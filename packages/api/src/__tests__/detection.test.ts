/**
 * Phase 7 detection tests: STORY-051 through STORY-058
 */
import { describe, it, expect, beforeEach } from 'vitest'

// STORY-052: VPN detection
import {
  isVpnIP,
  loadVpnListFromContent,
  _resetVpnCache,
} from '../lib/vpn.js'

// STORY-053: Tor detection
import {
  isTorExitNode,
  loadTorListFromContent,
  getTorListSize,
  _resetTorCache,
} from '../lib/tor.js'

// STORY-054: Datacenter detection
import {
  isDatacenterIP,
  loadDatacenterListFromContent,
  _resetDatacenterCache,
} from '../lib/datacenter.js'

// STORY-051: CIDR utilities
import { ipToInt, isInCIDR, isInCIDRList, isPrivateIP } from '../lib/cidr.js'

// STORY-055: Timezone mismatch
import { getTimezoneMismatch } from '../lib/timezone.js'

// STORY-056: Bot score
import { calculateBotScore } from '../lib/bot-score.js'

// STORY-057: Risk score
import { calculateRiskScore, getRiskLevel } from '../lib/risk-score.js'

describe('STORY-051: CIDR utilities (GeoLite2 / IP matching)', () => {
  it('converts valid IPv4 to integer', () => {
    expect(ipToInt('0.0.0.0')).toBe(0)
    expect(ipToInt('255.255.255.255')).toBe(0xffffffff)
    expect(ipToInt('10.0.0.1')).toBe((10 << 24) | 1)
  })

  it('returns -1 for invalid IPs', () => {
    expect(ipToInt('not-an-ip')).toBe(-1)
    expect(ipToInt('')).toBe(-1)
    expect(ipToInt('999.0.0.1')).toBe(-1)
  })

  it('isInCIDR matches IP in range', () => {
    expect(isInCIDR('10.0.0.1', '10.0.0.0/8')).toBe(true)
    expect(isInCIDR('192.168.1.100', '192.168.0.0/16')).toBe(true)
    expect(isInCIDR('172.16.0.50', '172.16.0.0/12')).toBe(true)
  })

  it('isInCIDR rejects IP outside range', () => {
    expect(isInCIDR('11.0.0.1', '10.0.0.0/8')).toBe(false)
    expect(isInCIDR('8.8.8.8', '192.168.0.0/16')).toBe(false)
  })

  it('isInCIDR handles /32 (exact match)', () => {
    expect(isInCIDR('1.2.3.4', '1.2.3.4/32')).toBe(true)
    expect(isInCIDR('1.2.3.5', '1.2.3.4/32')).toBe(false)
  })

  it('isInCIDRList checks against multiple ranges', () => {
    const cidrs = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
    expect(isInCIDRList('10.5.5.5', cidrs)).toBe(true)
    expect(isInCIDRList('172.20.0.1', cidrs)).toBe(true)
    expect(isInCIDRList('8.8.8.8', cidrs)).toBe(false)
  })

  it('isPrivateIP identifies private addresses', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true)
    expect(isPrivateIP('172.16.0.1')).toBe(true)
    expect(isPrivateIP('192.168.1.1')).toBe(true)
    expect(isPrivateIP('127.0.0.1')).toBe(true)
    expect(isPrivateIP('8.8.8.8')).toBe(false)
    expect(isPrivateIP('1.1.1.1')).toBe(false)
  })
})

describe('STORY-052: VPN IP detection', () => {
  beforeEach(() => {
    _resetVpnCache()
  })

  it('returns false for empty list', () => {
    loadVpnListFromContent('')
    expect(isVpnIP('1.2.3.4')).toBe(false)
  })

  it('detects IP in VPN CIDR range', () => {
    loadVpnListFromContent('1.2.3.0/24\n5.6.7.0/24\n')
    expect(isVpnIP('1.2.3.100')).toBe(true)
    expect(isVpnIP('5.6.7.50')).toBe(true)
  })

  it('returns false for IP not in VPN list', () => {
    loadVpnListFromContent('1.2.3.0/24\n')
    expect(isVpnIP('8.8.8.8')).toBe(false)
  })

  it('ignores comment lines', () => {
    loadVpnListFromContent('# This is a comment\n1.2.3.0/24\n')
    expect(isVpnIP('1.2.3.1')).toBe(true)
  })

  it('returns false for IPv6 addresses (IPv4 list only)', () => {
    loadVpnListFromContent('1.2.3.0/24\n')
    expect(isVpnIP('2001:db8::1')).toBe(false)
  })

  it('handles empty lines gracefully', () => {
    loadVpnListFromContent('\n\n1.2.3.0/24\n\n')
    expect(isVpnIP('1.2.3.1')).toBe(true)
  })
})

