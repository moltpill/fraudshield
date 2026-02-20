/**
 * STORY-055: Timezone mismatch detection
 *
 * Compares the browser-reported timezone to the timezone derived
 * from IP geolocation. A mismatch suggests VPN or proxy usage.
 */

/**
 * Compare two IANA timezone strings to determine if they differ.
 *
 * Handles DST differences between adjacent timezones (e.g. US/Eastern vs America/New_York).
 * Returns a mismatch score: 0 (match) or 1 (mismatch).
 *
 * @param browserTimezone - Timezone from SDK signals (e.g. "Europe/London")
 * @param geoTimezone - Timezone from IP geolocation (e.g. "Europe/London")
 * @returns 0 if timezones match or cannot be compared, 1 if they mismatch
 */
export function getTimezoneMismatch(
  browserTimezone: string | null | undefined,
  geoTimezone: string | null | undefined
): number {
  // Can't compare if either is missing
  if (!browserTimezone || !geoTimezone) return 0

  // Exact match
  if (browserTimezone === geoTimezone) return 0

  // Normalize both to UTC offset for comparison (handles DST)
  const browserOffset = getUTCOffset(browserTimezone)
  const geoOffset = getUTCOffset(geoTimezone)

  // If offsets match, timezones are effectively the same
  if (browserOffset !== null && geoOffset !== null && browserOffset === geoOffset) {
    return 0
  }

  // Check well-known timezone aliases
  if (areTimezonesEquivalent(browserTimezone, geoTimezone)) {
    return 0
  }

  return 1
}

/**
 * Get current UTC offset in minutes for an IANA timezone name.
 * Returns null if the timezone is invalid.
 */
function getUTCOffset(timezone: string): number | null {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(now)
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value ?? ''

    // Parse "GMT+5:30" or "GMT-8" format
    const match = offsetPart.match(/GMT([+-])(\d+)(?::(\d+))?/)
    if (!match) return 0 // GMT+0

    const sign = match[1] === '+' ? 1 : -1
    const hours = parseInt(match[2], 10)
    const minutes = parseInt(match[3] ?? '0', 10)
    return sign * (hours * 60 + minutes)
  } catch {
    return null // Invalid timezone
  }
}

/** Well-known timezone aliases (different names, same zone) */
const TIMEZONE_ALIASES: [string, string][] = [
  ['UTC', 'GMT'],
  ['US/Eastern', 'America/New_York'],
  ['US/Central', 'America/Chicago'],
  ['US/Mountain', 'America/Denver'],
  ['US/Pacific', 'America/Los_Angeles'],
  ['US/Hawaii', 'Pacific/Honolulu'],
  ['Europe/London', 'GB'],
  ['Asia/Calcutta', 'Asia/Kolkata'],
  ['Asia/Ulaanbaatar', 'Asia/Ulan_Bator'],
]

function areTimezonesEquivalent(tz1: string, tz2: string): boolean {
  for (const [a, b] of TIMEZONE_ALIASES) {
    if ((tz1 === a && tz2 === b) || (tz1 === b && tz2 === a)) {
      return true
    }
  }
  return false
}
