'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import ConnectionStatus from '@/components/iot/ConnectionStatus';
import { formatTime, formatDate } from '@/utils/formatters';
import type { SensorData } from '@/types/iot';

const MAX_AGE_MS = 6000;

function checkConnected(latest: SensorData | null): boolean {
  if (!latest) return false;
  return Date.now() - new Date(latest.timestamp).getTime() < MAX_AGE_MS;
}

export default function MonitoringPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [allHistory, setAllHistory] = useState<SensorData[]>([]);
  const [connected001, setConnected001] = useState(false);
  const [connected002, setConnected002] = useState(false);
  const [cameraConnected, setCameraConnected] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch cả 2 thiết bị cùng lúc, update state 1 lần → không flicker
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [res1, res2] = await Promise.all([
          fetch('/api/sensors?limit=50&deviceId=ESP8266_001'),
          fetch('/api/sensors?limit=50&deviceId=ESP8266_002'),
        ]);
        const [json1, json2] = await Promise.all([res1.json(), res2.json()]);

        const data1: SensorData[] = json1.data ?? [];
        const data2: SensorData[] = json2.data ?? [];

        const combined = [...data1, ...data2].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setAllHistory(combined);
        setConnected001(checkConnected(json1.latest ?? null));
        setConnected002(checkConnected(json2.latest ?? null));
      } catch {
        setConnected001(false);
        setConnected002(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  // Kiem tra ket noi ESP32-CAM qua URL da luu trong localStorage
  useEffect(() => {
    const check = () => {
      const savedUrl = localStorage.getItem('cameraUrl');
      if (!savedUrl) {
        setCameraConnected(false);
        return;
      }
      const img = new Image();
      const timeout = setTimeout(() => {
        img.src = '';
        setCameraConnected(false);
      }, 4000);
      img.onload = () => {
        clearTimeout(timeout);
        setCameraConnected(true);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        setCameraConnected(false);
      };
      img.src = `${savedUrl}/capture?t=${Date.now()}`;
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Header title="Giám sát" />

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
              <ConnectionStatus isConnected={connected001} connectedText="ESP8266_001 đã kết nối" />
              <ConnectionStatus isConnected={connected002} connectedText="ESP8266_002 đã kết nối" />
              <ConnectionStatus isConnected={cameraConnected} connectedText="ESP32-CAM đã kết nối" />
            </div>
          </div>
        </Card>

        {/* Data Table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Dữ liệu cảm biến gần đây
            </h3>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {allHistory.length} bản ghi
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">#</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Thời gian</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Nhiệt độ</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Độ ẩm</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Mức nước</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">Device ID</th>
                </tr>
              </thead>
              <tbody className="text-zinc-900 dark:text-zinc-100">
                {allHistory.slice(0, 20).map((item, index) => (
                  <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-3 px-4 text-zinc-500">{index + 1}</td>
                    <td className="py-3 px-4">{formatTime(item.timestamp)}</td>
                    <td className="py-3 px-4">{item.temperature}°C</td>
                    <td className="py-3 px-4">{item.humidity}%</td>
                    <td className="py-3 px-4">{item.waterLevel ?? 0}%</td>
                    <td className="py-3 px-4 text-zinc-500 text-sm">{item.deviceId}</td>
                  </tr>
                ))}
                {allHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Chưa có dữ liệu từ ESP8266. Hãy đảm bảo ESP8266 đang chạy và gửi dữ liệu đến server.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
