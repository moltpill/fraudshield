'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { CodeBlock } from './code-block'
import { cn } from '@/lib/utils'

interface ApiResponseProps {
  title?: string
  status?: number
  statusText?: string
  response: string
  expandable?: boolean
  defaultExpanded?: boolean
  className?: string
}

export function ApiResponse({
  title = 'Response',
  status = 200,
  statusText = 'OK',
  response,
  expandable = true,
  defaultExpanded = true,
  className,
}: ApiResponseProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const isSuccess = status >= 200 && status < 300

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => expandable && setExpanded(!expanded)}
        disabled={!expandable}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left',
          'bg-muted/30 border-b',
          expandable && 'hover:bg-muted/50 cursor-pointer transition-colors'
        )}
      >
        <div className="flex items-center gap-3">
          {expandable && (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span
            className={cn(
              'text-xs font-mono px-2 py-0.5 rounded',
              isSuccess
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            )}
          >
            {status} {statusText}
          </span>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-0">
          <CodeBlock code={response} language="json" />
        </div>
      )}
    </div>
  )
}

// Error response examples
interface ErrorExample {
  status: number
  statusText: string
  code: string
  description: string
  response: string
}

interface ErrorTableProps {
  errors: ErrorExample[]
  className?: string
}

export function ErrorTable({ errors, className }: ErrorTableProps) {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null)

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      <div className="divide-y">
        {errors.map((error, index) => (
          <div key={error.code}>
            <button
              onClick={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedIndex === index ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs font-mono bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">
                  {error.status}
                </span>
              </div>
              <code className="text-sm font-semibold text-red-500">
                {error.code}
              </code>
              <span className="text-sm text-muted-foreground flex-1">
                {error.description}
              </span>
            </button>
            {expandedIndex === index && (
              <div className="px-4 pb-4">
                <CodeBlock code={error.response} language="json" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
