import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { cancelStitchSubscription } from '@/lib/stitch'

export async function POST() {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscription = await prisma.subscription.findUnique({
    where: { accountId: session.user.accountId },
  })

  if (!subscription) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  if (subscription.status === 'cancelled') {
    return NextResponse.json({ error: 'Subscription is already cancelled' }, { status: 409 })
  }

  // Cancel in Stitch if we have a Stitch subscription ID
  if (subscription.stitchSubscriptionId) {
    await cancelStitchSubscription(subscription.stitchSubscriptionId)
  }

  // Update our DB
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  })

  // Downgrade account to FREE on cancellation
  await prisma.account.update({
    where: { id: session.user.accountId },
    data: { tier: 'FREE' },
  })

  return NextResponse.json({ message: 'Subscription cancelled successfully' })
}
