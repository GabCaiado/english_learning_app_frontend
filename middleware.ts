/**
 * middleware.ts
 * -------------
 * UX-only protection layer.
 *
 * IMPORTANT: This middleware does NOT validate JWT signatures, expiry, or
 * token version. It only checks that the access_token cookie is *present*.
 *
 * Real security lives in the FastAPI backend:
 *   - RS256 signature verification
 *   - Expiry check
 *   - token_version / account status check
 *
 * A user with an expired or invalid token will still pass this middleware but
 * will receive a 401 from the API, which triggers the client-side refresh
 * interceptor in lib/api.ts.
 */

import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/reset-password', '/verify-email', '/signup']

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(path)
  ) {
    return NextResponse.next()
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))
  const hasAccessToken = (request.cookies.get('access_token')?.value?.length ?? 0) > 0
  const hasRefreshToken = (request.cookies.get('refresh_token')?.value?.length ?? 0) > 0
  const hasSession = hasAccessToken || hasRefreshToken

  if (hasSession && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (!hasSession && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
