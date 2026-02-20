import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/stitch'

// Stitch subscription status → our subscription status mapping
const STITCH_SUB_STATUS_MAP: Record<string, string> = {
  AUTHORISED: 'active',
  FAILED: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  UNAUTHORISED: 'pending',
}

// Tier derived from merchant reference: eyes-{tier}-{accountId}-{ts}
function extractTierFromRef(merchantReference: string): string | null {
  const match = merchantReference.match(/^eyes-(\w+)-/)
  if (!match) return null
  return match[1].toUpperCase()
}

interface StitchWebhookEvent {
  id: string
  type: string
  data: {
    subscriptionId?: string
    paymentId?: string
    merchantReference?: string
    accountId?: string
    amount?: number
    status?: string
    payerId?: string
  }
}

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get('x-stitch-signature') ?? ''
  const secret = process.env.STITCH_WEBHOOK_SECRET ?? ''

  // Validate signature if secret is configured
  if (secret && !verifyWebhookSignature(payload, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: StitchWebhookEvent
  try {
    event = JSON.parse(payload) as StitchWebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // Idempotency: skip if we've already processed this event
  const eventId = event.id
  if (eventId) {
    const existing = await prisma.payment.findUnique({ where: { eventId } })
    if (existing) {
      return NextResponse.json({ message: 'Already processed' })
    }
  }

  try {
    switch (event.type) {
      case 'subscription.authorised':
      case 'subscription.updated': {
        const { subscriptionId, payerId, status } = event.data
        if (!subscriptionId || !payerId) break

        const ourStatus = STITCH_SUB_STATUS_MAP[status ?? ''] ?? 'pending'
        const subscription = await prisma.subscription.findFirst({
          where: { stitchSubscriptionId: subscriptionId },
        })

        if (!subscription) break

        const updateData: Record<string, unknown> = { status: ourStatus }
        if (ourStatus === 'active') {
          // Set billing period end to next month
          const nextMonth = new Date()
          nextMonth.setMonth(nextMonth.getMonth() + 1)
          updateData.currentPeriodEnd = nextMonth
        }

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: updateData,
        })

        // Upgrade account tier when subscription activates
        if (ourStatus === 'active') {
          await prisma.account.update({
            where: { id: subscription.accountId },
            data: { tier: subscription.tier },
          })
        }
        break
      }

      case 'payment.completed': {
        const { paymentId, merchantReference, amount, payerId } = event.data
        if (!payerId) break

        const tier = extractTierFromRef(merchantReference ?? '')

        // Find the subscription for this payer
        const subscription = await prisma.subscription.findUnique({
          where: { accountId: payerId },
        })

        // Mark the most recent pending payment as completed (or create a new record)
        const pendingPayment = await prisma.payment.findFirst({
          where: { accountId: payerId, status: 'pending' },
          orderBy: { createdAt: 'desc' },
        })

        if (pendingPayment) {
          await prisma.payment.update({
            where: { id: pendingPayment.id },
            data: {
              status: 'completed',
              stitchPaymentId: paymentId ?? null,
              eventId,
            },
          })
        } else {
          await prisma.payment.create({
            data: {
              accountId: payerId,
              subscriptionId: subscription?.id ?? null,
              stitchPaymentId: paymentId ?? null,
              amount: amount ?? 0,
              tier: tier ?? subscription?.tier ?? 'UNKNOWN',
              status: 'completed',
              eventId,
            },
          })
        }

        // Ensure subscription is active
        if (subscription) {
          const nextMonth = new Date()
          nextMonth.setMonth(nextMonth.getMonth() + 1)
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'active', currentPeriodEnd: nextMonth },
          })
          await prisma.account.update({
            where: { id: payerId },
            data: { tier: subscription.tier },
          })
        }
        break
      }

      case 'payment.failed': {
        const { paymentId, payerId } = event.data
        if (!payerId) break

        const subscription = await prisma.subscription.findUnique({
          where: { accountId: payerId },
        })

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'past_due' },
          })
        }

        // Record failed payment
        await prisma.payment.create({
          data: {
            accountId: payerId,
            subscriptionId: subscription?.id ?? null,
            stitchPaymentId: paymentId ?? null,
            amount: 0,
            tier: subscription?.tier ?? 'UNKNOWN',
            status: 'failed',
            eventId,
          },
        })
        break
      }

      case 'payment.refunded': {
        const { paymentId, payerId, amount } = event.data
        if (!payerId) break

        // Update the original payment to refunded
        if (paymentId) {
          await prisma.payment.updateMany({
            where: { stitchPaymentId: paymentId },
            data: { status: 'refunded' },
          })
        }

        // Record the refund as a separate payment entry with negative amount
        await prisma.payment.create({
          data: {
            accountId: payerId,
            amount: -(amount ?? 0),
            tier: 'REFUND',
            status: 'refunded',
            eventId,
          },
        })

        // Downgrade to FREE tier on refund
        await prisma.account.update({
          where: { id: payerId },
          data: { tier: 'FREE' },
        })

        // Cancel the subscription
        const subscription = await prisma.subscription.findUnique({
          where: { accountId: payerId },
        })
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'cancelled', cancelledAt: new Date() },
          })
        }
        break
      }

      default:
        // Unknown event type - log and return OK (don't fail)
        break
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
