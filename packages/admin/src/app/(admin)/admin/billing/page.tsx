import Link from 'next/link'
import { DollarSign, TrendingUp, Users, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAdminBillingStats } from '@/lib/billing-data'
import { RefundButton } from '@/components/admin/billing-refund-button'

function formatZAR(cents: number): string {
  return `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const TIER_COLORS: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  FREE: 'secondary',
  STARTER: 'outline',
  GROWTH: 'outline',
  SCALE: 'outline',
  ENTERPRISE: 'outline',
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string
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

export default async function AdminBillingPage() {
  const stats = await getAdminBillingStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Revenue overview and subscription management</p>
      </div>

      {/* MRR / ARR / Subscriptions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="MRR"
          value={formatZAR(stats.mrr)}
          icon={DollarSign}
          description="Monthly Recurring Revenue"
        />
        <StatCard
          title="ARR"
          value={formatZAR(stats.arr)}
          icon={TrendingUp}
          description="Annual Recurring Revenue"
        />
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions.toString()}
          icon={Users}
          description="Paying customers"
        />
        <StatCard
          title="Failed Payments"
          value={stats.failedPayments.length.toString()}
          icon={AlertCircle}
          description="Pending resolution"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue by Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Tier</CardTitle>
            <CardDescription>Active subscriptions breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.revenueByTier.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active subscriptions yet</p>
            ) : (
              <div className="space-y-3">
                {stats.revenueByTier
                  .sort((a, b) => b.mrr - a.mrr)
                  .map((row) => (
                  <div key={row.tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={TIER_COLORS[row.tier] ?? 'outline'} className="text-xs">
                        {row.tier}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {row.count} {row.count === 1 ? 'account' : 'accounts'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatZAR(row.mrr)}/mo
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-sm font-medium">Total MRR</span>
                  <span className="text-sm font-bold">{formatZAR(stats.mrr)}/mo</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failed / Pending Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Failed &amp; Pending Payments</CardTitle>
            <CardDescription>Payments requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.failedPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No failed payments</p>
            ) : (
              <div className="space-y-2">
                {stats.failedPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/accounts/${p.accountId}`}
                        className="font-medium hover:underline truncate block text-sm"
                      >
                        {p.email}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.createdAt)} · {p.tier}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === 'failed'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Payments</CardTitle>
          <CardDescription>Completed and refunded transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/accounts/${payment.accountId}`}
                          className="font-medium hover:underline"
                        >
                          {payment.email}
                        </Link>
                        {payment.stitchPaymentId && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {payment.stitchPaymentId.slice(0, 12)}...
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={TIER_COLORS[payment.tier] ?? 'outline'} className="text-xs">
                          {payment.tier}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {payment.amount < 0
                          ? <span className="text-blue-600">-{formatZAR(-payment.amount)}</span>
                          : formatZAR(payment.amount)
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          payment.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : payment.status === 'refunded'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payment.status === 'completed' && (
                          <RefundButton
                            paymentId={payment.id}
                            amount={payment.amount}
                            email={payment.email}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
