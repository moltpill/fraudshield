import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

// --- Hoisted mocks ---
const mockPrismaPaymentFindUnique = vi.hoisted(() => vi.fn())
const mockPrismaPaymentFindFirst = vi.hoisted(() => vi.fn())
const mockPrismaPaymentCreate = vi.hoisted(() => vi.fn())
const mockPrismaPaymentUpdate = vi.hoisted(() => vi.fn())
const mockPrismaPaymentUpdateMany = vi.hoisted(() => vi.fn())
const mockPrismaSubFindFirst = vi.hoisted(() => vi.fn())
const mockPrismaSubFindUnique = vi.hoisted(() => vi.fn())
const mockPrismaSubUpdate = vi.hoisted(() => vi.fn())
const mockPrismaAccountUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findUnique: mockPrismaPaymentFindUnique,
      findFirst: mockPrismaPaymentFindFirst,
      create: mockPrismaPaymentCreate,
      update: mockPrismaPaymentUpdate,
      updateMany: mockPrismaPaymentUpdateMany,
    },
    subscription: {
      findFirst: mockPrismaSubFindFirst,
      findUnique: mockPrismaSubFindUnique,
      update: mockPrismaSubUpdate,
    },
    account: { update: mockPrismaAccountUpdate },
  },
}))

import { POST } from '@/app/api/webhooks/stitch/route'

const WEBHOOK_SECRET = 'test-webhook-secret'

function makeWebhookRequest(event: object, withValidSig = true, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event)
  const sig = withValidSig
    ? createHmac('sha256', secret).update(payload).digest('hex')
    : 'bad-signature'

  return new NextRequest('http://localhost/api/webhooks/stitch', {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
      'x-stitch-signature': sig,
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STITCH_WEBHOOK_SECRET = WEBHOOK_SECRET
  mockPrismaPaymentFindUnique.mockResolvedValue(null) // no duplicate
})

describe('Stitch webhook endpoint', () => {
  it('returns 401 for invalid signature', async () => {
    const req = makeWebhookRequest({ id: 'evt-1', type: 'payment.completed', data: {} }, false)
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for malformed JSON', async () => {
    const req = new NextRequest('http://localhost/api/webhooks/stitch', {
      method: 'POST',
      body: 'not-json',
      headers: { 'x-stitch-signature': '' },
    })
    // No secret set means no sig check
    delete process.env.STITCH_WEBHOOK_SECRET
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 and "already processed" for duplicate event', async () => {
    mockPrismaPaymentFindUnique.mockResolvedValue({ id: 'pay-dup' })
    const req = makeWebhookRequest({ id: 'evt-dup', type: 'payment.completed', data: {} })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { message: string }
    expect(body.message).toBe('Already processed')
  })

  it('handles subscription.authorised → activates subscription and upgrades tier', async () => {
    mockPrismaSubFindFirst.mockResolvedValue({
      id: 'sub-db-001',
      accountId: 'acc-001',
      tier: 'STARTER',
      status: 'pending',
    })
    mockPrismaSubUpdate.mockResolvedValue({})
    mockPrismaAccountUpdate.mockResolvedValue({})

    const req = makeWebhookRequest({
      id: 'evt-sub-auth',
      type: 'subscription.authorised',
      data: {
        subscriptionId: 'stitch-sub-001',
        payerId: 'acc-001',
        status: 'AUTHORISED',
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrismaSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'active' }),
      })
    )
    expect(mockPrismaAccountUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: 'STARTER' }),
      })
    )
  })

  it('handles payment.completed → marks payment completed and activates subscription', async () => {
    mockPrismaSubFindUnique.mockResolvedValue({
      id: 'sub-db-001',
      accountId: 'acc-001',
      tier: 'STARTER',
    })
    mockPrismaPaymentFindFirst.mockResolvedValue({ id: 'pay-pending-001' })
    mockPrismaPaymentUpdate.mockResolvedValue({})
    mockPrismaSubUpdate.mockResolvedValue({})
    mockPrismaAccountUpdate.mockResolvedValue({})

    const req = makeWebhookRequest({
      id: 'evt-pay-001',
      type: 'payment.completed',
      data: {
        paymentId: 'stitch-pay-001',
        merchantReference: 'sentinel-starter-acc-001-1234567890',
        payerId: 'acc-001',
        amount: 14900,
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrismaPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      })
    )
    expect(mockPrismaAccountUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tier: 'STARTER' } })
    )
  })

  it('handles payment.completed → creates payment record if no pending payment', async () => {
    mockPrismaSubFindUnique.mockResolvedValue({
      id: 'sub-db-001',
      accountId: 'acc-001',
      tier: 'GROWTH',
    })
    mockPrismaPaymentFindFirst.mockResolvedValue(null) // no pending
    mockPrismaPaymentCreate.mockResolvedValue({})
    mockPrismaSubUpdate.mockResolvedValue({})
    mockPrismaAccountUpdate.mockResolvedValue({})

    const req = makeWebhookRequest({
      id: 'evt-pay-002',
      type: 'payment.completed',
      data: {
        paymentId: 'stitch-pay-002',
        merchantReference: 'sentinel-growth-acc-002-1234567890',
        payerId: 'acc-001',
        amount: 39900,
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrismaPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed', amount: 39900 }),
      })
    )
  })

  it('handles payment.failed → marks subscription past_due', async () => {
    mockPrismaSubFindUnique.mockResolvedValue({
      id: 'sub-db-001',
      accountId: 'acc-001',
      tier: 'STARTER',
    })
    mockPrismaSubUpdate.mockResolvedValue({})
    mockPrismaPaymentCreate.mockResolvedValue({})

    const req = makeWebhookRequest({
      id: 'evt-fail-001',
      type: 'payment.failed',
      data: {
        paymentId: 'stitch-pay-fail-001',
        payerId: 'acc-001',
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrismaSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'past_due' }),
      })
    )
  })

  it('handles payment.refunded → downgrades to FREE and cancels subscription', async () => {
    mockPrismaPaymentUpdateMany.mockResolvedValue({})
    mockPrismaPaymentCreate.mockResolvedValue({})
    mockPrismaAccountUpdate.mockResolvedValue({})
    mockPrismaSubFindUnique.mockResolvedValue({
      id: 'sub-db-001',
      accountId: 'acc-001',
      tier: 'STARTER',
    })
    mockPrismaSubUpdate.mockResolvedValue({})

    const req = makeWebhookRequest({
      id: 'evt-refund-001',
      type: 'payment.refunded',
      data: {
        paymentId: 'stitch-pay-001',
        payerId: 'acc-001',
        amount: 14900,
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrismaAccountUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tier: 'FREE' } })
    )
    expect(mockPrismaSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'cancelled' }),
      })
    )
  })

  it('returns 200 for unknown event types (ignore gracefully)', async () => {
    const req = makeWebhookRequest({
      id: 'evt-unknown',
      type: 'some.unknown.event',
      data: {},
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('skips signature check when STITCH_WEBHOOK_SECRET not set', async () => {
    delete process.env.STITCH_WEBHOOK_SECRET
    const req = new NextRequest('http://localhost/api/webhooks/stitch', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt-nosig', type: 'unknown.event', data: {} }),
      headers: { 'Content-Type': 'application/json', 'x-stitch-signature': 'anything' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
