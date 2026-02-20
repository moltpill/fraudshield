import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const where: Record<string, unknown> = {}
  if (searchParams.get('action')) where.action = searchParams.get('action')
  if (searchParams.get('adminId')) where.adminId = searchParams.get('adminId')

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
    include: {
      admin: { select: { email: true, name: true, role: true } },
    },
  })

  // Build CSV
  const header = 'Timestamp,Admin Email,Admin Name,Role,Action,Target Type,Target ID,Details,IP\n'
  const rows = logs.map((log) => {
    const details = log.details.replace(/"/g, '""') // escape quotes
    return [
      new Date(log.createdAt).toISOString(),
      log.admin.email,
      `"${log.admin.name}"`,
      log.admin.role,
      log.action,
      log.targetType,
      log.targetId,
      `"${details}"`,
      log.ip ?? '',
    ].join(',')
  })

  const csv = header + rows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
