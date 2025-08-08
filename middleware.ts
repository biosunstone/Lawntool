import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/measurements',
  '/quotes',
  '/customers',
  '/team',
  '/billing',
  '/settings',
  '/analytics',
  '/admin',
  '/pricing',
  '/widget',
]

// Paths that require business owner or admin role
const businessOwnerPaths = [
  '/team',
  '/billing',
  '/settings',
  '/pricing',
  '/widget',
]

// Paths that require admin role only
const adminOnlyPaths = [
  '/admin',
]

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const { pathname } = request.nextUrl

  // Widget embed routes should always be public
  if (pathname.match(/^\/widget\/[a-fA-F0-9]{24}$/)) {
    return NextResponse.next()
  }

  // Check if path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtectedPath && !token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Check if path requires business owner role
  const isBusinessOwnerPath = businessOwnerPaths.some(path => pathname.startsWith(path))
  
  if (isBusinessOwnerPath && token) {
    const userRole = (token as any).role
    if (userRole !== 'admin' && userRole !== 'business_owner') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Check if path requires admin role only
  const isAdminOnlyPath = adminOnlyPaths.some(path => pathname.startsWith(path))
  
  if (isAdminOnlyPath && token) {
    const userRole = (token as any).role
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (token && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|embed).*)',
  ],
}