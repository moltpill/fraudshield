import { describe, it, expect, vi } from 'vitest'
import {
  Eyes,
  Sentinel, // Legacy alias
  FraudShield, // Legacy alias
  EyesError,
  SentinelError, // Legacy alias
  FraudShieldError, // Legacy alias
  EyesOptions,
  SentinelOptions, // Legacy alias
  FraudShieldOptions, // Legacy alias
  ErrorCode,
} from '../src/index'

describe('EyesError', () => {
  it('creates error with message only', () => {
    const error = new EyesError('Test error')
    expect(error.message).toBe('Test error')
    expect(error.statusCode).toBeUndefined()
    expect(error.code).toBeUndefined()
  })

  it('has correct name property', () => {
    const error = new EyesError('Test error')
    expect(error instanceof Error).toBe(true)
    expect(error.name).toBe('EyesError')
  })

  it('accepts statusCode and code options', () => {
    const error = new EyesError('Invalid API key', {
      statusCode: 401,
      code: ErrorCode.INVALID_KEY,
    })
    expect(error.message).toBe('Invalid API key')
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('INVALID_KEY')
  })

  it('can be caught as Error', () => {
    const error = new EyesError('Test')
    expect(error instanceof Error).toBe(true)
  })

  it('maintains instanceof check', () => {
    const error = new EyesError('Test')
    expect(error instanceof EyesError).toBe(true)
  })

  it('SentinelError alias works', () => {
    const error = new SentinelError('Test')
    expect(error instanceof EyesError).toBe(true)
  })

  it('FraudShieldError alias works', () => {
    const error = new FraudShieldError('Test')
    expect(error instanceof EyesError).toBe(true)
  })
})

describe('EyesOptions type', () => {
  it('requires apiKey', () => {
    const options: EyesOptions = {
      apiKey: 'eye_live_test123',
    }
    expect(options.apiKey).toBe('eye_live_test123')
  })

  it('allows optional endpoint', () => {
    const options: EyesOptions = {
      apiKey: 'eye_live_test123',
      endpoint: 'https://custom.api.com',
    }
    expect(options.endpoint).toBe('https://custom.api.com')
  })

  it('SentinelOptions alias works', () => {
    const options: SentinelOptions = {
      apiKey: 'eye_live_test123',
    }
    expect(options.apiKey).toBe('eye_live_test123')
  })

  it('FraudShieldOptions alias works', () => {
    const options: FraudShieldOptions = {
      apiKey: 'eye_live_test123',
    }
    expect(options.apiKey).toBe('eye_live_test123')
  })
})

describe('Network error handling', () => {
  it('throws EyesError with NETWORK_ERROR code on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')))

    const sdk = new Eyes({ apiKey: 'eye_live_test' })
    
    try {
      await sdk.analyze()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(EyesError)
      expect((error as EyesError).code).toBe(ErrorCode.NETWORK_ERROR)
      expect((error as EyesError).message).toBe('Connection refused')
    }

    vi.unstubAllGlobals()
  })

  it('Sentinel alias works identically', async () => {
    const sdk = new Sentinel({ apiKey: 'eye_live_test' })
    expect(sdk).toBeInstanceOf(Eyes)
  })

  it('FraudShield alias works identically', async () => {
    const sdk = new FraudShield({ apiKey: 'eye_live_test' })
    expect(sdk).toBeInstanceOf(Eyes)
  })
})
