import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/audit-log'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { status, tier, name } = body

  const updateData: Record<string, string> = {}
  if (status) updateData.status = status
  if (tier) updateData.tier = tier
  if (name) updateData.name = name

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const account = await prisma.account.update({
    where: { id },
    data: updateData,
  })

  // Log the action
  const action = status === 'suspended'
    ? AUDIT_ACTIONS.SUSPEND_ACCOUNT
    : status === 'active'
    ? AUDIT_ACTIONS.UNSUSPEND_ACCOUNT
    : tier
    ? AUDIT_ACTIONS.CHANGE_TIER
    : AUDIT_ACTIONS.UPDATE_ACCOUNT

  await logAdminAction({
    adminId: session.user.adminId,
    action,
    targetType: 'account',
    targetId: id,
    details: updateData,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ account })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only SUPER_ADMIN can delete
  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  await prisma.account.delete({ where: { id } })

  await logAdminAction({
    adminId: session.user.adminId,
    action: AUDIT_ACTIONS.DELETE_ACCOUNT,
    targetType: 'account',
    targetId: id,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true })
}
