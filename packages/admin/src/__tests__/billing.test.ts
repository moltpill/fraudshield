import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Hoisted mocks ---
const mockAuth = vi.hoisted(() => vi.fn())
const mockPrismaPaymentFindUnique = vi.hoisted(() => vi.fn())
const mockPrismaPaymentUpdate = vi.hoisted(() => vi.fn())
const mockPrismaAccountUpdate = vi.hoisted(() => vi.fn())
const mockPrismaSubFindUnique = vi.hoisted(() => vi.fn())
const mockPrismaSubUpdate = vi.hoisted(() => vi.fn())
const mockLogAdminAction = vi.hoisted(() => vi.fn())
const mockFetch = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', mockFetch)

vi.mock('@/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findUnique: mockPrismaPaymentFindUnique,
      update: mockPrismaPaymentUpdate,
    },
    account: { update: mockPrismaAccountUpdate },
    subscription: {
      findUnique: mockPrismaSubFindUnique,
      update: mockPrismaSubUpdate,
    },
  },
}))
vi.mock('@/lib/audit-log', () => ({
  logAdminAction: mockLogAdminAction,
  AUDIT_ACTIONS: {
    REVOKE_KEY: 'REVOKE_KEY',
    SUSPEND_ACCOUNT: 'SUSPEND_ACCOUNT',
    CHANGE_TIER: 'CHANGE_TIER',
    CREATE_ACCOUNT: 'CREATE_ACCOUNT',
    UNSUSPEND_ACCOUNT: 'UNSUSPEND_ACCOUNT',
    DELETE_ACCOUNT: 'DELETE_ACCOUNT',
    CREATE_KEY: 'CREATE_KEY',
    DELETE_KEY: 'DELETE_KEY',
    IMPERSONATE: 'IMPERSONATE',
    UPDATE_ACCOUNT: 'UPDATE_ACCOUNT',
  },
}))

import { POST } from '@/app/api/admin/billing/refund/route'
import { TIER_MONTHLY_REVENUE } from '@/lib/billing-data'

const SUPER_ADMIN_SESSION = {
  user: { adminId: 'admin-001', role: 'SUPER_ADMIN' },
}

const SUPPORT_SESSION = {
  user: { adminId: 'admin-002', role: 'SUPPORT' },
}

const READONLY_SESSION = {
  user: { adminId: 'admin-003', role: 'READONLY' },
}

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/admin/billing/refund', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('TIER_MONTHLY_REVENUE', () => {
  it('has correct ZAR prices in cents', () => {
    expect(TIER_MONTHLY_REVENUE.STARTER).toBe(14900)
    expect(TIER_MONTHLY_REVENUE.GROWTH).toBe(39900)
    expect(TIER_MONTHLY_REVENUE.SCALE).toBe(99900)
    expect(TIER_MONTHLY_REVENUE.FREE).toBe(0)
  })
})

