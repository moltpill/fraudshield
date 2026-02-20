/**
 * STORY-051: GeoLite2 IP geolocation
 *
 * Uses MaxMind GeoLite2-City.mmdb database for IP geolocation.
 * Database file location: packages/api/data/GeoLite2-City.mmdb
 *
 * To download the database:
 *   pnpm --filter @fraudshield/api db:geo-update
 * Or run: ./scripts/update-geolite2.sh (requires MAXMIND_LICENSE_KEY env var)
 */

import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../../data/GeoLite2-City.mmdb')

export interface GeoLocation {
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
  lat: number | null
  lng: number | null
  timezone: string | null
  isp: string | null
  asn: number | null
}

// Lazy-loaded MaxMind reader
let _reader: unknown | null = null
let _readerLoaded = false

async function getReader(): Promise<unknown | null> {
  if (_readerLoaded) return _reader

  _readerLoaded = true

  if (!existsSync(DB_PATH)) {
    console.warn(
      `[geo] GeoLite2-City.mmdb not found at ${DB_PATH}. ` +
      'Run pnpm --filter @fraudshield/api db:geo-update to download. ' +
      'Geolocation will return null.'
    )
    return null
  }

  try {
    // Dynamic import to avoid hard dependency when DB not present
    const { open } = await import('maxmind')
    _reader = await open(DB_PATH)
  } catch (err) {
    console.error('[geo] Failed to open GeoLite2 database:', err)
    _reader = null
  }

  return _reader
}

/**
 * Look up geolocation for an IP address.
 * Returns null if database not available or IP not found.
 */
export async function getGeolocation(ip: string): Promise<GeoLocation | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null // Private IPs don't have geolocation
  }

  const reader = await getReader()
  if (!reader) return null

  try {
    // maxmind returns null for IPs not in database
    const result = (reader as { get: (ip: string) => Record<string, unknown> | null }).get(ip)
    if (!result) return null

    const country = result.country as { names?: { en?: string }; iso_code?: string } | undefined
    const registeredCountry = result.registered_country as { names?: { en?: string }; iso_code?: string } | undefined
    const subdivisions = result.subdivisions as { names?: { en?: string } }[] | undefined
    const city = result.city as { names?: { en?: string } } | undefined
    const location = result.location as { latitude?: number; longitude?: number; time_zone?: string } | undefined
    const traits = result.traits as { isp?: string; autonomous_system_number?: number } | undefined

    const countryData = country ?? registeredCountry

    return {
      country: countryData?.names?.en ?? null,
      countryCode: countryData?.iso_code ?? null,
      region: subdivisions?.[0]?.names?.en ?? null,
      city: city?.names?.en ?? null,
      lat: location?.latitude ?? null,
      lng: location?.longitude ?? null,
      timezone: location?.time_zone ?? null,
      isp: traits?.isp ?? null,
      asn: traits?.autonomous_system_number ?? null,
    }
  } catch (err) {
    console.error('[geo] Lookup error:', err)
    return null
  }
}

/** Reset reader cache (for testing) */
export function _resetGeoReader(): void {
  _reader = null
  _readerLoaded = false
}
