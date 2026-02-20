import { prisma } from './prisma'
import { TIER_PRICES } from './stitch'

export interface BillingData {
  subscription: {
    id: string
    tier: string
    status: string
    currentPeriodEnd: Date | null
    cancelledAt: Date | null
    stitchSubscriptionId: string | null
  } | null
  payments: {
    id: string
    amount: number
    tier: string
    status: string
    createdAt: Date
  }[]
  currentTier: string
}

export async function getBillingData(accountId: string): Promise<BillingData> {
  const [account, payments] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      select: {
        tier: true,
        subscription: {
          select: {
            id: true,
            tier: true,
            status: true,
            currentPeriodEnd: true,
            cancelledAt: true,
            stitchSubscriptionId: true,
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        tier: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  return {
    subscription: account?.subscription ?? null,
    payments,
    currentTier: account?.tier ?? 'FREE',
  }
}

export const PLAN_DETAILS = [
  {
    tier: 'FREE',
    label: 'Free',
    price: 0,
    priceLabel: 'R0/mo',
    limit: '1,000 requests/mo',
    features: ['Basic fingerprinting', 'Bot detection', 'Email support'],
  },
  {
    tier: 'STARTER',
    label: 'Starter',
    price: TIER_PRICES.STARTER,
    priceLabel: 'R149/mo',
    limit: '10,000 requests/mo',
    features: ['All Free features', 'VPN detection', 'API access', 'Priority support'],
  },
  {
    tier: 'GROWTH',
    label: 'Growth',
    price: TIER_PRICES.GROWTH,
    priceLabel: 'R399/mo',
    limit: '100,000 requests/mo',
    features: ['All Starter features', 'Tor detection', 'Datacenter detection', 'Webhook events'],
  },
  {
    tier: 'SCALE',
    label: 'Scale',
    price: TIER_PRICES.SCALE,
    priceLabel: 'R999/mo',
    limit: '1,000,000 requests/mo',
    features: ['All Growth features', 'Custom domains', 'SLA guarantee', 'Dedicated support'],
  },
  {
    tier: 'ENTERPRISE',
    label: 'Enterprise',
    price: 0,
    priceLabel: 'Custom',
    limit: 'Unlimited',
    features: ['All Scale features', 'Custom limits', 'Custom SLA', 'On-premise option'],
  },
]
