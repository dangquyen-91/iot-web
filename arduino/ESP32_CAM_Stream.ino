/*
 * ESP32-CAM Stream - Camera giam sat IoT
 *
 * Board: AI-Thinker ESP32-CAM
 * Camera: OV3660
 * Giao thuc: HTTP (MJPEG stream)
 *
 * Endpoint:
 * - GET /        : Trang debug hien thi stream + thong tin
 * - GET /stream  : MJPEG stream (frontend CameraView goi endpoint nay)
 *
 * Cai dat Arduino IDE:
 * 1. Board Manager: cai "esp32" cua Espressif Systems
 * 2. Chon board: "AI Thinker ESP32-CAM"
 * 3. Upload Speed: 115200
 * 4. Khi upload: nhan nut RESET tren board
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ==================== CAU HINH ====================

// WiFi - thay thong tin WiFi cua ban
const char* WIFI_SSID = "DangHuyen";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI_CUA_BAN";

// ==================== PIN ESP32-CAM (AI-Thinker) ====================

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// LED Flash (GPIO 4 tren AI-Thinker)
#define FLASH_GPIO_NUM     4

// ==================== BIEN TOAN CUC ====================

httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

// MJPEG boundary
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// ==================== KHOI TAO CAMERA ====================

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;

  // Cau hinh do phan giai dua tren PSRAM
  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;    // 640x480
    config.jpeg_quality = 12;              // 0-63, thap = chat luong cao
    config.fb_count = 2;                   // 2 frame buffer cho stream muot
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    config.frame_size = FRAMESIZE_QVGA;   // 320x240 (khong co PSRAM)
    config.jpeg_quality = 15;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[Camera] Loi khoi tao: 0x%x\n", err);
    return false;
  }

  // Tinh chinh camera OV3660
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_vflip(s, 1);          // OV3660 can lat doc
    s->set_brightness(s, 1);     // -2 den 2
    s->set_saturation(s, -2);    // OV3660 mac dinh bao hoa cao, giam xuong
  }

  Serial.println("[Camera] Khoi tao thanh cong!");
  if (psramFound()) {
    Serial.println("[Camera] PSRAM: Co - Do phan giai: VGA (640x480)");
  } else {
    Serial.println("[Camera] PSRAM: Khong - Do phan giai: QVGA (320x240)");
  }

  return true;
}

// ==================== HANDLER: MJPEG STREAM ====================

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  // Cho phep truy cap tu web app (CORS)
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "X-Framerate", "25");

  res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  if (res != ESP_OK) {
    return res;
  }

  Serial.println("[Stream] Client da ket noi");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[Stream] Loi lay frame");
      res = ESP_FAIL;
      break;
    }

    // Gui boundary
    res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (res != ESP_OK) {
      esp_camera_fb_return(fb);
      break;
    }

    // Gui header cua frame
    size_t hlen = snprintf(part_buf, 64, STREAM_PART, fb->len);
    res = httpd_resp_send_chunk(req, part_buf, hlen);
    if (res != ESP_OK) {
      esp_camera_fb_return(fb);
      break;
    }

    // Gui du lieu JPEG
    res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);

    if (res != ESP_OK) {
      break;
    }
  }

  Serial.println("[Stream] Client da ngat ket noi");
  return res;
}

// ==================== HANDLER: TRANG DEBUG ====================

static esp_err_t index_handler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  String html = "<!DOCTYPE html><html><head>";
  html += "<meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP32-CAM Stream</title>";
  html += "<style>";
  html += "body{font-family:Arial;margin:20px;background:#1a1a2e;color:#eee;}";
  html += ".card{background:#16213e;padding:20px;margin:10px 0;border-radius:10px;}";
  html += "img{width:100%;border-radius:10px;}";
  html += ".info{background:#0f3460;padding:10px;border-radius:5px;margin:5px 0;}";
  html += "a{color:#4fc3f7;}";
  html += "</style></head><body>";

  html += "<h1>ESP32-CAM Stream</h1>";

  html += "<div class='card'>";
  html += "<img src='/stream' alt='Camera Stream'>";
  html += "</div>";

  html += "<div class='card'>";
  html += "<h2>Thong tin</h2>";
  html += "<div class='info'>IP: " + WiFi.localIP().toString() + "</div>";
  html += "<div class='info'>Stream URL: <a href='http://" + WiFi.localIP().toString() + ":81/stream'>http://" + WiFi.localIP().toString() + ":81/stream</a></div>";
  html += "<div class='info'>Nhap vao web app: <strong>http://" + WiFi.localIP().toString() + ":81</strong></div>";
  html += "<div class='info'>PSRAM: " + String(psramFound() ? "Co" : "Khong") + "</div>";
  html += "</div>";

  html += "</body></html>";

  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, html.c_str(), html.length());
}

// ==================== KHOI DONG HTTP SERVER ====================

void startHttpServer() {
  // Server 1: Trang web (port 80)
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri = {
    .uri       = "/",
    .method    = HTTP_GET,
    .handler   = index_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    Serial.printf("[Server] Trang debug: http://%s/\n", WiFi.localIP().toString().c_str());
  }

  // Server 2: Stream (port 81)
  config.server_port = 81;
  config.ctrl_port = 32769;

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    Serial.printf("[Server] Stream URL: http://%s:81/stream\n", WiFi.localIP().toString().c_str());
  }
}

// ==================== KET NOI WIFI ====================

void connectWiFi() {
  Serial.print("[WiFi] Dang ket noi den ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Da ket noi!");
    Serial.print("[WiFi] Dia chi IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Ket noi that bai! Khoi dong lai sau 5 giay...");
    delay(5000);
    ESP.restart();
  }
}

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n========================================");
  Serial.println("   ESP32-CAM Stream - Smart Farm");
  Serial.println("========================================");

  // Tat LED flash
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);

  // Khoi tao camera
  if (!initCamera()) {
    Serial.println("[ERROR] Khong the khoi tao camera! Khoi dong lai...");
    delay(3000);
    ESP.restart();
  }

  // Ket noi WiFi
  connectWiFi();

  // Khoi dong HTTP server
  startHttpServer();

  Serial.println("\n========================================");
  Serial.printf("   Nhap vao web app: http://%s:81\n", WiFi.localIP().toString().c_str());
  Serial.println("========================================\n");
}

// ==================== LOOP ====================

void loop() {
  // Kiem tra WiFi, reconnect neu mat ket noi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Mat ket noi! Dang ket noi lai...");
    connectWiFi();
    startHttpServer();
  }

  delay(10000);  // Kiem tra WiFi moi 10 giay
}
