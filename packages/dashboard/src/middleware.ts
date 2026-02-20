import { auth } from '@/auth'

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/signup', '/api/auth', '/docs']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )
}

// Export auth directly - the authorized callback in auth.ts handles the logic
export default auth

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
