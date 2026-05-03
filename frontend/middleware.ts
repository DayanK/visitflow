import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // If token refresh failed, force re-login
    if (req.nextauth.token?.error === 'RefreshAccessTokenError') {
      const signInUrl = new URL('/login', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    // Protect all routes except auth, static files, api/auth, and Teams icon endpoints
    '/((?!login|auth/teams-callback|privacy|terms|api/auth|api/graph|api/teams/icons|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
