import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ['/dashboard', '/proposals', '/customers', '/products', '/analytics', '/settings'];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is protected (strip locale prefix)
  const pathWithoutLocale = pathname.replace(/^\/(tr|en)/, '');
  const isProtected = protectedPaths.some((p) => pathWithoutLocale.startsWith(p));

  if (isProtected) {
    // Check for session token (NextAuth)
    const token = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value;

    if (!token) {
      const locale = pathname.startsWith('/en') ? 'en' : 'tr';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(tr|en)/:path*'],
};
