/**
 * Fingerprint hashing service
 * 
 * Computes stable fingerprint hash from raw browser signals.
 * Uses SHA-256 on normalized signal JSON.
 */

import { createHash } from 'crypto'

/**
 * Signals collected from the browser SDK
 */
export interface BrowserSignals {
  canvas?: string
  webgl?: string
  audio?: string
  navigator?: Record<string, unknown>
  screen?: Record<string, unknown>
  timezone?: Record<string, unknown>
  webrtcIPs?: string[]
  bot?: Record<string, unknown>
  // Volatile fields that will be excluded
  timestamp?: number
  requestTime?: number
  [key: string]: unknown
}

/**
 * List of volatile signal keys that should be excluded from hashing
 * These change between requests and would break fingerprint stability
 */
const VOLATILE_KEYS = ['timestamp', 'requestTime', 'requestId', 'sessionId']

/**
 * Deep sorts object keys recursively for consistent JSON output
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }

  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
  }
  
  return sorted
}

/**
 * Removes volatile keys from signals object
 */
function removeVolatileKeys(signals: BrowserSignals): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(signals)) {
    if (!VOLATILE_KEYS.includes(key)) {
      cleaned[key] = value
    }
  }
  
  return cleaned
}

/**
 * Computes a stable fingerprint hash from browser signals
 * 
 * @param signals - Raw browser signals from SDK
 * @returns SHA-256 hex hash of normalized signals
 */
export function computeFingerprint(signals: BrowserSignals): string {
  // Remove volatile signals that change between requests
  const cleanedSignals = removeVolatileKeys(signals)
  
  // Sort keys recursively for consistent JSON serialization
  const normalizedSignals = sortObjectKeys(cleanedSignals)
  
  // Serialize to JSON and compute SHA-256 hash
  const json = JSON.stringify(normalizedSignals)
  const hash = createHash('sha256').update(json).digest('hex')
  
  return hash
}
