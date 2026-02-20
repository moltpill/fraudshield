// Signal collectors
export { getCanvasFingerprint } from './signals/canvas'
export { getBotSignals } from './signals/bot'
export type { BotSignals } from './signals/bot'

/**
 * Standard error codes returned by the Eyes API
 */
export const ErrorCode = {
  /** API key is invalid or not found */
  INVALID_KEY: 'INVALID_KEY',
  /** Monthly quota has been exceeded */
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  /** Network error occurred during request */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Account has been suspended */
  SUSPENDED: 'SUSPENDED',
} as const

/** Type for error code values */
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * Result of the analyze() method
 */
export interface AnalyzeResult {
  /** Unique visitor identifier (fingerprint hash) */
  visitorId: string
  /** Confidence score of the fingerprint (0-1) */
  confidence: number
  /** Risk level assessment */
  risk: 'low' | 'medium' | 'high'
  /** Detection signals and flags */
  signals: Record<string, boolean>
  /** Optional request ID for debugging */
  requestId?: string
}

import { getCanvasFingerprint } from './signals/canvas'
import { getWebGLFingerprint } from './signals/webgl'
import { getAudioFingerprint } from './signals/audio'
import { getNavigatorSignals } from './signals/navigator'
import { getScreenSignals } from './signals/screen'
import { getTimezoneSignals } from './signals/timezone'
import { getWebRTCIPs } from './signals/webrtc'
import { getBotSignals } from './signals/bot'

/**
 * Error options for EyesError
 */
export interface EyesErrorOptions {
  statusCode?: number
  code?: string
}

// Legacy alias
export type SentinelErrorOptions = EyesErrorOptions

/**
 * Custom error class for Eyes SDK errors
 */
export class EyesError extends Error {
  readonly statusCode?: number
  readonly code?: string

  constructor(message: string, options?: EyesErrorOptions) {
    super(message)
    this.name = 'EyesError'
    this.statusCode = options?.statusCode
    this.code = options?.code

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, EyesError.prototype)
  }
}

// Legacy aliases for backwards compatibility
export { EyesError as SentinelError }
export { EyesError as FraudShieldError }

/**
 * Eyes SDK configuration options
 */
export interface EyesOptions {
  /** API key for authentication (required) */
  apiKey: string
  /** Custom API endpoint (optional) */
  endpoint?: string
}

// Legacy aliases
export type SentinelOptions = EyesOptions
export type FraudShieldOptions = EyesOptions

/**
 * Response from the analyze API
 */
export interface AnalyzeResponse {
  visitorId: string
  riskScore?: number
  flags?: Record<string, boolean>
  requestId?: string
  [key: string]: unknown
}

/**
 * Eyes SDK main class - The All Seeing Eyes
 * AI-Powered Fraud Detection: See Everything. Trust No One.
 * 
 * @example
 * ```ts
 * const sdk = new Eyes({ apiKey: 'eye_live_xxx' })
 * const result = await sdk.analyze()
 * console.log(result.visitorId, result.riskScore)
 * ```
 */
export class Eyes {
  private readonly _apiKey: string
  private readonly _endpoint: string

  private static readonly DEFAULT_ENDPOINT = 'https://api.theallseeingeyes.org'

  constructor(options: EyesOptions) {
    if (!options.apiKey || options.apiKey.trim() === '') {
      throw new Error('apiKey is required')
    }

    this._apiKey = options.apiKey
    this._endpoint = options.endpoint ?? Eyes.DEFAULT_ENDPOINT
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

  /**
   * Analyze the current browser/device and return fraud detection results
   * 
   * Collects all signals (canvas, webgl, audio, navigator, screen, timezone,
   * WebRTC IPs, bot signals) and sends them to the Eyes API.
   * 
   * @returns Promise<AnalyzeResponse> - The analysis result from the API
   * @throws {EyesError} On network errors or API error responses
   * 
   * @example
   * ```ts
   * try {
   *   const result = await sdk.analyze()
   *   console.log('Visitor ID:', result.visitorId)
   *   console.log('Risk Score:', result.riskScore)
   * } catch (error) {
   *   if (error instanceof EyesError) {
   *     console.error('API Error:', error.code, error.message)
   *   }
   * }
   * ```
   */
  async analyze(): Promise<AnalyzeResponse> {
    // Collect all signals in parallel for better performance
    const [canvas, webgl, audio, navigator, webrtcIPs] = await Promise.all([
      getCanvasFingerprint(),
      getWebGLFingerprint(),
      getAudioFingerprint(),
      getNavigatorSignals(),
      getWebRTCIPs(),
    ])

    // Synchronous signal collectors
    const screen = getScreenSignals()
    const timezone = getTimezoneSignals()
    const bot = getBotSignals()

    const signals = {
      canvas,
      webgl,
      audio,
      navigator,
      screen,
      timezone,
      webrtcIPs,
      bot,
    }

    const url = `${this._endpoint}/v1/analyze`

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._apiKey}`,
        },
        body: JSON.stringify(signals),
      })
    } catch (error) {
      // Network error
      const message = error instanceof Error ? error.message : 'Network error'
      throw new EyesError(message, { code: ErrorCode.NETWORK_ERROR })
    }

    if (!response.ok) {
      // HTTP error response
      let errorData: { error?: string; code?: string } = {}
      try {
        errorData = await response.json()
      } catch {
        // JSON parse error - use generic message
      }

      const message = errorData.error || `HTTP ${response.status} error`
      throw new EyesError(message, {
        statusCode: response.status,
        code: errorData.code,
      })
    }

    // Success - parse and return response
    return response.json()
  }
}

// Legacy aliases for backwards compatibility
export { Eyes as Sentinel }
export { Eyes as FraudShield }
