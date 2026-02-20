/**
 * STORY-063: Health check and monitoring endpoints
 *
 * Tests for /health/db, /health/ready, and IP list freshness in health response.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock prisma
const mockPrismaQueryRaw = vi.hoisted(() => vi.fn())
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: mockPrismaQueryRaw,
  },
}))

// Mock fs to control file existence checks
const mockExistsSync = vi.hoisted(() => vi.fn())
vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  default: { existsSync: mockExistsSync },
}))

describe('STORY-063: Health check endpoints', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()
    // Re-import to get fresh app with mocks applied
    vi.resetModules()
    const { app: importedApp } = await import('../app.js')
    app = importedApp
  })

  describe('GET /health/db', () => {
    it('returns 200 with db=connected when database is healthy', async () => {
      mockPrismaQueryRaw.mockResolvedValue([{ result: 1 }])
      mockExistsSync.mockReturnValue(false)

      const res = await app.request('/health/db')
      expect(res.status).toBe(200)
      const data = await res.json() as Record<string, unknown>
      expect(data.status).toBe('ok')
      expect(data.db).toBe('connected')
      expect(data.timestamp).toBeDefined()
    })

    it('returns 503 with db=disconnected when database is unhealthy', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('Connection refused'))
      mockExistsSync.mockReturnValue(false)

      const res = await app.request('/health/db')
      expect(res.status).toBe(503)
      const data = await res.json() as Record<string, unknown>
      expect(data.status).toBe('error')
      expect(data.db).toBe('disconnected')
      expect(data.error).toBeDefined()
    })
  })

  describe('GET /health/ready', () => {
    it('returns 200 when db connected and ip lists present', async () => {
      mockPrismaQueryRaw.mockResolvedValue([{ result: 1 }])
      mockExistsSync.mockReturnValue(true) // all files exist

      const res = await app.request('/health/ready')
      expect(res.status).toBe(200)
      const data = await res.json() as Record<string, unknown>
      expect(data.status).toBe('ready')
      const checks = data.checks as Record<string, unknown>
      expect(checks.database).toBe('ok')
    })

    it('returns 503 when database is down', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('down'))
      mockExistsSync.mockReturnValue(true)

      const res = await app.request('/health/ready')
      expect(res.status).toBe(503)
      const data = await res.json() as Record<string, unknown>
      expect(data.status).toBe('not_ready')
    })

    it('includes ip list status in checks', async () => {
      mockPrismaQueryRaw.mockResolvedValue([{ result: 1 }])
      // VPN missing, others present
      mockExistsSync.mockImplementation((path: string) => {
        if (typeof path === 'string' && path.includes('vpn')) return false
        return true
      })

      const res = await app.request('/health/ready')
      const data = await res.json() as Record<string, unknown>
      const checks = data.checks as Record<string, unknown>
      const ipLists = checks.ipLists as Record<string, unknown>
      expect(ipLists.vpn).toBe('missing')
      expect(ipLists.tor).toBe('ok')
      expect(ipLists.datacenter).toBe('ok')
      expect(ipLists.geo).toBe('ok')
    })

    it('is still ready when ip lists are missing (non-critical)', async () => {
      // IP lists missing doesn't make the API "not ready" — just degraded
      mockPrismaQueryRaw.mockResolvedValue([{ result: 1 }])
      mockExistsSync.mockReturnValue(false) // all missing

      const res = await app.request('/health/ready')
      expect(res.status).toBe(200)
      const data = await res.json() as Record<string, unknown>
      // Still ready — degraded but functional
      expect(data.status).toBe('ready')
    })
  })
})
