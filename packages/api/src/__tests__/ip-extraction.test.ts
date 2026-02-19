/**
 * Tests for IP extraction and geolocation stub
 * STORY-028: Add IP extraction and geolocation stub
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { extractClientIp, getGeolocation, type GeoLocation } from '../lib/ip.js'
import { analyzeRoute } from '../routes/analyze.js'

// Mock Prisma for integration tests
const mockVisitor = vi.hoisted(() => ({
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

describe('IP Extraction', () => {
  describe('extractClientIp', () => {
    it('extracts IP from X-Forwarded-For header (single IP)', () => {
      const headers = new Headers({ 'X-Forwarded-For': '203.0.113.50' })
      expect(extractClientIp(headers)).toBe('203.0.113.50')
    })

    it('extracts first IP from X-Forwarded-For header (multiple IPs)', () => {
      const headers = new Headers({ 'X-Forwarded-For': '203.0.113.50, 70.41.3.18, 150.172.238.178' })
      expect(extractClientIp(headers)).toBe('203.0.113.50')
    })

    it('extracts IP from X-Real-IP header when X-Forwarded-For missing', () => {
      const headers = new Headers({ 'X-Real-IP': '198.51.100.178' })
      expect(extractClientIp(headers)).toBe('198.51.100.178')
    })

    it('prefers X-Forwarded-For over X-Real-IP', () => {
      const headers = new Headers({
        'X-Forwarded-For': '203.0.113.50',
        'X-Real-IP': '198.51.100.178'
      })
      expect(extractClientIp(headers)).toBe('203.0.113.50')
    })

    it('handles IPv6 addresses', () => {
      const headers = new Headers({ 'X-Forwarded-For': '2001:db8:85a3::8a2e:370:7334' })
      expect(extractClientIp(headers)).toBe('2001:db8:85a3::8a2e:370:7334')
    })

    it('handles IPv4-mapped IPv6 addresses', () => {
      const headers = new Headers({ 'X-Forwarded-For': '::ffff:192.0.2.1' })
      expect(extractClientIp(headers)).toBe('::ffff:192.0.2.1')
    })

    it('trims whitespace from IP addresses', () => {
      const headers = new Headers({ 'X-Forwarded-For': '  203.0.113.50  ' })
      expect(extractClientIp(headers)).toBe('203.0.113.50')
    })

    it('returns null when no IP headers present', () => {
      const headers = new Headers({})
      expect(extractClientIp(headers)).toBeNull()
    })

    it('returns null for empty X-Forwarded-For', () => {
      const headers = new Headers({ 'X-Forwarded-For': '' })
      expect(extractClientIp(headers)).toBeNull()
    })

    it('handles socket IP fallback', () => {
      const headers = new Headers({})
      expect(extractClientIp(headers, '127.0.0.1')).toBe('127.0.0.1')
    })

    it('prefers header over socket IP', () => {
      const headers = new Headers({ 'X-Forwarded-For': '203.0.113.50' })
      expect(extractClientIp(headers, '127.0.0.1')).toBe('203.0.113.50')
    })
  })
})

describe('GeoLocation', () => {
  describe('getGeolocation', () => {
    it('returns null for any IP (stub implementation)', async () => {
      const result = await getGeolocation('203.0.113.50')
      expect(result).toBeNull()
    })

    it('returns null for IPv6', async () => {
      const result = await getGeolocation('2001:db8:85a3::8a2e:370:7334')
      expect(result).toBeNull()
    })

    it('returns null for null IP', async () => {
      const result = await getGeolocation(null)
      expect(result).toBeNull()
    })
  })

  describe('GeoLocation interface', () => {
    it('defines the expected shape', () => {
      // Type-level test: this will fail to compile if interface is wrong
      const geo: GeoLocation = {
        country: 'US',
        countryCode: 'US',
        region: 'California',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
        isp: 'Comcast',
        asn: 'AS7922'
      }
      expect(geo.country).toBe('US')
      expect(geo.countryCode).toBe('US')
      expect(geo.region).toBe('California')
      expect(geo.city).toBe('San Francisco')
      expect(geo.latitude).toBe(37.7749)
      expect(geo.longitude).toBe(-122.4194)
      expect(geo.timezone).toBe('America/Los_Angeles')
      expect(geo.isp).toBe('Comcast')
      expect(geo.asn).toBe('AS7922')
    })
  })
})

describe('IP stored in VisitorEvent', () => {
  let app: Hono

  const mockApiKey = {
    id: 'key-123',
    accountId: 'acc-123',
    key: 'fs_live_abcd1234567890abcd1234567890ab',
    name: 'Test Key',
    status: 'active',
  }

  const testSignals = {
    canvas: 'canvas-hash-123',
    webgl: 'webgl-data',
    navigator: { userAgent: 'Mozilla/5.0', language: 'en-US' },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    app = new Hono()
    app.use('*', async (c, next) => {
      c.set('apiKey', mockApiKey as any)
      await next()
    })
    app.route('/v1', analyzeRoute)

    const now = new Date()
    mockVisitor.upsert.mockResolvedValue({
      id: 'visitor-123',
      fingerprint: 'abc123',
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    })
    mockVisitorEvent.create.mockResolvedValue({ id: 'event-123' })
  })

  it('stores IPv4 from X-Forwarded-For in VisitorEvent', async () => {
    await app.request('/v1/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.50',
      },
      body: JSON.stringify({ signals: testSignals }),
    })

    expect(mockVisitorEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ip: '203.0.113.50',
      }),
    })
  })

  it('stores IPv6 from X-Forwarded-For in VisitorEvent', async () => {
    await app.request('/v1/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '2001:db8:85a3::8a2e:370:7334',
      },
      body: JSON.stringify({ signals: testSignals }),
    })

    expect(mockVisitorEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ip: '2001:db8:85a3::8a2e:370:7334',
      }),
    })
  })

  it('stores first IP when multiple in X-Forwarded-For', async () => {
    await app.request('/v1/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.50, 70.41.3.18, 150.172.238.178',
      },
      body: JSON.stringify({ signals: testSignals }),
    })

    expect(mockVisitorEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ip: '203.0.113.50',
      }),
    })
  })

  it('stores null when no IP headers present', async () => {
    await app.request('/v1/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signals: testSignals }),
    })

    expect(mockVisitorEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ip: null,
      }),
    })
  })
})
