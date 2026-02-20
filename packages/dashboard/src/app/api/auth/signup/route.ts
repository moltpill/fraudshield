import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_INPUT' }, { status: 400 })
  }

  const { email, name, password } = body as { email?: string; name?: string; password?: string }

  // Validate required fields
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required', code: 'INVALID_INPUT' }, { status: 400 })
  }
  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name is required', code: 'INVALID_INPUT' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check if email already taken
  const existing = await prisma.account.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return NextResponse.json(
      { error: 'Email is already registered', code: 'EMAIL_TAKEN' },
      { status: 409 }
    )
  }

  // Hash password and create account
  const hashedPassword = await bcrypt.hash(password, 12)
  const account = await prisma.account.create({
    data: {
      email: normalizedEmail,
      name: name.trim(),
      password: hashedPassword,
      tier: 'FREE',
      status: 'active',
    },
  })

  return NextResponse.json(
    { accountId: account.id, email: account.email, name: account.name },
    { status: 201 }
  )
}
