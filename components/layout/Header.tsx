'use client';

import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'Bảng điều khiển' }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-6 flex items-center justify-between">
      {/* Page Title */}
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
        {title}
      </h1>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full">
          <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {user?.name || 'Người dùng'}
          </span>
          {user?.role === 'admin' && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
              Admin
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
