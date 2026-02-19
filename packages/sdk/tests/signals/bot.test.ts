/**
 * Bot detection signals tests
 * 
 * Tests for getBotSignals() which detects headless browsers and bots
 * by checking for webdriver, phantom, selenium artifacts, chrome.runtime
 * in non-Chrome browsers, and inconsistent permissions API.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getBotSignals } from '../../src/signals/bot'
import type { BotSignals } from '../../src/signals/bot'

describe('getBotSignals', () => {
  let originalNavigator: Navigator
  let originalWindow: Window & typeof globalThis

  beforeEach(() => {
    originalNavigator = globalThis.navigator
    originalWindow = globalThis.window
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    })
  })

  it('should return a detection flags object', () => {
    const result = getBotSignals()

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
    expect(result).toHaveProperty('webdriver')
    expect(result).toHaveProperty('phantom')
    expect(result).toHaveProperty('selenium')
    expect(result).toHaveProperty('chromeRuntime')
    expect(result).toHaveProperty('inconsistentPermissions')
  })

  it('should detect navigator.webdriver = true', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { webdriver: true },
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.webdriver).toBe(true)
  })

  it('should return false when navigator.webdriver is false', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { webdriver: false },
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.webdriver).toBe(false)
  })

  it('should return false when navigator.webdriver is undefined', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.webdriver).toBe(false)
  })

  it('should detect window.phantom', () => {
    const mockWindow = { phantom: {} }
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.phantom).toBe(true)
  })

  it('should return false when window.phantom is undefined', () => {
    const mockWindow = {}
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.phantom).toBe(false)
  })

  it('should detect window.__selenium_unwrapped', () => {
    const mockWindow = { __selenium_unwrapped: {} }
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.selenium).toBe(true)
  })

  it('should detect window.__webdriver_evaluate', () => {
    const mockWindow = { __webdriver_evaluate: () => {} }
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.selenium).toBe(true)
  })

  it('should detect window.__selenium_evaluate', () => {
    const mockWindow = { __selenium_evaluate: () => {} }
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.selenium).toBe(true)
  })

  it('should return false when no selenium artifacts present', () => {
    const mockWindow = {}
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.selenium).toBe(false)
  })

  it('should detect chrome.runtime in non-Chrome browser', () => {
    // Simulate Firefox with chrome.runtime (suspicious)
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0' },
      writable: true,
      configurable: true,
    })
    const mockWindow = { chrome: { runtime: {} } }
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.chromeRuntime).toBe(true)
  })

  it('should not flag chrome.runtime in actual Chrome browser', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      writable: true,
      configurable: true,
    })
    const mockWindow = { chrome: { runtime: {} } }
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.chromeRuntime).toBe(false)
  })

  it('should return false when chrome.runtime not present', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 Firefox/91.0' },
      writable: true,
      configurable: true,
    })
    const mockWindow = {}
    Object.defineProperty(globalThis, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.chromeRuntime).toBe(false)
  })

  it('should detect inconsistent permissions API (synchronous granted result)', () => {
    // Fake permissions API that returns sync object instead of Promise
    // This is suspicious - real browsers return Promises
    const mockPermissions = {
      query: () => ({ state: 'granted' }), // Sync, not async - suspicious!
    }
    Object.defineProperty(globalThis, 'navigator', {
      value: { permissions: mockPermissions },
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.inconsistentPermissions).toBe(true)
  })

  it('should return false for consistent permissions (async Promise)', () => {
    // Real permissions API returns a Promise
    const mockPermissions = {
      query: () => Promise.resolve({ state: 'granted' }),
    }
    Object.defineProperty(globalThis, 'navigator', {
      value: { permissions: mockPermissions },
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.inconsistentPermissions).toBe(false)
  })

  it('should handle missing permissions API gracefully', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.inconsistentPermissions).toBe(false)
  })

  it('should handle undefined navigator gracefully', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.webdriver).toBe(false)
  })

  it('should handle undefined window gracefully', () => {
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const result = getBotSignals()

    expect(result.phantom).toBe(false)
    expect(result.selenium).toBe(false)
  })
})
