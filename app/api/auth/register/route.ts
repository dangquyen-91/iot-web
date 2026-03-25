// API Route: Đăng ký tài khoản mới

import { NextResponse } from 'next/server';
import { getUserByEmail, createUser } from '@/lib/api';
import { generateSalt, hashPassword } from '@/lib/crypto';
import type { CreateUserData } from '@/types/auth';

export async function POST(request: Request) {
  try {
    // Parse body
    const body = await request.json();
    const { email, passwordHash, name } = body;

    // Validate input
    if (!email || !passwordHash || !name) {
      return NextResponse.json(
        { error: 'Email, mật khẩu và tên là bắt buộc' },
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

    // Validate name
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Tên phải có ít nhất 2 ký tự' },
        { status: 400 }
      );
    }

    // Validate password hash (should be 64 chars hex from SHA-256)
    if (passwordHash.length !== 64 || !/^[a-f0-9]+$/i.test(passwordHash)) {
      return NextResponse.json(
        { error: 'Mật khẩu không hợp lệ' },
        { status: 400 }
      );
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 409 }
      );
    }

    // Tạo salt và hash password
    const salt = generateSalt();
    const finalPasswordHash = await hashPassword(passwordHash, salt);

    // Tạo user mới
    const userData: CreateUserData = {
      email: email.toLowerCase(),
      passwordHash: finalPasswordHash,
      salt,
      role: 'user', // Mặc định là user
      name: name.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const newUser = await createUser(userData);

    if (!newUser) {
      return NextResponse.json(
        { error: 'Không thể tạo tài khoản. Vui lòng thử lại.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng đăng nhập.',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
