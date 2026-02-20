import { prisma } from '@/lib/prisma'

export const AUDIT_ACTIONS = {
  CREATE_ACCOUNT: 'CREATE_ACCOUNT',
  UPDATE_ACCOUNT: 'UPDATE_ACCOUNT',
  SUSPEND_ACCOUNT: 'SUSPEND_ACCOUNT',
  UNSUSPEND_ACCOUNT: 'UNSUSPEND_ACCOUNT',
  DELETE_ACCOUNT: 'DELETE_ACCOUNT',
  CHANGE_TIER: 'CHANGE_TIER',
  CREATE_KEY: 'CREATE_KEY',
  REVOKE_KEY: 'REVOKE_KEY',
  DELETE_KEY: 'DELETE_KEY',
  IMPERSONATE: 'IMPERSONATE',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

interface LogAdminActionParams {
  adminId: string
  action: AuditAction
  targetType: string
  targetId: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

export async function logAdminAction({
  adminId,
  action,
  targetType,
  targetId,
  details = {},
  ip,
  userAgent,
}: LogAdminActionParams) {
  return prisma.auditLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details: JSON.stringify(details),
      ip,
      userAgent,
    },
  })
}
