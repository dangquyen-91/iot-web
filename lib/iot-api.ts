// MockAPI Client cho IoT - Luu sensor data va commands tren MockAPI
// De hoat dong tren Vercel serverless

import type { SensorData, PendingCommand, DeviceState } from '@/types/iot';

// Project IoT moi - dung cho sensors va commands
const IOT_MOCKAPI_URL =
  process.env.IOT_MOCKAPI_URL || 'https://69c3a603b780a9ba03e777ad.mockapi.io';

// Endpoints
const SENSORS_ENDPOINT = `${IOT_MOCKAPI_URL}/data`;      // resource "data" cho sensors
const COMMANDS_ENDPOINT = `${IOT_MOCKAPI_URL}/data1`;    // resource "data1" cho commands

// ==================== SENSOR DATA ====================

/**
 * Luu sensor data len MockAPI
 */
export async function saveSensorData(data: SensorData): Promise<SensorData | null> {
  try {
    const response = await fetch(SENSORS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error saving sensor data:', error);
    return null;
  }
}

/**
 * Lay sensor data moi nhat
 */
export async function getLatestSensorData(deviceId?: string): Promise<SensorData | null> {
  try {
    let url = `${SENSORS_ENDPOINT}?sortBy=timestamp&order=desc&limit=1`;
    if (deviceId) {
      url += `&deviceId=${deviceId}`;
    }

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;

    const data: SensorData[] = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching latest sensor:', error);
    return null;
  }
}

/**
 * Lay lich su sensor data
 */
export async function getSensorHistory(limit: number = 50, deviceId?: string): Promise<SensorData[]> {
  try {
    let url = `${SENSORS_ENDPOINT}?sortBy=timestamp&order=desc&limit=${limit}`;
    if (deviceId) {
      url += `&deviceId=${deviceId}`;
    }

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return [];

    return response.json();
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    return [];
  }
}

/**
 * Xoa sensor data cu (giu lai N records moi nhat)
 */
export async function cleanupOldSensorData(keepCount: number = 100): Promise<void> {
  try {
    const response = await fetch(
      `${SENSORS_ENDPOINT}?sortBy=timestamp&order=desc`,
      { cache: 'no-store' }
    );

    if (!response.ok) return;

    const allData: SensorData[] = await response.json();

    // Xoa cac records cu
    if (allData.length > keepCount) {
      const toDelete = allData.slice(keepCount);
      await Promise.all(
        toDelete.map(item =>
          fetch(`${SENSORS_ENDPOINT}/${item.id}`, { method: 'DELETE' })
        )
      );
    }
  } catch (error) {
    console.error('Error cleaning up sensor data:', error);
  }
}

// ==================== COMMANDS ====================

/**
 * Them command vao queue
 */
export async function addCommandToQueue(
  command: Omit<PendingCommand, 'id' | 'createdAt' | 'executed'>
): Promise<PendingCommand | null> {
  try {
    // Xoa command cu cho cung device (chua executed)
    await clearPendingCommandsForDevice(command.deviceId, command.device);

    const newCommand: Omit<PendingCommand, 'id'> = {
      ...command,
      createdAt: new Date().toISOString(),
      executed: false,
    };

    const response = await fetch(COMMANDS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCommand),
    });

    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error adding command:', error);
    return null;
  }
}

/**
 * Lay commands chua thuc thi cho device
 */
export async function getPendingCommands(deviceId: string): Promise<PendingCommand[]> {
  try {
    const response = await fetch(
      `${COMMANDS_ENDPOINT}?deviceId=${deviceId}&executed=false&sortBy=createdAt&order=desc`,
      { cache: 'no-store' }
    );

    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.error('Error fetching pending commands:', error);
    return [];
  }
}

/**
 * Danh dau command da thuc thi
 */
export async function markCommandExecuted(commandId: string): Promise<boolean> {
  try {
    const response = await fetch(`${COMMANDS_ENDPOINT}/${commandId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executed: true,
        executedAt: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error marking command executed:', error);
    return false;
  }
}

/**
 * Xoa pending commands cho device/device-type
 */
async function clearPendingCommandsForDevice(deviceId: string, device: string): Promise<void> {
  try {
    const response = await fetch(
      `${COMMANDS_ENDPOINT}?deviceId=${deviceId}&device=${device}&executed=false`,
      { cache: 'no-store' }
    );

    if (!response.ok) return;

    const commands: PendingCommand[] = await response.json();
    await Promise.all(
      commands.map(cmd =>
        fetch(`${COMMANDS_ENDPOINT}/${cmd.id}`, { method: 'DELETE' })
      )
    );
  } catch (error) {
    console.error('Error clearing pending commands:', error);
  }
}

// ==================== DEVICE STATE ====================
// Luu state trong 1 record dac biet cua commands

const STATE_RECORD_DEVICE_ID = '_STATE_';

/**
 * Lay device state tu record dac biet trong commands
 */
export async function getDeviceState(): Promise<DeviceState> {
  const defaultState: DeviceState = {
    fan: false,
    pump: false,
    lastUpdated: new Date().toISOString(),
  };

  try {
    const response = await fetch(
      `${COMMANDS_ENDPOINT}?deviceId=${STATE_RECORD_DEVICE_ID}&limit=1`,
      { cache: 'no-store' }
    );

    if (!response.ok) return defaultState;

    const records = await response.json();
    if (records.length === 0) {
      // Tao record state moi
      await fetch(COMMANDS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: STATE_RECORD_DEVICE_ID,
          device: 'state',
          action: 'init',
          fan: false,
          pump: false,
          createdAt: new Date().toISOString(),
          executed: true,
        }),
      });
      return defaultState;
    }

    const stateRecord = records[0];
    return {
      fan: stateRecord.fan ?? false,
      pump: stateRecord.pump ?? false,
      lastUpdated: stateRecord.createdAt,
    };
  } catch (error) {
    console.error('Error fetching device state:', error);
    return defaultState;
  }
}

/**
 * Cap nhat device state
 */
export async function updateDeviceState(newState: Partial<DeviceState>): Promise<DeviceState | null> {
  try {
    const response = await fetch(
      `${COMMANDS_ENDPOINT}?deviceId=${STATE_RECORD_DEVICE_ID}&limit=1`,
      { cache: 'no-store' }
    );

    if (!response.ok) return null;

    const records = await response.json();

    if (records.length === 0) {
      // Tao moi
      const createRes = await fetch(COMMANDS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: STATE_RECORD_DEVICE_ID,
          device: 'state',
          action: 'update',
          fan: newState.fan ?? false,
          pump: newState.pump ?? false,
          createdAt: new Date().toISOString(),
          executed: true,
        }),
      });
      if (!createRes.ok) return null;
      const created = await createRes.json();
      return { fan: created.fan, pump: created.pump, lastUpdated: created.createdAt };
    }

    // Cap nhat record hien tai
    const stateRecord = records[0];
    const updateRes = await fetch(`${COMMANDS_ENDPOINT}/${stateRecord.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...stateRecord,
        fan: newState.fan ?? stateRecord.fan,
        pump: newState.pump ?? stateRecord.pump,
        createdAt: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) return null;
    const updated = await updateRes.json();
    return { fan: updated.fan, pump: updated.pump, lastUpdated: updated.createdAt };
  } catch (error) {
    console.error('Error updating device state:', error);
    return null;
  }
}
