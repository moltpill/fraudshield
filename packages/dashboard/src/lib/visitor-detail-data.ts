import { prisma } from './prisma'
import { getRiskLevel } from './visitors-data'

export interface VisitorDetail {
  id: string
  fingerprint: string
  firstSeen: Date
  lastSeen: Date
  visitCount: number
  latestRiskScore: number
  riskLevel: 'high' | 'medium' | 'low'
  isBot: boolean
  isVpn: boolean
  isTor: boolean
  isDatacenter: boolean
}

export interface VisitorEvent {
  id: string
  timestamp: Date
  riskScore: number
  isBot: boolean
  isVpn: boolean
  isTor: boolean
  isDatacenter: boolean
  ip: string | null
  signals: Record<string, unknown>
}

export interface VisitorDetailResult {
  visitor: VisitorDetail
  events: VisitorEvent[]
}

export async function getVisitorDetail(
  visitorId: string,
  accountId: string
): Promise<VisitorDetailResult | null> {
  const visitor = await prisma.visitor.findFirst({
    where: {
      id: visitorId,
      events: { some: { apiKey: { accountId } } },
    },
    include: {
      events: {
        where: { apiKey: { accountId } },
        orderBy: { timestamp: 'desc' },
        take: 50,
      },
    },
  })

  if (!visitor) return null

  const latestEvent = visitor.events[0]
  const latestRiskScore = latestEvent?.riskScore ?? 0
  const riskLevel = getRiskLevel(latestRiskScore)

  const isBot = visitor.events.some((e) => e.isBot)
  const isVpn = visitor.events.some((e) => e.isVpn)
  const isTor = visitor.events.some((e) => e.isTor)
  const isDatacenter = visitor.events.some((e) => e.isDatacenter)

  const events: VisitorEvent[] = visitor.events.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    riskScore: e.riskScore,
    isBot: e.isBot,
    isVpn: e.isVpn,
    isTor: e.isTor,
    isDatacenter: e.isDatacenter,
    ip: e.ip,
    signals: (() => {
      try {
        return JSON.parse(e.signals) as Record<string, unknown>
      } catch {
        return {}
      }
    })(),
  }))

  return {
    visitor: {
      id: visitor.id,
      fingerprint: visitor.fingerprint,
      firstSeen: visitor.firstSeen,
      lastSeen: visitor.lastSeen,
      visitCount: visitor.visitCount,
      latestRiskScore,
      riskLevel,
      isBot,
      isVpn,
      isTor,
      isDatacenter,
    },
    events,
  }
}
