// Định nghĩa các types cho hệ thống xác thực

export type UserRole = 'user' | 'admin';

// User đầy đủ từ database
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

// User an toàn để trả về client (không có password)
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Session trong database
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  userAgent?: string;
}

// Payload trong JWT token
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

// Thông tin đăng nhập
export interface LoginCredentials {
  email: string;
  password: string;
}

// Kết quả xác thực
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// Dữ liệu tạo user mới
export interface CreateUserData {
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  createdAt: string;
}

// Dữ liệu tạo session mới
export interface CreateSessionData {
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  userAgent?: string;
}
