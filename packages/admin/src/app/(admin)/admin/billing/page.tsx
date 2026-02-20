import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function AdminBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Revenue and subscription management</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Billing Overview</CardTitle>
          <CardDescription>
            Stripe integration coming in Phase 6. This page will show MRR, ARR, revenue by tier,
            recent payments, and failed payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon: Stripe integration with subscription management.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
