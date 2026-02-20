import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json() as { name?: string; status?: string }

  // Verify key belongs to this account
  const existing = await prisma.apiKey.findFirst({
    where: { id, accountId: session.user.accountId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
    select: { id: true, name: true, status: true, createdAt: true },
  })

  return NextResponse.json({ key: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership then revoke (soft delete)
  const existing = await prisma.apiKey.findFirst({
    where: { id, accountId: session.user.accountId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.apiKey.update({
    where: { id },
    data: { status: 'revoked' },
  })

  return NextResponse.json({ success: true })
}
