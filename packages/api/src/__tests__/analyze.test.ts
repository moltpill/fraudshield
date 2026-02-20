import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { analyzeRoute } from '../routes/analyze.js'

// Mock Prisma
const mockVisitor = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}))

const mockVisitorEvent = vi.hoisted(() => ({
  create: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    visitor: mockVisitor,
    visitorEvent: mockVisitorEvent,
  },
}))

// Mock geo to return location data (STORY-058)
const mockGetGeolocation = vi.hoisted(() => vi.fn())
vi.mock('../lib/geo.js', () => ({
  getGeolocation: mockGetGeolocation,
  _resetGeoReader: vi.fn(),
}))

describe('POST /v1/analyze', () => {
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

  const testSignals = {
    canvas: 'canvas-hash-123',
    webgl: 'webgl-data',
    navigator: { userAgent: 'Mozilla/5.0', language: 'en-US' },
    screen: { width: 1920, height: 1080 },
    timezone: { offset: -480 },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create fresh app with middleware that sets apiKey and account
    app = new Hono()
    
    // Mock auth middleware - set context variables
    app.use('*', async (c, next) => {
      c.set('apiKey', mockApiKey as any)
      c.set('account', mockAccount as any)
      await next()
    })

    // Mount the analyze route
    app.route('/v1', analyzeRoute)
  })

  it('accepts JSON body with signals and returns visitor data', async () => {
    const now = new Date()
    const mockCreatedVisitor = {
      id: 'visitor-123',
      fingerprint: 'abc123fingerprint',
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    }

    mockVisitor.upsert.mockResolvedValue(mockCreatedVisitor)
    mockVisitorEvent.create.mockResolvedValue({
      id: 'event-123',
      visitorId: 'visitor-123',
      apiKeyId: 'key-123',
      signals: JSON.stringify(testSignals),
      riskScore: 0,
      isBot: false,
      isVpn: false,
      isTor: false,
      isDatacenter: false,
      timestamp: now,
    })

    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: testSignals }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.visitorId).toBe('visitor-123')
    expect(data.confidence).toBeGreaterThanOrEqual(0)
    expect(data.confidence).toBeLessThanOrEqual(1)
    expect(data.firstSeen).toBeDefined()
    expect(data.lastSeen).toBeDefined()
  })

  it('computes fingerprint hash from signals', async () => {
    const now = new Date()
    mockVisitor.upsert.mockResolvedValue({
      id: 'visitor-456',
      fingerprint: 'computed-hash',
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    })
    mockVisitorEvent.create.mockResolvedValue({ id: 'event-456' })

    await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: testSignals }),
    })

    // Verify fingerprint was computed (upsert called with fingerprint)
    expect(mockVisitor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fingerprint: expect.any(String) },
        create: expect.objectContaining({
          fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hex
        }),
      })
    )
  })

  it('creates or updates Visitor record', async () => {
    const now = new Date()
    mockVisitor.upsert.mockResolvedValue({
      id: 'visitor-789',
      fingerprint: 'hash',
      firstSeen: now,
      lastSeen: now,
      visitCount: 2,
    })
    mockVisitorEvent.create.mockResolvedValue({ id: 'event-789' })

    await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: testSignals }),
    })

    // Visitor should be upserted (created or updated)
    expect(mockVisitor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
        create: expect.objectContaining({
          fingerprint: expect.any(String),
          firstSeen: expect.any(Date),
          lastSeen: expect.any(Date),
          visitCount: 1,
        }),
        update: expect.objectContaining({
          lastSeen: expect.any(Date),
          visitCount: { increment: 1 },
        }),
      })
    )
  })

  it('creates VisitorEvent with signals', async () => {
    const now = new Date()
    mockVisitor.upsert.mockResolvedValue({
      id: 'visitor-event-test',
      fingerprint: 'hash',
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    })
    mockVisitorEvent.create.mockResolvedValue({ id: 'event-test' })

    await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: testSignals }),
    })

    expect(mockVisitorEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visitorId: 'visitor-event-test',
          apiKeyId: 'key-123',
          signals: expect.any(String),
          riskScore: expect.any(Number),
          isBot: expect.any(Boolean),
          isVpn: expect.any(Boolean),
          isTor: expect.any(Boolean),
          isDatacenter: expect.any(Boolean),
        }),
      })
    )
  })

  it('returns 400 for missing signals', async () => {
    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(data.code).toBe('INVALID_SIGNALS')
  })

  it('returns 400 for invalid signals type', async () => {
    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: 'not-an-object' }),
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.code).toBe('INVALID_SIGNALS')
  })

  it('returns correct confidence for new visitor (first visit)', async () => {
    const now = new Date()
    mockVisitor.upsert.mockResolvedValue({
      id: 'new-visitor',
      fingerprint: 'hash',
      firstSeen: now,
      lastSeen: now,
      visitCount: 1, // First visit
    })
    mockVisitorEvent.create.mockResolvedValue({ id: 'event' })

    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: testSignals }),
    })

    const data = await res.json()
    // First visit should have lower confidence
    expect(data.confidence).toBeLessThan(1)
  })

  it('returns higher confidence for returning visitor', async () => {
    const firstSeen = new Date(Date.now() - 86400000) // 1 day ago
    const now = new Date()
    mockVisitor.upsert.mockResolvedValue({
      id: 'returning-visitor',
      fingerprint: 'hash',
      firstSeen: firstSeen,
      lastSeen: now,
      visitCount: 10, // Many visits
    })
    mockVisitorEvent.create.mockResolvedValue({ id: 'event' })

    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: testSignals }),
    })

    const data = await res.json()
    // Returning visitor should have higher confidence
    expect(data.confidence).toBeGreaterThan(0.5)
  })

  it('stores signals as JSON string', async () => {
    const now = new Date()
    mockVisitor.upsert.mockResolvedValue({
      id: 'visitor-json',
      fingerprint: 'hash',
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    })
    mockVisitorEvent.create.mockResolvedValue({ id: 'event' })

    await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: testSignals }),
    })

    const createCall = mockVisitorEvent.create.mock.calls[0][0]
    const storedSignals = JSON.parse(createCall.data.signals)
    expect(storedSignals).toEqual(testSignals)
  })
})

