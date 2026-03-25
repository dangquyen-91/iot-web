'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import type { User } from '@/types/auth';

// Simplified user for display (without sensitive data)
type DisplayUser = Omit<User, 'passwordHash' | 'salt'>;

export default function UsersPage() {
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();

      if (response.ok && data.users) {
        setUsers(data.users);
      } else {
        setMessage({ type: 'error', text: data.error || 'Không thể tải danh sách người dùng' });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: DisplayUser) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(users.map(u =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        ));
        setMessage({
          type: 'success',
          text: `Đã ${user.isActive ? 'vô hiệu hóa' : 'kích hoạt'} tài khoản ${user.email}`,
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Không thể cập nhật người dùng' });
      }
    } catch (error) {
      console.error('Error toggling user:', error);
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    }
  };

  const handleDeleteUser = async (user: DisplayUser) => {
    if (user.role === 'admin') {
      setMessage({ type: 'error', text: 'Không thể xóa tài khoản admin' });
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa người dùng ${user.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(users.filter(u => u.id !== user.id));
        setMessage({ type: 'success', text: `Đã xóa người dùng ${user.email}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Không thể xóa người dùng' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    }
  };

  // Get avatar color based on role
  const getAvatarColor = (role: string) => {
    return role === 'admin'
      ? 'bg-green-500 text-white'
      : 'bg-blue-500 text-white';
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Quản lý người dùng" />

      <div className="flex-1 p-6 space-y-6">
        {/* Message Alert */}
        {message && (
          <Alert
            variant={message.type}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Quản lý tài khoản người dùng trong hệ thống
          </p>
          <Button onClick={() => setShowModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm người dùng
          </Button>
        </div>

        {/* Users Table */}
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-700/50">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-zinc-500 dark:text-zinc-400">
                    Người dùng
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-zinc-500 dark:text-zinc-400">
                    Vai trò
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-zinc-500 dark:text-zinc-400">
                    Trạng thái
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-zinc-500 dark:text-zinc-400">
                    Ngày tạo
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-zinc-500 dark:text-zinc-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        Đang tải...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      Chưa có người dùng nào
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getAvatarColor(user.role)}`}>
                            <span className="font-medium text-sm">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            user.role === 'admin'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            user.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-zinc-600 dark:text-zinc-400">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(user)}
                            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            {user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          </button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.role === 'admin'}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add User Modal */}
        {showModal && (
          <AddUserModal
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              fetchUsers();
              setMessage({ type: 'success', text: 'Đã thêm người dùng mới' });
            }}
          />
        )}
      </div>
    </div>
  );
}

// Add User Modal Component
function AddUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Không thể tạo người dùng');
      }
    } catch (err) {
      setError('Lỗi kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
          Thêm người dùng mới
        </h2>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Họ tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Vai trò
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="user">Người dùng</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Hủy
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Thêm
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
