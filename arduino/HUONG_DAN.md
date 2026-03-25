# Hướng dẫn kết nối ESP8266 với Web IoT

## 1. Sơ đồ kết nối phần cứng

```
ESP8266 NodeMCU
├── D7 (GPIO 13) ─────> DHT11 Data
├── D5 (GPIO 14) ─────> Relay Bơm (IN)
├── D6 (GPIO 12) ─────> Relay Quạt (IN)
├── 3.3V ─────────────> DHT11 VCC
├── 5V (VIN) ─────────> Relay VCC (cả 2 relay)
└── GND ──────────────> DHT11 GND, Relay GND
```

## 2. Cài đặt Arduino IDE

### 2.1 Thêm board ESP8266
1. Mở Arduino IDE
2. Vào **File > Preferences**
3. Thêm URL vào "Additional Board Manager URLs":
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
4. Vào **Tools > Board > Boards Manager**
5. Tìm "esp8266" và cài đặt

### 2.2 Cài đặt thư viện
Vào **Sketch > Include Library > Manage Libraries**, cài đặt:
- **DHT sensor library** by Adafruit
- **ArduinoJson** by Benoit Blanchon

### 2.3 Chọn Board
- Board: **NodeMCU 1.0 (ESP-12E Module)**
- Upload Speed: 115200
- Flash Size: 4MB (FS:2MB OTA:~1019KB)

## 3. Cấu hình code ESP8266

Mở file `ESP8266_SmartFarm.ino` và chỉnh sửa:

```cpp
// WiFi của bạn
const char* WIFI_SSID = "TEN_WIFI_CUA_BAN";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI";

// IP máy tính chạy Next.js (tìm bằng lệnh ipconfig)
const char* SERVER_URL = "http://192.168.1.xxx:3000";
```

## 4. Chạy Web Server

```bash
cd iot-web
npm run dev
```

Server sẽ chạy tại `http://localhost:3000`

## 5. Kiểm tra kết nối

### 5.1 Từ ESP8266
Mở Serial Monitor (115200 baud) để xem log:
```
[WiFi] Đã kết nối!
[WiFi] Địa chỉ IP: 192.168.1.xxx
[Server] Đang chạy tại http://192.168.1.xxx/
[Sensor] Nhiệt độ: 28.5°C, Độ ẩm: 65.0%
[HTTP] Gửi dữ liệu đến http://192.168.1.yyy:3000/api/sensors
[HTTP] Response code: 200
```

### 5.2 Truy cập trực tiếp ESP8266
Mở trình duyệt, nhập IP của ESP8266 (ví dụ: `http://192.168.1.xxx`)
Bạn sẽ thấy giao diện điều khiển đơn giản.

### 5.3 Test API
```bash
# Lấy dữ liệu cảm biến
curl http://localhost:3000/api/sensors

# Bật bơm
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{"device":"pump","action":"on"}'

# Tắt quạt
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -d '{"device":"fan","action":"off"}'
```

## 6. Các endpoint API

### Web Server (Next.js)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/sensors` | Lấy dữ liệu cảm biến |
| POST | `/api/sensors` | ESP8266 gửi dữ liệu lên |
| GET | `/api/devices` | Lấy trạng thái thiết bị |
| POST | `/api/devices` | Điều khiển thiết bị |

### ESP8266 Web Server

| Endpoint | Mô tả |
|----------|-------|
| `/` | Trang điều khiển |
| `/status` | JSON trạng thái |
| `/pump/on` | Bật bơm |
| `/pump/off` | Tắt bơm |
| `/fan/on` | Bật quạt |
| `/fan/off` | Tắt quạt |

## 7. Lưu ý quan trọng

1. **ESP8266 và máy tính phải cùng mạng WiFi**
2. **Relay module thường là Active LOW** (kích LOW để bật)
3. **Đảm bảo cấp nguồn đủ cho relay** (dùng nguồn ngoài nếu cần)
4. **DHT11 cần delay ít nhất 2 giây giữa các lần đọc**

## 8. Troubleshooting

### ESP8266 không kết nối WiFi
- Kiểm tra tên WiFi và mật khẩu
- Đảm bảo WiFi là 2.4GHz (ESP8266 không hỗ trợ 5GHz)

### Không gửi được dữ liệu lên server
- Kiểm tra IP của máy chạy Next.js (dùng `ipconfig`)
- Đảm bảo firewall cho phép port 3000
- Kiểm tra Next.js đang chạy

### DHT11 đọc sai/không đọc được
- Kiểm tra kết nối dây
- Thử thêm điện trở 10K pull-up giữa Data và VCC
- DHT11 chỉ đọc được mỗi 2 giây

### Relay không hoạt động
- Kiểm tra nguồn cấp cho relay (cần 5V)
- Relay thường là Active LOW, cần kích LOW để bật
