import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/signup', '/api/auth', '/docs']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth entirely for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // For protected paths, use Auth.js
  return (auth as any)(request)
}

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
