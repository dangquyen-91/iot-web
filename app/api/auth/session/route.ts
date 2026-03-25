// API Route: Lấy thông tin session hiện tại

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/token';
import { getUserById } from '@/lib/api';
import type { AuthUser } from '@/types/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload) {
      // Token không hợp lệ hoặc hết hạn - xóa cookie
      cookieStore.delete('auth-token');
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    // Lấy thông tin user mới nhất từ database
    const user = await getUserById(payload.userId);

    if (!user || !user.isActive) {
      cookieStore.delete('auth-token');
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    // Trả về user info
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return NextResponse.json({
      authenticated: true,
      user: authUser,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, user: null, error: 'Lỗi kiểm tra session' },
      { status: 500 }
    );
  }
}
