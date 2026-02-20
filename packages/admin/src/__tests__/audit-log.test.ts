import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: mockCreate,
    },
  },
}))

describe('Audit Log Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ id: 'log1' })
  })

  it('exports AUDIT_ACTIONS constants', async () => {
    const { AUDIT_ACTIONS } = await import('@/lib/audit-log')
    expect(AUDIT_ACTIONS.CREATE_ACCOUNT).toBe('CREATE_ACCOUNT')
    expect(AUDIT_ACTIONS.SUSPEND_ACCOUNT).toBe('SUSPEND_ACCOUNT')
    expect(AUDIT_ACTIONS.UNSUSPEND_ACCOUNT).toBe('UNSUSPEND_ACCOUNT')
    expect(AUDIT_ACTIONS.DELETE_ACCOUNT).toBe('DELETE_ACCOUNT')
    expect(AUDIT_ACTIONS.CHANGE_TIER).toBe('CHANGE_TIER')
    expect(AUDIT_ACTIONS.CREATE_KEY).toBe('CREATE_KEY')
    expect(AUDIT_ACTIONS.REVOKE_KEY).toBe('REVOKE_KEY')
    expect(AUDIT_ACTIONS.DELETE_KEY).toBe('DELETE_KEY')
    expect(AUDIT_ACTIONS.IMPERSONATE).toBe('IMPERSONATE')
    expect(AUDIT_ACTIONS.UPDATE_ACCOUNT).toBe('UPDATE_ACCOUNT')
  })

  it('logAdminAction creates audit log record', async () => {
    const { logAdminAction, AUDIT_ACTIONS } = await import('@/lib/audit-log')
    await logAdminAction({
      adminId: 'admin1',
      action: AUDIT_ACTIONS.SUSPEND_ACCOUNT,
      targetType: 'account',
      targetId: 'acc1',
      details: { reason: 'policy violation' },
      ip: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        adminId: 'admin1',
        action: 'SUSPEND_ACCOUNT',
        targetType: 'account',
        targetId: 'acc1',
        details: JSON.stringify({ reason: 'policy violation' }),
        ip: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
      },
    })
  })

  it('logAdminAction uses empty object for missing details', async () => {
    const { logAdminAction, AUDIT_ACTIONS } = await import('@/lib/audit-log')
    await logAdminAction({
      adminId: 'admin1',
      action: AUDIT_ACTIONS.REVOKE_KEY,
      targetType: 'api_key',
      targetId: 'key1',
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: '{}',
        ip: undefined,
        userAgent: undefined,
      }),
    })
  })

  it('logAdminAction returns the created record', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'log42', action: 'IMPERSONATE' })
    const { logAdminAction, AUDIT_ACTIONS } = await import('@/lib/audit-log')
    const result = await logAdminAction({
      adminId: 'admin1',
      action: AUDIT_ACTIONS.IMPERSONATE,
      targetType: 'account',
      targetId: 'acc2',
    })
    expect(result).toMatchObject({ id: 'log42' })
  })

  it('serializes details as JSON string', async () => {
    const { logAdminAction, AUDIT_ACTIONS } = await import('@/lib/audit-log')
    const details = { tier: 'ENTERPRISE', previousTier: 'STARTER' }
    await logAdminAction({
      adminId: 'admin1',
      action: AUDIT_ACTIONS.CHANGE_TIER,
      targetType: 'account',
      targetId: 'acc1',
      details,
    })

    const call = mockCreate.mock.calls[0][0]
    expect(call.data.details).toBe(JSON.stringify(details))
  })
})