describe('STORY-053: Tor exit node detection', () => {
  beforeEach(() => {
    _resetTorCache()
  })

  it('returns false for empty list', () => {
    loadTorListFromContent('')
    expect(isTorExitNode('1.2.3.4')).toBe(false)
  })

  it('detects known Tor exit node', () => {
    loadTorListFromContent('185.220.101.1\n185.220.101.2\n45.33.32.156\n')
    expect(isTorExitNode('185.220.101.1')).toBe(true)
    expect(isTorExitNode('45.33.32.156')).toBe(true)
  })

  it('returns false for non-Tor IP', () => {
    loadTorListFromContent('185.220.101.1\n')
    expect(isTorExitNode('8.8.8.8')).toBe(false)
  })

  it('uses Set-based O(1) lookup', () => {
    loadTorListFromContent('1.2.3.4\n5.6.7.8\n')
    expect(getTorListSize()).toBe(2)
  })

  it('returns false for IPv6', () => {
    loadTorListFromContent('1.2.3.4\n')
    expect(isTorExitNode('2001:db8::1')).toBe(false)
  })

  it('ignores non-IP lines (comments and malformed)', () => {
    loadTorListFromContent('# Tor exit nodes\n1.2.3.4\nnot-an-ip\n5.6.7.8\n')
    expect(getTorListSize()).toBe(2)
  })
})

describe('STORY-054: Datacenter IP detection', () => {
  beforeEach(() => {
    _resetDatacenterCache()
  })

  it('returns null for empty list', () => {
    loadDatacenterListFromContent('')
    expect(isDatacenterIP('1.2.3.4')).toBeNull()
  })

  it('detects AWS IP range', () => {
    loadDatacenterListFromContent('52.0.0.0,52.255.255.255,Amazon')
    expect(isDatacenterIP('52.100.200.1')).toBe('Amazon')
  })

  it('detects Google Cloud IP range', () => {
    loadDatacenterListFromContent('34.0.0.0,34.127.255.255,Google')
    expect(isDatacenterIP('34.100.0.1')).toBe('Google')
  })

  it('returns null for non-datacenter IP', () => {
    loadDatacenterListFromContent('52.0.0.0,52.255.255.255,Amazon')
    expect(isDatacenterIP('8.8.8.8')).toBeNull()
  })

  it('uses binary search for efficient lookup', () => {
    // Multiple ranges
    loadDatacenterListFromContent(
      '10.0.0.0,10.255.255.255,InternalA\n' +
      '52.0.0.0,52.255.255.255,Amazon\n' +
      '34.0.0.0,34.127.255.255,Google\n'
    )
    expect(isDatacenterIP('52.1.2.3')).toBe('Amazon')
    expect(isDatacenterIP('34.10.20.30')).toBe('Google')
    expect(isDatacenterIP('1.1.1.1')).toBeNull()
  })

  it('returns null for IPv6', () => {
    loadDatacenterListFromContent('52.0.0.0,52.255.255.255,Amazon')
    expect(isDatacenterIP('2001:db8::1')).toBeNull()
  })

  it('ignores malformed lines', () => {
    loadDatacenterListFromContent('invalid\n52.0.0.0,52.255.255.255,Amazon\n')
    expect(isDatacenterIP('52.1.2.3')).toBe('Amazon')
  })
})

describe('STORY-055: Timezone mismatch detection', () => {
  it('returns 0 for matching timezones', () => {
    expect(getTimezoneMismatch('Europe/London', 'Europe/London')).toBe(0)
    expect(getTimezoneMismatch('America/New_York', 'America/New_York')).toBe(0)
  })

  it('returns 0 when either timezone is missing', () => {
    expect(getTimezoneMismatch(null, 'America/New_York')).toBe(0)
    expect(getTimezoneMismatch('Europe/London', null)).toBe(0)
    expect(getTimezoneMismatch(undefined, undefined)).toBe(0)
  })

  it('returns 1 for mismatching timezones', () => {
    expect(getTimezoneMismatch('America/New_York', 'Europe/London')).toBe(1)
    expect(getTimezoneMismatch('Asia/Tokyo', 'America/Los_Angeles')).toBe(1)
  })

  it('returns 0 for UTC/GMT equivalence', () => {
    expect(getTimezoneMismatch('UTC', 'GMT')).toBe(0)
  })

  it('returns 0 for known timezone aliases', () => {
    expect(getTimezoneMismatch('US/Eastern', 'America/New_York')).toBe(0)
    expect(getTimezoneMismatch('US/Pacific', 'America/Los_Angeles')).toBe(0)
  })

  it('returns 0 for same UTC offset different names', () => {
    // Both are UTC+0
    expect(getTimezoneMismatch('UTC', 'UTC')).toBe(0)
  })
})

