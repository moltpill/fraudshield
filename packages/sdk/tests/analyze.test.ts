import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Eyes, EyesError, Sentinel, SentinelError } from '../src/index'

describe('Eyes.analyze', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends POST request to /v1/analyze', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ visitorId: 'test-visitor-id' }),
    })

    const sdk = new Eyes({ apiKey: 'eye_live_test123' })
    await sdk.analyze()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.theallseeingeyes.org/v1/analyze')
    expect(options.method).toBe('POST')
  })

  it('includes Authorization header with API key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ visitorId: 'test' }),
    })

    const sdk = new Eyes({ apiKey: 'eye_live_secretkey123' })
    await sdk.analyze()

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer eye_live_secretkey123')
  })

  it('uses custom endpoint when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ visitorId: 'test' }),
    })

    const sdk = new Eyes({
      apiKey: 'eye_live_test',
      endpoint: 'https://custom.api.com'
    })
    await sdk.analyze()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://custom.api.com/v1/analyze')
  })

  it('returns the API response', async () => {
    const mockResponse = {
      visitorId: 'fp_abc123',
      riskScore: 25,
      flags: { vpn: false, tor: false },
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const sdk = new Eyes({ apiKey: 'eye_live_test' })
    const result = await sdk.analyze()

    expect(result).toEqual(mockResponse)
  })

  it('throws EyesError on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const sdk = new Eyes({ apiKey: 'eye_live_test' })

    await expect(sdk.analyze()).rejects.toThrow(EyesError)
  })

  it('throws EyesError with status code on HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid key', code: 'INVALID_KEY' }),
    })

    const sdk = new Eyes({ apiKey: 'eye_live_test' })

    try {
      await sdk.analyze()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(EyesError)
      expect((error as EyesError).statusCode).toBe(401)
      expect((error as EyesError).code).toBe('INVALID_KEY')
    }
  })

  // Legacy alias tests
  it('Sentinel alias works for analyze', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ visitorId: 'test' }),
    })

    const sdk = new Sentinel({ apiKey: 'eye_live_test' })
    expect(sdk).toBeInstanceOf(Eyes)
  })

  it('SentinelError alias is same as EyesError', () => {
    expect(SentinelError).toBe(EyesError)
  })
})
