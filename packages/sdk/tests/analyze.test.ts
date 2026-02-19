import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FraudShield, FraudShieldError } from '../src/index'

// Mock all signal collectors
vi.mock('../src/signals/canvas', () => ({
  getCanvasFingerprint: vi.fn(() => Promise.resolve('canvas-hash-123')),
}))

vi.mock('../src/signals/webgl', () => ({
  getWebGLFingerprint: vi.fn(() =>
    Promise.resolve({
      renderer: 'Test GPU',
      vendor: 'Test Vendor',
      hash: 'webgl-hash-456',
    })
  ),
}))

vi.mock('../src/signals/audio', () => ({
  getAudioFingerprint: vi.fn(() => Promise.resolve('audio-hash-789')),
}))

vi.mock('../src/signals/navigator', () => ({
  getNavigatorSignals: vi.fn(() =>
    Promise.resolve({
      userAgent: 'Test UA',
      platform: 'Test Platform',
      language: 'en-US',
      languages: ['en-US', 'en'],
      hardwareConcurrency: 8,
      deviceMemory: 16,
      maxTouchPoints: 0,
      cookieEnabled: true,
      doNotTrack: null,
      plugins: [],
    })
  ),
}))

vi.mock('../src/signals/screen', () => ({
  getScreenSignals: vi.fn(() => ({
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24,
    devicePixelRatio: 1,
    orientation: { type: 'landscape-primary', angle: 0 },
  })),
}))

vi.mock('../src/signals/timezone', () => ({
  getTimezoneSignals: vi.fn(() => ({
    timezone: 'America/New_York',
    timezoneOffset: 300,
    locale: 'en-US',
  })),
}))

vi.mock('../src/signals/webrtc', () => ({
  getWebRTCIPs: vi.fn(() => Promise.resolve(['192.168.1.100'])),
}))

vi.mock('../src/signals/bot', () => ({
  getBotSignals: vi.fn(() => ({
    webdriver: false,
    phantom: false,
    selenium: false,
    chromeRuntime: false,
    inconsistentPermissions: false,
  })),
}))

describe('FraudShield.analyze', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('collects all signals and posts to API', async () => {
    const mockResponse = {
      visitorId: 'visitor-123',
      riskScore: 0.1,
      flags: { vpn: false, bot: false },
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const sdk = new FraudShield({ apiKey: 'fs_live_test123' })
    const result = await sdk.analyze()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]

    // Check URL
    expect(url).toBe('https://api.fraudshield.io/v1/analyze')

    // Check POST method
    expect(options.method).toBe('POST')

    // Check Content-Type header
    expect(options.headers['Content-Type']).toBe('application/json')

    // Check body contains signals
    const body = JSON.parse(options.body)
    expect(body).toHaveProperty('canvas')
    expect(body).toHaveProperty('webgl')
    expect(body).toHaveProperty('audio')
    expect(body).toHaveProperty('navigator')
    expect(body).toHaveProperty('screen')
    expect(body).toHaveProperty('timezone')
    expect(body).toHaveProperty('webrtcIPs')
    expect(body).toHaveProperty('bot')

    // Verify signal values
    expect(body.canvas).toBe('canvas-hash-123')
    expect(body.audio).toBe('audio-hash-789')
    expect(body.webrtcIPs).toEqual(['192.168.1.100'])
  })

  it('includes API key in Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ visitorId: 'test' }),
    })

    const sdk = new FraudShield({ apiKey: 'fs_live_secretkey123' })
    await sdk.analyze()

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer fs_live_secretkey123')
  })

  it('uses custom endpoint when configured', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ visitorId: 'test' }),
    })

    const sdk = new FraudShield({
      apiKey: 'fs_live_test',
      endpoint: 'https://custom.api.com',
    })
    await sdk.analyze()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://custom.api.com/v1/analyze')
  })

  it('returns parsed API response', async () => {
    const mockResponse = {
      visitorId: 'visitor-xyz-789',
      riskScore: 0.75,
      flags: { vpn: true, bot: false, datacenter: true },
      requestId: 'req-123',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const sdk = new FraudShield({ apiKey: 'fs_live_test' })
    const result = await sdk.analyze()

    expect(result).toEqual(mockResponse)
    expect(result.visitorId).toBe('visitor-xyz-789')
    expect(result.riskScore).toBe(0.75)
    expect(result.flags.vpn).toBe(true)
  })

  it('throws FraudShieldError on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const sdk = new FraudShield({ apiKey: 'fs_live_test' })

    try {
      await sdk.analyze()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FraudShieldError)
      expect((error as FraudShieldError).message).toBe('Network error')
    }
  })

  it('throws FraudShieldError on HTTP error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
    })

    const sdk = new FraudShield({ apiKey: 'fs_live_invalid' })

    await expect(sdk.analyze()).rejects.toThrow(FraudShieldError)
  })

  it('FraudShieldError includes status code on HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Account suspended', code: 'ACCOUNT_SUSPENDED' }),
    })

    const sdk = new FraudShield({ apiKey: 'fs_live_test' })

    try {
      await sdk.analyze()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FraudShieldError)
      expect((error as FraudShieldError).statusCode).toBe(403)
      expect((error as FraudShieldError).code).toBe('ACCOUNT_SUSPENDED')
    }
  })

  it('FraudShieldError includes error code from API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }),
    })

    const sdk = new FraudShield({ apiKey: 'fs_live_test' })

    try {
      await sdk.analyze()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(FraudShieldError)
      expect((error as FraudShieldError).code).toBe('RATE_LIMIT_EXCEEDED')
      expect((error as FraudShieldError).message).toContain('Rate limit exceeded')
    }
  })

  it('handles JSON parse errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    const sdk = new FraudShield({ apiKey: 'fs_live_test' })

    await expect(sdk.analyze()).rejects.toThrow(FraudShieldError)
  })
})

describe('FraudShieldError', () => {
  it('extends Error', () => {
    const error = new FraudShieldError('Test error')
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct name', () => {
    const error = new FraudShieldError('Test error')
    expect(error.name).toBe('FraudShieldError')
  })

  it('accepts optional statusCode', () => {
    const error = new FraudShieldError('Test error', { statusCode: 401 })
    expect(error.statusCode).toBe(401)
  })

  it('accepts optional code', () => {
    const error = new FraudShieldError('Test error', { code: 'TEST_CODE' })
    expect(error.code).toBe('TEST_CODE')
  })

  it('accepts both statusCode and code', () => {
    const error = new FraudShieldError('Test error', {
      statusCode: 403,
      code: 'FORBIDDEN',
    })
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe('FORBIDDEN')
  })
})
