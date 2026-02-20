import { prisma } from './prisma'

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export interface OverviewStats {
  visitors30d: number
  requestsToday: number
  vpnPercent: number
  botPercent: number
}

export interface DailyUsage {
  date: string // YYYY-MM-DD
  count: number
}

export interface RecentVisitor {
  id: string
  firstSeen: Date
  lastSeen: Date
  visitCount: number
}

export async function getOverviewStats(accountId: string): Promise<OverviewStats> {
  const now = new Date()
  const thirtyDaysAgo = addDays(now, -30)
  const todayStart = startOfDay(now)
  const tomorrowStart = startOfDay(addDays(now, 1))

  const [visitors30d, requestsToday, totalEvents, vpnEvents, botEvents] = await Promise.all([
    prisma.visitor.count({
      where: {
        lastSeen: { gte: thirtyDaysAgo },
        events: { some: { apiKey: { accountId } } },
      },
    }),
    prisma.visitorEvent.count({
      where: {
        timestamp: { gte: todayStart, lt: tomorrowStart },
        apiKey: { accountId },
      },
    }),
    prisma.visitorEvent.count({
      where: { apiKey: { accountId } },
    }),
    prisma.visitorEvent.count({
      where: { apiKey: { accountId }, isVpn: true },
    }),
    prisma.visitorEvent.count({
      where: { apiKey: { accountId }, isBot: true },
    }),
  ])

  const vpnPercent = totalEvents > 0 ? Math.round((vpnEvents / totalEvents) * 100) : 0
  const botPercent = totalEvents > 0 ? Math.round((botEvents / totalEvents) * 100) : 0

  return { visitors30d, requestsToday, vpnPercent, botPercent }
}

export async function getLast7DaysUsage(accountId: string): Promise<DailyUsage[]> {
  const now = new Date()
  const sevenDaysAgo = startOfDay(addDays(now, -6)) // last 7 days including today

  const records = await prisma.usageRecord.findMany({
    where: {
      accountId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: 'asc' },
  })

  // Build full 7-day array (fill missing days with 0)
  const result: DailyUsage[] = []
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(addDays(now, -i))
    const key = d.toISOString().slice(0, 10)
    const record = records.find((r) => r.date.toISOString().slice(0, 10) === key)
    result.push({ date: key, count: record?.requestCount ?? 0 })
  }

  return result
}

export async function getRecentVisitors(accountId: string, limit = 10): Promise<RecentVisitor[]> {
  const visitors = await prisma.visitor.findMany({
    where: {
      events: { some: { apiKey: { accountId } } },
    },
    orderBy: { lastSeen: 'desc' },
    take: limit,
    select: {
      id: true,
      firstSeen: true,
      lastSeen: true,
      visitCount: true,
    },
  })
  return visitors
}
