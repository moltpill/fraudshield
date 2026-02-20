import { createHmac } from 'crypto'

const STITCH_BASE_URL = process.env.STITCH_BASE_URL ?? 'https://express.stitch.money'

// Tier pricing in ZAR cents
export const TIER_PRICES: Record<string, number> = {
  STARTER: 14900,  // R149.00
  GROWTH: 39900,   // R399.00
  SCALE: 99900,    // R999.00
  ENTERPRISE: 0,   // Custom
}

export const TIER_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  SCALE: 'Scale',
  ENTERPRISE: 'Enterprise',
}

// Token cache (module-level, reset per process restart)
let _cachedToken: string | null = null
let _tokenExpiry = 0

interface StitchTokenResponse {
  success: boolean
  data: { accessToken: string }
}

export interface StitchPaymentLink {
  id: string
  url: string
  shortUrl?: string
  status: string
  amount: number
  merchantReference: string
  expiresAt?: string
}

export interface StitchSubscription {
  id: string
  status: string
  amount: number
  email: string
  payerId: string
  startDate: string
  authorizationUrl?: string
  merchantReference: string
}

export interface StitchRefund {
  id: string
  status: string
  amount: number
  reason: string
}

/** Fetch a short-lived access token from Stitch Express (cached for 14 min) */
export async function getStitchToken(
  scope: 'client_paymentrequest' | 'client_recurringpaymentconsentrequest' = 'client_paymentrequest'
): Promise<string> {
  const now = Date.now()
  if (_cachedToken && now < _tokenExpiry) {
    return _cachedToken
  }

  const response = await fetch(`${STITCH_BASE_URL}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.STITCH_CLIENT_ID,
      clientSecret: process.env.STITCH_CLIENT_SECRET,
      scope,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Stitch auth failed: ${response.status} ${body}`)
  }

  const data = (await response.json()) as StitchTokenResponse
  _cachedToken = data.data.accessToken
  _tokenExpiry = now + 14 * 60 * 1000 // 14 min (token expires at 15)
  return _cachedToken
}

/** Create a one-time payment link on Stitch Express */
export async function createPaymentLink(params: {
  amount: number
  merchantReference: string
  payerName: string
  payerEmail: string
  expiresAt?: string
}): Promise<StitchPaymentLink> {
  const token = await getStitchToken()

  const response = await fetch(`${STITCH_BASE_URL}/api/v1/payment-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      merchantReference: params.merchantReference,
      payerName: params.payerName,
      payerEmailAddress: params.payerEmail,
      expiresAt: params.expiresAt,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Stitch payment link failed: ${response.status} ${body}`)
  }

  return (await response.json()) as StitchPaymentLink
}

/** Create a recurring subscription on Stitch Express */
export async function createStitchSubscription(params: {
  amount: number
  merchantReference: string
  startDate: string
  payerFullName: string
  email: string
  payerId: string
  initialAmount?: number
}): Promise<StitchSubscription> {
  const token = await getStitchToken('client_recurringpaymentconsentrequest')

  const response = await fetch(`${STITCH_BASE_URL}/api/v1/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      merchantReference: params.merchantReference,
      startDate: params.startDate,
      payerFullName: params.payerFullName.slice(0, 20), // API limit: 20 chars
      email: params.email,
      payerId: params.payerId,
      initialAmount: params.initialAmount ?? params.amount,
      recurrence: {
        type: 'Monthly',
        interval: 1,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Stitch subscription failed: ${response.status} ${body}`)
  }

  return (await response.json()) as StitchSubscription
}

/** Cancel a Stitch subscription (cannot be re-authorised after cancellation) */
export async function cancelStitchSubscription(subscriptionId: string): Promise<void> {
  const token = await getStitchToken('client_recurringpaymentconsentrequest')

  const response = await fetch(
    `${STITCH_BASE_URL}/api/v1/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Stitch cancel failed: ${response.status} ${body}`)
  }
}

/** Initiate a refund for a completed payment */
export async function refundStitchPayment(
  paymentId: string,
  params: {
    amount: number
    reason: 'DUPLICATE' | 'FRAUD' | 'REQUESTED_BY_CUSTOMER'
  }
): Promise<StitchRefund> {
  const token = await getStitchToken()

  const response = await fetch(`${STITCH_BASE_URL}/api/v1/payment/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Stitch refund failed: ${response.status} ${body}`)
  }

  return (await response.json()) as StitchRefund
}

/** Register a webhook URL with Stitch (returns the signing secret) */
export async function registerWebhook(url: string): Promise<{ id: string; secret: string }> {
  const token = await getStitchToken()

  const response = await fetch(`${STITCH_BASE_URL}/api/v1/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Stitch webhook registration failed: ${response.status} ${body}`)
  }

  return (await response.json()) as { id: string; secret: string }
}

/** Verify a Stitch webhook signature using HMAC-SHA256 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

/** Reset token cache (for testing) */
export function _resetTokenCache() {
  _cachedToken = null
  _tokenExpiry = 0
}
