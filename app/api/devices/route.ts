// API Route: Điều khiển thiết bị (relay bơm, quạt) qua ESP8266

import { NextResponse } from 'next/server';
import type { DeviceState, DeviceCommand } from '@/types/iot';

// Trạng thái thiết bị hiện tại (sync với ESP8266)
let deviceState: DeviceState = {
  fan: false,
  pump: false,
  lastUpdated: new Date().toISOString(),
};

// IP của ESP8266 điều khiển relay (cấu hình qua env hoặc settings)
const ESP_CONTROLLER_IP = process.env.ESP_CONTROLLER_IP || '';

// GET - Lấy trạng thái thiết bị hiện tại
export async function GET() {
  return NextResponse.json({
    success: true,
    data: deviceState,
  });
}

// POST - Điều khiển thiết bị
export async function POST(request: Request) {
  try {
    const command: DeviceCommand = await request.json();

    // Validate
    if (!['fan', 'pump'].includes(command.device)) {
      return NextResponse.json(
        { success: false, error: 'Thiết bị không hợp lệ. Chỉ hỗ trợ: fan, pump' },
        { status: 400 }
      );
    }

    if (!['on', 'off'].includes(command.action)) {
      return NextResponse.json(
        { success: false, error: 'Hành động không hợp lệ. Chỉ hỗ trợ: on, off' },
        { status: 400 }
      );
    }

    const newState = command.action === 'on';

    // Nếu có IP ESP8266, gửi lệnh điều khiển
    if (ESP_CONTROLLER_IP) {
      try {
        const endpoint = command.device === 'fan' ? 'fan' : 'pump';
        const espUrl = `http://${ESP_CONTROLLER_IP}/${endpoint}/${command.action}`;

        const espResponse = await fetch(espUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // Timeout 5s
        });

        if (!espResponse.ok) {
          console.error(`[DEVICE] ESP8266 trả về lỗi: ${espResponse.status}`);
        }
      } catch (espError) {
        console.error('[DEVICE] Không thể kết nối ESP8266:', espError);
        // Vẫn cập nhật state local để demo
      }
    }

    // Cập nhật trạng thái local
    deviceState = {
      ...deviceState,
      [command.device]: newState,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`[DEVICE] ${command.device.toUpperCase()} -> ${command.action.toUpperCase()}`);

    return NextResponse.json({
      success: true,
      message: `${command.device === 'fan' ? 'Quạt' : 'Bơm'} đã ${newState ? 'BẬT' : 'TẮT'}`,
      data: deviceState,
    });
  } catch (error) {
    console.error('[DEVICE] Lỗi:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi điều khiển thiết bị' },
      { status: 500 }
    );
  }
}

// PUT - Cập nhật trạng thái từ ESP8266 (ESP gọi khi có thay đổi)
export async function PUT(request: Request) {
  try {
    const data = await request.json();

    // ESP8266 báo cáo trạng thái thực tế
    deviceState = {
      fan: data.fan ?? deviceState.fan,
      pump: data.pump ?? deviceState.pump,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`[DEVICE] ESP8266 báo cáo: Fan=${deviceState.fan}, Pump=${deviceState.pump}`);

    return NextResponse.json({
      success: true,
      data: deviceState,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Lỗi cập nhật trạng thái' },
      { status: 500 }
    );
  }
}
