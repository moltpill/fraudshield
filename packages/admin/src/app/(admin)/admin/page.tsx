import Link from 'next/link'
import { Users, Key, Activity, UserPlus, TrendingUp, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getAdminOverviewStats,
  getTopAccountsByUsage,
  getNewSignups,
  getLast30DaysRequests,
} from '@/lib/admin-data'

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function RequestsChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return null
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const width = 600
  const height = 120
  const padding = { left: 40, right: 10, top: 10, bottom: 20 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - (d.count / maxCount) * chartH,
    date: d.date,
    count: d.count,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-label="Requests chart">
      <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
      ))}
      {/* Y-axis label */}
      <text x={padding.left - 5} y={padding.top + 4} textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))">
        {maxCount}
      </text>
      <text x={padding.left - 5} y={padding.top + chartH + 4} textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))">
        0
      </text>
      {/* X-axis labels: first and last */}
      <text x={padding.left} y={height - 2} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
        {data[0]?.date.slice(5)}
      </text>
      <text x={width - padding.right} y={height - 2} textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))">
        {data[data.length - 1]?.date.slice(5)}
      </text>
    </svg>
  )
}

const TIER_COLORS: Record<string, string> = {
  FREE: 'secondary',
  STARTER: 'outline',
  GROWTH: 'outline',
  SCALE: 'outline',
  ENTERPRISE: 'outline',
}

export default async function AdminOverviewPage() {
  const [stats, topAccounts, newSignups, last30DaysData] = await Promise.all([
    getAdminOverviewStats(),
    getTopAccountsByUsage(5),
    getNewSignups(8),
    getLast30DaysRequests(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Accounts"
          value={stats.totalAccounts.toLocaleString()}
          icon={Users}
          description="All registered accounts"
        />
        <StatCard
          title="Active API Keys"
          value={stats.activeApiKeys.toLocaleString()}
          icon={Key}
          description="Keys across all accounts"
        />
        <StatCard
          title="Requests Today"
          value={stats.requestsToday.toLocaleString()}
          icon={Activity}
          description="Total API calls today"
        />
        <StatCard
          title="New Signups (30d)"
          value={stats.newSignupsThisMonth.toLocaleString()}
          icon={UserPlus}
          description="New accounts this month"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Requests Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Requests (Last 30 Days)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <RequestsChart data={last30DaysData} />
          </CardContent>
        </Card>

        {/* System Health (stub) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Health</CardTitle>
            <CardDescription>Service status indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'API Server', status: 'healthy' },
              { name: 'Database', status: 'healthy' },
              { name: 'Admin Panel', status: 'healthy' },
              { name: 'Customer Dashboard', status: 'healthy' },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center justify-between">
                <span className="text-sm">{svc.name}</span>
                <div className="flex items-center gap-1.5">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  <span className="text-xs text-muted-foreground capitalize">{svc.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Accounts by Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Accounts by Usage</CardTitle>
            <CardDescription>Current month</CardDescription>
          </CardHeader>
          <CardContent>
            {topAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage data yet</p>
            ) : (
              <div className="space-y-2">
                {topAccounts.map((account) => (
                  <div key={account.accountId} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/accounts/${account.accountId}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {account.email}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Badge variant="outline" className="text-xs">{account.tier}</Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {account.usage.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Signups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Signups</CardTitle>
            <CardDescription>Latest account registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {newSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts yet</p>
            ) : (
              <div className="space-y-2">
                {newSignups.map((account) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/accounts/${account.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {account.email}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={TIER_COLORS[account.tier] as 'secondary' | 'outline'}
                      className="shrink-0 ml-4 text-xs"
                    >
                      {account.tier}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
