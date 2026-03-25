/*
 * ESP8266 Water Level Sensor - Cam bien muc nuoc
 *
 * CHUC NANG: Doc cam bien muc nuoc tai chan A0 va gui len server
 *
 * Ket noi phan cung:
 * - Cam bien muc nuoc: A0 (ADC)
 *
 * Luu y: ESP8266 chi co 1 chan analog (A0), dai doc 0-1.0V
 * Neu cam bien xuat 0-3.3V can them dien tro chia ap:
 *   A0 <-- [R1=220k] -- Cam bien -- [R2=100k] -- GND
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>

// ==================== CAU HINH ====================

// WiFi
const char* WIFI_SSID = "DangHuyen";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI_CUA_BAN";  // Thay mat khau WiFi cua ban o day

// Server URL (dia chi may chay Next.js)
const char* SERVER_URL = "http://192.168.1.9:3000";

// Device ID - khac voi ESP chinh (ESP8266_001)
const char* DEVICE_ID = "ESP8266_002";

// Thoi gian (ms)
const unsigned long SEND_INTERVAL = 2000;   // Gui sensor data moi 2 giay

// ==================== CHAN KET NOI ====================

// A0 la chan analog duy nhat tren ESP8266, khong can khai bao them

// ==================== BIEN TOAN CUC ====================

ESP8266WebServer server(80);
WiFiClient wifiClient;

float waterLevelPercent = 0;   // Muc nuoc (0-100%)
int rawValue = 0;              // Gia tri ADC thu (0-1023)
unsigned long lastSendTime = 0;

// ==================== HAM SETUP ====================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n========================================");
  Serial.println("   ESP8266 Water Level Sensor");
  Serial.println("   Cam bien muc nuoc - Chan A0");
  Serial.println("========================================");

  // Ket noi WiFi
  connectWiFi();

  // Cau hinh Web Server de debug
  setupWebServer();

  Serial.println("\n[OK] He thong san sang!");
  Serial.println("[INFO] Doc cam bien A0, gui len server moi 5 giay");
  Serial.println("========================================\n");
}

// ==================== HAM LOOP ====================

void loop() {
  server.handleClient();

  unsigned long currentTime = millis();

  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    readWaterLevel();
    sendSensorData();
    lastSendTime = currentTime;
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
    Serial.println("\n[WiFi] Ket noi that bai! Khoi dong lai...");
    ESP.restart();
  }
}

// ==================== DOC CAM BIEN MUC NUOC ====================

void readWaterLevel() {
  // Doc gia tri ADC tai chan A0 (0-1023)
  // Lay trung binh 10 lan do de giam nhieu
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(A0);
    delay(5);
  }
  rawValue = sum / 10;

  // Chuyen doi sang phan tram (0-100%)
  // Dieu chinh RAW_MIN va RAW_MAX theo cam bien thuc te cua ban:
  //   - RAW_MIN: gia tri ADC khi muc nuoc thap nhat (can o kho)
  //   - RAW_MAX: gia tri ADC khi muc nuoc day (ngap toan bo can)
  const int RAW_MIN = 0;    // ADC khi kho hoan toan
  const int RAW_MAX = 1023; // ADC khi ngap hoan toan

  waterLevelPercent = ((float)(rawValue - RAW_MIN) / (RAW_MAX - RAW_MIN)) * 100.0;

  // Gioi han trong khoang 0-100%
  waterLevelPercent = constrain(waterLevelPercent, 0.0, 100.0);

  // Lam tron 1 chu so thap phan
  waterLevelPercent = round(waterLevelPercent * 10.0) / 10.0;

  Serial.print("[Sensor] ADC: ");
  Serial.print(rawValue);
  Serial.print(" | Muc nuoc: ");
  Serial.print(waterLevelPercent);
  Serial.println("%");
}

// ==================== GUI DU LIEU LEN SERVER ====================

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi chua ket noi, thu ket noi lai...");
    connectWiFi();
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/sensors";

  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");

  // Tao JSON - gui waterLevel len server
  // temperature va humidity de 0 vi ESP nay khong co DHT
  StaticJsonDocument<200> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["waterLevel"]  = waterLevelPercent;
  doc["temperature"] = 0;
  doc["humidity"]    = 0;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("[HTTP] Gui data: ");
  Serial.println(jsonString);

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      Serial.println("[HTTP] Server OK: " + response);
    } else {
      Serial.print("[HTTP] HTTP code: ");
      Serial.println(httpCode);
    }
  } else {
    Serial.print("[HTTP] Loi ket noi: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ==================== WEB SERVER DE DEBUG ====================

void setupWebServer() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);

  server.begin();
  Serial.print("[Server] Debug server tai http://");
  Serial.print(WiFi.localIP());
  Serial.println("/");
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<meta http-equiv='refresh' content='3'>";
  html += "<title>ESP8266 Water Level</title>";
  html += "<style>";
  html += "body{font-family:Arial;margin:20px;background:#f0f9ff;}";
  html += ".card{background:white;padding:20px;margin:10px 0;border-radius:10px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}";
  html += ".value{font-size:48px;font-weight:bold;color:#0284c7;text-align:center;}";
  html += ".label{text-align:center;color:#666;margin-bottom:10px;}";
  html += ".bar-bg{background:#e0f2fe;border-radius:10px;height:30px;margin:10px 0;}";
  html += ".bar-fill{background:#0284c7;border-radius:10px;height:30px;transition:width 0.5s;}";
  html += ".info{background:#dbeafe;padding:10px;border-radius:5px;margin:10px 0;font-size:14px;}";
  html += "</style></head><body>";

  html += "<h2>ESP8266 - Cam bien muc nuoc</h2>";

  html += "<div class='info'>";
  html += "Device ID: <strong>" + String(DEVICE_ID) + "</strong> | ";
  html += "IP: <strong>" + WiFi.localIP().toString() + "</strong>";
  html += "</div>";

  // Hien thi muc nuoc
  html += "<div class='card'>";
  html += "<div class='label'>Muc nuoc</div>";
  html += "<div class='value'>" + String(waterLevelPercent, 1) + "%</div>";

  // Thanh progress
  html += "<div class='bar-bg'>";
  html += "<div class='bar-fill' style='width:" + String(waterLevelPercent) + "%;'></div>";
  html += "</div>";

  html += "<p style='text-align:center;color:#888;font-size:14px;'>ADC raw: " + String(rawValue) + " / 1023</p>";
  html += "</div>";

  html += "<p style='color:#666;font-size:13px;'>Server: " + String(SERVER_URL) + " | Tu dong tai sau 3s</p>";
  html += "</body></html>";

  server.send(200, "text/html", html);
}

void handleStatus() {
  StaticJsonDocument<150> doc;
  doc["deviceId"]   = DEVICE_ID;
  doc["waterLevel"] = waterLevelPercent;
  doc["rawADC"]     = rawValue;
  doc["ip"]         = WiFi.localIP().toString();

  String json;
  serializeJson(doc, json);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}
