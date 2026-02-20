import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAuditLogs } from '@/lib/admin-data'

const ACTION_COLORS: Record<string, string> = {
  CREATE_ACCOUNT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  UPDATE_ACCOUNT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SUSPEND_ACCOUNT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  UNSUSPEND_ACCOUNT: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  DELETE_ACCOUNT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CHANGE_TIER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  CREATE_KEY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REVOKE_KEY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  DELETE_KEY: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  IMPERSONATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  const { logs, total } = await getAuditLogs({
    adminId: params.adminId ?? '',
    action: params.action ?? '',
    search: params.search ?? '',
    from: params.from ?? '',
    to: params.to ?? '',
    page,
    limit: 25,
  })

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">{total.toLocaleString()} logged actions</p>
        </div>
        {/* Export CSV link */}
        <a
          href="/api/admin/audit-log/export"
          className="text-sm text-primary hover:underline"
          download
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search in details..."
          defaultValue={params.search ?? ''}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm max-w-xs"
          onChange={(e) => {
            const url = new URL(window.location.href)
            if (e.target.value) url.searchParams.set('search', e.target.value)
            else url.searchParams.delete('search')
            url.searchParams.delete('page')
            window.location.href = url.toString()
          }}
        />
        <select
          defaultValue={params.action ?? ''}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          onChange={(e) => {
            const url = new URL(window.location.href)
            if (e.target.value) url.searchParams.set('action', e.target.value)
            else url.searchParams.delete('action')
            window.location.href = url.toString()
          }}
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <input
          type="date"
          defaultValue={params.from ?? ''}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          onChange={(e) => {
            const url = new URL(window.location.href)
            if (e.target.value) url.searchParams.set('from', e.target.value)
            else url.searchParams.delete('from')
            window.location.href = url.toString()
          }}
          aria-label="From date"
        />
        <input
          type="date"
          defaultValue={params.to ?? ''}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          onChange={(e) => {
            const url = new URL(window.location.href)
            if (e.target.value) url.searchParams.set('to', e.target.value)
            else url.searchParams.delete('to')
            window.location.href = url.toString()
          }}
          aria-label="To date"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium">Admin</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Target</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No audit log entries found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const details = (() => {
                      try {
                        return JSON.parse(log.details)
                      } catch {
                        return {}
                      }
                    })()

                    return (
                      <tr key={log.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-xs">{log.admin.name}</p>
                            <p className="text-xs text-muted-foreground">{log.admin.role}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-800'}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-xs font-medium capitalize">{log.targetType.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                              {log.targetId}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {Object.keys(details).length > 0
                            ? Object.entries(details)
                                .slice(0, 2)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')
                            : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="px-3 py-1.5 rounded-md border hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="px-3 py-1.5 rounded-md border hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
