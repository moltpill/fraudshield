'use client'

import { useState } from 'react'

interface UpgradeButtonProps {
  tier: string
  label: string
  disabled?: boolean
  variant?: 'outline' | 'primary'
}

export function UpgradeButton({ tier, label, disabled, variant = 'primary' }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json() as { authorizationUrl?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to initiate checkout')
        return
      }
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const baseClass = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variantClass = variant === 'primary'
    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
    : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'

  return (
    <div>
      <button
        className={`${baseClass} ${variantClass}`}
        onClick={handleUpgrade}
        disabled={disabled || loading}
        aria-label={`Upgrade to ${label}`}
      >
        {loading ? 'Processing...' : label}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1" role="alert">{error}</p>
      )}
    </div>
  )
}

interface CancelButtonProps {
  onCancelled?: () => void
}

export function CancelButton({ onCancelled }: CancelButtonProps) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel subscription')
        setConfirming(false)
        return
      }
      onCancelled?.()
      window.location.reload()
    } catch {
      setError('Network error. Please try again.')
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
        onClick={handleCancel}
        disabled={loading}
        aria-label="Cancel subscription"
      >
        {loading ? 'Cancelling...' : confirming ? 'Click again to confirm' : 'Cancel Subscription'}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1" role="alert">{error}</p>
      )}
    </div>
  )
}
