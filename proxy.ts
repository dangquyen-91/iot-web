// Proxy: Bảo vệ routes theo role (Next.js 16)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeToken } from '@/lib/token';

// Routes công khai - ai cũng truy cập được
const publicRoutes = ['/login', '/register', '/forgot-password'];

// Routes chỉ admin mới truy cập được
const adminRoutes = ['/admin', '/users', '/settings'];

// Routes được bảo vệ (cần đăng nhập)
const protectedRoutes = ['/dashboard', '/monitoring'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Bỏ qua các static files và API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // files như favicon.ico, etc.
  ) {
    return NextResponse.next();
  }

  // Kiểm tra public routes
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Kiểm tra admin routes
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Kiểm tra protected routes
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Trang chủ - redirect based on auth status
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Public routes
  if (isPublicRoute) {
    // Nếu đã đăng nhập, redirect về dashboard
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp > Date.now() / 1000) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected routes - cần đăng nhập
  if (isProtectedRoute || isAdminRoute) {
    if (!token) {
      // Chưa đăng nhập - redirect về login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Decode token để kiểm tra
    const payload = decodeToken(token);

    if (!payload) {
      // Token không hợp lệ
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }

    // Kiểm tra hết hạn
    if (payload.exp < Date.now() / 1000) {
      // Token hết hạn
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }

    // Kiểm tra quyền admin
    if (isAdminRoute && payload.role !== 'admin') {
      // Không có quyền admin - redirect về dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
