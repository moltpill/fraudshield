import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/audit-log'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role === 'READONLY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { ids, action } = body

  if (!ids?.length || !action) {
    return NextResponse.json({ error: 'ids and action are required' }, { status: 400 })
  }

  const status = action === 'suspend' ? 'suspended' : 'active'
  const auditAction = action === 'suspend' ? AUDIT_ACTIONS.SUSPEND_ACCOUNT : AUDIT_ACTIONS.UNSUSPEND_ACCOUNT

  await prisma.account.updateMany({
    where: { id: { in: ids } },
    data: { status },
  })

  // Log each action
  await Promise.all(
    ids.map((id: string) =>
      logAdminAction({
        adminId: session.user.adminId,
        action: auditAction,
        targetType: 'account',
        targetId: id,
        details: { bulkAction: action },
        ip: req.headers.get('x-forwarded-for') ?? undefined,
      })
    )
  )

  return NextResponse.json({ success: true, updated: ids.length })
}
