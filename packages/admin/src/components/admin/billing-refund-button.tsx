'use client'

import { useState } from 'react'

interface RefundButtonProps {
  paymentId: string
  amount: number
  email: string
  onRefunded?: () => void
}

export function RefundButton({ paymentId, amount, email, onRefunded }: RefundButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<'DUPLICATE' | 'FRAUD' | 'REQUESTED_BY_CUSTOMER'>('REQUESTED_BY_CUSTOMER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRefund() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/billing/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, reason, amount }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Refund failed')
        return
      }
      setOpen(false)
      onRefunded?.()
      window.location.reload()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const zarAmount = `R${(amount / 100).toFixed(2)}`

  return (
    <>
      <button
        className="text-xs text-blue-600 hover:underline"
        onClick={() => setOpen(true)}
        aria-label={`Refund payment for ${email}`}
      >
        Refund
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">Initiate Refund</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Refund {zarAmount} to {email}?
            </p>

            <div className="mb-4">
              <label className="text-sm font-medium block mb-1">Reason</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reason}
                onChange={e => setReason(e.target.value as typeof reason)}
              >
                <option value="REQUESTED_BY_CUSTOMER">Requested by Customer</option>
                <option value="DUPLICATE">Duplicate Payment</option>
                <option value="FRAUD">Fraud</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-3" role="alert">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={handleRefund}
                disabled={loading}
                aria-label="Confirm refund"
              >
                {loading ? 'Processing...' : `Refund ${zarAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
