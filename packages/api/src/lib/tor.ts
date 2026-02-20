/**
 * STORY-053: Tor exit node detection
 *
 * Loads and checks against the Tor Project's exit node list.
 * Source: https://check.torproject.org/torbulkexitlist
 * Update frequency: Hourly (Tor list changes frequently)
 *
 * Data file: packages/api/data/tor-exits.txt
 * Run: pnpm --filter @fraudshield/api ip:update
 */

import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isIPv6 } from './cidr.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TOR_LIST_PATH = join(__dirname, '../../data/tor-exits.txt')

// Set-based lookup for O(1) performance (Tor list is plain IPs, not CIDRs)
let _torExitSet: Set<string> | null = null

function loadTorList(): Set<string> {
  if (_torExitSet !== null) return _torExitSet

  if (!existsSync(TOR_LIST_PATH)) {
    console.warn(
      '[tor] tor-exits.txt not found. Run scripts/update-ip-lists.sh to download.'
    )
    _torExitSet = new Set()
    return _torExitSet
  }

  const content = readFileSync(TOR_LIST_PATH, 'utf-8')
  const ips = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/))

  _torExitSet = new Set(ips)
  console.info(`[tor] Loaded ${_torExitSet.size} Tor exit nodes`)
  return _torExitSet
}

/**
 * Check if an IP address is a known Tor exit node.
 * Returns true if IP is in the current Tor exit node list.
 *
 * Note: Uses Set for O(1) lookup performance.
 */
export function isTorExitNode(ip: string): boolean {
  if (!ip || isIPv6(ip)) return false

  const torSet = loadTorList()
  return torSet.has(ip)
}

/**
 * Get the count of loaded Tor exit nodes (for monitoring).
 */
export function getTorListSize(): number {
  return loadTorList().size
}

/** Load Tor list from custom content (for testing) */
export function loadTorListFromContent(content: string): void {
  const ips = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/))
  _torExitSet = new Set(ips)
}

/** Reset cache (for testing) */
export function _resetTorCache(): void {
  _torExitSet = null
}
