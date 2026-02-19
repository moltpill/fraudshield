/**
 * Screen signals collection tests
 * 
 * Tests for getScreenSignals() which collects screen properties
 * for device fingerprinting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getScreenSignals } from '../../src/signals/screen'
import type { ScreenSignals } from '../../src/signals/screen'

describe('getScreenSignals', () => {
  let originalScreen: Screen
  let originalDevicePixelRatio: number

  beforeEach(() => {
    originalScreen = globalThis.screen
    originalDevicePixelRatio = globalThis.devicePixelRatio
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'screen', {
      value: originalScreen,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: originalDevicePixelRatio,
      writable: true,
      configurable: true,
    })
  })

  it('should return screen metrics object', () => {
    const mockScreen = {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      orientation: {
        type: 'landscape-primary',
        angle: 0,
      },
    }

    Object.defineProperty(globalThis, 'screen', {
      value: mockScreen,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: 2,
      writable: true,
      configurable: true,
    })

    const result = getScreenSignals()

    expect(result).toEqual({
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      devicePixelRatio: 2,
      orientation: {
        type: 'landscape-primary',
        angle: 0,
      },
    })
  })

  it('should include window.devicePixelRatio', () => {
    const mockScreen = {
      width: 2560,
      height: 1440,
      availWidth: 2560,
      availHeight: 1400,
      colorDepth: 30,
      pixelDepth: 30,
    }

    Object.defineProperty(globalThis, 'screen', {
      value: mockScreen,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: 1.5,
      writable: true,
      configurable: true,
    })

    const result = getScreenSignals()

    expect(result.devicePixelRatio).toBe(1.5)
  })

  it('should include screen.orientation if available', () => {
    const mockScreen = {
      width: 1080,
      height: 1920,
      availWidth: 1080,
      availHeight: 1800,
      colorDepth: 24,
      pixelDepth: 24,
      orientation: {
        type: 'portrait-primary',
        angle: 0,
      },
    }

    Object.defineProperty(globalThis, 'screen', {
      value: mockScreen,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: 3,
      writable: true,
      configurable: true,
    })

    const result = getScreenSignals()

    expect(result.orientation).toEqual({
      type: 'portrait-primary',
      angle: 0,
    })
  })

  it('should handle missing orientation gracefully', () => {
    const mockScreen = {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      // No orientation property
    }

    Object.defineProperty(globalThis, 'screen', {
      value: mockScreen,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: 1,
      writable: true,
      configurable: true,
    })

    const result = getScreenSignals()

    expect(result.orientation).toBeUndefined()
  })

  it('should handle undefined devicePixelRatio', () => {
    const mockScreen = {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
    }

    Object.defineProperty(globalThis, 'screen', {
      value: mockScreen,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const result = getScreenSignals()

    expect(result.devicePixelRatio).toBeUndefined()
  })

  it('should handle iframe restrictions gracefully (screen unavailable)', () => {
    Object.defineProperty(globalThis, 'screen', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: 2,
      writable: true,
      configurable: true,
    })

    const result = getScreenSignals()

    expect(result.width).toBeUndefined()
    expect(result.height).toBeUndefined()
    expect(result.availWidth).toBeUndefined()
    expect(result.availHeight).toBeUndefined()
    expect(result.colorDepth).toBeUndefined()
    expect(result.pixelDepth).toBeUndefined()
    expect(result.orientation).toBeUndefined()
    expect(result.devicePixelRatio).toBe(2)
  })

  it('should handle iframe with restricted screen access (throws on access)', () => {
    const restrictedScreen = new Proxy({} as Screen, {
      get(_target, prop) {
        if (prop === 'width' || prop === 'height') {
          throw new DOMException('Blocked by iframe sandbox')
        }
        return undefined
      },
    })

    Object.defineProperty(globalThis, 'screen', {
      value: restrictedScreen,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: 1,
      writable: true,
      configurable: true,
    })

    // Should not throw, handle gracefully
    const result = getScreenSignals()

    expect(result).toBeDefined()
    expect(result.width).toBeUndefined()
    expect(result.height).toBeUndefined()
    expect(result.devicePixelRatio).toBe(1)
  })

  it('should handle landscape-secondary orientation', () => {
    const mockScreen = {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
      orientation: {
        type: 'landscape-secondary',
        angle: 180,
      },
    }

    Object.defineProperty(globalThis, 'screen', {
      value: mockScreen,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: 1,
      writable: true,
      configurable: true,
    })

    const result = getScreenSignals()

    expect(result.orientation).toEqual({
      type: 'landscape-secondary',
      angle: 180,
    })
  })
})
