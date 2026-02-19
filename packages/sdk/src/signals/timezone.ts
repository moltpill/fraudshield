/**
 * Timezone and locale signals collection
 * 
 * Collects timezone information using Intl API and Date API,
 * plus locale from navigator.language.
 * 
 * Handles missing APIs gracefully by returning undefined
 * for unavailable properties.
 */

export interface TimezoneSignals {
  timezone: string | undefined
  timezoneOffset: number
  locale: string | undefined
}

/**
 * Get timezone name from Intl.DateTimeFormat
 * Returns undefined if Intl API is not available
 */
function getTimezoneName(): string | undefined {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return new Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  } catch {
    // Intl API error
  }
  return undefined
}

/**
 * Get timezone offset from Date.getTimezoneOffset()
 * Returns minutes offset from UTC (positive = behind UTC, negative = ahead)
 */
function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset()
}

/**
 * Get locale from navigator.language
 * Returns undefined if navigator is not available
 */
function getLocale(): string | undefined {
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language
    }
  } catch {
    // Navigator access restricted
  }
  return undefined
}

/**
 * Collect timezone and locale signals for device fingerprinting
 * 
 * Returns timezone name (IANA format), offset in minutes,
 * and browser locale.
 * 
 * Uses:
 * - Intl.DateTimeFormat().resolvedOptions() for timezone name
 * - Date().getTimezoneOffset() for offset
 * - navigator.language for locale
 */
export function getTimezoneSignals(): TimezoneSignals {
  return {
    timezone: getTimezoneName(),
    timezoneOffset: getTimezoneOffset(),
    locale: getLocale(),
  }
}
