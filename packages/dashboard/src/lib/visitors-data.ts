import { prisma } from './prisma'

export interface VisitorRow {
  id: string
  firstSeen: Date
  lastSeen: Date
  visitCount: number
  riskScore: number
}

export function getRiskLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

interface GetVisitorsOptions {
  accountId: string
  search?: string
  risk?: string
  page?: number
  limit?: number
}

interface GetVisitorsResult {
  visitors: VisitorRow[]
  total: number
  totalPages: number
}

export async function getVisitors({
  accountId,
  search,
  risk,
  page = 1,
  limit = 20,
}: GetVisitorsOptions): Promise<GetVisitorsResult> {
  const offset = (page - 1) * limit

  // Build risk score filter
  let riskScoreFilter: { gte?: number; lt?: number } | undefined
  if (risk === 'high') riskScoreFilter = { gte: 70 }
  else if (risk === 'medium') riskScoreFilter = { gte: 30, lt: 70 }
  else if (risk === 'low') riskScoreFilter = { lt: 30 }

  const baseWhere = {
    ...(search ? { id: { contains: search } } : {}),
    events: {
      some: {
        apiKey: { accountId },
        ...(riskScoreFilter ? { riskScore: riskScoreFilter } : {}),
      },
    },
  }

  const [rawVisitors, total] = await Promise.all([
    prisma.visitor.findMany({
      where: baseWhere,
      orderBy: { lastSeen: 'desc' },
      take: limit,
      skip: offset,
      include: {
        events: {
          where: { apiKey: { accountId } },
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { riskScore: true },
        },
      },
    }),
    prisma.visitor.count({ where: baseWhere }),
  ])

  const visitors: VisitorRow[] = rawVisitors.map((v) => ({
    id: v.id,
    firstSeen: v.firstSeen,
    lastSeen: v.lastSeen,
    visitCount: v.visitCount,
    riskScore: v.events[0]?.riskScore ?? 0,
  }))

  return {
    visitors,
    total,
    totalPages: Math.ceil(total / limit),
  }
}
