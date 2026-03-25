// API Route: Lệnh điều khiển cho ESP polling
// ESP sẽ gọi GET để lấy lệnh chờ, sau đó gọi PUT để xác nhận đã thực thi

import { NextResponse } from 'next/server';
import type { PendingCommand, DeviceState } from '@/types/iot';

// Queue lệnh chờ ESP thực thi (production nên dùng Redis/Database)
let commandQueue: PendingCommand[] = [];

// Trạng thái thiết bị hiện tại
let deviceState: DeviceState = {
  fan: false,
  pump: false,
  lastUpdated: new Date().toISOString(),
};

// Export để các module khác có thể thêm lệnh
export function addCommand(command: Omit<PendingCommand, 'id' | 'createdAt' | 'executed'>) {
  const newCommand: PendingCommand = {
    ...command,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    executed: false,
  };

  // Xóa lệnh cũ cho cùng device (chỉ giữ lệnh mới nhất)
  commandQueue = commandQueue.filter(
    cmd => !(cmd.deviceId === command.deviceId && cmd.device === command.device && !cmd.executed)
  );

  commandQueue.push(newCommand);
  console.log(`[COMMAND] Thêm lệnh: ${command.device} -> ${command.action} (${command.source})`);

  return newCommand;
}

// Export để lấy trạng thái thiết bị
export function getDeviceState(): DeviceState {
  return deviceState;
}

// Export để cập nhật trạng thái
export function updateDeviceState(newState: Partial<DeviceState>) {
  deviceState = {
    ...deviceState,
    ...newState,
    lastUpdated: new Date().toISOString(),
  };
}

// GET - ESP polling lấy lệnh chờ thực thi
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'ESP8266_001';

    // Tìm lệnh chưa thực thi cho device này
    const pendingCommands = commandQueue.filter(
      cmd => cmd.deviceId === deviceId && !cmd.executed
    );

    if (pendingCommands.length === 0) {
      return NextResponse.json({
        success: true,
        hasCommands: false,
        commands: [],
        deviceState,
      });
    }

    return NextResponse.json({
      success: true,
      hasCommands: true,
      commands: pendingCommands,
      deviceState,
    });
  } catch (error) {
    console.error('[COMMAND] Lỗi GET:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy lệnh' },
      { status: 500 }
    );
  }
}

// POST - Thêm lệnh điều khiển thủ công từ Web
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate
    if (!['fan', 'pump'].includes(data.device)) {
      return NextResponse.json(
        { success: false, error: 'Thiết bị không hợp lệ' },
        { status: 400 }
      );
    }

    if (!['on', 'off'].includes(data.action)) {
      return NextResponse.json(
        { success: false, error: 'Hành động không hợp lệ' },
        { status: 400 }
      );
    }

    const command = addCommand({
      deviceId: data.deviceId || 'ESP8266_001',
      device: data.device,
      action: data.action,
      source: 'manual',
      reason: 'Điều khiển thủ công từ Web',
    });

    return NextResponse.json({
      success: true,
      message: `Đã gửi lệnh ${data.action} cho ${data.device}`,
      command,
    });
  } catch (error) {
    console.error('[COMMAND] Lỗi POST:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi thêm lệnh' },
      { status: 500 }
    );
  }
}

// PUT - ESP xác nhận đã thực thi lệnh
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { commandId, deviceId, actualState } = data;

    // Đánh dấu lệnh đã thực thi
    if (commandId) {
      const cmdIndex = commandQueue.findIndex(cmd => cmd.id === commandId);
      if (cmdIndex !== -1) {
        commandQueue[cmdIndex].executed = true;
        commandQueue[cmdIndex].executedAt = new Date().toISOString();
      }
    }

    // Cập nhật trạng thái thực tế từ ESP
    if (actualState) {
      deviceState = {
        fan: actualState.fan ?? deviceState.fan,
        pump: actualState.pump ?? deviceState.pump,
        lastUpdated: new Date().toISOString(),
      };

      console.log(`[COMMAND] ESP báo cáo trạng thái: Fan=${deviceState.fan}, Pump=${deviceState.pump}`);
    }

    // Dọn dẹp lệnh cũ đã thực thi (giữ 50 lệnh gần nhất)
    const executedCommands = commandQueue.filter(cmd => cmd.executed);
    if (executedCommands.length > 50) {
      commandQueue = [
        ...commandQueue.filter(cmd => !cmd.executed),
        ...executedCommands.slice(-50),
      ];
    }

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật trạng thái',
      deviceState,
    });
  } catch (error) {
    console.error('[COMMAND] Lỗi PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi cập nhật' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa tất cả lệnh chờ (cho admin/debug)
export async function DELETE() {
  const pendingCount = commandQueue.filter(cmd => !cmd.executed).length;
  commandQueue = commandQueue.filter(cmd => cmd.executed);

  return NextResponse.json({
    success: true,
    message: `Đã xóa ${pendingCount} lệnh chờ`,
  });
}
