/**
 * POST /v1/analyze endpoint
 * 
 * Receives browser signals, computes fingerprint, stores visitor data.
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../lib/prisma.js'
import { computeFingerprint } from '../lib/fingerprint.js'
import { extractClientIp } from '../lib/ip.js'

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

  // Compute fingerprint hash
  const fingerprint = computeFingerprint(signals as Record<string, unknown>)
  
  const now = new Date()

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

  // Extract client IP from request headers
  const clientIp = extractClientIp(c.req.raw.headers)

  // Create visitor event
  await prisma.visitorEvent.create({
    data: {
      visitorId: visitor.id,
      apiKeyId: apiKey.id,
      signals: JSON.stringify(signals),
      riskScore: 0, // TODO: Implement risk scoring in future story
      isBot: false, // TODO: Implement bot detection in future story
      isVpn: false, // TODO: Implement VPN detection in future story
      isTor: false, // TODO: Implement Tor detection in future story
      isDatacenter: false, // TODO: Implement datacenter detection in future story
      ip: clientIp, // Client IP address (IPv4 or IPv6)
    },
  })

  // Calculate confidence based on visit history
  const confidence = calculateConfidence(visitor.visitCount)

  return c.json({
    visitorId: visitor.id,
    confidence,
    firstSeen: visitor.firstSeen.toISOString(),
    lastSeen: visitor.lastSeen.toISOString(),
  })
})
