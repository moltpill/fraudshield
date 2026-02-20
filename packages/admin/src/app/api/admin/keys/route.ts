import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@sentinel/shared'
import { logAdminAction, AUDIT_ACTIONS } from '@/lib/audit-log'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role === 'READONLY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { accountId, name } = body

  if (!accountId || !name) {
    return NextResponse.json({ error: 'accountId and name are required' }, { status: 400 })
  }

  // Verify account exists
  const account = await prisma.account.findUnique({ where: { id: accountId } })
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const key = generateApiKey('live')

  const apiKey = await prisma.apiKey.create({
    data: {
      accountId,
      key,
      name,
      status: 'active',
    },
  })

  await logAdminAction({
    adminId: session.user.adminId,
    action: AUDIT_ACTIONS.CREATE_KEY,
    targetType: 'api_key',
    targetId: apiKey.id,
    details: { name, accountId, accountEmail: account.email },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ apiKey: { ...apiKey, key } }, { status: 201 })
}
