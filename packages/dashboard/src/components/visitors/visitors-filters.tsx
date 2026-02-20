'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function VisitorsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      // Reset to page 1 when filtering
      params.delete('page')
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = (value: string) => {
    router.push(`${pathname}?${createQueryString('search', value)}`)
  }

  const handleRisk = (value: string) => {
    router.push(`${pathname}?${createQueryString('risk', value === 'all' ? '' : value)}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <Input
        placeholder="Search by visitor ID..."
        defaultValue={searchParams.get('search') ?? ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const val = e.target.value
          // Debounce: only update after 300ms
          const timer = setTimeout(() => handleSearch(val), 300)
          return () => clearTimeout(timer)
        }}
        className="sm:max-w-xs"
        aria-label="Search visitors"
      />
      <Select
        defaultValue={searchParams.get('risk') ?? 'all'}
        onValueChange={handleRisk}
      >
        <SelectTrigger className="sm:w-40" aria-label="Filter by risk">
          <SelectValue placeholder="Risk level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All risks</SelectItem>
          <SelectItem value="high">High risk</SelectItem>
          <SelectItem value="medium">Medium risk</SelectItem>
          <SelectItem value="low">Low risk</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
