import Link from 'next/link'
import type { RecentVisitor } from '@/lib/dashboard-data'

interface RecentVisitorsProps {
  visitors: RecentVisitor[]
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RecentVisitors({ visitors }: RecentVisitorsProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6 pb-3">
        <p className="text-sm font-medium text-muted-foreground">Recent Visitors</p>
      </div>
      {visitors.length === 0 ? (
        <div className="px-6 pb-6 text-sm text-muted-foreground">
          No visitors yet. Integrate the SDK to start tracking.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Visitor ID</th>
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">Last Seen</th>
                <th className="px-6 py-3 text-right font-medium text-muted-foreground">Visits</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3">
                    <Link
                      href={`/dashboard/visitors/${v.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {v.id.slice(0, 12)}...
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {formatDate(v.lastSeen)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    {v.visitCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