describe('POST /api/admin/billing/refund', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogAdminAction.mockResolvedValue(undefined)
    mockPrismaPaymentUpdate.mockResolvedValue({})
    mockPrismaAccountUpdate.mockResolvedValue({})
    mockPrismaSubUpdate.mockResolvedValue({})
    mockPrismaSubFindUnique.mockResolvedValue(null)
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest({ paymentId: 'pay-001', reason: 'DUPLICATE' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for READONLY role', async () => {
    mockAuth.mockResolvedValue(READONLY_SESSION)
    const res = await POST(makeRequest({ paymentId: 'pay-001', reason: 'DUPLICATE' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when paymentId missing', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    const res = await POST(makeRequest({ reason: 'DUPLICATE' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('paymentId')
  })

  it('returns 400 for invalid reason', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-001',
      accountId: 'acc-001',
      amount: 14900,
      status: 'completed',
      stitchPaymentId: null,
      account: { id: 'acc-001', email: 'user@test.com' },
    })
    const res = await POST(makeRequest({ paymentId: 'pay-001', reason: 'INVALID_REASON' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when payment not found', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ paymentId: 'nonexistent', reason: 'DUPLICATE' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 when payment not completed', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-001',
      accountId: 'acc-001',
      amount: 14900,
      status: 'pending',
      stitchPaymentId: null,
      account: { id: 'acc-001', email: 'user@test.com' },
    })
    const res = await POST(makeRequest({ paymentId: 'pay-001', reason: 'DUPLICATE' }))
    expect(res.status).toBe(409)
  })

  it('processes refund for SUPER_ADMIN successfully', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-001',
      accountId: 'acc-001',
      amount: 14900,
      status: 'completed',
      stitchPaymentId: null,
      account: { id: 'acc-001', email: 'user@test.com' },
    })

    const res = await POST(makeRequest({ paymentId: 'pay-001', reason: 'REQUESTED_BY_CUSTOMER' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; refundAmount: number }
    expect(body.success).toBe(true)
    expect(body.refundAmount).toBe(14900)
  })

  it('processes refund for SUPPORT role successfully', async () => {
    mockAuth.mockResolvedValue(SUPPORT_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-002',
      accountId: 'acc-002',
      amount: 39900,
      status: 'completed',
      stitchPaymentId: null,
      account: { id: 'acc-002', email: 'user2@test.com' },
    })

    const res = await POST(makeRequest({ paymentId: 'pay-002', reason: 'FRAUD' }))
    expect(res.status).toBe(200)
  })

  it('downgrades account to FREE after refund', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-001',
      accountId: 'acc-001',
      amount: 14900,
      status: 'completed',
      stitchPaymentId: null,
      account: { id: 'acc-001', email: 'user@test.com' },
    })

    await POST(makeRequest({ paymentId: 'pay-001', reason: 'REQUESTED_BY_CUSTOMER' }))
    expect(mockPrismaAccountUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tier: 'FREE' } })
    )
  })

  it('cancels active subscription after refund', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-001',
      accountId: 'acc-001',
      amount: 14900,
      status: 'completed',
      stitchPaymentId: null,
      account: { id: 'acc-001', email: 'user@test.com' },
    })
    mockPrismaSubFindUnique.mockResolvedValue({
      id: 'sub-001',
      accountId: 'acc-001',
      status: 'active',
    })

    await POST(makeRequest({ paymentId: 'pay-001', reason: 'REQUESTED_BY_CUSTOMER' }))
    expect(mockPrismaSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'cancelled' }),
      })
    )
  })

  it('calls Stitch refund API when stitchPaymentId present', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-001',
      accountId: 'acc-001',
      amount: 14900,
      status: 'completed',
      stitchPaymentId: 'stitch-pay-001',
      account: { id: 'acc-001', email: 'user@test.com' },
    })

    // Mock Stitch token + refund calls
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { accessToken: 'tok' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'stitch-refund-001', status: 'PROCESSED' }),
      })

    const res = await POST(makeRequest({ paymentId: 'pay-001', reason: 'REQUESTED_BY_CUSTOMER' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { stitchRefundId: string }
    expect(body.stitchRefundId).toBe('stitch-refund-001')
  })

  it('logs admin action for audit trail', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-001',
      accountId: 'acc-001',
      amount: 14900,
      status: 'completed',
      stitchPaymentId: null,
      account: { id: 'acc-001', email: 'user@test.com' },
    })

    await POST(makeRequest({ paymentId: 'pay-001', reason: 'DUPLICATE' }))
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-001',
        targetType: 'payment',
        targetId: 'pay-001',
      })
    )
  })

  it('is case-insensitive for reason', async () => {
    mockAuth.mockResolvedValue(SUPER_ADMIN_SESSION)
    mockPrismaPaymentFindUnique.mockResolvedValue({
      id: 'pay-001',
      accountId: 'acc-001',
      amount: 14900,
      status: 'completed',
      stitchPaymentId: null,
      account: { id: 'acc-001', email: 'user@test.com' },
    })

    const res = await POST(makeRequest({ paymentId: 'pay-001', reason: 'duplicate' }))
    expect(res.status).toBe(200)
  })
})
