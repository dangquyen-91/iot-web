'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { clientHashPassword } from '@/lib/crypto';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // Hash password phía client trước khi gửi
      const passwordHash = await clientHashPassword(password, email);

      const result = await login(email, passwordHash);

      if (result.success) {
        // Redirect đến trang được yêu cầu hoặc dashboard
        const redirect = searchParams.get('redirect') || '/dashboard';
        router.push(redirect);
      } else {
        setError(result.error || 'Đăng nhập thất bại');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg">
      <LoginForm
        onSubmit={handleLogin}
        error={error}
        loading={loading}
      />
    </Card>
  );
}
