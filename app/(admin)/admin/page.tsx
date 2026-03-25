'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import type { SensorData, DeviceState } from '@/types/iot';

const MAX_AGE_MS = 6000;

function checkConnected(latest: SensorData | null): boolean {
  if (!latest) return false;
  return Date.now() - new Date(latest.timestamp).getTime() < MAX_AGE_MS;
}

export default function AdminPage() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [connected001, setConnected001] = useState(false);
  const [connected002, setConnected002] = useState(false);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [deviceState, setDeviceState] = useState<DeviceState>({ fan: false, pump: false });

  // Fetch user count
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(json => { if (json.users) setUserCount(json.users.length); })
      .catch(() => {});
  }, []);

  // Fetch ESP connection status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [res1, res2] = await Promise.all([
          fetch('/api/sensors?limit=1&deviceId=ESP8266_001'),
          fetch('/api/sensors?limit=1&deviceId=ESP8266_002'),
        ]);
        const [json1, json2] = await Promise.all([res1.json(), res2.json()]);
        setConnected001(checkConnected(json1.latest ?? null));
        setConnected002(checkConnected(json2.latest ?? null));
      } catch {
        setConnected001(false);
        setConnected002(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch relay state (fan/pump)
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/devices/commands?deviceId=ESP8266_001');
        const json = await res.json();
        if (json.success && json.deviceState) setDeviceState(json.deviceState);
      } catch {}
    };
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check camera connection via localStorage
  useEffect(() => {
    const check = () => {
      const savedUrl = localStorage.getItem('cameraUrl');
      if (!savedUrl) { setCameraConnected(false); return; }
      const img = new Image();
      const timeout = setTimeout(() => { img.src = ''; setCameraConnected(false); }, 4000);
      img.onload = () => { clearTimeout(timeout); setCameraConnected(true); };
      img.onerror = () => { clearTimeout(timeout); setCameraConnected(false); };
      img.src = `${savedUrl}/capture?t=${Date.now()}`;
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const connectedESPs = [connected001, connected002, cameraConnected].filter(Boolean).length;

  const deviceList = [
    {
      id: 'ESP8266_001',
      name: 'ESP8266_001',
      description: 'Cảm biến nhiệt độ & độ ẩm',
      type: 'Cảm biến',
      status: connected001 ? 'online' : 'offline',
      extra: null,
    },
    {
      id: 'ESP8266_002',
      name: 'ESP8266_002',
      description: 'Cảm biến mức nước',
      type: 'Cảm biến',
      status: connected002 ? 'online' : 'offline',
      extra: null,
    },
    {
      id: 'ESP32-CAM',
      name: 'ESP32-CAM',
      description: 'Camera giám sát',
      type: 'Camera',
      status: cameraConnected ? 'online' : 'offline',
      extra: null,
    },
    {
      id: 'relay-fan',
      name: 'Quạt thông gió',
      description: 'Relay D6 (GPIO 12) — ESP8266_001',
      type: 'Relay',
      status: connected001 ? 'online' : 'offline',
      extra: connected001 ? (deviceState.fan ? 'Đang bật' : 'Đang tắt') : null,
    },
    {
      id: 'relay-pump',
      name: 'Bơm nước',
      description: 'Relay D5 (GPIO 14) — ESP8266_001',
      type: 'Relay',
      status: connected001 ? 'online' : 'offline',
      extra: connected001 ? (deviceState.pump ? 'Đang bật' : 'Đang tắt') : null,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Quản trị" />

      <div className="flex-1 p-6 space-y-6">
        {/* Admin Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Tổng người dùng</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {userCount ?? '—'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Thiết bị kết nối</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {connectedESPs}
                  <span className="text-base font-normal text-zinc-400 dark:text-zinc-500">/3</span>
                </p>
              </div>
            </div>
          </Card>

        </div>

        {/* Device List */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Danh sách thiết bị
            </h3>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {connectedESPs}/3 ESP đang online
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm">Thiết bị</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm">Mô tả</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm">Loại</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm">Kết nối</th>
                  <th className="py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400 text-sm">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {deviceList.map((device) => (
                  <tr key={device.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">{device.name}</td>
                    <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">{device.description}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                        {device.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`flex items-center gap-1.5 text-sm font-medium ${
                        device.status === 'online'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-500 dark:text-red-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          device.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        }`} />
                        {device.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {device.extra ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          device.extra === 'Đang bật'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
                        }`}>
                          {device.extra}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
