'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Copy, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NewKeyResult {
  id: string
  key: string
  name: string
}

export function IssueKeyButton({ accountId, accountEmail }: { accountId: string; accountEmail: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState<NewKeyResult | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, name: name.trim() }),
      })
      const data = await res.json()
      setNewKey(data.apiKey)
      setName('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (newKey?.key) {
      await navigator.clipboard.writeText(newKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleClose() {
    setOpen(false)
    setNewKey(null)
    setName('')
    setCopied(false)
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Issue Key
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue API Key</DialogTitle>
            <DialogDescription>
              Issue a new API key for {accountEmail}
            </DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Copy this key now — it will not be shown again.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted font-mono text-xs break-all">
                <span className="flex-1">{newKey.key}</span>
                <Button size="icon" variant="ghost" onClick={handleCopy} className="h-7 w-7 shrink-0">
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Production Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                  {loading ? 'Creating...' : 'Create Key'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function RevokeKeyButton({ keyId, keyName }: { keyId: string; keyName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRevoke() {
    setLoading(true)
    try {
      await fetch(`/api/admin/keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked', reason }),
      })
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>
        <X className="h-3.5 w-3.5 mr-1" />
        Revoke
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Revoking &quot;{keyName}&quot; will immediately invalidate it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="e.g. Security breach, policy violation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={loading}>
              {loading ? 'Revoking...' : 'Revoke Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
