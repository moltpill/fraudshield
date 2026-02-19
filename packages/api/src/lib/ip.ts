/**
 * IP extraction and geolocation utilities
 * STORY-028: Add IP extraction and geolocation stub
 */

/**
 * Geolocation data for an IP address
 */
export interface GeoLocation {
  country: string
  countryCode: string
  region: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  isp: string
  asn: string
}

/**
 * Extract client IP address from request headers
 * 
 * Checks headers in order of preference:
 * 1. X-Forwarded-For (first IP in comma-separated list)
 * 2. X-Real-IP
 * 3. Socket IP (fallback)
 * 
 * Handles both IPv4 and IPv6 addresses.
 * 
 * @param headers - Request headers
 * @param socketIp - Optional fallback IP from socket connection
 * @returns Client IP address or null if not found
 */
export function extractClientIp(headers: Headers, socketIp?: string): string | null {
  // Check X-Forwarded-For first (most common proxy header)
  const forwardedFor = headers.get('X-Forwarded-For')
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // The first IP is the original client
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  // Check X-Real-IP (used by some proxies like nginx)
  const realIp = headers.get('X-Real-IP')
  if (realIp) {
    const trimmed = realIp.trim()
    if (trimmed) {
      return trimmed
    }
  }

  // Fall back to socket IP if provided
  if (socketIp) {
    return socketIp
  }

  return null
}

/**
 * Get geolocation data for an IP address
 * 
 * STUB IMPLEMENTATION: Returns null for all IPs.
 * Real implementation will use GeoLite2 database lookup.
 * 
 * @param ip - IP address to lookup
 * @returns Geolocation data or null
 */
export async function getGeolocation(ip: string | null): Promise<GeoLocation | null> {
  // Stub implementation - always returns null
  // Real implementation will use MaxMind GeoLite2 database
  return null
}
