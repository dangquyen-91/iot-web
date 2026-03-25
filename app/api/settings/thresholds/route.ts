// API Route: Cấu hình ngưỡng tự động cho hệ thống IoT
// Server sẽ dựa vào ngưỡng này để ra quyết định điều khiển

import { NextResponse } from 'next/server';
import type { AutomationThresholds } from '@/types/iot';

// Cấu hình ngưỡng mặc định (production nên lưu database)
let automationThresholds: AutomationThresholds = {
  fan: {
    enabled: true,
    turnOnTemp: 30,      // Bật quạt khi nhiệt độ > 30°C
    turnOffTemp: 28,     // Tắt quạt khi nhiệt độ < 28°C
  },
  pump: {
    enabled: true,
    turnOnHumidity: 40,  // Bật bơm khi độ ẩm < 40%
    turnOffHumidity: 60, // Tắt bơm khi độ ẩm > 60%
  },
};

// Export để module khác sử dụng
export function getThresholds(): AutomationThresholds {
  return automationThresholds;
}

// GET - Lấy cấu hình ngưỡng hiện tại
export async function GET() {
  return NextResponse.json({
    success: true,
    data: automationThresholds,
  });
}

// POST - Cập nhật cấu hình ngưỡng
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate dữ liệu
    if (data.fan) {
      if (typeof data.fan.enabled === 'boolean') {
        automationThresholds.fan.enabled = data.fan.enabled;
      }
      if (typeof data.fan.turnOnTemp === 'number') {
        automationThresholds.fan.turnOnTemp = data.fan.turnOnTemp;
      }
      if (typeof data.fan.turnOffTemp === 'number') {
        automationThresholds.fan.turnOffTemp = data.fan.turnOffTemp;
      }

      // Kiểm tra logic: turnOnTemp phải > turnOffTemp
      if (automationThresholds.fan.turnOnTemp <= automationThresholds.fan.turnOffTemp) {
        return NextResponse.json(
          { success: false, error: 'Ngưỡng bật quạt phải lớn hơn ngưỡng tắt' },
          { status: 400 }
        );
      }
    }

    if (data.pump) {
      if (typeof data.pump.enabled === 'boolean') {
        automationThresholds.pump.enabled = data.pump.enabled;
      }
      if (typeof data.pump.turnOnHumidity === 'number') {
        automationThresholds.pump.turnOnHumidity = data.pump.turnOnHumidity;
      }
      if (typeof data.pump.turnOffHumidity === 'number') {
        automationThresholds.pump.turnOffHumidity = data.pump.turnOffHumidity;
      }

      // Kiểm tra logic: turnOffHumidity phải > turnOnHumidity
      if (automationThresholds.pump.turnOffHumidity <= automationThresholds.pump.turnOnHumidity) {
        return NextResponse.json(
          { success: false, error: 'Ngưỡng tắt bơm phải lớn hơn ngưỡng bật' },
          { status: 400 }
        );
      }
    }

    console.log('[THRESHOLDS] Cập nhật ngưỡng:', automationThresholds);

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật cấu hình ngưỡng',
      data: automationThresholds,
    });
  } catch (error) {
    console.error('[THRESHOLDS] Lỗi:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi cập nhật cấu hình' },
      { status: 500 }
    );
  }
}

// PUT - Reset về mặc định
export async function PUT() {
  automationThresholds = {
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

  return NextResponse.json({
    success: true,
    message: 'Đã reset về cấu hình mặc định',
    data: automationThresholds,
  });
}
