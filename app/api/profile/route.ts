// API Route: Quản lý hồ sơ người dùng hiện tại

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/token';
import { getUserById, updateUser } from '@/lib/api';

// GET - Lấy thông tin hồ sơ của người dùng hiện tại
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const { passwordHash, salt, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// PUT - Cập nhật tên người dùng
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Tên phải có ít nhất 2 ký tự' },
        { status: 400 }
      );
    }

    const updatedUser = await updateUser(payload.userId, { name: name.trim() });

    if (!updatedUser) {
      return NextResponse.json({ error: 'Không thể cập nhật hồ sơ' }, { status: 500 });
    }

    const { passwordHash, salt, ...safeUser } = updatedUser;

    return NextResponse.json({
      success: true,
      user: safeUser,
      message: 'Đã cập nhật hồ sơ thành công',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
