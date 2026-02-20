import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // ignore — name is optional
  }

  const name = (body.name as string | undefined)?.trim() || 'Default Key'
  const rawKey = nanoid(30)
  const key = `eye_live_${rawKey}`

  const apiKey = await prisma.apiKey.create({
    data: {
      accountId: session.user.accountId,
      key,
      name,
      status: 'active',
    },
  })

  return NextResponse.json(
    { id: apiKey.id, key: apiKey.key, name: apiKey.name, status: apiKey.status },
    { status: 201 }
  )
}
