import { describe, it, expect } from 'vitest'
import { Tier } from './types/index'

describe('@sentinel/shared types', () => {
  describe('Tier enum', () => {
    it('has all expected values', () => {
      expect(Tier.FREE).toBe('FREE')
      expect(Tier.STARTER).toBe('STARTER')
      expect(Tier.GROWTH).toBe('GROWTH')
      expect(Tier.SCALE).toBe('SCALE')
      expect(Tier.ENTERPRISE).toBe('ENTERPRISE')
    })
  })
})
