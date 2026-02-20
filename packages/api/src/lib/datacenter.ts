/**
 * STORY-054: Datacenter IP detection
 *
 * Detects IP addresses belonging to cloud providers and datacenters.
 * Uses ipcat dataset which covers AWS, GCP, Azure, DigitalOcean, etc.
 * Source: https://github.com/client9/ipcat
 *
 * Data file: packages/api/data/datacenters.csv
 * Format: "startIP,endIP,ProviderName" (IP ranges, not CIDRs)
 * Update frequency: Weekly
 *
 * Run: pnpm --filter @fraudshield/api ip:update
 */

import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ipToInt, isIPv6 } from './cidr.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DC_LIST_PATH = join(__dirname, '../../data/datacenters.csv')

interface DatacenterRange {
  start: number
  end: number
  provider: string
}

// Sorted array of datacenter ranges for binary search
let _datacenterRanges: DatacenterRange[] | null = null

function loadDatacenterList(): DatacenterRange[] {
  if (_datacenterRanges !== null) return _datacenterRanges

  if (!existsSync(DC_LIST_PATH)) {
    console.warn(
      '[datacenter] datacenters.csv not found. Run scripts/update-ip-lists.sh to download.'
    )
    _datacenterRanges = []
    return _datacenterRanges
  }

  const content = readFileSync(DC_LIST_PATH, 'utf-8')
  const ranges: DatacenterRange[] = []

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const parts = trimmed.split(',')
    if (parts.length < 3) continue

    const startIp = parts[0].trim()
    const endIp = parts[1].trim()
    const provider = parts.slice(2).join(',').trim().replace(/^"|"$/g, '')

    const start = ipToInt(startIp)
    const end = ipToInt(endIp)

    if (start !== -1 && end !== -1 && start <= end) {
      ranges.push({ start, end, provider })
    }
  }

  // Sort by start IP for binary search
  ranges.sort((a, b) => a.start - b.start)
  _datacenterRanges = ranges

  console.info(`[datacenter] Loaded ${_datacenterRanges.length} datacenter IP ranges`)
  return _datacenterRanges
}

/**
 * Check if an IP address belongs to a known datacenter or cloud provider.
 * Returns the provider name (e.g. "Amazon", "Google", "Microsoft") or null.
 */
export function isDatacenterIP(ip: string): string | null {
  if (!ip || isIPv6(ip)) return null

  const ipInt = ipToInt(ip)
  if (ipInt === -1) return null

  const ranges = loadDatacenterList()
  if (ranges.length === 0) return null

  // Binary search for the IP in sorted ranges
  let lo = 0
  let hi = ranges.length - 1

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const range = ranges[mid]

    if (ipInt < range.start) {
      hi = mid - 1
    } else if (ipInt > range.end) {
      lo = mid + 1
    } else {
      return range.provider
    }
  }

  return null
}

/**
 * Get the count of loaded datacenter IP ranges (for monitoring).
 */
export function getDatacenterListSize(): number {
  return loadDatacenterList().length
}

/** Load datacenter list from custom CSV content (for testing) */
export function loadDatacenterListFromContent(content: string): void {
  const ranges: DatacenterRange[] = []

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const parts = trimmed.split(',')
    if (parts.length < 3) continue

    const startIp = parts[0].trim()
    const endIp = parts[1].trim()
    const provider = parts.slice(2).join(',').trim().replace(/^"|"$/g, '')

    const start = ipToInt(startIp)
    const end = ipToInt(endIp)

    if (start !== -1 && end !== -1 && start <= end) {
      ranges.push({ start, end, provider })
    }
  }

  ranges.sort((a, b) => a.start - b.start)
  _datacenterRanges = ranges
}

/** Reset cache (for testing) */
export function _resetDatacenterCache(): void {
  _datacenterRanges = null
}
