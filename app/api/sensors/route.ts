// API Route: Nhận dữ liệu cảm biến từ ESP8266 và ra quyết định tự động
// ESP chỉ gửi data, SERVER ra quyết định điều khiển

import { NextResponse } from 'next/server';
import type { SensorData, SensorHistory, DecisionLog, AutomationThresholds } from '@/types/iot';
import { getThresholds } from '@/app/api/settings/thresholds/route';
import { addCommand, getDeviceState } from '@/app/api/devices/commands/route';

// Lưu trữ dữ liệu cảm biến trong memory (production nên dùng database)
let sensorDataStore: SensorData[] = [];
let decisionLogs: DecisionLog[] = [];
const MAX_RECORDS = 500;
const MAX_DECISION_LOGS = 100;

// Hàm ra quyết định tự động dựa trên dữ liệu cảm biến
function makeAutomationDecision(sensorData: SensorData): DecisionLog {
  const thresholds = getThresholds();
  const deviceState = getDeviceState();
  const decisions: DecisionLog['decision'][] = [];

  // Quyết định cho QUẠT (dựa trên nhiệt độ)
  if (thresholds.fan.enabled) {
    if (!deviceState.fan && sensorData.temperature > thresholds.fan.turnOnTemp) {
      // Nhiệt độ cao, cần bật quạt
      addCommand({
        deviceId: sensorData.deviceId,
        device: 'fan',
        action: 'on',
        source: 'auto',
        reason: `Nhiệt độ ${sensorData.temperature}°C > ${thresholds.fan.turnOnTemp}°C`,
      });
      decisions.push({
        device: 'fan',
        action: 'on',
        reason: `Nhiệt độ ${sensorData.temperature}°C vượt ngưỡng ${thresholds.fan.turnOnTemp}°C`,
      });
      console.log(`[AUTO] BẬT QUẠT - Nhiệt độ: ${sensorData.temperature}°C > ${thresholds.fan.turnOnTemp}°C`);
    } else if (deviceState.fan && sensorData.temperature < thresholds.fan.turnOffTemp) {
      // Nhiệt độ đã giảm, tắt quạt
      addCommand({
        deviceId: sensorData.deviceId,
        device: 'fan',
        action: 'off',
        source: 'auto',
        reason: `Nhiệt độ ${sensorData.temperature}°C < ${thresholds.fan.turnOffTemp}°C`,
      });
      decisions.push({
        device: 'fan',
        action: 'off',
        reason: `Nhiệt độ ${sensorData.temperature}°C dưới ngưỡng ${thresholds.fan.turnOffTemp}°C`,
      });
      console.log(`[AUTO] TẮT QUẠT - Nhiệt độ: ${sensorData.temperature}°C < ${thresholds.fan.turnOffTemp}°C`);
    }
  }

  // Quyết định cho BƠM (dựa trên độ ẩm)
  if (thresholds.pump.enabled) {
    if (!deviceState.pump && sensorData.humidity < thresholds.pump.turnOnHumidity) {
      // Độ ẩm thấp, cần bật bơm
      addCommand({
        deviceId: sensorData.deviceId,
        device: 'pump',
        action: 'on',
        source: 'auto',
        reason: `Độ ẩm ${sensorData.humidity}% < ${thresholds.pump.turnOnHumidity}%`,
      });
      decisions.push({
        device: 'pump',
        action: 'on',
        reason: `Độ ẩm ${sensorData.humidity}% dưới ngưỡng ${thresholds.pump.turnOnHumidity}%`,
      });
      console.log(`[AUTO] BẬT BƠM - Độ ẩm: ${sensorData.humidity}% < ${thresholds.pump.turnOnHumidity}%`);
    } else if (deviceState.pump && sensorData.humidity > thresholds.pump.turnOffHumidity) {
      // Độ ẩm đã đủ, tắt bơm
      addCommand({
        deviceId: sensorData.deviceId,
        device: 'pump',
        action: 'off',
        source: 'auto',
        reason: `Độ ẩm ${sensorData.humidity}% > ${thresholds.pump.turnOffHumidity}%`,
      });
      decisions.push({
        device: 'pump',
        action: 'off',
        reason: `Độ ẩm ${sensorData.humidity}% vượt ngưỡng ${thresholds.pump.turnOffHumidity}%`,
      });
      console.log(`[AUTO] TẮT BƠM - Độ ẩm: ${sensorData.humidity}% > ${thresholds.pump.turnOffHumidity}%`);
    }
  }

  // Tạo log quyết định
  const decisionLog: DecisionLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    sensorData,
    decision: decisions.length > 0 ? decisions[0] : null, // Lấy quyết định đầu tiên
    thresholds,
  };

  // Lưu log
  decisionLogs.unshift(decisionLog);
  if (decisionLogs.length > MAX_DECISION_LOGS) {
    decisionLogs = decisionLogs.slice(0, MAX_DECISION_LOGS);
  }

  return decisionLog;
}

// POST - ESP8266 gửi dữ liệu cảm biến lên
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate dữ liệu
    if (typeof data.temperature !== 'number' || typeof data.humidity !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ. Cần temperature và humidity.' },
        { status: 400 }
      );
    }

    const newReading: SensorData = {
      id: Date.now().toString(),
      deviceId: data.deviceId || 'ESP8266_001',
      temperature: Math.round(data.temperature * 10) / 10,
      humidity: Math.round(data.humidity * 10) / 10,
      waterLevel: Math.round((data.waterLevel ?? 0) * 10) / 10,
      timestamp: new Date().toISOString(),
    };

    // Thêm vào đầu mảng (mới nhất trước)
    sensorDataStore.unshift(newReading);

    // Giới hạn số lượng bản ghi
    if (sensorDataStore.length > MAX_RECORDS) {
      sensorDataStore = sensorDataStore.slice(0, MAX_RECORDS);
    }

    console.log(`[SENSOR] Nhận dữ liệu: ${newReading.temperature}°C, ${newReading.humidity}%, Mức nước: ${newReading.waterLevel}%`);

    // ===== TẮT AUTOMATION - Chỉ điều khiển thủ công =====
    // const decisionLog = makeAutomationDecision(newReading);

    return NextResponse.json({
      success: true,
      message: 'Dữ liệu đã được xử lý',
      data: newReading,
      // automation: {
      //   decision: decisionLog.decision,
      //   thresholds: decisionLog.thresholds,
      // },
    });
  } catch (error) {
    console.error('[SENSOR] Lỗi:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xử lý dữ liệu' },
      { status: 500 }
    );
  }
}

// GET - Web app lấy dữ liệu cảm biến
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const deviceId = searchParams.get('deviceId');
    const includeDecisions = searchParams.get('includeDecisions') === 'true';

    let filteredData = sensorDataStore;

    // Lọc theo deviceId nếu có
    if (deviceId) {
      filteredData = filteredData.filter(d => d.deviceId === deviceId);
    }

    // Giới hạn số lượng trả về
    const data = filteredData.slice(0, Math.min(limit, 100));

    const response: SensorHistory & { decisions?: DecisionLog[] } = {
      data,
      latest: data[0] || null,
      count: filteredData.length,
    };

    // Bao gồm log quyết định nếu yêu cầu
    if (includeDecisions) {
      response.decisions = decisionLogs.slice(0, 20);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SENSOR] Lỗi GET:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy dữ liệu' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa dữ liệu cũ (cho admin)
export async function DELETE() {
  sensorDataStore = [];
  decisionLogs = [];
  return NextResponse.json({
    success: true,
    message: 'Đã xóa toàn bộ dữ liệu cảm biến và log quyết định',
  });
}
