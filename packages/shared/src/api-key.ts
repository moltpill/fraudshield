import { randomBytes } from 'crypto'

export type ApiKeyType = 'live' | 'test'

const API_KEY_PREFIX = {
  live: 'eye_live_',
  test: 'eye_test_',
} as const

const HEX_LENGTH = 32

/**
 * Generate a secure API key with the appropriate prefix.
 * Format: eye_live_ or eye_test_ followed by 32 hex characters
 */
export function generateApiKey(type: ApiKeyType): string {
  const prefix = API_KEY_PREFIX[type]
  const hex = randomBytes(16).toString('hex') // 16 bytes = 32 hex chars
  return `${prefix}${hex}`
}

/**
 * Validate an API key format.
 * Returns true if the key has a valid prefix and 32 hex characters.
 */
export function validateApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false
  }
  
  // Check for valid prefix and extract hex portion
  const livePrefix = API_KEY_PREFIX.live
  const testPrefix = API_KEY_PREFIX.test
  
  let hex: string | undefined
  
  if (key.startsWith(livePrefix)) {
    hex = key.slice(livePrefix.length)
  } else if (key.startsWith(testPrefix)) {
    hex = key.slice(testPrefix.length)
  } else {
    return false
  }
  
  // Validate hex portion: exactly 32 lowercase hex characters
  return hex.length === HEX_LENGTH && /^[a-f0-9]+$/.test(hex)
}

/**
 * Extract the type from a valid API key.
 * Returns undefined if the key is invalid.
 */
export function getApiKeyType(key: string): ApiKeyType | undefined {
  if (!validateApiKey(key)) {
    return undefined
  }
  
  if (key.startsWith(API_KEY_PREFIX.live)) {
    return 'live'
  }
  
  return 'test'
}
