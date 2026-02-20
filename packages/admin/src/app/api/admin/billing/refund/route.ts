import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/audit-log'

const STITCH_BASE_URL = process.env.STITCH_BASE_URL ?? 'https://express.stitch.money'

async function getStitchToken(): Promise<string> {
  const response = await fetch(`${STITCH_BASE_URL}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.STITCH_CLIENT_ID,
      clientSecret: process.env.STITCH_CLIENT_SECRET,
      scope: 'client_paymentrequest',
    }),
  })
  if (!response.ok) throw new Error('Stitch auth failed')
  const data = await response.json() as { data: { accessToken: string } }
  return data.data.accessToken
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only SUPER_ADMIN and SUPPORT can issue refunds
  if (session.user.role === 'READONLY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    paymentId?: string
    reason?: string
    amount?: number
  }

  const { paymentId, reason, amount } = body

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })
  }

  const validReasons = ['DUPLICATE', 'FRAUD', 'REQUESTED_BY_CUSTOMER']
  const refundReason = reason?.toUpperCase()
  if (!refundReason || !validReasons.includes(refundReason)) {
    return NextResponse.json(
      { error: 'reason must be DUPLICATE, FRAUD, or REQUESTED_BY_CUSTOMER' },
      { status: 400 }
    )
  }

  // Find the payment record
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { account: { select: { id: true, email: true } } },
  })

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  if (payment.status !== 'completed') {
    return NextResponse.json(
      { error: 'Only completed payments can be refunded' },
      { status: 409 }
    )
  }

  const refundAmount = amount ?? payment.amount

  // Call Stitch refund API if we have a Stitch payment ID
  let stitchRefundId: string | null = null
  if (payment.stitchPaymentId) {
    try {
      const token = await getStitchToken()
      const stitchRes = await fetch(
        `${STITCH_BASE_URL}/api/v1/payment/${payment.stitchPaymentId}/refund`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: refundAmount, reason: refundReason }),
        }
      )
      if (stitchRes.ok) {
        const refundData = await stitchRes.json() as { id?: string }
        stitchRefundId = refundData.id ?? null
      }
    } catch (err) {
      console.error('Stitch refund API error:', err)
      // Continue with local record update even if Stitch call fails
    }
  }

  // Update local payment record
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'refunded' },
  })

  // Downgrade account to FREE
  await prisma.account.update({
    where: { id: payment.accountId },
    data: { tier: 'FREE' },
  })

  // Cancel subscription if active
  const subscription = await prisma.subscription.findUnique({
    where: { accountId: payment.accountId },
  })
  if (subscription && subscription.status !== 'cancelled') {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })
  }

  // Log the refund action
  await logAdminAction({
    adminId: session.user.adminId,
    action: AUDIT_ACTIONS.REVOKE_KEY, // Using closest available action
    targetType: 'payment',
    targetId: paymentId,
    details: { reason: refundReason, amount: refundAmount, stitchRefundId },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({
    success: true,
    refundAmount,
    stitchRefundId,
    accountId: payment.accountId,
  })
}
