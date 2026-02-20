import { auth } from '@/auth'
import { getOverviewStats, getLast7DaysUsage, getRecentVisitors } from '@/lib/dashboard-data'
import { StatCard } from '@/components/dashboard/stat-card'
import { RequestsChart } from '@/components/dashboard/requests-chart'
import { RecentVisitors } from '@/components/dashboard/recent-visitors'

export default async function DashboardPage() {
  const session = await auth()
  const accountId = session!.user!.accountId

  const [stats, chartData, recentVisitors] = await Promise.all([
    getOverviewStats(accountId),
    getLast7DaysUsage(accountId),
    getRecentVisitors(accountId, 10),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Visitors (30d)"
          value={stats.visitors30d.toLocaleString()}
          description="Unique visitors in last 30 days"
        />
        <StatCard
          label="Requests Today"
          value={stats.requestsToday.toLocaleString()}
          description="API calls made today"
        />
        <StatCard
          label="VPN Traffic"
          value={`${stats.vpnPercent}%`}
          description="Requests from VPN IPs"
        />
        <StatCard
          label="Bot Traffic"
          value={`${stats.botPercent}%`}
          description="Requests with bot signals"
        />
      </div>

      {/* Chart */}
      <div className="mb-8">
        <RequestsChart data={chartData} />
      </div>

      {/* Recent visitors */}
      <RecentVisitors visitors={recentVisitors} />
    </div>
  )
}
