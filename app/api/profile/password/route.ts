// API Route: Đổi mật khẩu người dùng hiện tại

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/token';
import { getUserById, updateUser } from '@/lib/api';
import { verifyPassword, hashPassword, generateSalt } from '@/lib/crypto';

// PUT - Đổi mật khẩu
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

    const { currentPasswordHash, newPasswordHash } = await request.json();

    if (!currentPasswordHash || !newPasswordHash) {
      return NextResponse.json(
        { error: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' },
        { status: 400 }
      );
    }

    // Lấy thông tin user từ database
    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Xác minh mật khẩu hiện tại
    const isCurrentPasswordValid = await verifyPassword(
      currentPasswordHash,
      user.passwordHash,
      user.salt
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Mật khẩu hiện tại không đúng' },
        { status: 400 }
      );
    }

    // Tạo salt mới và hash mật khẩu mới
    const newSalt = generateSalt();
    const newHash = await hashPassword(newPasswordHash, newSalt);

    const updatedUser = await updateUser(payload.userId, {
      passwordHash: newHash,
      salt: newSalt,
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'Không thể đổi mật khẩu' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã đổi mật khẩu thành công',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