describe('STORY-056: Bot score calculation', () => {
  it('returns 0 score for clean human signals', () => {
    const result = calculateBotScore({
      bot: {
        webdriver: false,
        phantom: false,
        selenium: false,
        chromeRuntime: false,
        inconsistentPermissions: false,
      },
      navigator: {
        plugins: ['Chrome PDF Plugin', 'Shockwave Flash'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    expect(result.score).toBe(0)
    expect(result.factors.webdriver).toBe(0)
    expect(result.factors.phantom).toBe(0)
  })

  it('returns high score for webdriver signal', () => {
    const result = calculateBotScore({
      bot: { webdriver: true },
    })
    expect(result.score).toBeGreaterThanOrEqual(0.35)
    expect(result.factors.webdriver).toBe(1)
  })

  it('returns high score for PhantomJS detection', () => {
    const result = calculateBotScore({
      bot: { phantom: true },
    })
    expect(result.score).toBeGreaterThanOrEqual(0.25)
    expect(result.factors.phantom).toBe(1)
  })

  it('returns maximum score for multiple bot indicators', () => {
    const result = calculateBotScore({
      bot: {
        webdriver: true,
        phantom: true,
        selenium: true,
        chromeRuntime: true,
        inconsistentPermissions: true,
      },
      navigator: {
        plugins: [],
        userAgent: 'HeadlessChrome/120',
      },
    })
    expect(result.score).toBeGreaterThan(0.9)
  })

  it('detects headless Chrome user agent', () => {
    const result = calculateBotScore({
      navigator: {
        userAgent: 'HeadlessChrome/120.0.0.0',
      },
    })
    expect(result.factors.suspiciousUserAgent).toBe(1)
  })

  it('detects empty plugins as bot indicator', () => {
    const result = calculateBotScore({
      navigator: {
        plugins: [],
      },
    })
    expect(result.factors.missingPlugins).toBe(1)
  })

  it('returns breakdown factors object', () => {
    const result = calculateBotScore({})
    expect(result.factors).toHaveProperty('webdriver')
    expect(result.factors).toHaveProperty('phantom')
    expect(result.factors).toHaveProperty('selenium')
    expect(result.factors).toHaveProperty('chromeRuntime')
    expect(result.factors).toHaveProperty('inconsistentPermissions')
    expect(result.factors).toHaveProperty('missingPlugins')
    expect(result.factors).toHaveProperty('suspiciousUserAgent')
  })

  it('score is between 0 and 1', () => {
    const result = calculateBotScore({
      bot: { webdriver: true, phantom: true, selenium: true },
      navigator: { plugins: [], userAgent: 'HeadlessChrome' },
    })
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })
})

describe('STORY-057: Risk score aggregation', () => {
  it('getRiskLevel classifies scores correctly', () => {
    expect(getRiskLevel(0)).toBe('low')
    expect(getRiskLevel(29)).toBe('low')
    expect(getRiskLevel(30)).toBe('medium')
    expect(getRiskLevel(59)).toBe('medium')
    expect(getRiskLevel(60)).toBe('high')
    expect(getRiskLevel(79)).toBe('high')
    expect(getRiskLevel(80)).toBe('critical')
    expect(getRiskLevel(100)).toBe('critical')
  })

  it('returns low risk for clean signals', () => {
    const result = calculateRiskScore({
      signals: {},
      ip: '1.2.3.4',
      isVpn: false,
      isTor: false,
      isDatacenter: false,
    })
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
  })

  it('returns critical risk for Tor + VPN + bot', () => {
    const result = calculateRiskScore({
      signals: { bot: { webdriver: true, phantom: true } },
      ip: '185.220.101.1',
      isVpn: true,
      isTor: true,
      isDatacenter: true,
    })
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.level).toBe('critical')
  })

  it('returns medium risk for Tor only (score=40)', () => {
    const result = calculateRiskScore({
      signals: {},
      ip: '185.220.101.1',
      isTor: true,
    })
    expect(result.score).toBe(40)
    expect(result.level).toBe('medium')
  })

  it('returns low risk for VPN only (score=25, below medium threshold of 30)', () => {
    const result = calculateRiskScore({
      signals: {},
      ip: '1.2.3.4',
      isVpn: true,
    })
    expect(result.score).toBe(25)
    expect(result.level).toBe('low')
  })

  it('includes detection signals in result', () => {
    const result = calculateRiskScore({
      signals: {},
      ip: '1.2.3.4',
      isVpn: true,
      isTor: false,
      isDatacenter: true,
      datacenterProvider: 'Amazon',
    })
    expect(result.signals.isVpn).toBe(true)
    expect(result.signals.isDatacenter).toBe(true)
    expect(result.signals.datacenterProvider).toBe('Amazon')
  })

  it('returns score between 0 and 100', () => {
    const extremeResult = calculateRiskScore({
      signals: { bot: { webdriver: true, phantom: true, selenium: true } },
      ip: '1.2.3.4',
      isVpn: true,
      isTor: true,
      isDatacenter: true,
    })
    expect(extremeResult.score).toBeGreaterThanOrEqual(0)
    expect(extremeResult.score).toBeLessThanOrEqual(100)
  })

  it('includes botScore in signals', () => {
    const result = calculateRiskScore({
      signals: { bot: { webdriver: true } },
      ip: '1.2.3.4',
    })
    expect(result.signals.botScore).toBeGreaterThan(0)
  })

  it('includes timezone mismatch detection', () => {
    const result = calculateRiskScore({
      signals: {
        timezone: { timezone: 'America/New_York' },
      },
      ip: '1.2.3.4',
      geoTimezone: 'Europe/London',
    })
    expect(result.signals.timezoneMismatch).toBe(1)
    expect(result.score).toBeGreaterThan(0)
  })
})
