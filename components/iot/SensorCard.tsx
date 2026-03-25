'use client';

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  max: number;
  warning?: boolean;
}

export default function SensorCard({
  label,
  value,
  unit,
  icon,
  color,
  bgColor,
  max,
  warning,
}: SensorCardProps) {
  const percentage = (value / max) * 100;

  return (
    <div
      className={`p-4 rounded-lg ${
        warning
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          : 'bg-zinc-50 dark:bg-zinc-700/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgColor} ${color}`}>{icon}</div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
            <p
              className={`text-2xl font-bold ${
                warning ? 'text-red-600' : 'text-zinc-900 dark:text-white'
              }`}
            >
              {value}
              {unit}
            </p>
          </div>
        </div>
        {warning && (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 rounded-full">
            Canh bao
          </span>
        )}
      </div>
      <div className="h-2 bg-zinc-200 dark:bg-zinc-600 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            warning ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
