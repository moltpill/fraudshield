import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@/auth'
import { getVisitors, getRiskLevel, type VisitorRow } from '@/lib/visitors-data'
import { VisitorsFilters } from '@/components/visitors/visitors-filters'
import { Pagination } from '@/components/visitors/pagination'
import { Badge } from '@/components/ui/badge'

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface PageProps {
  searchParams: Promise<{ search?: string; risk?: string; page?: string }>
}

export default async function VisitorsPage({ searchParams }: PageProps) {
  const session = await auth()
  const accountId = session!.user!.accountId
  const params = await searchParams

  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const { visitors, total, totalPages } = await getVisitors({
    accountId,
    search: params.search,
    risk: params.risk,
    page,
    limit: 20,
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Visitors</h1>
        <p className="text-muted-foreground mt-1">
          {total.toLocaleString()} total visitors
        </p>
      </div>

      <Suspense>
        <VisitorsFilters />
      </Suspense>

      <div className="rounded-lg border bg-card">
        {visitors.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No visitors found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Visitor ID</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">First Seen</th>
                    <th className="px-6 py-3 text-left font-medium text-muted-foreground">Last Seen</th>
                    <th className="px-6 py-3 text-right font-medium text-muted-foreground">Visits</th>
                    <th className="px-6 py-3 text-center font-medium text-muted-foreground">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v: VisitorRow) => {
                    const risk = getRiskLevel(v.riskScore)
                    return (
                      <tr
                        key={v.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-3">
                          <Link
                            href={`/dashboard/visitors/${v.id}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {v.id.slice(0, 16)}...
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{formatDate(v.firstSeen)}</td>
                        <td className="px-6 py-3 text-muted-foreground">{formatDate(v.lastSeen)}</td>
                        <td className="px-6 py-3 text-right tabular-nums">{v.visitCount}</td>
                        <td className="px-6 py-3 text-center">
                          <Badge
                            variant={
                              risk === 'high' ? 'danger' : risk === 'medium' ? 'warning' : 'success'
                            }
                          >
                            {risk}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Suspense>
              <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
          </>
        )}
      </div>
    </div>
  )
}
