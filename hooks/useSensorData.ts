'use client';

import { useState, useEffect } from 'react';
import type { SensorData } from '@/types/iot';

interface UseSensorDataOptions {
  limit?: number;
  pollingInterval?: number;
  deviceId?: string;
}

interface UseSensorDataReturn {
  latestData: SensorData | null;
  history: SensorData[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSensorData(options: UseSensorDataOptions = {}): UseSensorDataReturn {
  const { limit = 1, pollingInterval = 3000, deviceId } = options;

  const [latestData, setLatestData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = deviceId
          ? `/api/sensors?limit=${limit}&deviceId=${deviceId}`
          : `/api/sensors?limit=${limit}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.latest) {
          // Kiểm tra xem dữ liệu có quá cũ không (> 10 giây = thiết bị đã ngắt kết nối)
          const dataAge = Date.now() - new Date(json.latest.timestamp).getTime();
          const maxAge = 6000; // 6 giây (3x send interval)

          if (dataAge < maxAge) {
            // Dữ liệu còn mới - thiết bị vẫn kết nối
            setLatestData(json.latest);
            setIsConnected(true);
          } else {
            // Dữ liệu quá cũ - thiết bị đã ngắt kết nối
            setLatestData(null);
            setIsConnected(false);
          }
        } else {
          // Không có dữ liệu
          setLatestData(null);
          setIsConnected(false);
        }

        if (json.data) {
          setHistory(json.data);
        }

        setError(null);
      } catch (err) {
        console.error('Loi fetch sensor:', err);
        setIsConnected(false);
        setError('Khong the ket noi den server');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, pollingInterval);
    return () => clearInterval(interval);
  }, [limit, pollingInterval, deviceId]);

  return { latestData, history, isConnected, isLoading, error };
}
