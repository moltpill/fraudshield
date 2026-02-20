import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Hoisted mocks ---
const mockAuth = vi.hoisted(() => vi.fn())
const mockPrismaFindUnique = vi.hoisted(() => vi.fn())
const mockPrismaCreate = vi.hoisted(() => vi.fn())
const mockPrismaUpdate = vi.hoisted(() => vi.fn())
const mockPrismaUpsert = vi.hoisted(() => vi.fn())
const mockCreateStitchSubscription = vi.hoisted(() => vi.fn())
const mockCancelStitchSubscription = vi.hoisted(() => vi.fn())

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: { findUnique: mockPrismaFindUnique, update: mockPrismaUpdate },
    subscription: {
      findUnique: mockPrismaFindUnique,
      upsert: mockPrismaUpsert,
      update: mockPrismaUpdate,
    },
    payment: { create: mockPrismaCreate },
  },
}))
vi.mock('@/lib/stitch', () => ({
  createStitchSubscription: mockCreateStitchSubscription,
  cancelStitchSubscription: mockCancelStitchSubscription,
  TIER_PRICES: { STARTER: 14900, GROWTH: 39900, SCALE: 99900 },
}))

import { POST as checkoutPOST } from '@/app/api/billing/checkout/route'
import { POST as cancelPOST } from '@/app/api/billing/cancel/route'

const MOCK_SESSION = {
  user: {
    accountId: 'acc-001',
    email: 'user@example.com',
    name: 'Test User',
    tier: 'FREE',
  },
}

const MOCK_ACCOUNT = {
  id: 'acc-001',
  email: 'user@example.com',
  name: 'Test User',
  tier: 'FREE',
  subscription: null,
}

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(MOCK_SESSION)
    mockPrismaFindUnique.mockResolvedValue(MOCK_ACCOUNT)
    mockPrismaUpsert.mockResolvedValue({ id: 'sub-db-001' })
    mockPrismaCreate.mockResolvedValue({ id: 'pay-001' })
    mockCreateStitchSubscription.mockResolvedValue({
      id: 'stitch-sub-001',
      status: 'UNAUTHORISED',
      authorizationUrl: 'https://express.stitch.money/authorize/stitch-sub-001',
      amount: 14900,
      email: 'user@example.com',
      payerId: 'acc-001',
      startDate: '2026-03-01T00:00:00Z',
      merchantReference: 'fraudshield-starter-acc-001-xxx',
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await checkoutPOST(makeRequest({ tier: 'STARTER' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid tier', async () => {
    const res = await checkoutPOST(makeRequest({ tier: 'FREE' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('Invalid tier')
  })

  it('returns 400 for ENTERPRISE tier (custom)', async () => {
    const res = await checkoutPOST(makeRequest({ tier: 'ENTERPRISE' }))
    expect(res.status).toBe(400)
  })

  it('creates subscription and returns authorizationUrl for STARTER', async () => {
    const res = await checkoutPOST(makeRequest({ tier: 'STARTER' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { authorizationUrl: string; tier: string; amount: number }
    expect(body.authorizationUrl).toContain('stitch-sub-001')
    expect(body.tier).toBe('STARTER')
    expect(body.amount).toBe(14900)
  })

  it('calls createStitchSubscription with correct params', async () => {
    await checkoutPOST(makeRequest({ tier: 'GROWTH' }))
    expect(mockCreateStitchSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 39900,
        email: 'user@example.com',
        payerId: 'acc-001',
      })
    )
  })

  it('upserts subscription record as pending', async () => {
    await checkoutPOST(makeRequest({ tier: 'STARTER' }))
    expect(mockPrismaUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'pending', tier: 'STARTER' }),
        update: expect.objectContaining({ status: 'pending' }),
      })
    )
  })

  it('creates a pending payment record', async () => {
    await checkoutPOST(makeRequest({ tier: 'STARTER' }))
    expect(mockPrismaCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending', amount: 14900, tier: 'STARTER' }),
      })
    )
  })

  it('returns 409 when already subscribed to same tier', async () => {
    mockPrismaFindUnique.mockResolvedValue({
      ...MOCK_ACCOUNT,
      tier: 'STARTER',
      subscription: { status: 'active' },
    })
    const res = await checkoutPOST(makeRequest({ tier: 'STARTER' }))
    expect(res.status).toBe(409)
  })

  it('is case-insensitive for tier names', async () => {
    const res = await checkoutPOST(makeRequest({ tier: 'starter' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { tier: string }
    expect(body.tier).toBe('STARTER')
  })
})

describe('POST /api/billing/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(MOCK_SESSION)
    mockCancelStitchSubscription.mockResolvedValue(undefined)
    mockPrismaUpdate.mockResolvedValue({})
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await cancelPOST()
    expect(res.status).toBe(401)
  })

  it('returns 404 when no subscription exists', async () => {
    mockPrismaFindUnique.mockResolvedValue(null)
    const res = await cancelPOST()
    expect(res.status).toBe(404)
  })

  it('returns 409 when subscription already cancelled', async () => {
    mockPrismaFindUnique.mockResolvedValue({
      id: 'sub-001',
      accountId: 'acc-001',
      status: 'cancelled',
      stitchSubscriptionId: 'stitch-sub-001',
    })
    const res = await cancelPOST()
    expect(res.status).toBe(409)
  })

  it('cancels subscription in Stitch and DB', async () => {
    mockPrismaFindUnique.mockResolvedValue({
      id: 'sub-001',
      accountId: 'acc-001',
      status: 'active',
      stitchSubscriptionId: 'stitch-sub-001',
    })
    const res = await cancelPOST()
    expect(res.status).toBe(200)
    expect(mockCancelStitchSubscription).toHaveBeenCalledWith('stitch-sub-001')
    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'cancelled' }),
      })
    )
  })

  it('downgrades account to FREE on cancellation', async () => {
    mockPrismaFindUnique.mockResolvedValue({
      id: 'sub-001',
      accountId: 'acc-001',
      status: 'active',
      stitchSubscriptionId: 'stitch-sub-001',
    })
    await cancelPOST()
    // account.update should be called to set tier to FREE
    const calls = mockPrismaUpdate.mock.calls
    const accountUpdate = calls.find(
      (c: unknown[]) => (c[0] as { data?: { tier?: string } }).data?.tier === 'FREE'
    )
    expect(accountUpdate).toBeTruthy()
  })

  it('handles cancel without Stitch ID gracefully', async () => {
    mockPrismaFindUnique.mockResolvedValue({
      id: 'sub-001',
      accountId: 'acc-001',
      status: 'active',
      stitchSubscriptionId: null,
    })
    const res = await cancelPOST()
    expect(res.status).toBe(200)
    expect(mockCancelStitchSubscription).not.toHaveBeenCalled()
  })
})
