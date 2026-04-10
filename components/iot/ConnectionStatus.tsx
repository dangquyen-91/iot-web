'use client';

interface ConnectionStatusProps {
  isConnected: boolean;
  connectedText?: string;
  disconnectedText?: string;
}

export default function ConnectionStatus({
  isConnected,
  connectedText = 'ESP8266 đã kết nối',
  disconnectedText = 'Chưa có dữ liệu',
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span
        className={`text-sm ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {isConnected ? connectedText : disconnectedText}
      </span>
    </div>
  );
}
