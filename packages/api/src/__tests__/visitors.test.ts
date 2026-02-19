import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { visitorsRoute } from '../routes/visitors.js'

// Mock Prisma
const mockVisitor = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}))

const mockVisitorEvent = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    visitor: mockVisitor,
    visitorEvent: mockVisitorEvent,
  },
}))

describe('GET /v1/visitors/:id', () => {
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

    app.route('/v1', visitorsRoute)
  })

  it('returns visitor details when found', async () => {
    const now = new Date()
    const firstSeen = new Date(now.getTime() - 86400000) // 1 day ago

    mockVisitor.findFirst.mockResolvedValue({
      id: 'visitor-123',
      fingerprint: 'abc123fingerprint',
      firstSeen,
      lastSeen: now,
      visitCount: 5,
    })

    const res = await app.request('/v1/visitors/visitor-123')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.id).toBe('visitor-123')
    expect(data.visitCount).toBe(5)
    expect(data.firstSeen).toBe(firstSeen.toISOString())
    expect(data.lastSeen).toBe(now.toISOString())
  })

  it('returns 404 when visitor not found', async () => {
    mockVisitor.findFirst.mockResolvedValue(null)

    const res = await app.request('/v1/visitors/nonexistent-id')

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(data.code).toBe('VISITOR_NOT_FOUND')
  })

  it('scopes query to API key account only', async () => {
    mockVisitor.findFirst.mockResolvedValue(null)

    await app.request('/v1/visitors/visitor-123')

    // Verify the query includes account scoping through events
    expect(mockVisitor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'visitor-123',
          events: {
            some: {
              apiKey: {
                accountId: 'acc-123',
              },
            },
          },
        }),
      })
    )
  })

  it('includes recent events when ?include=events', async () => {
    const now = new Date()
    const firstSeen = new Date(now.getTime() - 86400000)

    mockVisitor.findFirst.mockResolvedValue({
      id: 'visitor-123',
      fingerprint: 'abc123fingerprint',
      firstSeen,
      lastSeen: now,
      visitCount: 3,
    })

    const mockEvents = [
      {
        id: 'event-1',
        visitorId: 'visitor-123',
        apiKeyId: 'key-123',
        signals: '{}',
        riskScore: 10,
        isBot: false,
        isVpn: false,
        isTor: false,
        isDatacenter: false,
        timestamp: now,
      },
      {
        id: 'event-2',
        visitorId: 'visitor-123',
        apiKeyId: 'key-123',
        signals: '{}',
        riskScore: 5,
        isBot: false,
        isVpn: true,
        isTor: false,
        isDatacenter: false,
        timestamp: new Date(now.getTime() - 3600000),
      },
    ]

    mockVisitorEvent.findMany.mockResolvedValue(mockEvents)

    const res = await app.request('/v1/visitors/visitor-123?include=events')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.id).toBe('visitor-123')
    expect(data.events).toBeDefined()
    expect(data.events).toHaveLength(2)
    expect(data.events[0].id).toBe('event-1')
    expect(data.events[0].riskScore).toBe(10)
  })

  it('does not include events when ?include is not specified', async () => {
    const now = new Date()

    mockVisitor.findFirst.mockResolvedValue({
      id: 'visitor-123',
      fingerprint: 'abc123fingerprint',
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    })

    const res = await app.request('/v1/visitors/visitor-123')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.events).toBeUndefined()
    expect(mockVisitorEvent.findMany).not.toHaveBeenCalled()
  })

  it('limits events to recent ones (max 50)', async () => {
    const now = new Date()

    mockVisitor.findFirst.mockResolvedValue({
      id: 'visitor-123',
      fingerprint: 'abc123fingerprint',
      firstSeen: now,
      lastSeen: now,
      visitCount: 100,
    })

    mockVisitorEvent.findMany.mockResolvedValue([])

    await app.request('/v1/visitors/visitor-123?include=events')

    expect(mockVisitorEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visitorId: 'visitor-123',
          apiKey: {
            accountId: 'acc-123',
          },
        }),
        take: 50,
        orderBy: { timestamp: 'desc' },
      })
    )
  })

  it('events are scoped to account only', async () => {
    const now = new Date()

    mockVisitor.findFirst.mockResolvedValue({
      id: 'visitor-123',
      fingerprint: 'abc123fingerprint',
      firstSeen: now,
      lastSeen: now,
      visitCount: 5,
    })

    mockVisitorEvent.findMany.mockResolvedValue([])

    await app.request('/v1/visitors/visitor-123?include=events')

    // Events query should be scoped to account
    expect(mockVisitorEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          apiKey: {
            accountId: 'acc-123',
          },
        }),
      })
    )
  })
})

