import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/signup', '/api/auth']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )
}

export default auth(function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  const session = (req as { auth: { user?: { accountId?: string } } | null }).auth

  // Allow public paths without auth
  if (isPublicPath(pathname)) {
    // If already logged in, redirect away from login page
    if (pathname === '/login' && session?.user?.accountId) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!session?.user?.accountId) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
