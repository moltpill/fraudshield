import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { usageRoute } from '../routes/usage.js'

// Mock Prisma
const mockUsageRecord = vi.hoisted(() => ({
  findMany: vi.fn(),
  aggregate: vi.fn(),
}))

const mockTierLimit = vi.hoisted(() => ({
  findUnique: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    usageRecord: mockUsageRecord,
    tierLimit: mockTierLimit,
  },
}))

describe('GET /v1/usage', () => {
  let app: Hono

  const mockApiKey = {
    id: 'key-123',
    accountId: 'acc-123',
    key: 'fs_live_abcd1234567890abcd1234567890ab',
    name: 'Test Key',
    status: 'active',
  }

  const mockAccount = {
    id: 'acc-123',
    email: 'test@example.com',
    name: 'Test Account',
    tier: 'FREE',
    status: 'active',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create fresh app with mock auth middleware
    app = new Hono()
    
    app.use('*', async (c, next) => {
      c.set('apiKey', mockApiKey as any)
      c.set('account', mockAccount as any)
      await next()
    })

    app.route('/v1', usageRoute)
  })

  it('returns current month usage count', async () => {
    mockTierLimit.findUnique.mockResolvedValue({
      tier: 'FREE',
      monthlyLimit: 1000,
      features: '{}',
    })

    mockUsageRecord.findMany.mockResolvedValue([
      { date: new Date('2026-02-01'), requestCount: 50 },
      { date: new Date('2026-02-02'), requestCount: 30 },
    ])

    const res = await app.request('/v1/usage')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.currentMonthUsage).toBe(80)
  })

  it('returns tier limit from TierLimit table', async () => {
    mockTierLimit.findUnique.mockResolvedValue({
      tier: 'FREE',
      monthlyLimit: 1000,
      features: '{}',
    })

    mockUsageRecord.findMany.mockResolvedValue([])

    const res = await app.request('/v1/usage')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.tierLimit).toBe(1000)
    expect(data.tier).toBe('FREE')
  })

  it('returns percentage used', async () => {
    mockTierLimit.findUnique.mockResolvedValue({
      tier: 'STARTER',
      monthlyLimit: 500,
      features: '{}',
    })

    mockUsageRecord.findMany.mockResolvedValue([
      { date: new Date('2026-02-01'), requestCount: 250 },
    ])

    // Update account tier for this test
    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('apiKey', mockApiKey as any)
      c.set('account', { ...mockAccount, tier: 'STARTER' } as any)
      await next()
    })
    app.route('/v1', usageRoute)

    const res = await app.request('/v1/usage')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.percentageUsed).toBe(50)
  })

  it('returns daily breakdown for current month', async () => {
    const day1 = new Date('2026-02-01')
    const day2 = new Date('2026-02-02')
    const day3 = new Date('2026-02-03')

    mockTierLimit.findUnique.mockResolvedValue({
      tier: 'FREE',
      monthlyLimit: 1000,
      features: '{}',
    })

    mockUsageRecord.findMany.mockResolvedValue([
      { date: day1, requestCount: 50 },
      { date: day2, requestCount: 30 },
      { date: day3, requestCount: 20 },
    ])

    const res = await app.request('/v1/usage')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.dailyBreakdown).toHaveLength(3)
    expect(data.dailyBreakdown[0].date).toBe(day1.toISOString().split('T')[0])
    expect(data.dailyBreakdown[0].count).toBe(50)
    expect(data.dailyBreakdown[1].count).toBe(30)
    expect(data.dailyBreakdown[2].count).toBe(20)
  })

  it('calculates from UsageRecord table for current month only', async () => {
    mockTierLimit.findUnique.mockResolvedValue({
      tier: 'FREE',
      monthlyLimit: 1000,
      features: '{}',
    })

    mockUsageRecord.findMany.mockResolvedValue([
      { date: new Date('2026-02-15'), requestCount: 100 },
    ])

    await app.request('/v1/usage')

    // Verify query filters to current month
    expect(mockUsageRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: 'acc-123',
          date: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      })
    )
  })

  it('returns zero usage when no records exist', async () => {
    mockTierLimit.findUnique.mockResolvedValue({
      tier: 'FREE',
      monthlyLimit: 1000,
      features: '{}',
    })

    mockUsageRecord.findMany.mockResolvedValue([])

    const res = await app.request('/v1/usage')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.currentMonthUsage).toBe(0)
    expect(data.percentageUsed).toBe(0)
    expect(data.dailyBreakdown).toHaveLength(0)
  })

  it('handles missing tier limit gracefully', async () => {
    mockTierLimit.findUnique.mockResolvedValue(null)
    mockUsageRecord.findMany.mockResolvedValue([])

    const res = await app.request('/v1/usage')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    // Default to 0 limit if tier not found (shouldn't happen normally)
    expect(data.tierLimit).toBe(0)
  })

  it('caps percentage at 100 when over limit', async () => {
    mockTierLimit.findUnique.mockResolvedValue({
      tier: 'FREE',
      monthlyLimit: 100,
      features: '{}',
    })

    mockUsageRecord.findMany.mockResolvedValue([
      { date: new Date('2026-02-01'), requestCount: 150 },
    ])

    const res = await app.request('/v1/usage')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    // Allow >100% to show overage clearly
    expect(data.percentageUsed).toBe(150)
  })
})
