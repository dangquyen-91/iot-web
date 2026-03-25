'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DeviceState } from '@/types/iot';

interface UseDeviceControlReturn {
  devices: DeviceState;
  isLoading: 'fan' | 'pump' | null;
  toggleDevice: (device: 'fan' | 'pump') => Promise<void>;
  error: string | null;
}

export function useDeviceControl(): UseDeviceControlReturn {
  const [devices, setDevices] = useState<DeviceState>({
    fan: false,
    pump: false,
  });
  const [isLoading, setIsLoading] = useState<'fan' | 'pump' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastToggleTime = useRef<number>(0);

  // Fetch device state from commands API (lay state tu ESP8266 bao cao)
  useEffect(() => {
    const fetchDeviceState = async () => {
      // TAM DUNG polling trong 5s sau khi toggle de tranh bi de state
      const timeSinceLastToggle = Date.now() - lastToggleTime.current;
      if (timeSinceLastToggle < 5000) {
        return; // Skip polling
      }

      try {
        const res = await fetch('/api/devices/commands?deviceId=ESP8266_001');
        const json = await res.json();
        if (json.success && json.deviceState) {
          setDevices(json.deviceState);
        }
      } catch (err) {
        console.error('Loi fetch device state:', err);
      }
    };

    fetchDeviceState();
    const interval = setInterval(fetchDeviceState, 3000); // Poll moi 3s
    return () => clearInterval(interval);
  }, []);

  // Toggle device
  const toggleDevice = useCallback(async (device: 'fan' | 'pump') => {
    setIsLoading(device);
    setError(null);

    const action = devices[device] ? 'off' : 'on';
    const newState = action === 'on';

    // OPTIMISTIC UPDATE - cap nhat state NGAY LAP TUC (khong doi API)
    setDevices(prev => ({
      ...prev,
      [device]: newState
    }));

    // Danh dau thoi gian toggle de tam dung polling
    lastToggleTime.current = Date.now();

    try {
      const res = await fetch('/api/devices/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device,
          action,
          deviceId: 'ESP8266_001'
        }),
      });

      const json = await res.json();
      if (!json.success) {
        // Neu API loi, rollback state
        setDevices(prev => ({
          ...prev,
          [device]: !newState
        }));
        setError(json.error || 'Loi dieu khien thiet bi');
      }
    } catch (err) {
      console.error('Loi toggle device:', err);
      // Rollback state neu loi
      setDevices(prev => ({
        ...prev,
        [device]: !newState
      }));
      setError('Khong the ket noi server');
    } finally {
      setIsLoading(null);
    }
  }, [devices]);

  return { devices, isLoading, toggleDevice, error };
}
