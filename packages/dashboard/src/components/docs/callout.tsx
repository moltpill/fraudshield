import * as React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Zap,
  BookOpen,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type CalloutType = 'info' | 'warning' | 'success' | 'tip' | 'note' | 'security'

interface CalloutProps {
  type?: CalloutType
  title?: string
  children: React.ReactNode
  className?: string
}

const calloutConfig: Record<
  CalloutType,
  {
    icon: React.ComponentType<{ className?: string }>
    containerClass: string
    iconClass: string
  }
> = {
  info: {
    icon: Info,
    containerClass:
      'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10',
    iconClass: 'text-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    containerClass:
      'border-yellow-500/30 bg-yellow-500/5 dark:bg-yellow-500/10',
    iconClass: 'text-yellow-500',
  },
  success: {
    icon: CheckCircle2,
    containerClass:
      'border-green-500/30 bg-green-500/5 dark:bg-green-500/10',
    iconClass: 'text-green-500',
  },
  tip: {
    icon: Lightbulb,
    containerClass:
      'border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10',
    iconClass: 'text-purple-500',
  },
  note: {
    icon: BookOpen,
    containerClass:
      'border-gray-500/30 bg-gray-500/5 dark:bg-gray-500/10',
    iconClass: 'text-gray-500',
  },
  security: {
    icon: Shield,
    containerClass:
      'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
    iconClass: 'text-red-500',
  },
}

export function Callout({
  type = 'info',
  title,
  children,
  className,
}: CalloutProps) {
  const config = calloutConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border p-4 my-6',
        config.containerClass,
        className
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconClass)} />
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold mb-1 text-foreground">{title}</p>
          )}
          <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert prose-p:my-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick status indicator
interface StatusBadgeProps {
  status: 'live' | 'beta' | 'deprecated' | 'coming-soon'
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    live: { label: 'Live', class: 'bg-green-500/10 text-green-500 border-green-500/30' },
    beta: { label: 'Beta', class: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
    deprecated: { label: 'Deprecated', class: 'bg-red-500/10 text-red-500 border-red-500/30' },
    'coming-soon': { label: 'Coming Soon', class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  }

  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        config.class,
        className
      )}
    >
      {config.label}
    </span>
  )
}
