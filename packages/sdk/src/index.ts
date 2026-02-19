// Signal collectors
export { getCanvasFingerprint } from './signals/canvas'

/**
 * FraudShield SDK configuration options
 */
export interface FraudShieldOptions {
  /** API key for authentication (required) */
  apiKey: string
  /** Custom API endpoint (optional) */
  endpoint?: string
}

/**
 * FraudShield SDK main class
 * 
 * @example
 * ```ts
 * const sdk = new FraudShield({ apiKey: 'fs_live_xxx' })
 * ```
 */
export class FraudShield {
  private readonly _apiKey: string
  private readonly _endpoint: string

  private static readonly DEFAULT_ENDPOINT = 'https://api.fraudshield.io'

  constructor(options: FraudShieldOptions) {
    if (!options.apiKey || options.apiKey.trim() === '') {
      throw new Error('apiKey is required')
    }

    this._apiKey = options.apiKey
    this._endpoint = options.endpoint ?? FraudShield.DEFAULT_ENDPOINT
  }

  /** Get the configured endpoint */
  get endpoint(): string {
    return this._endpoint
  }

  /** Get the API key (masked for security) */
  get apiKeyMasked(): string {
    if (this._apiKey.length <= 12) {
      return '***'
    }
    return this._apiKey.slice(0, 8) + '***' + this._apiKey.slice(-4)
  }
}
