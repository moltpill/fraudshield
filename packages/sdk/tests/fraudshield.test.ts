import { describe, it, expect } from 'vitest'
import { FraudShield } from '../src/index'

describe('FraudShield', () => {
  describe('constructor', () => {
    it('should create instance with apiKey', () => {
      const sdk = new FraudShield({ apiKey: 'fs_live_abc123' })
      expect(sdk).toBeInstanceOf(FraudShield)
    })

    it('should accept optional endpoint', () => {
      const sdk = new FraudShield({
        apiKey: 'fs_live_abc123',
        endpoint: 'https://custom.api.com'
      })
      expect(sdk).toBeInstanceOf(FraudShield)
    })

    it('should throw if apiKey is missing', () => {
      expect(() => new FraudShield({} as any)).toThrow('apiKey is required')
    })

    it('should throw if apiKey is empty', () => {
      expect(() => new FraudShield({ apiKey: '' })).toThrow('apiKey is required')
    })

    it('should use default endpoint if not provided', () => {
      const sdk = new FraudShield({ apiKey: 'fs_live_abc123' })
      expect(sdk.endpoint).toBe('https://api.fraudshield.io')
    })

    it('should use custom endpoint when provided', () => {
      const sdk = new FraudShield({
        apiKey: 'fs_live_abc123',
        endpoint: 'https://custom.api.com'
      })
      expect(sdk.endpoint).toBe('https://custom.api.com')
    })

    it('should provide masked API key', () => {
      const sdk = new FraudShield({ apiKey: 'fs_live_abc123def456ghi789' })
      expect(sdk.apiKeyMasked).toBe('fs_live_***i789')
    })
  })

  describe('exports', () => {
    it('should export FraudShield class', async () => {
      const module = await import('../src/index')
      expect(module.FraudShield).toBeDefined()
      expect(typeof module.FraudShield).toBe('function')
    })
  })
})
