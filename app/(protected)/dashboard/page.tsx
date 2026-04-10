'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import ConnectionStatus from '@/components/iot/ConnectionStatus';
import SensorCard from '@/components/iot/SensorCard';
import DeviceToggle from '@/components/iot/DeviceToggle';
import CameraView from '@/components/iot/CameraView';
import { useSensorData } from '@/hooks/useSensorData';
import { useDeviceControl } from '@/hooks/useDeviceControl';
import { formatTime, formatDate } from '@/utils/formatters';

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { latestData, isConnected } = useSensorData({ limit: 1, pollingInterval: 2000, deviceId: 'ESP8266_001' });
  const { latestData: latestData002, isConnected: connected002 } = useSensorData({ limit: 1, pollingInterval: 2000, deviceId: 'ESP8266_002' });
  const { devices, isLoading, toggleDevice } = useDeviceControl();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Header title="Bảng điều khiển" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Date & Time Display */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Thời gian hệ thống</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatTime(currentTime)}</p>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{formatDate(currentTime)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <ConnectionStatus isConnected={isConnected} connectedText="ESP8266_001 đã kết nối" />
              <ConnectionStatus isConnected={connected002} connectedText="ESP8266_002 đã kết nối" />
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sensor Data */}
          <Card>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'}`}></span>
              Dữ liệu cảm biến (Thời gian thực)
            </h3>
            <div className="space-y-4">
              <SensorCard
                label="Nhiệt độ"
                value={latestData?.temperature ?? 0}
                unit="°C"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                color="text-orange-600"
                bgColor="bg-orange-100 dark:bg-orange-900/30"
                max={50}
                warning={(latestData?.temperature ?? 0) > 35}
              />
              <SensorCard
                label="Độ ẩm không khí"
                value={latestData?.humidity ?? 0}
                unit="%"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                }
                color="text-blue-600"
                bgColor="bg-blue-100 dark:bg-blue-900/30"
                max={100}
              />
              <SensorCard
                label="Mức nước"
                value={latestData002?.waterLevel ?? 0}
                unit="%"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                color="text-cyan-600"
                bgColor="bg-cyan-100 dark:bg-cyan-900/30"
                max={100}
                warning={(latestData002?.waterLevel ?? 100) < 20}
              />
            </div>
            {latestData?.timestamp && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
                Cập nhật lúc: {new Date(latestData.timestamp).toLocaleString('vi-VN')}
              </p>
            )}
          </Card>

          {/* Device Control */}
          <Card>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Điều khiển thiết bị
            </h3>
            <div className="space-y-4">
              <DeviceToggle
                name="Quạt thông gió"
                description="Relay D6 (GPIO 12)"
                active={devices.fan}
                loading={isLoading === 'fan'}
                onClick={() => toggleDevice('fan')}
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
              />
              <DeviceToggle
                name="Bơm nước"
                description="Relay D5 (GPIO 14)"
                active={devices.pump}
                loading={isLoading === 'pump'}
                onClick={() => toggleDevice('pump')}
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                }
              />
            </div>
          </Card>
        </div>

        {/* Camera Section */}
        <Card>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Camera giám sát (ESP32-CAM)
          </h3>
          <CameraView />
        </Card>
      </div>
    </div>
  );
}
