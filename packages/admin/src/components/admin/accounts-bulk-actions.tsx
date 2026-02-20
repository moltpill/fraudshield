'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface AccountsBulkActionsProps {
  selectedIds: string[]
}

export function AccountsBulkActions({ selectedIds }: AccountsBulkActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (selectedIds.length === 0) return null

  async function handleBulkAction(action: 'suspend' | 'unsuspend') {
    setLoading(true)
    try {
      await fetch('/api/admin/accounts/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => handleBulkAction('suspend')}
        disabled={loading}
      >
        Suspend
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkAction('unsuspend')}
        disabled={loading}
      >
        Unsuspend
      </Button>
    </div>
  )
}
