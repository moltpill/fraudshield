import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  description?: string
  className?: string
}

export function StatCard({ label, value, description, className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
