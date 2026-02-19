/**
 * Timezone and locale signals collection tests
 * 
 * Tests for getTimezoneSignals() which collects timezone and locale
 * information for device fingerprinting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTimezoneSignals } from '../../src/signals/timezone'
import type { TimezoneSignals } from '../../src/signals/timezone'

describe('getTimezoneSignals', () => {
  let originalIntl: typeof Intl
  let originalDate: typeof Date
  let originalNavigator: Navigator

  beforeEach(() => {
    originalIntl = globalThis.Intl
    originalDate = globalThis.Date
    originalNavigator = globalThis.navigator
  })

  afterEach(() => {
    globalThis.Intl = originalIntl
    globalThis.Date = originalDate
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('should return timezone name from Intl.DateTimeFormat', () => {
    const mockIntl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({
          timeZone: 'America/New_York',
        }),
      })),
    }
    globalThis.Intl = mockIntl as typeof Intl

    const result = getTimezoneSignals()

    expect(result.timezone).toBe('America/New_York')
  })

  it('should return timezone offset from Date.getTimezoneOffset()', () => {
    const MockDate = class extends Date {
      getTimezoneOffset(): number {
        return 300 // UTC-5 (EST)
      }
    }
    globalThis.Date = MockDate as unknown as typeof Date

    const result = getTimezoneSignals()

    expect(result.timezoneOffset).toBe(300)
  })

  it('should return locale from navigator.language', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
      configurable: true,
    })

    const result = getTimezoneSignals()

    expect(result.locale).toBe('en-US')
  })

  it('should return complete TimezoneSignals object', () => {
    const mockIntl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({
          timeZone: 'Europe/London',
        }),
      })),
    }
    globalThis.Intl = mockIntl as typeof Intl

    const MockDate = class extends Date {
      getTimezoneOffset(): number {
        return 0 // UTC
      }
    }
    globalThis.Date = MockDate as unknown as typeof Date

    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'en-GB' },
      writable: true,
      configurable: true,
    })

    const result = getTimezoneSignals()

    expect(result).toEqual({
      timezone: 'Europe/London',
      timezoneOffset: 0,
      locale: 'en-GB',
    })
  })

  it('should handle missing Intl.DateTimeFormat gracefully', () => {
    globalThis.Intl = undefined as unknown as typeof Intl

    const result = getTimezoneSignals()

    expect(result.timezone).toBeUndefined()
  })

  it('should handle missing navigator.language gracefully', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })

    const result = getTimezoneSignals()

    expect(result.locale).toBeUndefined()
  })

  it('should handle undefined navigator gracefully', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const result = getTimezoneSignals()

    expect(result.locale).toBeUndefined()
  })

  it('should handle different timezone formats', () => {
    const mockIntl = {
      ...originalIntl,
      DateTimeFormat: vi.fn(() => ({
        resolvedOptions: () => ({
          timeZone: 'Asia/Tokyo',
        }),
      })),
    }
    globalThis.Intl = mockIntl as typeof Intl

    const MockDate = class extends Date {
      getTimezoneOffset(): number {
        return -540 // UTC+9 (JST)
      }
    }
    globalThis.Date = MockDate as unknown as typeof Date

    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'ja-JP' },
      writable: true,
      configurable: true,
    })

    const result = getTimezoneSignals()

    expect(result).toEqual({
      timezone: 'Asia/Tokyo',
      timezoneOffset: -540,
      locale: 'ja-JP',
    })
  })
})
