'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AutomationThresholds } from '@/types/iot';

const defaultThresholds: AutomationThresholds = {
  fan: {
    enabled: true,
    turnOnTemp: 30,
    turnOffTemp: 28,
  },
  pump: {
    enabled: true,
    turnOnHumidity: 40,
    turnOffHumidity: 60,
  },
};

export function useThresholds() {
  const [thresholds, setThresholds] = useState<AutomationThresholds>(defaultThresholds);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch thresholds from server
  const fetchThresholds = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/thresholds');
      const result = await response.json();
      if (result.success) {
        setThresholds(result.data);
      }
      setError(null);
    } catch (err) {
      setError('Không thể tải cấu hình');
      console.error('Fetch thresholds error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save thresholds to server
  const saveThresholds = useCallback(async (newThresholds: AutomationThresholds) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThresholds),
      });
      const result = await response.json();
      if (result.success) {
        setThresholds(result.data);
        return true;
      } else {
        setError(result.error || 'Lỗi lưu cấu hình');
        return false;
      }
    } catch (err) {
      setError('Không thể lưu cấu hình');
      console.error('Save thresholds error:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Reset to defaults
  const resetThresholds = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/thresholds', {
        method: 'PUT',
      });
      const result = await response.json();
      if (result.success) {
        setThresholds(result.data);
      }
    } catch (err) {
      console.error('Reset thresholds error:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  return {
    thresholds,
    loading,
    saving,
    error,
    saveThresholds,
    resetThresholds,
    refetch: fetchThresholds,
  };
}
