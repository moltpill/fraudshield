/**
 * STORY-052: VPN IP list loader
 *
 * Downloads and parses VPN IP CIDR ranges from X4BNet.
 * Source: https://github.com/X4BNet/lists_vpn
 * Update frequency: Daily
 *
 * Data file: packages/api/data/vpn-ipv4.txt
 * Run: pnpm --filter @fraudshield/api ip:update
 */

import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isInCIDRList, isIPv6 } from './cidr.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VPN_LIST_PATH = join(__dirname, '../../data/vpn-ipv4.txt')

// In-memory cache of VPN CIDR ranges
let _vpnCidrs: string[] | null = null

function loadVpnList(): string[] {
  if (_vpnCidrs !== null) return _vpnCidrs

  if (!existsSync(VPN_LIST_PATH)) {
    console.warn(
      '[vpn] vpn-ipv4.txt not found. Run scripts/update-ip-lists.sh to download.'
    )
    _vpnCidrs = []
    return _vpnCidrs
  }

  const content = readFileSync(VPN_LIST_PATH, 'utf-8')
  _vpnCidrs = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))

  console.info(`[vpn] Loaded ${_vpnCidrs.length} VPN CIDR ranges`)
  return _vpnCidrs
}

/**
 * Check if an IP address belongs to a known VPN provider.
 * Returns true if IP is in the VPN list.
 */
export function isVpnIP(ip: string): boolean {
  if (!ip || isIPv6(ip)) return false // VPN list is IPv4 only

  const cidrs = loadVpnList()
  if (cidrs.length === 0) return false

  return isInCIDRList(ip, cidrs)
}

/**
 * Get the count of loaded VPN CIDR ranges (for monitoring).
 */
export function getVpnListSize(): number {
  return loadVpnList().length
}

/** Load VPN list from custom path (for testing) */
export function loadVpnListFromContent(content: string): void {
  _vpnCidrs = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
}

/** Reset cache (for testing) */
export function _resetVpnCache(): void {
  _vpnCidrs = null
}
