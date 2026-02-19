import { describe, it, expect } from 'vitest'
import { computeFingerprint, type BrowserSignals } from '../lib/fingerprint'

describe('Fingerprint Hashing Service', () => {
  // Sample signals for testing
  const sampleSignals: BrowserSignals = {
    canvas: 'abc123def456',
    webgl: 'webgl-hash-789',
    audio: 'audio-fp-xyz',
    navigator: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      language: 'en-US',
      platform: 'MacIntel',
      hardwareConcurrency: 8,
      deviceMemory: 16,
    },
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelRatio: 2,
    },
    timezone: {
      offset: -480,
      name: 'America/Los_Angeles',
    },
    webrtcIPs: ['192.168.1.1', '10.0.0.1'],
    bot: {
      webdriver: false,
      phantom: false,
      selenium: false,
    },
  }

  describe('computeFingerprint', () => {
    it('returns a SHA-256 hash string', () => {
      const fingerprint = computeFingerprint(sampleSignals)
      
      // SHA-256 produces 64-character hex string
      expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
    })

    it('returns the same hash for identical signals', () => {
      const fingerprint1 = computeFingerprint(sampleSignals)
      const fingerprint2 = computeFingerprint(sampleSignals)
      
      expect(fingerprint1).toBe(fingerprint2)
    })

    it('returns the same hash regardless of property order', () => {
      const signalsA: BrowserSignals = {
        canvas: 'hash1',
        webgl: 'hash2',
        audio: 'hash3',
      }
      
      const signalsB: BrowserSignals = {
        audio: 'hash3',
        canvas: 'hash1',
        webgl: 'hash2',
      }
      
      const fingerprintA = computeFingerprint(signalsA)
      const fingerprintB = computeFingerprint(signalsB)
      
      expect(fingerprintA).toBe(fingerprintB)
    })

    it('normalizes nested object key order', () => {
      const signalsA: BrowserSignals = {
        navigator: {
          userAgent: 'Mozilla/5.0',
          language: 'en-US',
          platform: 'MacIntel',
        },
      }
      
      const signalsB: BrowserSignals = {
        navigator: {
          platform: 'MacIntel',
          language: 'en-US',
          userAgent: 'Mozilla/5.0',
        },
      }
      
      expect(computeFingerprint(signalsA)).toBe(computeFingerprint(signalsB))
    })

    it('excludes timestamp from hash calculation', () => {
      const signalsWithTimestamp: BrowserSignals = {
        ...sampleSignals,
        timestamp: Date.now(),
      }
      
      const signalsWithDifferentTimestamp: BrowserSignals = {
        ...sampleSignals,
        timestamp: Date.now() + 10000,
      }
      
      const fingerprint1 = computeFingerprint(signalsWithTimestamp)
      const fingerprint2 = computeFingerprint(signalsWithDifferentTimestamp)
      
      expect(fingerprint1).toBe(fingerprint2)
    })

    it('excludes requestTime from hash calculation', () => {
      const signalsA: BrowserSignals = {
        canvas: 'test-hash',
        requestTime: 1234567890,
      }
      
      const signalsB: BrowserSignals = {
        canvas: 'test-hash',
        requestTime: 9876543210,
      }
      
      expect(computeFingerprint(signalsA)).toBe(computeFingerprint(signalsB))
    })

    it('excludes requestId from hash calculation', () => {
      const signalsA: BrowserSignals = {
        canvas: 'test-hash',
        requestId: 'req-123',
      }
      
      const signalsB: BrowserSignals = {
        canvas: 'test-hash',
        requestId: 'req-456',
      }
      
      expect(computeFingerprint(signalsA)).toBe(computeFingerprint(signalsB))
    })

    it('excludes sessionId from hash calculation', () => {
      const signalsA: BrowserSignals = {
        canvas: 'test-hash',
        sessionId: 'session-abc',
      }
      
      const signalsB: BrowserSignals = {
        canvas: 'test-hash',
        sessionId: 'session-xyz',
      }
      
      expect(computeFingerprint(signalsA)).toBe(computeFingerprint(signalsB))
    })

    it('produces different hashes for different signals', () => {
      const signalsA: BrowserSignals = { canvas: 'hash-a' }
      const signalsB: BrowserSignals = { canvas: 'hash-b' }
      
      const fingerprintA = computeFingerprint(signalsA)
      const fingerprintB = computeFingerprint(signalsB)
      
      expect(fingerprintA).not.toBe(fingerprintB)
    })

    it('handles empty signals object', () => {
      const fingerprint = computeFingerprint({})
      
      expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles arrays consistently', () => {
      const signalsA: BrowserSignals = {
        webrtcIPs: ['192.168.1.1', '10.0.0.1'],
      }
      
      const signalsB: BrowserSignals = {
        webrtcIPs: ['192.168.1.1', '10.0.0.1'],
      }
      
      expect(computeFingerprint(signalsA)).toBe(computeFingerprint(signalsB))
    })

    it('produces different hash when array order differs', () => {
      // Arrays are NOT sorted - order matters for IP lists etc.
      const signalsA: BrowserSignals = {
        webrtcIPs: ['192.168.1.1', '10.0.0.1'],
      }
      
      const signalsB: BrowserSignals = {
        webrtcIPs: ['10.0.0.1', '192.168.1.1'],
      }
      
      expect(computeFingerprint(signalsA)).not.toBe(computeFingerprint(signalsB))
    })

    it('handles deeply nested objects', () => {
      const signalsA: BrowserSignals = {
        navigator: {
          plugins: {
            pdf: { name: 'PDF Viewer', enabled: true },
            flash: { name: 'Flash', enabled: false },
          },
        },
      }
      
      const signalsB: BrowserSignals = {
        navigator: {
          plugins: {
            flash: { name: 'Flash', enabled: false },
            pdf: { name: 'PDF Viewer', enabled: true },
          },
        },
      }
      
      expect(computeFingerprint(signalsA)).toBe(computeFingerprint(signalsB))
    })

    it('handles null values', () => {
      const signals: BrowserSignals = {
        canvas: 'test',
        webgl: null as unknown as string,
      }
      
      const fingerprint = computeFingerprint(signals)
      expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
