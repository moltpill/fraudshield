import { describe, it, expect } from 'vitest'
import { Eyes, Sentinel, FraudShield } from '../src/index'

describe('Eyes', () => {
  describe('constructor', () => {
    it('should create instance with apiKey', () => {
      const sdk = new Eyes({ apiKey: 'eye_live_abc123' })
      expect(sdk).toBeInstanceOf(Eyes)
    })

    it('should accept optional endpoint', () => {
      const sdk = new Eyes({
        apiKey: 'eye_live_abc123',
        endpoint: 'https://custom.api.com'
      })
      expect(sdk).toBeInstanceOf(Eyes)
    })

    it('should throw if apiKey is missing', () => {
      expect(() => new Eyes({} as any)).toThrow('apiKey is required')
    })

    it('should throw if apiKey is empty', () => {
      expect(() => new Eyes({ apiKey: '' })).toThrow('apiKey is required')
    })

    it('should use default endpoint if not provided', () => {
      const sdk = new Eyes({ apiKey: 'eye_live_abc123' })
      expect(sdk.endpoint).toBe('https://api.theallseeingeyes.org')
    })

    it('should use custom endpoint when provided', () => {
      const sdk = new Eyes({
        apiKey: 'eye_live_abc123',
        endpoint: 'https://custom.api.com'
      })
      expect(sdk.endpoint).toBe('https://custom.api.com')
    })

    it('should provide masked API key', () => {
      const sdk = new Eyes({ apiKey: 'eye_live_abc123def456ghi789' })
      expect(sdk.apiKeyMasked).toBe('eye_live***i789')
    })
  })

  describe('exports', () => {
    it('should export Eyes class', async () => {
      const module = await import('../src/index')
      expect(module.Eyes).toBeDefined()
      expect(typeof module.Eyes).toBe('function')
    })

    it('should export Sentinel alias for backwards compatibility', async () => {
      const module = await import('../src/index')
      expect(module.Sentinel).toBeDefined()
      expect(module.Sentinel).toBe(module.Eyes)
    })

    it('should export FraudShield alias for backwards compatibility', async () => {
      const module = await import('../src/index')
      expect(module.FraudShield).toBeDefined()
      expect(module.FraudShield).toBe(module.Eyes)
    })
  })

  describe('backwards compatibility', () => {
    it('Sentinel alias should work identically to Eyes', () => {
      const sdk = new Sentinel({ apiKey: 'eye_live_abc123' })
      expect(sdk).toBeInstanceOf(Eyes)
      expect(sdk).toBeInstanceOf(Sentinel)
    })

    it('FraudShield alias should work identically to Eyes', () => {
      const sdk = new FraudShield({ apiKey: 'eye_live_abc123' })
      expect(sdk).toBeInstanceOf(Eyes)
      expect(sdk).toBeInstanceOf(FraudShield)
    })
  })
})
