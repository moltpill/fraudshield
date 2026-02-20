import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  getStitchToken,
  createPaymentLink,
  createStitchSubscription,
  cancelStitchSubscription,
  refundStitchPayment,
  verifyWebhookSignature,
  TIER_PRICES,
  _resetTokenCache,
} from '@/lib/stitch'

beforeEach(() => {
  vi.clearAllMocks()
  _resetTokenCache()
  process.env.STITCH_CLIENT_ID = 'test-client-id'
  process.env.STITCH_CLIENT_SECRET = 'test-client-secret'
  process.env.STITCH_BASE_URL = 'https://express.stitch.money'
})

function mockTokenResponse() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: { accessToken: 'test-token-abc' } }),
    text: async () => '',
  })
}

describe('TIER_PRICES', () => {
  it('has correct ZAR cent prices', () => {
    expect(TIER_PRICES.STARTER).toBe(14900)  // R149
    expect(TIER_PRICES.GROWTH).toBe(39900)   // R399
    expect(TIER_PRICES.SCALE).toBe(99900)    // R999
  })
})

describe('getStitchToken', () => {
  it('fetches token from Stitch API', async () => {
    mockTokenResponse()
    const token = await getStitchToken()
    expect(token).toBe('test-token-abc')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://express.stitch.money/api/v1/token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test-client-id'),
      })
    )
  })

  it('caches token and avoids duplicate requests', async () => {
    mockTokenResponse()
    const t1 = await getStitchToken()
    const t2 = await getStitchToken()
    expect(t1).toBe(t2)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws on auth failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })
    await expect(getStitchToken()).rejects.toThrow('Stitch auth failed: 401')
  })

  it('uses correct scope for recurring payments', async () => {
    mockTokenResponse()
    await getStitchToken('client_recurringpaymentconsentrequest')
    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body as string)
    expect(body.scope).toBe('client_recurringpaymentconsentrequest')
  })
})

describe('createPaymentLink', () => {
  it('creates a payment link with correct params', async () => {
    mockTokenResponse()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'link-123',
        url: 'https://pay.stitch.money/link-123',
        status: 'PENDING',
        amount: 14900,
        merchantReference: 'sub-STARTER-acc-001',
      }),
    })

    const link = await createPaymentLink({
      amount: 14900,
      merchantReference: 'sub-STARTER-acc-001',
      payerName: 'Test User',
      payerEmail: 'test@example.com',
    })

    expect(link.id).toBe('link-123')
    expect(link.amount).toBe(14900)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://express.stitch.money/api/v1/payment-links',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Authorization': 'Bearer test-token-abc' }),
      })
    )
  })

  it('throws on API error', async () => {
    mockTokenResponse()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'Bad request' })
    await expect(createPaymentLink({
      amount: 14900,
      merchantReference: 'ref',
      payerName: 'Test',
      payerEmail: 'test@example.com',
    })).rejects.toThrow('Stitch payment link failed: 400')
  })
})

describe('createStitchSubscription', () => {
  it('creates subscription with monthly recurrence', async () => {
    mockTokenResponse()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'sub-456',
        status: 'UNAUTHORISED',
        amount: 14900,
        email: 'customer@example.com',
        payerId: 'acc-001',
        startDate: '2026-03-01T00:00:00Z',
        authorizationUrl: 'https://express.stitch.money/authorize/sub-456',
        merchantReference: 'fraud-STARTER-acc-001',
      }),
    })

    const sub = await createStitchSubscription({
      amount: 14900,
      merchantReference: 'fraud-STARTER-acc-001',
      startDate: '2026-03-01T00:00:00Z',
      payerFullName: 'Test User',
      email: 'customer@example.com',
      payerId: 'acc-001',
    })

    expect(sub.id).toBe('sub-456')
    expect(sub.authorizationUrl).toContain('sub-456')

    const body = JSON.parse(mockFetch.mock.calls[1][1].body as string)
    expect(body.recurrence.type).toBe('Monthly')
    expect(body.recurrence.interval).toBe(1)
  })

  it('truncates payerFullName to 20 chars', async () => {
    mockTokenResponse()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'sub-789', status: 'UNAUTHORISED', amount: 14900, email: 'e@e.com', payerId: 'p1', startDate: '', merchantReference: 'r' }),
    })

    await createStitchSubscription({
      amount: 14900,
      merchantReference: 'ref',
      startDate: '2026-03-01T00:00:00Z',
      payerFullName: 'A Very Long Name That Exceeds Twenty Characters',
      email: 'e@e.com',
      payerId: 'p1',
    })

    const body = JSON.parse(mockFetch.mock.calls[1][1].body as string)
    expect(body.payerFullName.length).toBeLessThanOrEqual(20)
  })
})

describe('cancelStitchSubscription', () => {
  it('cancels subscription by ID', async () => {
    mockTokenResponse()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    await cancelStitchSubscription('sub-456')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://express.stitch.money/api/v1/subscriptions/sub-456/cancel',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws on cancel failure', async () => {
    mockTokenResponse()
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not found' })
    await expect(cancelStitchSubscription('bad-id')).rejects.toThrow('Stitch cancel failed: 404')
  })
})

describe('refundStitchPayment', () => {
  it('initiates refund with amount and reason', async () => {
    mockTokenResponse()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'refund-001', status: 'PROCESSED', amount: 14900, reason: 'REQUESTED_BY_CUSTOMER' }),
    })

    const refund = await refundStitchPayment('pay-111', {
      amount: 14900,
      reason: 'REQUESTED_BY_CUSTOMER',
    })

    expect(refund.id).toBe('refund-001')
    expect(refund.status).toBe('PROCESSED')
  })
})

describe('verifyWebhookSignature', () => {
  it('returns true for valid signature', () => {
    const { createHmac } = require('crypto')
    const secret = 'my-webhook-secret'
    const payload = JSON.stringify({ event: 'payment.completed', id: '123' })
    const sig = createHmac('sha256', secret).update(payload).digest('hex')
    expect(verifyWebhookSignature(payload, sig, secret)).toBe(true)
  })

  it('returns false for invalid signature', () => {
    expect(verifyWebhookSignature('payload', 'bad-sig', 'secret')).toBe(false)
  })

  it('returns false for tampered payload', () => {
    const { createHmac } = require('crypto')
    const secret = 'my-webhook-secret'
    const original = JSON.stringify({ event: 'payment.completed', amount: 14900 })
    const tampered = JSON.stringify({ event: 'payment.completed', amount: 0 })
    const sig = createHmac('sha256', secret).update(original).digest('hex')
    expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false)
  })
})
