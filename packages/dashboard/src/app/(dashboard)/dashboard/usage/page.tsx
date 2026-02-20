import { auth } from '@/auth'
import { getUsageData } from '@/lib/usage-data'
import { RequestsChart } from '@/components/dashboard/requests-chart'

const TIER_FEATURES: Record<string, { limit: string; description: string }> = {
  FREE: { limit: '1,000 / mo', description: 'Great for testing and small projects' },
  STARTER: { limit: '10,000 / mo', description: 'Perfect for early-stage apps' },
  GROWTH: { limit: '100,000 / mo', description: 'For growing applications' },
  SCALE: { limit: '1,000,000 / mo', description: 'For high-traffic applications' },
  ENTERPRISE: { limit: 'Unlimited', description: 'Custom limits and SLA' },
}

const NEXT_TIER: Record<string, string | null> = {
  FREE: 'STARTER',
  STARTER: 'GROWTH',
  GROWTH: 'SCALE',
  SCALE: 'ENTERPRISE',
  ENTERPRISE: null,
}

export default async function UsagePage() {
  const session = await auth()
  const accountId = session!.user!.accountId
  const tier = session!.user!.tier ?? 'FREE'

  const usage = await getUsageData(accountId, tier)
  const tierInfo = TIER_FEATURES[tier.toUpperCase()] ?? { limit: 'Unknown', description: '' }
  const nextTier = NEXT_TIER[tier.toUpperCase()] ?? null

  // Build last 30 days chart data from dailyBreakdown
  const chartData = usage.dailyBreakdown.slice(-7).map((d: { date: string; count: number }) => ({
    date: d.date,
    count: d.count,
  }))

  // Fill up to 7 days if less
  while (chartData.length < 7) {
    chartData.unshift({ date: '', count: 0 })
  }

  const isUnlimited = usage.tierLimit <= 0
  const clampedPercent = Math.min(usage.percentageUsed, 100)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Usage</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your API usage and limits
        </p>
      </div>

      {/* Current usage card */}
      <div className="rounded-lg border bg-card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">This Month</p>
            <p className="text-4xl font-bold mt-1">
              {usage.currentMonthUsage.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              of {isUnlimited ? 'unlimited' : usage.tierLimit.toLocaleString()} requests
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-primary/10 text-primary uppercase">
              {usage.tier}
            </span>
            <p className="text-sm text-muted-foreground mt-1">{tierInfo.limit}</p>
          </div>
        </div>

        {/* Progress bar */}
        {!isUnlimited && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{usage.percentageUsed}% used</span>
              <span>{(usage.tierLimit - usage.currentMonthUsage).toLocaleString()} remaining</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  clampedPercent >= 90
                    ? 'bg-red-500'
                    : clampedPercent >= 70
                    ? 'bg-yellow-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${clampedPercent}%` }}
                role="progressbar"
                aria-valuenow={usage.percentageUsed}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${usage.percentageUsed}% of monthly quota used`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      {nextTier && usage.percentageUsed >= 70 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 p-4 mb-6">
          <p className="text-sm font-medium">
            You&apos;re using {usage.percentageUsed}% of your quota.
            {' '}Consider upgrading to <strong>{nextTier}</strong> for more capacity.
          </p>
        </div>
      )}

      {/* Chart */}
      {chartData.some((d: { date: string; count: number }) => d.count > 0) && (
        <div className="mb-6">
          <RequestsChart data={chartData} />
        </div>
      )}

      {/* Usage by key */}
      {usage.usageByKey.length > 0 && (
        <div className="rounded-lg border bg-card mb-6">
          <div className="p-6 pb-3">
            <p className="text-sm font-medium text-muted-foreground">Usage by API Key</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Key Name</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Requests (this month)</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {usage.usageByKey.map((k: { keyId: string; keyName: string; count: number }) => (
                  <tr key={k.keyId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium">{k.keyName}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{k.count.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                      {usage.currentMonthUsage > 0
                        ? `${Math.round((k.count / usage.currentMonthUsage) * 100)}%`
                        : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tier info */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-base font-semibold mb-2">Current Plan: {usage.tier}</h2>
        <p className="text-sm text-muted-foreground mb-4">{tierInfo.description}</p>
        {nextTier && (
          <p className="text-sm text-muted-foreground">
            Upgrade to {nextTier} for {TIER_FEATURES[nextTier]?.limit}.
          </p>
        )}
      </div>
    </div>
  )
}
