import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getWebGLFingerprint } from '../src/signals/webgl'

describe('getWebGLFingerprint', () => {
  let mockCanvas: any
  let mockGLContext: any
  let mockDebugInfo: any

  beforeEach(() => {
    mockDebugInfo = {
      UNMASKED_VENDOR_WEBGL: 0x9245,
      UNMASKED_RENDERER_WEBGL: 0x9246,
    }

    mockGLContext = {
      getExtension: vi.fn((name: string) => {
        if (name === 'WEBGL_debug_renderer_info') return mockDebugInfo
        return null
      }),
      getParameter: vi.fn((param: number) => {
        if (param === 0x9245) return 'Google Inc. (NVIDIA)'
        if (param === 0x9246) return 'ANGLE (NVIDIA GeForce GTX 1080)'
        return null
      }),
      getShaderPrecisionFormat: vi.fn(() => ({
        rangeMin: 127,
        rangeMax: 127,
        precision: 23,
      })),
      VERTEX_SHADER: 0x8b31,
      FRAGMENT_SHADER: 0x8b30,
      HIGH_FLOAT: 0x8df2,
    }

    mockCanvas = {
      getContext: vi.fn((type: string) => {
        if (type === 'webgl' || type === 'experimental-webgl') return mockGLContext
        return null
      }),
    }

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return mockCanvas
        return {}
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns object with renderer, vendor, and hash', async () => {
    const result = await getWebGLFingerprint()
    expect(result).toHaveProperty('renderer')
    expect(result).toHaveProperty('vendor')
    expect(result).toHaveProperty('hash')
  })

  it('extracts renderer using WEBGL_debug_renderer_info extension', async () => {
    const result = await getWebGLFingerprint()
    expect(mockGLContext.getExtension).toHaveBeenCalledWith('WEBGL_debug_renderer_info')
    expect(result.renderer).toBe('ANGLE (NVIDIA GeForce GTX 1080)')
  })

  it('extracts vendor using WEBGL_debug_renderer_info extension', async () => {
    const result = await getWebGLFingerprint()
    expect(result.vendor).toBe('Google Inc. (NVIDIA)')
  })

  it('returns consistent hash for same input', async () => {
    const result1 = await getWebGLFingerprint()
    const result2 = await getWebGLFingerprint()
    expect(result1.hash).toBe(result2.hash)
    expect(result1.hash.length).toBeGreaterThan(0)
  })

  it('includes shader precision info in hash computation', async () => {
    const result1 = await getWebGLFingerprint()
    
    // Change shader precision
    mockGLContext.getShaderPrecisionFormat = vi.fn(() => ({
      rangeMin: 15,
      rangeMax: 15,
      precision: 10,
    }))
    
    const result2 = await getWebGLFingerprint()
    expect(result1.hash).not.toBe(result2.hash)
  })

  it('falls back gracefully if WebGL unavailable', async () => {
    mockCanvas.getContext = vi.fn(() => null)
    const result = await getWebGLFingerprint()
    expect(result.renderer).toBe('webgl-not-supported')
    expect(result.vendor).toBe('webgl-not-supported')
    expect(result.hash).toBe('webgl-not-supported')
  })

  it('falls back gracefully if debug extension unavailable', async () => {
    mockGLContext.getExtension = vi.fn(() => null)
    const result = await getWebGLFingerprint()
    // Should still return a hash from shader precision, but unknown vendor/renderer
    expect(result.renderer).toBe('unknown')
    expect(result.vendor).toBe('unknown')
    expect(result.hash).toBeTruthy()
    expect(result.hash).not.toBe('webgl-not-supported')
  })

  it('handles document.createElement not available', async () => {
    vi.stubGlobal('document', undefined)
    const result = await getWebGLFingerprint()
    expect(result.renderer).toBe('webgl-not-supported')
    expect(result.vendor).toBe('webgl-not-supported')
    expect(result.hash).toBe('webgl-not-supported')
  })
})
