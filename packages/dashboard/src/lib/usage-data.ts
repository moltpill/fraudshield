import { prisma } from './prisma'

export interface UsageData {
  currentMonthUsage: number
  tierLimit: number
  tier: string
  percentageUsed: number
  dailyBreakdown: { date: string; count: number }[]
  usageByKey: { keyId: string; keyName: string; count: number }[]
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

const TIER_LIMITS: Record<string, number> = {
  FREE: 1000,
  STARTER: 10000,
  GROWTH: 100000,
  SCALE: 1000000,
  ENTERPRISE: -1, // unlimited
}

export async function getUsageData(accountId: string, tier: string): Promise<UsageData> {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = startOfNextMonth(now)

  const [account, usageRecords, tierLimitRecord] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { tier: true } }),
    prisma.usageRecord.findMany({
      where: {
        accountId,
        date: { gte: monthStart, lt: monthEnd },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.tierLimit.findUnique({ where: { tier: tier.toUpperCase() } }),
  ])

  const currentMonthUsage = usageRecords.reduce((sum, r) => sum + r.requestCount, 0)
  const tierLimit = tierLimitRecord?.monthlyLimit ?? TIER_LIMITS[tier.toUpperCase()] ?? 1000
  const percentageUsed = tierLimit > 0 ? Math.round((currentMonthUsage / tierLimit) * 100) : 0

  // Daily breakdown for current month
  const dailyBreakdown = usageRecords.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    count: r.requestCount,
  }))

  // Usage by API key (from VisitorEvent counts this month)
  const apiKeys = await prisma.apiKey.findMany({
    where: { accountId },
    select: { id: true, name: true },
  })

  const keyUsageCounts = await Promise.all(
    apiKeys.map(async (key) => {
      const count = await prisma.visitorEvent.count({
        where: {
          apiKeyId: key.id,
          timestamp: { gte: monthStart, lt: monthEnd },
        },
      })
      return { keyId: key.id, keyName: key.name, count }
    })
  )

  const usageByKey = keyUsageCounts
    .filter((k) => k.count > 0)
    .sort((a, b) => b.count - a.count)

  return {
    currentMonthUsage,
    tierLimit,
    tier: account?.tier ?? tier,
    percentageUsed,
    dailyBreakdown,
    usageByKey,
  }
}
