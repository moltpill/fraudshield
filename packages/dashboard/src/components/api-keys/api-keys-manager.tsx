'use client'

import { useState, useCallback } from 'react'
import { Copy, Check, Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface ApiKey {
  id: string
  name: string
  key: string
  status: string
  createdAt: string
}

interface ApiKeysManagerProps {
  initialKeys: ApiKey[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function maskKey(key: string): string {
  const prefix = key.startsWith('eye_live_') ? 'eye_live_' : 'eye_test_'
  return `${prefix}${'•'.repeat(8)}...${key.slice(-4)}`
}

export function ApiKeysManager({ initialKeys }: ApiKeysManagerProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      if (!res.ok) return
      const data = await res.json() as { key: ApiKey }
      setKeys((prev) => [data.key, ...prev])
      setCreatedKey(data.key.key)
      setNewKeyName('')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }, [])

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k))
    )
    setRevokeConfirmId(null)
  }

  const handleEditSave = async (id: string) => {
    if (!editingName.trim()) return
    const res = await fetch(`/api/keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingName.trim() }),
    })
    if (!res.ok) return
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, name: editingName.trim() } : k))
    )
    setEditingId(null)
  }

  return (
    <div>
      {/* Create button */}
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {/* Keys table */}
      <div className="rounded-lg border bg-card">
        {keys.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Key</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="px-6 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3">
                      {editingId === key.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingName(e.target.value)}
                            className="h-7 text-sm w-40"
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') handleEditSave(key.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            autoFocus
                          />
                          <Button size="sm" variant="outline" onClick={() => handleEditSave(key.id)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{key.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {maskKey(key.key)}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{formatDate(key.createdAt)}</td>
                    <td className="px-6 py-3 text-center">
                      <Badge variant={key.status === 'active' ? 'success' : 'danger'}>
                        {key.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {editingId !== key.id && key.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(key.id)
                              setEditingName(key.name)
                            }}
                            aria-label="Edit key name"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {key.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setRevokeConfirmId(key.id)}
                            aria-label="Revoke key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create key modal */}
      <Dialog open={showCreateModal} onOpenChange={(open: boolean) => {
        setShowCreateModal(open)
        if (!open) { setCreatedKey(null); setNewKeyName('') }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              {createdKey
                ? 'Your key has been created. Copy it now — it will not be shown again.'
                : 'Give your API key a descriptive name.'}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
                <code className="flex-1 font-mono text-xs break-all">{createdKey}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(createdKey, 'new')}
                  aria-label="Copy API key"
                >
                  {copiedKeyId === 'new' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="key-name">Key name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production, Staging"
                value={newKeyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewKeyName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleCreateKey() }}
              />
            </div>
          )}

          <DialogFooter>
            {createdKey ? (
              <Button onClick={() => { setShowCreateModal(false); setCreatedKey(null) }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || isCreating}>
                  {isCreating ? 'Creating...' : 'Create Key'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm modal */}
      <Dialog open={!!revokeConfirmId} onOpenChange={(open: boolean) => { if (!open) setRevokeConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Any applications using this key will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => revokeConfirmId && handleRevoke(revokeConfirmId)}
            >
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
