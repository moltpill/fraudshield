import { auth } from '@/auth'

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Account ID</p>
          <p className="mt-1 font-mono text-sm truncate">
            {session?.user?.accountId}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Current Tier</p>
          <p className="mt-1 text-2xl font-bold">{session?.user?.tier}</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <p className="mt-1 text-2xl font-bold text-green-600">Active</p>
        </div>
      </div>
    </div>
  )
}
