import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AccountsFilters } from '@/components/admin/accounts-filters'
import { getAccounts } from '@/lib/admin-data'

const STATUS_VARIANTS: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  active: 'secondary',
  suspended: 'destructive',
  cancelled: 'outline',
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const { accounts, total } = await getAccounts({
    search: params.search ?? '',
    tier: params.tier ?? '',
    status: params.status ?? '',
    page,
    limit: 20,
  })

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} total accounts
          </p>
        </div>
      </div>

      <AccountsFilters />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Tier</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Usage (MTD)</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No accounts found
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/accounts/${account.id}`}
                          className="font-medium hover:underline text-primary"
                        >
                          {account.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{account.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{account.tier}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[account.status] ?? 'outline'} className="text-xs capitalize">
                          {account.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {account.currentMonthUsage.toLocaleString()}
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
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
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
