// API Route: Lenh dieu khien cho ESP polling
// Su dung MockAPI de luu tru - tuong thich Vercel serverless

import { NextResponse } from 'next/server';
import {
  addCommandToQueue,
  getPendingCommands,
  markCommandExecuted,
  getDeviceState,
  updateDeviceState,
} from '@/lib/iot-api';

// GET - ESP polling lay lenh cho thuc thi
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'ESP8266_001';

    // Lay commands chua thuc thi va device state tu MockAPI
    const [pendingCommands, deviceState] = await Promise.all([
      getPendingCommands(deviceId),
      getDeviceState(),
    ]);

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
    console.error('[COMMAND] Loi GET:', error);
    return NextResponse.json(
      { success: false, error: 'Loi lay lenh' },
      { status: 500 }
    );
  }
}

// POST - Them lenh dieu khien thu cong tu Web
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate
    if (!['fan', 'pump'].includes(data.device)) {
      return NextResponse.json(
        { success: false, error: 'Thiet bi khong hop le' },
        { status: 400 }
      );
    }

    if (!['on', 'off'].includes(data.action)) {
      return NextResponse.json(
        { success: false, error: 'Hanh dong khong hop le' },
        { status: 400 }
      );
    }

    const command = await addCommandToQueue({
      deviceId: data.deviceId || 'ESP8266_001',
      device: data.device,
      action: data.action,
      source: 'manual',
      reason: 'Dieu khien thu cong tu Web',
    });

    if (!command) {
      return NextResponse.json(
        { success: false, error: 'Khong the them lenh' },
        { status: 500 }
      );
    }

    console.log(`[COMMAND] Them lenh: ${data.device} -> ${data.action}`);

    return NextResponse.json({
      success: true,
      message: `Da gui lenh ${data.action} cho ${data.device}`,
      command,
    });
  } catch (error) {
    console.error('[COMMAND] Loi POST:', error);
    return NextResponse.json(
      { success: false, error: 'Loi them lenh' },
      { status: 500 }
    );
  }
}

// PUT - ESP xac nhan da thuc thi lenh
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { commandId, actualState } = data;

    // Danh dau lenh da thuc thi
    if (commandId) {
      await markCommandExecuted(commandId);
    }

    // Cap nhat trang thai thuc te tu ESP
    if (actualState) {
      await updateDeviceState({
        fan: actualState.fan,
        pump: actualState.pump,
      });

      console.log(`[COMMAND] ESP bao cao trang thai: Fan=${actualState.fan}, Pump=${actualState.pump}`);
    }

    const deviceState = await getDeviceState();

    return NextResponse.json({
      success: true,
      message: 'Da cap nhat trang thai',
      deviceState,
    });
  } catch (error) {
    console.error('[COMMAND] Loi PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Loi cap nhat' },
      { status: 500 }
    );
  }
}
