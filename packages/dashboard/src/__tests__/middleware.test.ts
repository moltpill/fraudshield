import { describe, it, expect } from 'vitest'

// Test the middleware logic in isolation (without Next.js internals)

const PUBLIC_PATHS = ['/login', '/api/auth']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )
}

function shouldRedirectToLogin(
  pathname: string,
  hasSession: boolean
): boolean {
  if (isPublicPath(pathname)) return false
  return !hasSession
}

function shouldRedirectToDashboard(
  pathname: string,
  hasSession: boolean
): boolean {
  return pathname === '/login' && hasSession
}

describe('Middleware - Public Path Detection', () => {
  it('recognizes /login as public', () => {
    expect(isPublicPath('/login')).toBe(true)
  })

  it('recognizes /api/auth/* as public', () => {
    expect(isPublicPath('/api/auth')).toBe(true)
    expect(isPublicPath('/api/auth/signin')).toBe(true)
    expect(isPublicPath('/api/auth/callback/credentials')).toBe(true)
  })

  it('treats dashboard routes as protected', () => {
    expect(isPublicPath('/dashboard')).toBe(false)
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/visitors')).toBe(false)
    expect(isPublicPath('/api-keys')).toBe(false)
    expect(isPublicPath('/usage')).toBe(false)
    expect(isPublicPath('/settings')).toBe(false)
  })

  it('treats nested dashboard routes as protected', () => {
    expect(isPublicPath('/dashboard/overview')).toBe(false)
    expect(isPublicPath('/visitors/abc123')).toBe(false)
  })
})

describe('Middleware - Redirect Logic', () => {
  it('redirects unauthenticated users to /login for protected routes', () => {
    expect(shouldRedirectToLogin('/dashboard', false)).toBe(true)
    expect(shouldRedirectToLogin('/visitors', false)).toBe(true)
    expect(shouldRedirectToLogin('/settings', false)).toBe(true)
  })

  it('allows authenticated users through protected routes', () => {
    expect(shouldRedirectToLogin('/dashboard', true)).toBe(false)
    expect(shouldRedirectToLogin('/visitors', true)).toBe(false)
  })

  it('allows unauthenticated users to access public paths', () => {
    expect(shouldRedirectToLogin('/login', false)).toBe(false)
    expect(shouldRedirectToLogin('/api/auth/signin', false)).toBe(false)
  })

  it('redirects authenticated users away from /login', () => {
    expect(shouldRedirectToDashboard('/login', true)).toBe(true)
    expect(shouldRedirectToDashboard('/login', false)).toBe(false)
    expect(shouldRedirectToDashboard('/dashboard', true)).toBe(false)
  })
})

describe('Middleware - Session Validation', () => {
  it('validates session has required accountId', () => {
    const validSession = { user: { accountId: 'acc_123', email: 'test@test.com', tier: 'FREE' } }
    const invalidSession1 = { user: { email: 'test@test.com' } }
    const nullSession = null

    expect(!!validSession?.user?.accountId).toBe(true)
    expect(!!(invalidSession1 as { user?: { accountId?: string } })?.user?.accountId).toBe(false)
    expect(!!nullSession?.user?.accountId).toBe(false)
  })

  it('handles missing session gracefully', () => {
    const session = null
    const pathname = '/dashboard'

    const needsAuth = !isPublicPath(pathname) && !session
    expect(needsAuth).toBe(true)
  })
})

describe('Middleware - Callback URL', () => {
  it('preserves intended destination in callbackUrl', () => {
    const pathname = '/visitors'
    const loginUrl = new URL('/login', 'http://localhost:3002')
    loginUrl.searchParams.set('callbackUrl', pathname)

    expect(loginUrl.toString()).toBe('http://localhost:3002/login?callbackUrl=%2Fvisitors')
    expect(loginUrl.searchParams.get('callbackUrl')).toBe('/visitors')
  })

  it('uses /dashboard as default callback', () => {
    const callbackUrl = null ?? '/dashboard'
    expect(callbackUrl).toBe('/dashboard')
  })
})
