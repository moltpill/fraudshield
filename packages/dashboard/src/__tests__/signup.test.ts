/**
 * STORY-064: Signup and onboarding flow
 *
 * Tests for signup API route and onboarding wizard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
const mockAccountFindUnique = vi.hoisted(() => vi.fn())
const mockAccountCreate = vi.hoisted(() => vi.fn())
const mockApiKeyCreate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: mockAccountFindUnique,
      create: mockAccountCreate,
    },
    apiKey: {
      create: mockApiKeyCreate,
    },
  },
}))

// Mock bcryptjs
const mockBcryptHash = vi.hoisted(() => vi.fn())
vi.mock('bcryptjs', () => ({
  default: { hash: mockBcryptHash },
  hash: mockBcryptHash,
}))

// Mock nanoid for API key generation
const mockNanoid = vi.hoisted(() => vi.fn())
vi.mock('nanoid', () => ({
  nanoid: mockNanoid,
}))

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBcryptHash.mockResolvedValue('hashed_password')
    mockNanoid.mockReturnValue('abcd1234567890abcd1234567890ab')
  })

  async function callRoute(body: Record<string, unknown>) {
    const { POST } = await import('../app/api/auth/signup/route.js')
    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return POST(req as Parameters<typeof POST>[0])
  }

  it('creates account with hashed password', async () => {
    mockAccountFindUnique.mockResolvedValue(null) // no existing account
    mockAccountCreate.mockResolvedValue({
      id: 'acc-123',
      email: 'new@example.com',
      name: 'New User',
      tier: 'FREE',
    })

    const res = await callRoute({
      email: 'new@example.com',
      name: 'New User',
      password: 'SecurePass123!',
    })

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.accountId).toBe('acc-123')
    expect(data.email).toBe('new@example.com')

    expect(mockBcryptHash).toHaveBeenCalledWith('SecurePass123!', 12)
    expect(mockAccountCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          name: 'New User',
          password: 'hashed_password',
          tier: 'FREE',
          status: 'active',
        }),
      })
    )
  })

  it('returns 409 if email already registered', async () => {
    mockAccountFindUnique.mockResolvedValue({ id: 'existing', email: 'taken@example.com' })

    const res = await callRoute({
      email: 'taken@example.com',
      name: 'User',
      password: 'pass123!',
    })

    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.code).toBe('EMAIL_TAKEN')
    expect(mockAccountCreate).not.toHaveBeenCalled()
  })

  it('returns 400 for missing email', async () => {
    const res = await callRoute({ name: 'User', password: 'pass123!' })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.code).toBe('INVALID_INPUT')
  })

  it('returns 400 for missing name', async () => {
    const res = await callRoute({ email: 'a@b.com', password: 'pass123!' })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.code).toBe('INVALID_INPUT')
  })

  it('returns 400 for short password', async () => {
    const res = await callRoute({ email: 'a@b.com', name: 'User', password: '123' })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.code).toBe('INVALID_INPUT')
  })

  it('normalises email to lowercase', async () => {
    mockAccountFindUnique.mockResolvedValue(null)
    mockAccountCreate.mockResolvedValue({ id: 'acc-1', email: 'user@example.com', name: 'User', tier: 'FREE' })

    await callRoute({ email: 'USER@EXAMPLE.COM', name: 'User', password: 'SecurePass123!' })

    expect(mockAccountCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'user@example.com' }),
      })
    )
  })
})

describe('POST /api/onboarding/create-key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNanoid.mockReturnValue('abcd1234567890abcd1234567890ab')
  })

  async function callRoute(body: Record<string, unknown>, session: Record<string, unknown> | null) {
    vi.resetModules()
    vi.doMock('@/auth', () => ({
      auth: vi.fn().mockResolvedValue(session),
    }))
    const { POST } = await import('../app/api/onboarding/create-key/route.js')
    const req = new Request('http://localhost/api/onboarding/create-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return POST(req as Parameters<typeof POST>[0])
  }

  it('creates first API key for authenticated account', async () => {
    const mockSession = { user: { accountId: 'acc-123', email: 'u@e.com', tier: 'FREE' } }
    mockApiKeyCreate.mockResolvedValue({
      id: 'key-123',
      key: 'eye_live_abcd1234567890abcd1234567890ab',
      name: 'My First Key',
      status: 'active',
    })

    const res = await callRoute({ name: 'My First Key' }, mockSession)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.key).toContain('eye_live_')
    expect(data.name).toBe('My First Key')

    expect(mockApiKeyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: 'acc-123',
          name: 'My First Key',
          key: expect.stringMatching(/^eye_live_/),
        }),
      })
    )
  })

  it('returns 401 when not authenticated', async () => {
    const res = await callRoute({ name: 'Key' }, null)
    expect(res.status).toBe(401)
  })

  it('uses default name if not provided', async () => {
    const mockSession = { user: { accountId: 'acc-123', email: 'u@e.com', tier: 'FREE' } }
    mockApiKeyCreate.mockResolvedValue({
      id: 'key-123',
      key: 'eye_live_abcd1234567890abcd1234567890ab',
      name: 'Default Key',
      status: 'active',
    })

    const res = await callRoute({}, mockSession)
    expect(res.status).toBe(201)
  })
})
