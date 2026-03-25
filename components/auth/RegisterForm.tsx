'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

interface RegisterFormProps {
  onSubmit: (email: string, password: string, name: string) => Promise<void>;
  error?: string | null;
  loading?: boolean;
}

export default function RegisterForm({
  onSubmit,
  error,
  loading = false,
}: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate password length
    if (password.length < 6) {
      setValidationError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setValidationError('Mật khẩu xác nhận không khớp');
      return;
    }

    // Validate name
    if (name.trim().length < 2) {
      setValidationError('Tên phải có ít nhất 2 ký tự');
      return;
    }

    await onSubmit(email, password, name);
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Logo / Title */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-600 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Đăng ký tài khoản
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Tạo tài khoản để sử dụng hệ thống
        </p>
      </div>

      {/* Error Alert */}
      {displayError && (
        <Alert variant="error">
          {displayError}
        </Alert>
      )}

      {/* Name Input */}
      <Input
        type="text"
        label="Họ và tên"
        placeholder="Nguyễn Văn A"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        }
      />

      {/* Email Input */}
      <Input
        type="email"
        label="Email"
        placeholder="email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
            />
          </svg>
        }
      />

      {/* Password Input */}
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          label="Mật khẩu"
          placeholder="Ít nhất 6 ký tự"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          }
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          {showPassword ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Confirm Password Input */}
      <Input
        type={showPassword ? 'text' : 'password'}
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        }
      />

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={loading}
        disabled={!email || !password || !confirmPassword || !name}
      >
        Đăng ký
      </Button>

      {/* Login Link */}
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Đã có tài khoản?{' '}
        <Link
          href="/login"
          className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 font-medium"
        >
          Đăng nhập ngay
        </Link>
      </p>
    </form>
  );
}
