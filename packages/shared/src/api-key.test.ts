import { describe, it, expect } from 'vitest'
import { generateApiKey, validateApiKey } from './api-key'

describe('generateApiKey', () => {
  it('generates a live key with eye_live_ prefix', () => {
    const key = generateApiKey('live')
    expect(key).toMatch(/^eye_live_[a-f0-9]{32}$/)
  })

  it('generates a test key with eye_test_ prefix', () => {
    const key = generateApiKey('test')
    expect(key).toMatch(/^eye_test_[a-f0-9]{32}$/)
  })

  it('generates unique keys each time', () => {
    const keys = new Set<string>()
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey('live'))
    }
    expect(keys.size).toBe(100)
  })

  it('generates keys with exactly 32 hex characters after prefix', () => {
    const liveKey = generateApiKey('live')
    const testKey = generateApiKey('test')
    
    const liveHex = liveKey.replace('eye_live_', '')
    const testHex = testKey.replace('eye_test_', '')
    
    expect(liveHex).toHaveLength(32)
    expect(testHex).toHaveLength(32)
    expect(liveHex).toMatch(/^[a-f0-9]+$/)
    expect(testHex).toMatch(/^[a-f0-9]+$/)
  })
})

describe('validateApiKey', () => {
  it('returns true for valid live key', () => {
    const key = generateApiKey('live')
    expect(validateApiKey(key)).toBe(true)
  })

  it('returns true for valid test key', () => {
    const key = generateApiKey('test')
    expect(validateApiKey(key)).toBe(true)
  })

  it('returns false for invalid prefix', () => {
    expect(validateApiKey('eye_invalid_abc123')).toBe(false)
    expect(validateApiKey('sk_live_abc123')).toBe(false)
  })

  it('returns false for wrong hex length', () => {
    expect(validateApiKey('eye_live_abc123')).toBe(false) // too short
    expect(validateApiKey('eye_test_' + 'a'.repeat(33))).toBe(false) // too long
  })

  it('returns false for non-hex characters', () => {
    expect(validateApiKey('eye_live_' + 'g'.repeat(32))).toBe(false)
    expect(validateApiKey('eye_test_' + 'Z'.repeat(32))).toBe(false)
  })

  it('returns false for empty or invalid input', () => {
    expect(validateApiKey('')).toBe(false)
    expect(validateApiKey('eye_live_')).toBe(false)
    expect(validateApiKey('random_string')).toBe(false)
  })
})
