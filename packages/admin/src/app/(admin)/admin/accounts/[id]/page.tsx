import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Calendar, Activity, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAccountById } from '@/lib/admin-data'
import { AccountActions } from '@/components/admin/account-actions'

const STATUS_VARIANTS: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  active: 'secondary',
  suspended: 'destructive',
  cancelled: 'outline',
}

function UsageChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No usage data</p>
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const width = 400
  const height = 80
  const padding = { left: 30, right: 10, top: 5, bottom: 15 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding.top + chartH - (d.count / maxCount) * chartH,
    date: d.date,
    count: d.count,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-label="Usage chart">
      <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="hsl(var(--primary))" />
      ))}
    </svg>
  )
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const account = await getAccountById(id)

  if (!account) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/accounts"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            {account.email}
          </p>
        </div>
        <AccountActions
          accountId={account.id}
          currentStatus={account.status}
          currentTier={account.tier}
          currentName={account.name}
        />
      </div>

      {/* Account Info Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-base">{account.tier}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={STATUS_VARIANTS[account.status] ?? 'outline'} className="text-base capitalize">
              {account.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium">
              {new Date(account.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Usage Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Usage (Last 7 Days)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>
              {account.currentMonthUsage.toLocaleString()} requests this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart data={account.dailyUsage} />
          </CardContent>
        </Card>

        {/* Billing History (stub) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing History</CardTitle>
            <CardDescription>Payment history from Stripe</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Billing integration coming in Phase 6 (Stripe setup).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardDescription>{account.apiKeys.length} keys total</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Key</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {account.apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No API keys yet
                  </td>
                </tr>
              ) : (
                account.apiKeys.map((key) => (
                  <tr key={key.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {key.key.slice(0, 10)}••••••••{key.key.slice(-4)}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
