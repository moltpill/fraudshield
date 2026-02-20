/**
 * STORY-057: Risk score aggregation
 *
 * Combines all detection signals into an overall risk score (0-100)
 * with level classification: low, medium, high, critical.
 */

import { calculateBotScore } from './bot-score.js'
import { getTimezoneMismatch } from './timezone.js'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface DetectionSignals {
  isVpn: boolean
  isTor: boolean
  isDatacenter: boolean
  datacenterProvider: string | null
  botScore: number
  botFactors: Record<string, number>
  timezoneMismatch: number
  geoTimezone: string | null
  browserTimezone: string | null
}

export interface RiskScoreResult {
  /** Overall risk score: 0-100 */
  score: number
  /** Risk level derived from score */
  level: RiskLevel
  /** Individual signal scores */
  signals: DetectionSignals
}

// Risk weights (contribution to overall score)
const RISK_WEIGHTS = {
  tor: 40,          // Very high risk — strong anonymization
  vpn: 25,          // High risk — anonymization layer
  botScore: 20,     // High risk if bot confirmed (scaled)
  datacenter: 10,   // Medium risk — cloud/hosting IP
  timezoneMismatch: 5, // Low risk — additional signal
}

// Risk level thresholds
const RISK_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 30,
  low: 0,
}

/**
 * Classify a numeric score into a risk level.
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.critical) return 'critical'
  if (score >= RISK_THRESHOLDS.high) return 'high'
  if (score >= RISK_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export interface RiskScoreInput {
  signals: Record<string, unknown>
  ip: string | null
  isVpn?: boolean
  isTor?: boolean
  isDatacenter?: boolean
  datacenterProvider?: string | null
  geoTimezone?: string | null
}

/**
 * Calculate the overall risk score from all detection signals.
 *
 * @param input - Detection input with signals, IP, and detection flags
 * @returns RiskScoreResult with score (0-100), level, and signal breakdown
 */
export function calculateRiskScore(input: RiskScoreInput): RiskScoreResult {
  const {
    signals,
    isVpn = false,
    isTor = false,
    isDatacenter = false,
    datacenterProvider = null,
    geoTimezone = null,
  } = input

  // Calculate bot score from signals
  const botResult = calculateBotScore(signals as Parameters<typeof calculateBotScore>[0])

  // Get browser timezone from signals
  const browserTimezone = (signals.timezone as { timezone?: string } | undefined)?.timezone ?? null

  // Calculate timezone mismatch
  const timezoneMismatch = getTimezoneMismatch(browserTimezone, geoTimezone)

  // Calculate weighted risk score
  let score = 0

  if (isTor) score += RISK_WEIGHTS.tor
  if (isVpn) score += RISK_WEIGHTS.vpn
  if (isDatacenter) score += RISK_WEIGHTS.datacenter
  if (timezoneMismatch > 0) score += RISK_WEIGHTS.timezoneMismatch

  // Bot score is a probability (0-1), scale to contribution weight
  score += botResult.score * RISK_WEIGHTS.botScore

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, Math.round(score)))

  return {
    score,
    level: getRiskLevel(score),
    signals: {
      isVpn,
      isTor,
      isDatacenter,
      datacenterProvider,
      botScore: botResult.score,
      botFactors: botResult.factors,
      timezoneMismatch,
      geoTimezone,
      browserTimezone,
    },
  }
}
