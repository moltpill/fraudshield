import { auth } from '@/auth'
import { signOut } from '@/auth'

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session?.user?.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{session?.user?.email}</span>
            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium uppercase">
              {session?.user?.tier}
            </span>
          </div>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
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