describe('STORY-058: Detection results in API response', () => {
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
    tier: 'FREE',
    status: 'active',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGeolocation.mockResolvedValue(null)

    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('apiKey', mockApiKey as any)
      c.set('account', mockAccount as any)
      await next()
    })
    app.route('/v1', analyzeRoute)

    const now = new Date()
    mockVisitor.upsert.mockResolvedValue({
      id: 'visitor-123',
      fingerprint: 'hash',
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    })
    mockVisitorEvent.create.mockResolvedValue({ id: 'event-123' })
  })

  it('includes risk object with score and level', async () => {
    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: { canvas: 'hash' } }),
    })
    const data = await res.json() as Record<string, unknown>
    expect(data.risk).toBeDefined()
    expect(typeof (data.risk as Record<string, unknown>).score).toBe('number')
    expect(['low', 'medium', 'high', 'critical']).toContain((data.risk as Record<string, unknown>).level)
  })

  it('includes signals object with detection flags', async () => {
    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: { canvas: 'hash' } }),
    })
    const data = await res.json() as Record<string, unknown>
    const signals = data.signals as Record<string, unknown>
    expect(signals).toBeDefined()
    expect(typeof signals.vpn).toBe('boolean')
    expect(typeof signals.tor).toBe('boolean')
    expect(typeof signals.datacenter).toBe('boolean')
    expect(typeof signals.bot).toBe('boolean')
    expect(typeof signals.botScore).toBe('number')
    expect(typeof signals.timezoneMismatch).toBe('boolean')
  })

  it('includes location null when geo unavailable', async () => {
    mockGetGeolocation.mockResolvedValue(null)
    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: {} }),
    })
    const data = await res.json() as Record<string, unknown>
    expect(data.location).toBeNull()
  })

  it('includes location data when geo available', async () => {
    mockGetGeolocation.mockResolvedValue({
      country: 'South Africa',
      countryCode: 'ZA',
      city: 'Cape Town',
      timezone: 'Africa/Johannesburg',
      region: null,
      lat: -33.9,
      lng: 18.4,
      isp: null,
      asn: null,
    })
    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '1.2.3.4', // Provide IP so geolocation is called
      },
      body: JSON.stringify({ signals: {} }),
    })
    const data = await res.json() as Record<string, unknown>
    expect(data.location).toBeDefined()
    const location = data.location as Record<string, unknown>
    expect(location.country).toBe('South Africa')
    expect(location.countryCode).toBe('ZA')
    expect(location.city).toBe('Cape Town')
    expect(location.timezone).toBe('Africa/Johannesburg')
  })

  it('sets isBot=true in visitorEvent when botScore >= 0.5', async () => {
    const res = await app.request('/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signals: {
          bot: { webdriver: true, phantom: true, selenium: true },
          navigator: { plugins: [], userAgent: 'HeadlessChrome' },
        },
      }),
    })
    expect(res.status).toBe(200)
    const createCall = mockVisitorEvent.create.mock.calls[0][0]
    expect(createCall.data.isBot).toBe(true)
    expect(createCall.data.riskScore).toBeGreaterThan(0)
  })
})
