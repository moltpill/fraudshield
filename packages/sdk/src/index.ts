// Signal collectors
export { getCanvasFingerprint } from './signals/canvas'
export { getBotSignals } from './signals/bot'
export type { BotSignals } from './signals/bot'

import { getCanvasFingerprint } from './signals/canvas'
import { getWebGLFingerprint } from './signals/webgl'
import { getAudioFingerprint } from './signals/audio'
import { getNavigatorSignals } from './signals/navigator'
import { getScreenSignals } from './signals/screen'
import { getTimezoneSignals } from './signals/timezone'
import { getWebRTCIPs } from './signals/webrtc'
import { getBotSignals } from './signals/bot'

/**
 * Error options for FraudShieldError
 */
export interface FraudShieldErrorOptions {
  statusCode?: number
  code?: string
}

/**
 * Custom error class for FraudShield SDK errors
 */
export class FraudShieldError extends Error {
  readonly statusCode?: number
  readonly code?: string

  constructor(message: string, options?: FraudShieldErrorOptions) {
    super(message)
    this.name = 'FraudShieldError'
    this.statusCode = options?.statusCode
    this.code = options?.code

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, FraudShieldError.prototype)
  }
}

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
 * FraudShield SDK main class
 * 
 * @example
 * ```ts
 * const sdk = new FraudShield({ apiKey: 'fs_live_xxx' })
 * const result = await sdk.analyze()
 * console.log(result.visitorId, result.riskScore)
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

  /**
   * Analyze the current browser/device and return fraud detection results
   * 
   * Collects all signals (canvas, webgl, audio, navigator, screen, timezone,
   * WebRTC IPs, bot signals) and sends them to the FraudShield API.
   * 
   * @returns Promise<AnalyzeResponse> - The analysis result from the API
   * @throws {FraudShieldError} On network errors or API error responses
   * 
   * @example
   * ```ts
   * try {
   *   const result = await sdk.analyze()
   *   console.log('Visitor ID:', result.visitorId)
   *   console.log('Risk Score:', result.riskScore)
   * } catch (error) {
   *   if (error instanceof FraudShieldError) {
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
      throw new FraudShieldError(message)
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
      throw new FraudShieldError(message, {
        statusCode: response.status,
        code: errorData.code,
      })
    }

    // Success - parse and return response
    return response.json()
  }
}
