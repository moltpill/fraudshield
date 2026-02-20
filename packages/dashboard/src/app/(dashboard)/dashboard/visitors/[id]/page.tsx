import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/auth'
import { getVisitorDetail, type VisitorEvent } from '@/lib/visitor-detail-data'
import { Badge } from '@/components/ui/badge'

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VisitorDetailPage({ params }: PageProps) {
  const session = await auth()
  const accountId = session!.user!.accountId
  const { id } = await params

  const data = await getVisitorDetail(id, accountId)
  if (!data) notFound()

  const { visitor, events } = data

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/visitors"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to visitors
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono">{visitor.id.slice(0, 16)}...</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            Fingerprint: {visitor.fingerprint.slice(0, 24)}...
          </p>
        </div>
        <Badge
          variant={
            visitor.riskLevel === 'high' ? 'danger' : visitor.riskLevel === 'medium' ? 'warning' : 'success'
          }
          className="text-sm px-3 py-1"
        >
          {visitor.riskLevel} risk
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">First Seen</p>
          <p className="mt-1 font-medium">{formatDate(visitor.firstSeen)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Last Seen</p>
          <p className="mt-1 font-medium">{formatDate(visitor.lastSeen)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Visits</p>
          <p className="mt-1 text-2xl font-bold">{visitor.visitCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Risk Score</p>
          <p className="mt-1 text-2xl font-bold">{visitor.latestRiskScore}</p>
        </div>
      </div>

      {/* Detection flags */}
      <div className="rounded-lg border bg-card p-6 mb-8">
        <h2 className="text-base font-semibold mb-4">Detection Flags</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant={visitor.isVpn ? 'warning' : 'outline'}>
            VPN: {visitor.isVpn ? 'Detected' : 'None'}
          </Badge>
          <Badge variant={visitor.isTor ? 'danger' : 'outline'}>
            Tor: {visitor.isTor ? 'Detected' : 'None'}
          </Badge>
          <Badge variant={visitor.isBot ? 'danger' : 'outline'}>
            Bot: {visitor.isBot ? 'Detected' : 'None'}
          </Badge>
          <Badge variant={visitor.isDatacenter ? 'warning' : 'outline'}>
            Datacenter: {visitor.isDatacenter ? 'Detected' : 'None'}
          </Badge>
        </div>
      </div>

      {/* Event history */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 pb-3">
          <h2 className="text-base font-semibold">Event History</h2>
          <p className="text-sm text-muted-foreground mt-1">Last {events.length} events</p>
        </div>
        {events.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-muted-foreground">No events recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Risk</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">IP</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground">Flags</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e: VisitorEvent) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-muted-foreground">{formatDate(e.timestamp)}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{e.riskScore}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {e.ip ?? '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center gap-1 flex-wrap">
                        {e.isVpn && <Badge variant="warning" className="text-xs">VPN</Badge>}
                        {e.isTor && <Badge variant="danger" className="text-xs">Tor</Badge>}
                        {e.isBot && <Badge variant="danger" className="text-xs">Bot</Badge>}
                        {e.isDatacenter && <Badge variant="warning" className="text-xs">DC</Badge>}
                        {!e.isVpn && !e.isTor && !e.isBot && !e.isDatacenter && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
