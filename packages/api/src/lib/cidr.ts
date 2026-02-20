/**
 * CIDR IP range matching utilities
 * Used by VPN, datacenter, and other IP list lookups
 */

/** Convert IPv4 address string to 32-bit unsigned integer */
export function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return -1
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

/** Check if an IPv4 address falls within a CIDR range (e.g. "10.0.0.0/8") */
export function isInCIDR(ip: string, cidr: string): boolean {
  const slashIdx = cidr.indexOf('/')
  if (slashIdx === -1) {
    // Exact IP match
    return ip === cidr
  }

  const range = cidr.slice(0, slashIdx)
  const bits = parseInt(cidr.slice(slashIdx + 1), 10)

  if (isNaN(bits) || bits < 0 || bits > 32) return false

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  const ipInt = ipToInt(ip)
  const rangeInt = ipToInt(range)

  if (ipInt === -1 || rangeInt === -1) return false

  return (ipInt & mask) === (rangeInt & mask)
}

/** Check if IP is in any of a list of CIDR ranges (optimized for large lists) */
export function isInCIDRList(ip: string, cidrs: string[]): boolean {
  const ipInt = ipToInt(ip)
  if (ipInt === -1) return false

  for (const cidr of cidrs) {
    const slashIdx = cidr.indexOf('/')
    if (slashIdx === -1) {
      if (ipToInt(cidr) === ipInt) return true
      continue
    }

    const range = cidr.slice(0, slashIdx)
    const bits = parseInt(cidr.slice(slashIdx + 1), 10)
    if (isNaN(bits) || bits < 0 || bits > 32) continue

    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    const rangeInt = ipToInt(range)
    if (rangeInt === -1) continue

    if ((ipInt & mask) === (rangeInt & mask)) return true
  }
  return false
}

/** Check if IP is a private/loopback address */
export function isPrivateIP(ip: string): boolean {
  return isInCIDRList(ip, [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '127.0.0.0/8',
    '169.254.0.0/16',
    '::1/128',
  ])
}

/** Check if an IP is IPv6 (simplified check) */
export function isIPv6(ip: string): boolean {
  return ip.includes(':')
}
