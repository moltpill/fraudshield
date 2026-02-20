import type { DailyUsage } from '@/lib/dashboard-data'

interface RequestsChartProps {
  data: DailyUsage[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RequestsChart({ data }: RequestsChartProps) {
  const width = 600
  const height = 120
  const padX = 0
  const padY = 10

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  // Calculate SVG points
  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * innerW
    const y = padY + innerH - (d.count / maxCount) * innerH
    return { x, y, ...d }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  // Area fill path (close back to baseline)
  const areaD = [
    pathD,
    `L ${points[points.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)}`,
    `L ${points[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)}`,
    'Z',
  ].join(' ')

  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground mb-4">Requests (last 7 days)</p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: '300px', height: '120px' }}
          aria-label="Requests over last 7 days line chart"
          role="img"
        >
          {/* Area fill */}
          <path d={areaD} className="fill-primary/10" />
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            className="stroke-primary"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Data points */}
          {points.map((p) => (
            <circle
              key={p.date}
              cx={p.x}
              cy={p.y}
              r="3"
              className="fill-primary"
            />
          ))}
        </svg>
      </div>
      {/* Date labels */}
      <div className="flex justify-between mt-2 px-0">
        {data.map((d) => (
          <span key={d.date} className="text-xs text-muted-foreground">
            {formatDate(d.date)}
          </span>
        ))}
      </div>
    </div>
  )
}
