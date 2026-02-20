'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AccountActionsProps {
  accountId: string
  currentStatus: string
  currentTier: string
  currentName: string
}

const TIERS = ['FREE', 'STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE']

export function AccountActions({
  accountId,
  currentStatus,
  currentTier,
  currentName,
}: AccountActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showTierDialog, setShowTierDialog] = useState(false)
  const [selectedTier, setSelectedTier] = useState(currentTier)
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false)

  async function handleStatusToggle() {
    setLoading(true)
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    try {
      await fetch(`/api/admin/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleTierChange() {
    setLoading(true)
    try {
      await fetch(`/api/admin/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier }),
      })
      setShowTierDialog(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleImpersonate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/impersonate`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.dashboardUrl) {
        window.open(data.dashboardUrl, '_blank')
      }
      setShowImpersonateDialog(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={currentStatus === 'active' ? 'destructive' : 'default'}
          size="sm"
          onClick={handleStatusToggle}
          disabled={loading}
        >
          {currentStatus === 'active' ? 'Suspend Account' : 'Unsuspend Account'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTierDialog(true)}
          disabled={loading}
        >
          Change Tier
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImpersonateDialog(true)}
          disabled={loading}
        >
          Impersonate
        </Button>
      </div>

      {/* Tier Change Dialog */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Tier</DialogTitle>
            <DialogDescription>
              Change the subscription tier for {currentName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTierChange} disabled={loading}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate Dialog */}
      <Dialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonate Account</DialogTitle>
            <DialogDescription>
              You will open the customer dashboard as {currentName}. All actions will be logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImpersonateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImpersonate} disabled={loading}>
              Open Dashboard as {currentName}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
