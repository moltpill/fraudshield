import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAllApiKeys } from '@/lib/admin-data'
import { IssueKeyButton, RevokeKeyButton } from '@/components/admin/api-keys-admin-manager'

export default async function AdminApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  const { keys, total } = await getAllApiKeys({
    search: params.search ?? '',
    status: params.status ?? '',
    accountId: params.accountId ?? '',
    page,
    limit: 25,
  })

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">{total.toLocaleString()} keys across all accounts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          defaultValue={params.status ?? ''}
          onChange={(e) => {
            const url = new URL(window.location.href)
            if (e.target.value) url.searchParams.set('status', e.target.value)
            else url.searchParams.delete('status')
            window.location.href = url.toString()
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Key</th>
                  <th className="px-4 py-3 text-left font-medium">Account</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No API keys found
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{key.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {key.key.slice(0, 10)}••••{key.key.slice(-4)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/accounts/${key.account.id}`}
                          className="text-primary hover:underline text-xs"
                        >
                          {key.account.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={key.status === 'active' ? 'secondary' : 'destructive'}
                          className="text-xs capitalize"
                        >
                          {key.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {key.status === 'active' && (
                          <RevokeKeyButton keyId={key.id} keyName={key.name} />
                        )}
                      </td>
                    </tr>
                  ))
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
