/**
 * POST /v1/analyze endpoint
 *
 * Receives browser signals, computes fingerprint, stores visitor data,
 * and returns risk assessment with full detection results.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../lib/prisma.js'
import { computeFingerprint } from '../lib/fingerprint.js'
import { extractClientIp } from '../lib/ip.js'
import { getGeolocation } from '../lib/geo.js'
import { isVpnIP } from '../lib/vpn.js'
import { isTorExitNode } from '../lib/tor.js'
import { isDatacenterIP } from '../lib/datacenter.js'
import { calculateRiskScore } from '../lib/risk-score.js'

export const analyzeRoute = new Hono()

interface AnalyzeRequest {
  signals?: unknown
}

/**
 * Calculate visitor confidence based on visit history
 * - New visitors start at 0.5
 * - Confidence increases with visit count (capped at 0.99)
 */
function calculateConfidence(visitCount: number): number {
  if (visitCount <= 1) {
    return 0.5
  }
  // Logarithmic scaling: more visits = higher confidence, diminishing returns
  const confidence = Math.min(0.99, 0.5 + 0.1 * Math.log2(visitCount))
  return Math.round(confidence * 100) / 100
}

analyzeRoute.post('/analyze', async (c: Context) => {
  // Get API key from context (set by auth middleware)
  const apiKey = c.get('apiKey')

  // Parse request body
  let body: AnalyzeRequest
  try {
    body = await c.req.json()
  } catch {
    return c.json(
      { error: 'Invalid JSON body', code: 'INVALID_SIGNALS' },
      400
    )
  }

  // Validate signals
  const { signals } = body

  if (!signals) {
    return c.json(
      { error: 'Missing signals object', code: 'INVALID_SIGNALS' },
      400
    )
  }

  if (typeof signals !== 'object' || Array.isArray(signals)) {
    return c.json(
      { error: 'Signals must be an object', code: 'INVALID_SIGNALS' },
      400
    )
  }

  const signalsObj = signals as Record<string, unknown>

  // Compute fingerprint hash
  const fingerprint = computeFingerprint(signalsObj)

  const now = new Date()

  // Extract client IP
  const clientIp = extractClientIp(c.req.raw.headers)

  // Run geolocation and IP detection in parallel
  const [geo, vpn, tor, datacenterProvider] = await Promise.all([
    clientIp ? getGeolocation(clientIp) : Promise.resolve(null),
    clientIp ? Promise.resolve(isVpnIP(clientIp)) : Promise.resolve(false),
    clientIp ? Promise.resolve(isTorExitNode(clientIp)) : Promise.resolve(false),
    clientIp ? Promise.resolve(isDatacenterIP(clientIp)) : Promise.resolve(null),
  ])

  // Calculate risk score
  const riskResult = calculateRiskScore({
    signals: signalsObj,
    ip: clientIp,
    isVpn: vpn,
    isTor: tor,
    isDatacenter: datacenterProvider !== null,
    datacenterProvider,
    geoTimezone: geo?.timezone ?? null,
  })

  // Create or update visitor record
  const visitor = await prisma.visitor.upsert({
    where: { fingerprint },
    create: {
      fingerprint,
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
    },
    update: {
      lastSeen: now,
      visitCount: { increment: 1 },
    },
  })

  // Create visitor event with full detection results
  await prisma.visitorEvent.create({
    data: {
      visitorId: visitor.id,
      apiKeyId: apiKey.id,
      signals: JSON.stringify(signalsObj),
      riskScore: riskResult.score,
      isBot: riskResult.signals.botScore >= 0.5,
      isVpn: riskResult.signals.isVpn,
      isTor: riskResult.signals.isTor,
      isDatacenter: riskResult.signals.isDatacenter,
      ip: clientIp,
    },
  })

  // Calculate confidence based on visit history
  const confidence = calculateConfidence(visitor.visitCount)

  return c.json({
    visitorId: visitor.id,
    confidence,
    firstSeen: visitor.firstSeen.toISOString(),
    lastSeen: visitor.lastSeen.toISOString(),
    risk: {
      score: riskResult.score,
      level: riskResult.level,
    },
    signals: {
      vpn: riskResult.signals.isVpn,
      tor: riskResult.signals.isTor,
      datacenter: riskResult.signals.isDatacenter,
      datacenterProvider: riskResult.signals.datacenterProvider,
      bot: riskResult.signals.botScore >= 0.5,
      botScore: riskResult.signals.botScore,
      timezoneMismatch: riskResult.signals.timezoneMismatch > 0,
    },
    location: geo ? {
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      timezone: geo.timezone,
    } : null,
  })
})
