import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createStitchSubscription, TIER_PRICES } from '@/lib/stitch'

const PAID_TIERS = ['STARTER', 'GROWTH', 'SCALE']

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { tier?: string }
  const tier = body.tier?.toUpperCase()

  if (!tier || !PAID_TIERS.includes(tier)) {
    return NextResponse.json(
      { error: 'Invalid tier. Must be STARTER, GROWTH, or SCALE' },
      { status: 400 }
    )
  }

  const amount = TIER_PRICES[tier]
  const account = await prisma.account.findUnique({
    where: { id: session.user.accountId },
    select: { id: true, email: true, name: true, tier: true, subscription: true },
  })

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Don't allow subscribing to the same tier
  if (account.tier === tier && account.subscription?.status === 'active') {
    return NextResponse.json(
      { error: 'Already subscribed to this tier' },
      { status: 409 }
    )
  }

  const merchantReference = `eyes-${tier.toLowerCase()}-${account.id}-${Date.now()}`
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() + 1)
  startDate.setDate(1) // First of next month

  const subscription = await createStitchSubscription({
    amount,
    merchantReference,
    startDate: startDate.toISOString(),
    payerFullName: account.name,
    email: account.email,
    payerId: account.id,
    initialAmount: amount,
  })

  // Create or update the Subscription record in our DB (pending until webhook confirms)
  await prisma.subscription.upsert({
    where: { accountId: account.id },
    create: {
      accountId: account.id,
      stitchSubscriptionId: subscription.id,
      tier,
      status: 'pending',
    },
    update: {
      stitchSubscriptionId: subscription.id,
      tier,
      status: 'pending',
      cancelledAt: null,
    },
  })

  // Create a pending payment record for the initial charge
  await prisma.payment.create({
    data: {
      accountId: account.id,
      tier,
      amount,
      status: 'pending',
      stitchPaymentId: null,
    },
  })

  return NextResponse.json({
    subscriptionId: subscription.id,
    authorizationUrl: subscription.authorizationUrl,
    tier,
    amount,
    merchantReference,
  })
}
