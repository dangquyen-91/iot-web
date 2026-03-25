'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import RegisterForm from '@/components/auth/RegisterForm';
import Alert from '@/components/ui/Alert';
import { clientHashPassword } from '@/lib/crypto';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (email: string, password: string, name: string) => {
    setLoading(true);
    setError(null);

    try {
      // Hash password phía client trước khi gửi
      const passwordHash = await clientHashPassword(password, email);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passwordHash, name }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        // Chuyển đến trang đăng nhập sau 2 giây
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Đăng ký thất bại');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            Đăng ký thành công!
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Đang chuyển đến trang đăng nhập...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <RegisterForm
        onSubmit={handleRegister}
        error={error}
        loading={loading}
      />
    </Card>
  );
}
