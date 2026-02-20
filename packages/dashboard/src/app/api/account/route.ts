import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    name?: string
    email?: string
    currentPassword?: string
    newPassword?: string
    webhookUrl?: string
  }

  const updates: Record<string, string> = {}

  if (body.name !== undefined) {
    updates.name = body.name.trim()
  }

  if (body.email !== undefined) {
    const existing = await prisma.account.findUnique({ where: { email: body.email } })
    if (existing && existing.id !== session.user.accountId) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    updates.email = body.email.trim().toLowerCase()
  }

  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    }
    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
      select: { password: true },
    })
    if (!account?.password) {
      return NextResponse.json({ error: 'No password set' }, { status: 400 })
    }
    const valid = await bcrypt.compare(body.currentPassword, account.password)
    if (!valid) {
      return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 })
    }
    updates.password = await bcrypt.hash(body.newPassword, 10)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const updated = await prisma.account.update({
    where: { id: session.user.accountId },
    data: updates,
    select: { id: true, name: true, email: true, tier: true },
  })

  return NextResponse.json({ account: updated })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.account.delete({ where: { id: session.user.accountId } })
  return NextResponse.json({ success: true })
}
