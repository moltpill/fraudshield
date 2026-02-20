import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getLast30DaysRequests, getAdminOverviewStats } from '@/lib/admin-data'

export default async function AdminMetricsPage() {
  const [stats, last30Days] = await Promise.all([
    getAdminOverviewStats(),
    getLast30DaysRequests(),
  ])

  const maxCount = Math.max(...last30Days.map((d) => d.count), 1)
  const totalRequests = last30Days.reduce((sum, d) => sum + d.count, 0)
  const avgDaily = Math.round(totalRequests / 30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Metrics</h1>
        <p className="text-muted-foreground">API usage and platform statistics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Daily Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgDaily.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Peak Day</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{maxCount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Request Volume (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {last30Days.slice(-14).map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{d.date.slice(5)}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {d.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
