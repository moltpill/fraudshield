import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted for anything referenced in vi.mock factory functions
const { mockBcryptCompare, mockFindUnique, capturedConfig } = vi.hoisted(() => {
  const config = { value: {} as Record<string, unknown> }
  return {
    mockBcryptCompare: vi.fn(),
    mockFindUnique: vi.fn(),
    capturedConfig: config,
  }
})

vi.mock('next-auth', () => ({
  default: vi.fn((config) => {
    capturedConfig.value = config
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    }
  }),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn((config) => ({ ...config, _type: 'credentials' })),
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    adminUser: {
      findUnique: mockFindUnique,
    },
  },
}))

// Import the auth module to trigger NextAuth call
import '@/auth'

describe('Admin Auth Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports handlers, auth, signIn, signOut', async () => {
    const authModule = await import('@/auth')
    expect(authModule.handlers).toBeDefined()
    expect(authModule.auth).toBeDefined()
    expect(authModule.signIn).toBeDefined()
    expect(authModule.signOut).toBeDefined()
  })

  it('NextAuth called with providers config', () => {
    expect(capturedConfig.value.providers).toBeDefined()
    expect(Array.isArray(capturedConfig.value.providers)).toBe(true)
  })

  it('uses /login as sign-in page', () => {
    const pages = capturedConfig.value.pages as Record<string, string>
    expect(pages.signIn).toBe('/login')
  })

  it('uses jwt session strategy', () => {
    const session = capturedConfig.value.session as Record<string, string>
    expect(session.strategy).toBe('jwt')
  })

  it('authorize returns null for missing credentials', async () => {
    const providers = capturedConfig.value.providers as Array<{ authorize: Function }>
    const authorize = providers[0].authorize
    const result = await authorize({ email: '', password: '' })
    expect(result).toBeNull()
  })

  it('authorize returns null when admin user not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const providers = capturedConfig.value.providers as Array<{ authorize: Function }>
    const authorize = providers[0].authorize
    const result = await authorize({ email: 'unknown@example.com', password: 'pass' })
    expect(result).toBeNull()
  })

  it('authorize returns null for wrong password', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'admin1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'SUPER_ADMIN',
      password: 'hashed',
    })
    mockBcryptCompare.mockResolvedValueOnce(false)
    const providers = capturedConfig.value.providers as Array<{ authorize: Function }>
    const authorize = providers[0].authorize
    const result = await authorize({ email: 'admin@example.com', password: 'wrong' })
    expect(result).toBeNull()
  })

  it('authorize returns user for valid admin credentials', async () => {
    const mockAdmin = {
      id: 'admin1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'SUPER_ADMIN',
      password: 'hashed',
    }
    mockFindUnique.mockResolvedValueOnce(mockAdmin)
    mockBcryptCompare.mockResolvedValueOnce(true)

    const providers = capturedConfig.value.providers as Array<{ authorize: Function }>
    const authorize = providers[0].authorize
    const result = await authorize({ email: 'admin@example.com', password: 'correct' })
    expect(result).toMatchObject({
      adminId: 'admin1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'SUPER_ADMIN',
    })
  })

  it('jwt callback includes adminId and role', () => {
    const callbacks = capturedConfig.value.callbacks as {
      jwt: (args: { token: Record<string, unknown>; user: Record<string, unknown> }) => Record<string, unknown>
    }
    const token = callbacks.jwt({
      token: {},
      user: { adminId: 'admin1', role: 'SUPER_ADMIN', email: 'admin@test.com' },
    })
    expect(token.adminId).toBe('admin1')
    expect(token.role).toBe('SUPER_ADMIN')
  })

  it('session callback includes adminId and role', () => {
    const callbacks = capturedConfig.value.callbacks as {
      session: (args: {
        session: { user: Record<string, unknown>; expires: string }
        token: Record<string, unknown>
      }) => { user: Record<string, unknown> }
    }
    const result = callbacks.session({
      session: { user: {}, expires: '2099-01-01' },
      token: { adminId: 'admin1', role: 'SUPPORT' },
    })
    expect(result.user.adminId).toBe('admin1')
    expect(result.user.role).toBe('SUPPORT')
  })
})