describe('GET /v1/visitors', () => {
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

    app.route('/v1', visitorsRoute)
  })

  it('returns visitors with default pagination (limit 20)', async () => {
    const now = new Date()
    const visitors = [
      { id: 'v-1', fingerprint: 'fp1', firstSeen: now, lastSeen: now, visitCount: 3 },
      { id: 'v-2', fingerprint: 'fp2', firstSeen: now, lastSeen: now, visitCount: 1 },
    ]

    mockVisitor.findMany.mockResolvedValue(visitors)
    mockVisitor.count.mockResolvedValue(2)

    const res = await app.request('/v1/visitors')

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.visitors).toHaveLength(2)
    expect(data.total).toBe(2)
    expect(data.limit).toBe(20)
    expect(data.offset).toBe(0)
  })

  it('supports limit and offset pagination', async () => {
    mockVisitor.findMany.mockResolvedValue([])
    mockVisitor.count.mockResolvedValue(50)

    await app.request('/v1/visitors?limit=10&offset=20')

    expect(mockVisitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    )
  })

  it('orders by lastSeen desc by default', async () => {
    mockVisitor.findMany.mockResolvedValue([])
    mockVisitor.count.mockResolvedValue(0)

    await app.request('/v1/visitors')

    expect(mockVisitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { lastSeen: 'desc' },
      })
    )
  })

  it('scopes visitors to account via events relation', async () => {
    mockVisitor.findMany.mockResolvedValue([])
    mockVisitor.count.mockResolvedValue(0)

    await app.request('/v1/visitors')

    expect(mockVisitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          events: {
            some: {
              apiKey: {
                accountId: 'acc-123',
              },
            },
          },
        }),
      })
    )
  })

  it('filters by date range (from/to)', async () => {
    mockVisitor.findMany.mockResolvedValue([])
    mockVisitor.count.mockResolvedValue(0)

    const from = '2026-01-01T00:00:00Z'
    const to = '2026-01-31T23:59:59Z'

    await app.request(`/v1/visitors?from=${from}&to=${to}`)

    expect(mockVisitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lastSeen: {
            gte: new Date(from),
            lte: new Date(to),
          },
        }),
      })
    )
  })

  it('filters by risk level (high: score >= 70)', async () => {
    mockVisitor.findMany.mockResolvedValue([])
    mockVisitor.count.mockResolvedValue(0)

    await app.request('/v1/visitors?risk=high')

    // High risk: events with riskScore >= 70
    expect(mockVisitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          events: expect.objectContaining({
            some: expect.objectContaining({
              riskScore: { gte: 70 },
            }),
          }),
        }),
      })
    )
  })

  it('filters by risk level (medium: score 30-69)', async () => {
    mockVisitor.findMany.mockResolvedValue([])
    mockVisitor.count.mockResolvedValue(0)

    await app.request('/v1/visitors?risk=medium')

    expect(mockVisitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          events: expect.objectContaining({
            some: expect.objectContaining({
              riskScore: { gte: 30, lt: 70 },
            }),
          }),
        }),
      })
    )
  })

  it('filters by risk level (low: score < 30)', async () => {
    mockVisitor.findMany.mockResolvedValue([])
    mockVisitor.count.mockResolvedValue(0)

    await app.request('/v1/visitors?risk=low')

    expect(mockVisitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          events: expect.objectContaining({
            some: expect.objectContaining({
              riskScore: { lt: 30 },
            }),
          }),
        }),
      })
    )
  })

  it('returns total count for pagination', async () => {
    const visitors = [
      { id: 'v-1', fingerprint: 'fp1', firstSeen: new Date(), lastSeen: new Date(), visitCount: 1 },
    ]

    mockVisitor.findMany.mockResolvedValue(visitors)
    mockVisitor.count.mockResolvedValue(100)

    const res = await app.request('/v1/visitors?limit=1')

    const data = await res.json()
    expect(data.total).toBe(100)
    expect(data.visitors).toHaveLength(1)
  })

  it('caps limit at 100', async () => {
    mockVisitor.findMany.mockResolvedValue([])
    mockVisitor.count.mockResolvedValue(0)

    await app.request('/v1/visitors?limit=500')

    expect(mockVisitor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    )
  })
})
