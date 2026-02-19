import { describe, it, expect } from 'vitest'
import { generateApiKey, validateApiKey } from './api-key'

describe('generateApiKey', () => {
  it('generates a live key with fs_live_ prefix', () => {
    const key = generateApiKey('live')
    expect(key).toMatch(/^fs_live_[a-f0-9]{32}$/)
  })

  it('generates a test key with fs_test_ prefix', () => {
    const key = generateApiKey('test')
    expect(key).toMatch(/^fs_test_[a-f0-9]{32}$/)
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
    
    const liveHex = liveKey.replace('fs_live_', '')
    const testHex = testKey.replace('fs_test_', '')
    
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
    expect(validateApiKey('fs_invalid_abc123')).toBe(false)
    expect(validateApiKey('sk_live_abc123')).toBe(false)
  })

  it('returns false for wrong hex length', () => {
    expect(validateApiKey('fs_live_abc123')).toBe(false) // too short
    expect(validateApiKey('fs_test_' + 'a'.repeat(33))).toBe(false) // too long
  })

  it('returns false for non-hex characters', () => {
    expect(validateApiKey('fs_live_' + 'g'.repeat(32))).toBe(false)
    expect(validateApiKey('fs_test_' + 'Z'.repeat(32))).toBe(false)
  })

  it('returns false for empty or invalid input', () => {
    expect(validateApiKey('')).toBe(false)
    expect(validateApiKey('fs_live_')).toBe(false)
    expect(validateApiKey('random_string')).toBe(false)
  })
})
