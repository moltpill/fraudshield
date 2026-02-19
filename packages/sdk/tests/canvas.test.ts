import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCanvasFingerprint } from '../src/signals/canvas'

describe('getCanvasFingerprint', () => {
  let mockCanvas: any
  let mockContext: any

  beforeEach(() => {
    mockContext = {
      fillStyle: '',
      font: '',
      textBaseline: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
    }

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => 'data:image/png;base64,testdataurl'),
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

  it('returns a hash string', async () => {
    const result = await getCanvasFingerprint()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('uses canvas 2D context', async () => {
    await getCanvasFingerprint()
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
  })

  it('draws text with emoji', async () => {
    await getCanvasFingerprint()
    // Should draw text containing emoji
    const fillTextCalls = mockContext.fillText.mock.calls
    expect(fillTextCalls.length).toBeGreaterThan(0)
    const hasEmoji = fillTextCalls.some((call: string[]) => 
      /[\u{1F000}-\u{1FFFF}]/u.test(call[0])
    )
    expect(hasEmoji).toBe(true)
  })

  it('draws shapes (fillRect, arc)', async () => {
    await getCanvasFingerprint()
    expect(mockContext.fillRect).toHaveBeenCalled()
    expect(mockContext.arc).toHaveBeenCalled()
  })

  it('returns consistent hash for same input', async () => {
    const hash1 = await getCanvasFingerprint()
    const hash2 = await getCanvasFingerprint()
    expect(hash1).toBe(hash2)
  })

  it('handles canvas not supported gracefully', async () => {
    mockCanvas.getContext = vi.fn(() => null)
    const result = await getCanvasFingerprint()
    expect(result).toBe('canvas-not-supported')
  })

  it('handles document.createElement not available', async () => {
    vi.stubGlobal('document', undefined)
    const result = await getCanvasFingerprint()
    expect(result).toBe('canvas-not-supported')
  })
})
