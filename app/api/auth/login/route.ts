// API Route: Đăng nhập

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getUserByEmail,
  createSession,
  checkRateLimit,
  resetRateLimit,
  updateUser,
} from '@/lib/api';
import { verifyPassword } from '@/lib/crypto';
import { createToken } from '@/lib/token';
import type { AuthUser } from '@/types/auth';

export async function POST(request: Request) {
  try {
    // Lấy IP để rate limit
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Kiểm tra rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' },
        { status: 429 }
      );
    }

    // Parse body
    const body = await request.json();
    const { email, passwordHash } = body;

    // Validate input
    if (!email || !passwordHash) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    // Lấy user từ MockAPI
    const user = await getUserByEmail(email.toLowerCase());

    if (!user) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Kiểm tra trạng thái tài khoản
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Tài khoản đã bị vô hiệu hóa' },
        { status: 403 }
      );
    }

    // Xác minh mật khẩu
    const isValid = await verifyPassword(
      passwordHash,
      user.passwordHash,
      user.salt
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Reset rate limit khi đăng nhập thành công
    resetRateLimit(ip);

    // Tạo token
    const token = await createToken(user);

    // Lưu session vào MockAPI
    await createSession({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Cập nhật lastLogin
    await updateUser(user.id, {
      lastLogin: new Date().toISOString(),
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 giờ
      path: '/',
    });

    // Trả về user info (không có password)
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return NextResponse.json({
      success: true,
      user: authUser,
      message: 'Đăng nhập thành công',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
