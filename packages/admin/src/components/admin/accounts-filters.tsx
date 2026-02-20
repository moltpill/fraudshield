'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const TIERS = ['FREE', 'STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE']
const STATUSES = ['active', 'suspended', 'cancelled']

export function AccountsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    params.delete('page') // reset to page 1 on filter change
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Search by email or name..."
        defaultValue={searchParams.get('search') ?? ''}
        onChange={(e) => updateParams({ search: e.target.value })}
        className="max-w-xs"
      />
      <select
        value={searchParams.get('tier') ?? ''}
        onChange={(e) => updateParams({ tier: e.target.value })}
        className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        aria-label="Filter by tier"
      >
        <option value="">All Tiers</option>
        {TIERS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select
        value={searchParams.get('status') ?? ''}
        onChange={(e) => updateParams({ status: e.target.value })}
        className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s} className="capitalize">{s}</option>
        ))}
      </select>
      {(searchParams.get('search') || searchParams.get('tier') || searchParams.get('status')) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/accounts')}
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
}
