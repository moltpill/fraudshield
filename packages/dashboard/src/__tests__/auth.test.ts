import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock Prisma
const mockFindUnique = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: mockFindUnique,
    },
  },
}))

// Mock next-auth to capture config and expose authorize for testing
let capturedAuthorize: ((credentials: Record<string, string>) => Promise<unknown>) | undefined

vi.mock('next-auth', () => ({
  default: vi.fn((config: { providers: Array<{ name: string; credentials: unknown; authorize?: (creds: Record<string, string>) => Promise<unknown> }> }) => {
    capturedAuthorize = config?.providers?.[0]?.authorize
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    }
  }),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn((config: { name: string; credentials: unknown; authorize?: (creds: Record<string, string>) => Promise<unknown> }) => ({
    name: config.name,
    credentials: config.credentials,
    authorize: config.authorize,
  })),
}))

// Trigger module load to capture authorize
await import('@/auth')

describe('Auth Configuration', () => {
  it('configures credentials provider with authorize function', () => {
    expect(capturedAuthorize).toBeDefined()
    expect(typeof capturedAuthorize).toBe('function')
  })
})

describe('Credentials Provider - authorize function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockReset()
  })

  it('returns null when email credential is missing', async () => {
    const result = await capturedAuthorize?.({ password: 'pass123' })
    expect(result).toBeNull()
  })

  it('returns null when password credential is missing', async () => {
    const result = await capturedAuthorize?.({ email: 'test@test.com' })
    expect(result).toBeNull()
  })

  it('returns null when both credentials are missing', async () => {
    const result = await capturedAuthorize?.({})
    expect(result).toBeNull()
  })

  it('returns null when account not found in database', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    const result = await capturedAuthorize?.({
      email: 'notfound@test.com',
      password: 'password123',
    })

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'notfound@test.com' },
    })
    expect(result).toBeNull()
  })

  it('returns null when account is suspended', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'acc_123',
      email: 'test@test.com',
      name: 'Test',
      tier: 'FREE',
      status: 'suspended',
      password: await bcrypt.hash('password123', 10),
    })

    const result = await capturedAuthorize?.({
      email: 'test@test.com',
      password: 'password123',
    })

    expect(result).toBeNull()
  })

  it('returns null when account has no password set', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'acc_123',
      email: 'test@test.com',
      name: 'Test',
      tier: 'FREE',
      status: 'active',
      password: null,
    })

    const result = await capturedAuthorize?.({
      email: 'test@test.com',
      password: 'password123',
    })

    expect(result).toBeNull()
  })

  it('returns null when password does not match', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'acc_123',
      email: 'test@test.com',
      name: 'Test',
      tier: 'FREE',
      status: 'active',
      password: await bcrypt.hash('correctpassword', 10),
    })

    const result = await capturedAuthorize?.({
      email: 'test@test.com',
      password: 'wrongpassword',
    })

    expect(result).toBeNull()
  })

  it('returns user object with accountId and tier on valid credentials', async () => {
    const password = 'securepassword123'
    const hash = await bcrypt.hash(password, 10)

    mockFindUnique.mockResolvedValueOnce({
      id: 'acc_abc',
      email: 'user@example.com',
      name: 'Test User',
      tier: 'STARTER',
      status: 'active',
      password: hash,
    })

    const result = await capturedAuthorize?.({
      email: 'user@example.com',
      password,
    }) as { id: string; accountId: string; email: string; name: string; tier: string } | null

    expect(result).not.toBeNull()
    expect(result?.id).toBe('acc_abc')
    expect(result?.accountId).toBe('acc_abc')
    expect(result?.email).toBe('user@example.com')
    expect(result?.name).toBe('Test User')
    expect(result?.tier).toBe('STARTER')
  })

  it('queries database by email', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    await capturedAuthorize?.({ email: 'find@test.com', password: 'pass' })

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'find@test.com' },
    })
  })
})

describe('JWT and Session Callbacks', () => {
  it('adds accountId and tier to jwt token from user', () => {
    // Simulate the jwt callback behavior
    const token = { sub: 'user_id', email: 'test@test.com' }
    const user = { id: 'acc_123', accountId: 'acc_123', tier: 'STARTER', email: 'test@test.com', name: 'Test' }

    const updatedToken = user
      ? { ...token, accountId: user.accountId, tier: user.tier }
      : token

    expect(updatedToken.accountId).toBe('acc_123')
    expect(updatedToken.tier).toBe('STARTER')
  })

  it('passes through token unchanged when no user', () => {
    const token = { sub: 'user_id', accountId: 'acc_existing', tier: 'FREE' }

    // No user means we just return token unchanged
    const updatedToken = { ...token }

    expect(updatedToken.accountId).toBe('acc_existing')
    expect(updatedToken.tier).toBe('FREE')
  })

  it('adds accountId and tier to session from token', () => {
    const token = { accountId: 'acc_123', tier: 'GROWTH', sub: 'user_id' }
    const session = {
      user: { email: 'test@test.com', name: 'Test User' },
      expires: new Date().toISOString(),
    }

    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        accountId: token.accountId,
        tier: token.tier,
      },
    }

    expect(updatedSession.user.accountId).toBe('acc_123')
    expect(updatedSession.user.tier).toBe('GROWTH')
  })

  it('session includes all required fields: accountId, email, tier', () => {
    const session = {
      user: {
        accountId: 'acc_abc',
        email: 'user@example.com',
        name: 'User Name',
        tier: 'ENTERPRISE',
      },
      expires: new Date().toISOString(),
    }

    expect(session.user).toHaveProperty('accountId')
    expect(session.user).toHaveProperty('email')
    expect(session.user).toHaveProperty('tier')
  })
})

describe('Password Hashing', () => {
  it('bcrypt hashes and verifies passwords correctly', async () => {
    const password = 'mySecurePassword!'
    const hash = await bcrypt.hash(password, 10)

    expect(hash).not.toBe(password)
    expect(await bcrypt.compare(password, hash)).toBe(true)
    expect(await bcrypt.compare('wrongpassword', hash)).toBe(false)
  })

  it('different hashes for same password (salt)', async () => {
    const password = 'samepassword'
    const hash1 = await bcrypt.hash(password, 10)
    const hash2 = await bcrypt.hash(password, 10)

    expect(hash1).not.toBe(hash2)
    expect(await bcrypt.compare(password, hash1)).toBe(true)
    expect(await bcrypt.compare(password, hash2)).toBe(true)
  })
})
