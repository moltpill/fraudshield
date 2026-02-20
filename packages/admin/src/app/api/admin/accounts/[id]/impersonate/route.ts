import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/audit-log'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only SUPER_ADMIN and SUPPORT can impersonate
  if (!['SUPER_ADMIN', 'SUPPORT'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const account = await prisma.account.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  })

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Log the impersonation action
  await logAdminAction({
    adminId: session.user.adminId,
    action: AUDIT_ACTIONS.IMPERSONATE,
    targetType: 'account',
    targetId: id,
    details: { targetEmail: account.email, targetName: account.name },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  // Return the customer dashboard URL
  // In production this would generate a signed one-time token
  const dashboardUrl = `${process.env.DASHBOARD_URL ?? 'http://localhost:3002'}/dashboard`

  return NextResponse.json({
    success: true,
    dashboardUrl,
    message: `Impersonating ${account.name} (${account.email})`,
  })
}
