import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  FraudShield,
  FraudShieldError,
  ErrorCode,
  AnalyzeResult,
  FraudShieldOptions,
} from '../src/index'

// Mock all signal collectors
vi.mock('../src/signals/canvas', () => ({
  getCanvasFingerprint: vi.fn(() => Promise.resolve('canvas-hash')),
}))
vi.mock('../src/signals/webgl', () => ({
  getWebGLFingerprint: vi.fn(() => Promise.resolve({ hash: 'webgl-hash' })),
}))
vi.mock('../src/signals/audio', () => ({
  getAudioFingerprint: vi.fn(() => Promise.resolve('audio-hash')),
}))
vi.mock('../src/signals/navigator', () => ({
  getNavigatorSignals: vi.fn(() => Promise.resolve({})),
}))
vi.mock('../src/signals/screen', () => ({
  getScreenSignals: vi.fn(() => ({})),
}))
vi.mock('../src/signals/timezone', () => ({
  getTimezoneSignals: vi.fn(() => ({})),
}))
vi.mock('../src/signals/webrtc', () => ({
  getWebRTCIPs: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../src/signals/bot', () => ({
  getBotSignals: vi.fn(() => ({})),
}))

describe('ErrorCode constants', () => {
  it('exports INVALID_KEY error code', () => {
    expect(ErrorCode.INVALID_KEY).toBe('INVALID_KEY')
  })

  it('exports QUOTA_EXCEEDED error code', () => {
    expect(ErrorCode.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED')
  })

  it('exports NETWORK_ERROR error code', () => {
    expect(ErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR')
  })

  it('exports SUSPENDED error code', () => {
    expect(ErrorCode.SUSPENDED).toBe('SUSPENDED')
  })
})

describe('FraudShieldError', () => {
  it('extends Error', () => {
    const error = new FraudShieldError('Test error')
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct name property', () => {
    const error = new FraudShieldError('Test error')
    expect(error.name).toBe('FraudShieldError')
  })

  it('has code property', () => {
    const error = new FraudShieldError('Invalid API key', {
      code: ErrorCode.INVALID_KEY,
    })
    expect(error.code).toBe('INVALID_KEY')
  })

  it('works with instanceof after transpilation', () => {
    const error = new FraudShieldError('Test')
    expect(error instanceof FraudShieldError).toBe(true)
  })
})

describe('AnalyzeResult type', () => {
  it('has visitorId property', () => {
    const result: AnalyzeResult = {
      visitorId: 'visitor-123',
      confidence: 0.95,
      risk: 'low',
      signals: {},
    }
    expect(result.visitorId).toBe('visitor-123')
  })

  it('has confidence property', () => {
    const result: AnalyzeResult = {
      visitorId: 'visitor-123',
      confidence: 0.95,
      risk: 'low',
      signals: {},
    }
    expect(result.confidence).toBe(0.95)
  })

  it('has risk property', () => {
    const result: AnalyzeResult = {
      visitorId: 'visitor-123',
      confidence: 0.95,
      risk: 'high',
      signals: {},
    }
    expect(result.risk).toBe('high')
  })

  it('has signals property', () => {
    const result: AnalyzeResult = {
      visitorId: 'visitor-123',
      confidence: 0.95,
      risk: 'medium',
      signals: {
        vpn: true,
        bot: false,
        datacenter: true,
      },
    }
    expect(result.signals.vpn).toBe(true)
    expect(result.signals.bot).toBe(false)
    expect(result.signals.datacenter).toBe(true)
  })
})

describe('FraudShieldOptions type', () => {
  it('requires apiKey', () => {
    const options: FraudShieldOptions = {
      apiKey: 'fs_live_xxx',
    }
    expect(options.apiKey).toBe('fs_live_xxx')
  })

  it('allows optional endpoint', () => {
    const options: FraudShieldOptions = {
      apiKey: 'fs_live_xxx',
      endpoint: 'https://custom.api.com',
    }
    expect(options.endpoint).toBe('https://custom.api.com')
  })
})

describe('Network errors use NETWORK_ERROR code', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('includes NETWORK_ERROR code on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    const sdk = new FraudShield({ apiKey: 'fs_live_test' })

    try {
      await sdk.analyze()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FraudShieldError)
      expect((error as FraudShieldError).code).toBe(ErrorCode.NETWORK_ERROR)
      expect((error as FraudShieldError).message).toBe('Connection refused')
    }
  })
})
