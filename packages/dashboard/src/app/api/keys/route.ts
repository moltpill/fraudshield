import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function generateApiKey(type: 'live' | 'test'): string {
  return `fs_${type}_${randomBytes(16).toString('hex')}`
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { accountId: session.user.accountId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      key: true,
      status: true,
      allowedDomains: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.accountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { name?: string; type?: 'live' | 'test' }
  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'Key name is required' }, { status: 400 })
  }

  const keyType = body.type === 'test' ? 'test' : 'live'
  const keyValue = generateApiKey(keyType)

  const apiKey = await prisma.apiKey.create({
    data: {
      accountId: session.user.accountId,
      key: keyValue,
      name,
      status: 'active',
    },
  })

  return NextResponse.json({
    key: {
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key, // Shown only once
      status: apiKey.status,
      createdAt: apiKey.createdAt,
    },
  }, { status: 201 })
}
