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

  if (session.user.role === 'READONLY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { status, reason } = body

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: { status },
  })

  await logAdminAction({
    adminId: session.user.adminId,
    action: AUDIT_ACTIONS.REVOKE_KEY,
    targetType: 'api_key',
    targetId: id,
    details: { reason: reason ?? '', newStatus: status },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ apiKey })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await prisma.apiKey.delete({ where: { id } })

  await logAdminAction({
    adminId: session.user.adminId,
    action: AUDIT_ACTIONS.DELETE_KEY,
    targetType: 'api_key',
    targetId: id,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ success: true })
}
