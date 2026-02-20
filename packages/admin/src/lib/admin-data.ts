import { prisma } from '@/lib/prisma'

// ─── Overview / Dashboard Stats ────────────────────────────────────────────

export async function getAdminOverviewStats() {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalAccounts,
    activeApiKeys,
    requestsToday,
    newSignupsThisMonth,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.apiKey.count({ where: { status: 'active' } }),
    prisma.usageRecord.aggregate({
      _sum: { requestCount: true },
      where: { date: { gte: startOfToday } },
    }),
    prisma.account.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
  ])

  return {
    totalAccounts,
    activeApiKeys,
    requestsToday: requestsToday._sum.requestCount ?? 0,
    newSignupsThisMonth,
  }
}

export async function getTopAccountsByUsage(limit = 5) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const records = await prisma.usageRecord.groupBy({
    by: ['accountId'],
    _sum: { requestCount: true },
    where: { date: { gte: startOfMonth } },
    orderBy: { _sum: { requestCount: 'desc' } },
    take: limit,
  })

  const accountIds = records.map((r) => r.accountId)
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, email: true, name: true, tier: true },
  })

  return records.map((r) => {
    const account = accounts.find((a) => a.id === r.accountId)
    return {
      accountId: r.accountId,
      email: account?.email ?? '',
      name: account?.name ?? '',
      tier: account?.tier ?? 'FREE',
      usage: r._sum.requestCount ?? 0,
    }
  })
}

export async function getNewSignups(limit = 10) {
  return prisma.account.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      status: true,
      createdAt: true,
    },
  })
}

export async function getLast30DaysRequests() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const records = await prisma.usageRecord.groupBy({
    by: ['date'],
    _sum: { requestCount: true },
    where: { date: { gte: thirtyDaysAgo } },
    orderBy: { date: 'asc' },
  })

  // Fill in missing days with 0
  const result: { date: string; count: number }[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const record = records.find(
      (r) => r.date.toISOString().split('T')[0] === dateStr
    )
    result.push({ date: dateStr, count: record?._sum.requestCount ?? 0 })
  }
  return result
}

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts({
  search = '',
  tier = '',
  status = '',
  page = 1,
  limit = 20,
}: {
  search?: string
  tier?: string
  status?: string
  page?: number
  limit?: number
}) {
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name: { contains: search } },
    ]
  }
  if (tier) where.tier = tier
  if (status) where.status = status

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.account.count({ where }),
  ])

  // Get current month usage for each account
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const accountIds = accounts.map((a) => a.id)
  const usageData = await prisma.usageRecord.groupBy({
    by: ['accountId'],
    _sum: { requestCount: true },
    where: {
      accountId: { in: accountIds },
      date: { gte: startOfMonth },
    },
  })

  const accountsWithUsage = accounts.map((account) => {
    const usage = usageData.find((u) => u.accountId === account.id)
    return {
      ...account,
      currentMonthUsage: usage?._sum.requestCount ?? 0,
    }
  })

  return { accounts: accountsWithUsage, total, page, limit }
}

export async function getAccountById(id: string) {
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      apiKeys: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!account) return null

  // Get current month usage
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const usage = await prisma.usageRecord.aggregate({
    _sum: { requestCount: true },
    where: { accountId: id, date: { gte: startOfMonth } },
  })

  // Get last 7 days usage
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const dailyUsage = await prisma.usageRecord.findMany({
    where: { accountId: id, date: { gte: sevenDaysAgo } },
    orderBy: { date: 'asc' },
  })

  return {
    ...account,
    currentMonthUsage: usage._sum.requestCount ?? 0,
    dailyUsage: dailyUsage.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      count: r.requestCount,
    })),
  }
}

// ─── API Keys ────────────────────────────────────────────────────────────────

export async function getAllApiKeys({
  search = '',
  status = '',
  accountId = '',
  page = 1,
  limit = 20,
}: {
  search?: string
  status?: string
  accountId?: string
  page?: number
  limit?: number
}) {
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (accountId) where.accountId = accountId
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { key: { contains: search } },
    ]
  }

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        account: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.apiKey.count({ where }),
  ])

  return { keys, total, page, limit }
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function getAuditLogs({
  adminId = '',
  action = '',
  search = '',
  from = '',
  to = '',
  page = 1,
  limit = 20,
}: {
  adminId?: string
  action?: string
  search?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}) {
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (adminId) where.adminId = adminId
  if (action) where.action = action
  if (from || to) {
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)
    where.createdAt = dateFilter
  }
  if (search) {
    where.details = { contains: search }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        admin: { select: { id: true, email: true, name: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total, page, limit }
}
