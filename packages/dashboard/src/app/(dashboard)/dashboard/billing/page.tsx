import { auth } from '@/auth'
import { getBillingData, PLAN_DETAILS } from '@/lib/billing-data'
import { UpgradeButton, CancelButton } from '@/components/billing/upgrade-button'
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: 'Active', icon: CheckCircle2, className: 'text-green-600 bg-green-50 border-green-200' },
    pending: { label: 'Pending Authorization', icon: Clock, className: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    past_due: { label: 'Past Due', icon: AlertCircle, className: 'text-orange-600 bg-orange-50 border-orange-200' },
    cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-red-600 bg-red-50 border-red-200' },
    expired: { label: 'Expired', icon: XCircle, className: 'text-gray-600 bg-gray-50 border-gray-200' },
    free: { label: 'Free Plan', icon: CheckCircle2, className: 'text-blue-600 bg-blue-50 border-blue-200' },
  }[status] ?? { label: status, icon: Clock, className: 'text-gray-600 bg-gray-50 border-gray-200' }

  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${config.className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {config.label}
    </span>
  )
}

function formatZAR(cents: number): string {
  return `R${Math.abs(cents / 100).toFixed(2)}`
}

function formatDate(date: Date | null | string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function BillingPage() {
  const session = await auth()
  const accountId = session!.user!.accountId
  const billing = await getBillingData(accountId)

  const currentPlan = PLAN_DETAILS.find(p => p.tier === billing.currentTier) ?? PLAN_DETAILS[0]
  const subscriptionStatus = billing.subscription?.status ?? 'free'
  const isSubscribed = billing.subscription?.status === 'active'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and view payment history
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-lg border bg-card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Current Plan</p>
            <h2 className="text-2xl font-bold">{currentPlan.label}</h2>
            <p className="text-muted-foreground mt-1">{currentPlan.priceLabel} · {currentPlan.limit}</p>
          </div>
          <StatusBadge status={subscriptionStatus} />
        </div>

        {billing.subscription && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
            {billing.subscription.currentPeriodEnd && (
              <div>
                <p className="text-muted-foreground">Next billing date</p>
                <p className="font-medium">{formatDate(billing.subscription.currentPeriodEnd)}</p>
              </div>
            )}
            {billing.subscription.cancelledAt && (
              <div>
                <p className="text-muted-foreground">Cancelled on</p>
                <p className="font-medium">{formatDate(billing.subscription.cancelledAt)}</p>
              </div>
            )}
          </div>
        )}

        {billing.subscription?.status === 'pending' && (
          <div className="mt-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Your subscription is awaiting authorization. Please check your email or visit the
              authorization link to complete setup.
            </p>
          </div>
        )}

        {isSubscribed && (
          <div className="mt-4">
            <CancelButton />
          </div>
        )}
      </div>

      {/* Plan Comparison Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PLAN_DETAILS.map((plan) => {
            const isCurrent = plan.tier === billing.currentTier
            const isPaid = plan.price > 0
            const isEnterprise = plan.tier === 'ENTERPRISE'

            return (
              <div
                key={plan.tier}
                className={`rounded-lg border p-4 flex flex-col ${
                  isCurrent
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'bg-card'
                }`}
              >
                <div className="mb-3">
                  <p className="font-semibold">{plan.label}</p>
                  <p className="text-2xl font-bold mt-1">{plan.priceLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1">{plan.limit}</p>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground flex-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span className="text-xs text-center text-primary font-medium py-2">
                    Current plan
                  </span>
                ) : isEnterprise ? (
                  <a
                    href="mailto:sales@usesentinel.dev"
                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground text-center"
                  >
                    Contact Sales
                  </a>
                ) : isPaid ? (
                  <UpgradeButton
                    tier={plan.tier}
                    label={`Upgrade to ${plan.label}`}
                    variant={plan.tier === 'STARTER' ? 'primary' : 'outline'}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment History */}
      {billing.payments.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-6 pb-3">
            <h2 className="text-base font-semibold">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {billing.payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="px-6 py-3 text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-3 font-medium capitalize">
                      {payment.tier.toLowerCase()}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium">
                      {payment.amount < 0 ? `-${formatZAR(-payment.amount)}` : formatZAR(payment.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        payment.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        payment.status === 'refunded' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {billing.payments.length === 0 && (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm">
          No payment history yet.
        </div>
      )}
    </div>
  )
}
