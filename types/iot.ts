// Types cho hệ thống IoT Nông trại thông minh

// Dữ liệu cảm biến từ ESP8266
export interface SensorData {
  id?: string;
  deviceId: string;
  temperature: number;      // Nhiệt độ (°C)
  humidity: number;         // Độ ẩm không khí (%)
  waterLevel: number;       // Mức nước (%)
  timestamp: string;
}

// Trạng thái thiết bị điều khiển
export interface DeviceState {
  fan: boolean;             // Quạt thông gió (relay_quat - D6)
  pump: boolean;            // Bơm nước (relay_bom - D5)
  lastUpdated?: string;
}

// Lệnh điều khiển gửi đến ESP8266
export interface DeviceCommand {
  device: 'fan' | 'pump';
  action: 'on' | 'off';
}

// Response từ ESP8266
export interface ESPResponse {
  success: boolean;
  message?: string;
  data?: SensorData | DeviceState;
}

// Cấu hình ESP8266
export interface ESPConfig {
  ip: string;
  port?: number;
  name: string;
  type: 'sensor' | 'controller' | 'camera';
  status: 'online' | 'offline';
  lastSeen?: string;
}

// Lịch sử dữ liệu cảm biến
export interface SensorHistory {
  data: SensorData[];
  latest: SensorData | null;
  count: number;
}

// Cấu hình ngưỡng tự động cho server ra quyết định
export interface AutomationThresholds {
  // Ngưỡng quạt (dựa trên nhiệt độ)
  fan: {
    enabled: boolean;
    turnOnTemp: number;      // Bật quạt khi temp > giá trị này
    turnOffTemp: number;     // Tắt quạt khi temp < giá trị này
  };
  // Ngưỡng bơm (dựa trên độ ẩm)
  pump: {
    enabled: boolean;
    turnOnHumidity: number;  // Bật bơm khi humidity < giá trị này
    turnOffHumidity: number; // Tắt bơm khi humidity > giá trị này
  };
}

// Lệnh chờ ESP polling lấy về
export interface PendingCommand {
  id: string;
  deviceId: string;         // ID của ESP cần thực thi
  device: 'fan' | 'pump';
  action: 'on' | 'off';
  source: 'auto' | 'manual'; // Tự động hay thủ công
  reason?: string;           // Lý do (cho auto)
  createdAt: string;
  executed: boolean;
  executedAt?: string;
}

// Log quyết định tự động
export interface DecisionLog {
  id: string;
  timestamp: string;
  sensorData: SensorData;
  decision: {
    device: 'fan' | 'pump';
    action: 'on' | 'off';
    reason: string;
  } | null;
  thresholds: AutomationThresholds;
}
