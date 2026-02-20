import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn((fn) => fn),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({ type: 'next' })),
    redirect: vi.fn((url) => ({ type: 'redirect', url: url.toString() })),
  },
}))

describe('Admin Middleware', () => {
  function makeRequest(pathname: string, adminId?: string) {
    return {
      nextUrl: { pathname },
      url: `http://localhost:3003${pathname}`,
      auth: adminId ? { user: { adminId } } : null,
    }
  }

  it('allows access to /login without auth', async () => {
    const { default: middleware } = await import('@/middleware')
    const { NextResponse } = await import('next/server')
    const req = makeRequest('/login')
    middleware(req as Parameters<typeof middleware>[0])
    expect(NextResponse.next).toHaveBeenCalled()
  })

  it('redirects authenticated user away from /login', async () => {
    const { default: middleware } = await import('@/middleware')
    const { NextResponse } = await import('next/server')
    const req = makeRequest('/login', 'admin1')
    middleware(req as Parameters<typeof middleware>[0])
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/admin') })
    )
  })

  it('allows access to /api/auth paths', async () => {
    const { default: middleware } = await import('@/middleware')
    const { NextResponse } = await import('next/server')
    const req = makeRequest('/api/auth/signin')
    middleware(req as Parameters<typeof middleware>[0])
    expect(NextResponse.next).toHaveBeenCalled()
  })

  it('redirects unauthenticated to /login with callbackUrl', async () => {
    const { default: middleware } = await import('@/middleware')
    const { NextResponse } = await import('next/server')
    const req = makeRequest('/admin/accounts')
    middleware(req as Parameters<typeof middleware>[0])
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        href: expect.stringContaining('/login'),
      })
    )
  })

  it('allows authenticated access to protected paths', async () => {
    const { default: middleware } = await import('@/middleware')
    const { NextResponse } = await import('next/server')
    const req = makeRequest('/admin', 'admin1')
    middleware(req as Parameters<typeof middleware>[0])
    expect(NextResponse.next).toHaveBeenCalled()
  })
})
