// API Route: Nhan du lieu cam bien tu ESP8266
// Su dung MockAPI de luu tru - tuong thich Vercel serverless

import { NextResponse } from 'next/server';
import type { SensorData, SensorHistory } from '@/types/iot';
import {
  saveSensorData,
  getLatestSensorData,
  getSensorHistory,
  cleanupOldSensorData,
} from '@/lib/iot-api';

// POST - ESP8266 gui du lieu cam bien len
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate du lieu
    if (typeof data.temperature !== 'number' || typeof data.humidity !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Du lieu khong hop le. Can temperature va humidity.' },
        { status: 400 }
      );
    }

    const newReading: SensorData = {
      deviceId: data.deviceId || 'ESP8266_001',
      temperature: Math.round(data.temperature * 10) / 10,
      humidity: Math.round(data.humidity * 10) / 10,
      waterLevel: Math.round((data.waterLevel ?? 0) * 10) / 10,
      timestamp: new Date().toISOString(),
    };

    // Luu len MockAPI
    const saved = await saveSensorData(newReading);

    if (!saved) {
      return NextResponse.json(
        { success: false, error: 'Khong the luu du lieu' },
        { status: 500 }
      );
    }

    console.log(`[SENSOR] Nhan du lieu: ${newReading.temperature}°C, ${newReading.humidity}%`);

    // Cleanup du lieu cu (chay background, khong cho)
    cleanupOldSensorData(200).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Du lieu da duoc xu ly',
      data: saved,
    });
  } catch (error) {
    console.error('[SENSOR] Loi:', error);
    return NextResponse.json(
      { success: false, error: 'Loi xu ly du lieu' },
      { status: 500 }
    );
  }
}

// GET - Web app lay du lieu cam bien
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const deviceId = searchParams.get('deviceId') || undefined;

    // Lay du lieu tu MockAPI
    const [latest, history] = await Promise.all([
      getLatestSensorData(deviceId),
      getSensorHistory(Math.min(limit, 100), deviceId),
    ]);

    const response: SensorHistory = {
      data: history,
      latest,
      count: history.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SENSOR] Loi GET:', error);
    return NextResponse.json(
      { success: false, error: 'Loi lay du lieu' },
      { status: 500 }
    );
  }
}
