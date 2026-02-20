import { describe, it, expect, vi } from 'vitest'
import {
  Sentinel,
  FraudShield, // Legacy alias
  SentinelError,
  FraudShieldError, // Legacy alias
  SentinelOptions,
  FraudShieldOptions, // Legacy alias
  ErrorCode,
} from '../src/index'

describe('SentinelError', () => {
  it('creates error with message only', () => {
    const error = new SentinelError('Test error')
    expect(error.message).toBe('Test error')
    expect(error.statusCode).toBeUndefined()
    expect(error.code).toBeUndefined()
  })

  it('has correct name property', () => {
    const error = new SentinelError('Test error')
    expect(error instanceof Error).toBe(true)
    expect(error.name).toBe('SentinelError')
  })

  it('accepts statusCode and code options', () => {
    const error = new SentinelError('Invalid API key', {
      statusCode: 401,
      code: ErrorCode.INVALID_KEY,
    })
    expect(error.message).toBe('Invalid API key')
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('INVALID_KEY')
  })

  it('can be caught as Error', () => {
    const error = new SentinelError('Test')
    expect(error instanceof Error).toBe(true)
  })

  it('maintains instanceof check', () => {
    const error = new SentinelError('Test')
    expect(error instanceof SentinelError).toBe(true)
  })

  it('FraudShieldError alias works', () => {
    const error = new FraudShieldError('Test')
    expect(error instanceof SentinelError).toBe(true)
  })
})

describe('SentinelOptions type', () => {
  it('requires apiKey', () => {
    const options: SentinelOptions = {
      apiKey: 'stl_live_test123',
    }
    expect(options.apiKey).toBe('stl_live_test123')
  })

  it('allows optional endpoint', () => {
    const options: SentinelOptions = {
      apiKey: 'stl_live_test123',
      endpoint: 'https://custom.api.com',
    }
    expect(options.endpoint).toBe('https://custom.api.com')
  })

  it('FraudShieldOptions alias works', () => {
    const options: FraudShieldOptions = {
      apiKey: 'stl_live_test123',
    }
    expect(options.apiKey).toBe('stl_live_test123')
  })
})

describe('Network error handling', () => {
  it('throws SentinelError with NETWORK_ERROR code on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')))

    const sdk = new Sentinel({ apiKey: 'stl_live_test' })
    
    try {
      await sdk.analyze()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(SentinelError)
      expect((error as SentinelError).code).toBe(ErrorCode.NETWORK_ERROR)
      expect((error as SentinelError).message).toBe('Connection refused')
    }

    vi.unstubAllGlobals()
  })

  it('FraudShield alias works identically', async () => {
    const sdk = new FraudShield({ apiKey: 'stl_live_test' })
    expect(sdk).toBeInstanceOf(Sentinel)
  })
})
