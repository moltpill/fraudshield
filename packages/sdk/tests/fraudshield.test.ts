import { describe, it, expect } from 'vitest'
import { Sentinel, FraudShield } from '../src/index'

describe('Sentinel', () => {
  describe('constructor', () => {
    it('should create instance with apiKey', () => {
      const sdk = new Sentinel({ apiKey: 'stl_live_abc123' })
      expect(sdk).toBeInstanceOf(Sentinel)
    })

    it('should accept optional endpoint', () => {
      const sdk = new Sentinel({
        apiKey: 'stl_live_abc123',
        endpoint: 'https://custom.api.com'
      })
      expect(sdk).toBeInstanceOf(Sentinel)
    })

    it('should throw if apiKey is missing', () => {
      expect(() => new Sentinel({} as any)).toThrow('apiKey is required')
    })

    it('should throw if apiKey is empty', () => {
      expect(() => new Sentinel({ apiKey: '' })).toThrow('apiKey is required')
    })

    it('should use default endpoint if not provided', () => {
      const sdk = new Sentinel({ apiKey: 'stl_live_abc123' })
      expect(sdk.endpoint).toBe('https://api.usesentinel.dev')
    })

    it('should use custom endpoint when provided', () => {
      const sdk = new Sentinel({
        apiKey: 'stl_live_abc123',
        endpoint: 'https://custom.api.com'
      })
      expect(sdk.endpoint).toBe('https://custom.api.com')
    })

    it('should provide masked API key', () => {
      const sdk = new Sentinel({ apiKey: 'stl_live_abc123def456ghi789' })
      expect(sdk.apiKeyMasked).toBe('stl_live***i789')
    })
  })

  describe('exports', () => {
    it('should export Sentinel class', async () => {
      const module = await import('../src/index')
      expect(module.Sentinel).toBeDefined()
      expect(typeof module.Sentinel).toBe('function')
    })

    it('should export FraudShield alias for backwards compatibility', async () => {
      const module = await import('../src/index')
      expect(module.FraudShield).toBeDefined()
      expect(module.FraudShield).toBe(module.Sentinel)
    })
  })

  describe('backwards compatibility', () => {
    it('FraudShield alias should work identically to Sentinel', () => {
      const sdk = new FraudShield({ apiKey: 'stl_live_abc123' })
      expect(sdk).toBeInstanceOf(Sentinel)
      expect(sdk).toBeInstanceOf(FraudShield)
    })
  })
})
