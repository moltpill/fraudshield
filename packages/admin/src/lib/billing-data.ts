import { prisma } from './prisma'

export const TIER_MONTHLY_REVENUE: Record<string, number> = {
  STARTER: 14900,  // R149.00 in cents
  GROWTH: 39900,   // R399.00 in cents
  SCALE: 99900,    // R999.00 in cents
  ENTERPRISE: 0,   // custom
  FREE: 0,
}

export interface AdminBillingStats {
  mrr: number           // Monthly Recurring Revenue (cents)
  arr: number           // Annual Recurring Revenue (cents)
  revenueByTier: { tier: string; count: number; mrr: number }[]
  recentPayments: {
    id: string
    accountId: string
    email: string
    amount: number
    tier: string
    status: string
    stitchPaymentId: string | null
    createdAt: Date
  }[]
  failedPayments: {
    id: string
    accountId: string
    email: string
    amount: number
    tier: string
    status: string
    createdAt: Date
  }[]
  activeSubscriptions: number
  subscriptionsByTier: { tier: string; count: number }[]
}

export async function getAdminBillingStats(): Promise<AdminBillingStats> {
  const [accounts, recentPayments, failedPayments] = await Promise.all([
    // All active subscriptions by tier
    prisma.account.groupBy({
      by: ['tier'],
      where: {
        subscription: { status: 'active' },
      },
      _count: { id: true },
    }),
    // Recent completed/refunded payments with account info
    prisma.payment.findMany({
      where: { status: { in: ['completed', 'refunded'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { account: { select: { email: true } } },
    }),
    // Failed/pending payments with account info
    prisma.payment.findMany({
      where: { status: { in: ['failed', 'pending'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { account: { select: { email: true } } },
    }),
  ])

  // Calculate MRR from active subscriptions
  const revenueByTier = accounts.map(group => ({
    tier: group.tier,
    count: group._count.id,
    mrr: TIER_MONTHLY_REVENUE[group.tier] * group._count.id,
  }))

  const mrr = revenueByTier.reduce((sum, t) => sum + t.mrr, 0)
  const arr = mrr * 12

  const activeSubscriptions = accounts.reduce((sum, g) => sum + g._count.id, 0)

  const subscriptionsByTier = accounts.map(g => ({
    tier: g.tier,
    count: g._count.id,
  }))

  return {
    mrr,
    arr,
    revenueByTier,
    recentPayments: recentPayments.map(p => ({
      id: p.id,
      accountId: p.accountId,
      email: p.account.email,
      amount: p.amount,
      tier: p.tier,
      status: p.status,
      stitchPaymentId: p.stitchPaymentId,
      createdAt: p.createdAt,
    })),
    failedPayments: failedPayments.map(p => ({
      id: p.id,
      accountId: p.accountId,
      email: p.account.email,
      amount: p.amount,
      tier: p.tier,
      status: p.status,
      createdAt: p.createdAt,
    })),
    activeSubscriptions,
    subscriptionsByTier,
  }
}
