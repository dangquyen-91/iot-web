'use client';

interface DeviceToggleProps {
  name: string;
  description?: string;
  active: boolean;
  loading?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

export default function DeviceToggle({
  name,
  description,
  active,
  loading,
  onClick,
  icon,
}: DeviceToggleProps) {
  return (
    <div
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-200
        ${
          active
            ? 'border-green-500 bg-green-50/50 dark:bg-green-950/30'
            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'
        }
      `}
    >
      <div className="flex items-center justify-between">
        {/* Left Side: Icon + Info */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`
              flex-shrink-0 transition-colors
              ${active ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}
              ${loading ? 'animate-spin' : ''}
            `}
          >
            {icon}
          </div>

          {/* Text Info */}
          <div>
            <h4 className="font-semibold text-base text-zinc-900 dark:text-white">
              {name}
            </h4>
            {description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Status + Toggle */}
        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`
                w-2 h-2 rounded-full transition-colors
                ${active ? 'bg-green-500 animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'}
              `}
            />
            <span
              className={`
                text-sm font-medium
                ${active ? 'text-green-600 dark:text-green-400' : 'text-zinc-500 dark:text-zinc-400'}
              `}
            >
              {loading ? 'Đang xử lý...' : active ? 'Đang bật' : 'Đã tắt'}
            </span>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={onClick}
            disabled={loading}
            className={`
              relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${active ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'}
              hover:shadow-lg active:scale-95
            `}
            aria-label={`Toggle ${name}`}
          >
            <span
              className={`
                inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300
                ${active ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
