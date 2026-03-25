// API Route: Quản lý users (Admin only)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/token';
import { getAllUsers, createUser, getUserByEmail, updateUser, deleteUser as deleteUserFromDB } from '@/lib/api';
import { hashPassword, generateSalt } from '@/lib/crypto';
import type { CreateUserData } from '@/types/auth';

// GET - Lấy danh sách users
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const users = await getAllUsers();

    // Loại bỏ thông tin nhạy cảm
    const safeUsers = users.map(({ passwordHash, salt, ...user }) => user);

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// POST - Tạo user mới
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { email, password, name, role } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, mật khẩu và tên là bắt buộc' },
        { status: 400 }
      );
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 400 }
      );
    }

    // Tạo salt và hash password
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const userData: CreateUserData = {
      email: email.toLowerCase(),
      passwordHash,
      salt,
      role: role === 'admin' ? 'admin' : 'user',
      name,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const newUser = await createUser(userData);

    if (!newUser) {
      return NextResponse.json(
        { error: 'Không thể tạo người dùng' },
        { status: 500 }
      );
    }

    // Trả về user không có thông tin nhạy cảm
    const { passwordHash: _, salt: __, ...safeUser } = newUser;

    return NextResponse.json({
      success: true,
      user: safeUser,
      message: 'Đã tạo người dùng thành công',
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// PUT - Cập nhật user (toggle active, update info)
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { id, isActive, name, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID người dùng là bắt buộc' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (name) updateData.name = name;
    if (role && (role === 'user' || role === 'admin')) updateData.role = role;

    const updatedUser = await updateUser(id, updateData);

    if (!updatedUser) {
      return NextResponse.json({ error: 'Không thể cập nhật người dùng' }, { status: 500 });
    }

    const { passwordHash: _, salt: __, ...safeUser } = updatedUser;

    return NextResponse.json({
      success: true,
      user: safeUser,
      message: 'Đã cập nhật người dùng thành công',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// DELETE - Xóa user
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID người dùng là bắt buộc' }, { status: 400 });
    }

    // Không cho phép xóa chính mình
    if (id === payload.userId) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản của chính mình' }, { status: 400 });
    }

    const success = await deleteUserFromDB(id);

    if (!success) {
      return NextResponse.json({ error: 'Không thể xóa người dùng' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa người dùng thành công',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
