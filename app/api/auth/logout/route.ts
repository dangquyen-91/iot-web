// API Route: Đăng xuất

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/api';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    // Xóa session trong MockAPI nếu có token
    if (token) {
      await deleteSession(token);
    }

    // Xóa cookie
    cookieStore.delete('auth-token');

    return NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công',
    });
  } catch (error) {
    console.error('Logout error:', error);

    // Vẫn xóa cookie ngay cả khi có lỗi
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');

    return NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công',
    });
  }
}
