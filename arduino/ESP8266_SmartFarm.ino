/*
 * ESP8266 Smart Farm - Nong trai thong minh IoT
 *
 * KIEN TRUC: Server-Centric Decision Making
 * - ESP CHI doc cam bien va gui len server
 * - SERVER ra quyet dinh dieu khien
 * - ESP polling lay lenh tu server va thuc thi
 *
 * Ket noi phan cung:
 * - DHT11: D7 (GPIO 13)
 * - Relay Bom: D5 (GPIO 14)
 * - Relay Quat: D6 (GPIO 12)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ==================== CAU HINH ====================

// WiFi
const char* WIFI_SSID = "DangHuyen";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI_CUA_BAN";  // Thay mat khau WiFi cua ban o day

// Server URL (Vercel)
const char* SERVER_URL = "https://iot-web-mu.vercel.app";

// Device ID
const char* DEVICE_ID = "ESP8266_001";

// Thoi gian (ms)
const unsigned long SEND_INTERVAL = 5000;    // Gui sensor data moi 5 giay
const unsigned long POLL_INTERVAL = 2000;    // Polling lenh moi 2 giay

// ==================== CHAN KET NOI ====================

const int DHTPin = 13;       // D7 - Cam bien DHT11
const int relay_bom = 14;    // D5 - Relay bom nuoc
const int relay_quat = 12;   // D6 - Relay quat

// ==================== KHOI TAO ====================

#define DHTTYPE DHT11
DHT dht(DHTPin, DHTTYPE);

ESP8266WebServer server(80);
WiFiClientSecure wifiClient;

// Bien trang thai
bool pumpState = false;
bool fanState = false;
float temperature = 0;
float humidity = 0;
unsigned long lastSendTime = 0;
unsigned long lastPollTime = 0;

// ==================== HAM SETUP ====================

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n========================================");
  Serial.println("   ESP8266 Smart Farm - Server Mode");
  Serial.println("   (Server ra quyet dinh dieu khien)");
  Serial.println("========================================");

  // Khoi tao chan relay
  pinMode(relay_bom, OUTPUT);
  pinMode(relay_quat, OUTPUT);

  // Tat relay ban dau (relay active LOW)
  digitalWrite(relay_bom, HIGH);
  digitalWrite(relay_quat, HIGH);

  // Khoi tao DHT
  dht.begin();

  // Ket noi WiFi
  connectWiFi();

  // Cau hinh Web Server (de debug/manual control)
  setupWebServer();

  Serial.println("\n[OK] He thong san sang!");
  Serial.println("[INFO] ESP chi gui data, Server ra quyet dinh");
  Serial.println("========================================\n");
}

// ==================== HAM LOOP ====================

void loop() {
  // Xu ly request tu web local
  server.handleClient();

  unsigned long currentTime = millis();

  // Doc va gui du lieu cam bien dinh ky
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    readSensors();
    sendSensorData();
    lastSendTime = currentTime;
  }

  // Polling lenh tu server
  if (currentTime - lastPollTime >= POLL_INTERVAL) {
    pollCommands();
    lastPollTime = currentTime;
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
    // Bo qua kiem tra certificate cho HTTPS (Vercel)
    wifiClient.setInsecure();
  } else {
    Serial.println("\n[WiFi] Ket noi that bai! Khoi dong lai...");
    ESP.restart();
  }
}

// ==================== CAU HINH WEB SERVER (DEBUG) ====================

void setupWebServer() {
  // Trang chu - hien thi trang thai
  server.on("/", HTTP_GET, handleRoot);

  // API lay trang thai
  server.on("/status", HTTP_GET, handleStatus);

  // Manual control (cho debug)
  server.on("/pump/on", HTTP_GET, []() {
    setPump(true);
    sendJsonResponse(true, "Bom da BAT (manual)");
  });
  server.on("/pump/off", HTTP_GET, []() {
    setPump(false);
    sendJsonResponse(true, "Bom da TAT (manual)");
  });
  server.on("/fan/on", HTTP_GET, []() {
    setFan(true);
    sendJsonResponse(true, "Quat da BAT (manual)");
  });
  server.on("/fan/off", HTTP_GET, []() {
    setFan(false);
    sendJsonResponse(true, "Quat da TAT (manual)");
  });

  // Bat dau server
  server.begin();
  Serial.print("[Server] Debug server tai http://");
  Serial.print(WiFi.localIP());
  Serial.println("/");
}

// ==================== XU LY REQUEST ====================

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP8266 Smart Farm</title>";
  html += "<style>";
  html += "body{font-family:Arial;margin:20px;background:#f5f5f5;}";
  html += ".card{background:white;padding:20px;margin:10px 0;border-radius:10px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}";
  html += ".btn{padding:15px 30px;margin:5px;border:none;border-radius:5px;cursor:pointer;font-size:16px;}";
  html += ".btn-on{background:#22c55e;color:white;}";
  html += ".btn-off{background:#ef4444;color:white;}";
  html += ".sensor{font-size:24px;color:#333;}";
  html += ".status{display:inline-block;width:15px;height:15px;border-radius:50%;margin-right:10px;}";
  html += ".on{background:#22c55e;}.off{background:#ccc;}";
  html += ".info{background:#dbeafe;padding:10px;border-radius:5px;margin:10px 0;}";
  html += "</style></head><body>";

  html += "<h1>ESP8266 Smart Farm</h1>";

  html += "<div class='info'>";
  html += "<strong>Mode:</strong> Server Decision - ESP chi gui data, Server ra quyet dinh";
  html += "</div>";

  // Sensor data
  html += "<div class='card'>";
  html += "<h2>Cam bien</h2>";
  html += "<p class='sensor'>Nhiet do: <strong>" + String(temperature) + " C</strong></p>";
  html += "<p class='sensor'>Do am: <strong>" + String(humidity) + "%</strong></p>";
  html += "</div>";

  // Device status
  html += "<div class='card'>";
  html += "<h2>Trang thai thiet bi (tu Server)</h2>";
  html += "<p><span class='status " + String(pumpState ? "on" : "off") + "'></span>Bom nuoc: " + String(pumpState ? "BAT" : "TAT") + "</p>";
  html += "<p><span class='status " + String(fanState ? "on" : "off") + "'></span>Quat: " + String(fanState ? "BAT" : "TAT") + "</p>";
  html += "</div>";

  // Manual control (debug)
  html += "<div class='card'>";
  html += "<h2>Manual Control (Debug)</h2>";
  html += "<p>Bom: <a href='/pump/on'><button class='btn btn-on'>BAT</button></a>";
  html += "<a href='/pump/off'><button class='btn btn-off'>TAT</button></a></p>";
  html += "<p>Quat: <a href='/fan/on'><button class='btn btn-on'>BAT</button></a>";
  html += "<a href='/fan/off'><button class='btn btn-off'>TAT</button></a></p>";
  html += "</div>";

  html += "<p style='color:#666;'>IP: " + WiFi.localIP().toString() + " | Server: " + String(SERVER_URL) + "</p>";
  html += "<script>setTimeout(()=>location.reload(),5000);</script>";
  html += "</body></html>";

  server.send(200, "text/html", html);
}

void handleStatus() {
  StaticJsonDocument<200> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["pump"] = pumpState;
  doc["fan"] = fanState;
  doc["deviceId"] = DEVICE_ID;
  doc["ip"] = WiFi.localIP().toString();
  doc["mode"] = "server_decision";

  String json;
  serializeJson(doc, json);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void sendJsonResponse(bool success, const char* message) {
  StaticJsonDocument<100> doc;
  doc["success"] = success;
  doc["message"] = message;
  doc["pump"] = pumpState;
  doc["fan"] = fanState;

  String json;
  serializeJson(doc, json);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

// ==================== DIEU KHIEN RELAY ====================

void setPump(bool state) {
  pumpState = state;
  // Relay active LOW
  digitalWrite(relay_bom, state ? LOW : HIGH);
  Serial.println(state ? "[Relay] Bom BAT" : "[Relay] Bom TAT");
}

void setFan(bool state) {
  fanState = state;
  // Relay active LOW
  digitalWrite(relay_quat, state ? LOW : HIGH);
  Serial.println(state ? "[Relay] Quat BAT" : "[Relay] Quat TAT");
}

// ==================== DOC CAM BIEN ====================

void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t) && !isnan(h)) {
    temperature = t;
    humidity = h;
    Serial.print("[Sensor] Nhiet do: ");
    Serial.print(temperature);
    Serial.print(" C, Do am: ");
    Serial.print(humidity);
    Serial.println("%");
  } else {
    Serial.println("[Sensor] Loi doc DHT11!");
  }
}

// ==================== GUI DU LIEU LEN SERVER ====================

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi chua ket noi!");
    connectWiFi();
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/sensors";

  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");

  // Tao JSON
  StaticJsonDocument<200> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["deviceId"] = DEVICE_ID;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("[HTTP] Gui sensor data: ");
  Serial.println(jsonString);

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      Serial.println("[HTTP] Server response: " + response);

      // Parse response de xem server co quyet dinh gi khong
      StaticJsonDocument<512> resDoc;
      DeserializationError error = deserializeJson(resDoc, response);
      if (!error && resDoc.containsKey("automation")) {
        JsonObject automation = resDoc["automation"];
        if (!automation["decision"].isNull()) {
          Serial.println("[AUTO] Server da ra quyet dinh dieu khien!");
        }
      }
    }
  } else {
    Serial.print("[HTTP] Loi: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ==================== POLLING LENH TU SERVER ====================

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/devices/commands?deviceId=" + String(DEVICE_ID);

  http.begin(wifiClient, url);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();

    // Parse JSON
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error && doc["hasCommands"].as<bool>()) {
      JsonArray commands = doc["commands"].as<JsonArray>();

      for (JsonObject cmd : commands) {
        String device = cmd["device"].as<String>();
        String action = cmd["action"].as<String>();
        String cmdId = cmd["id"].as<String>();
        String source = cmd["source"].as<String>();
        String reason = cmd["reason"].as<String>();

        Serial.println("\n[COMMAND] =====================================");
        Serial.print("[COMMAND] Nhan lenh tu Server (");
        Serial.print(source);
        Serial.println(")");
        Serial.print("[COMMAND] Device: ");
        Serial.print(device);
        Serial.print(" -> ");
        Serial.println(action);
        if (reason.length() > 0) {
          Serial.print("[COMMAND] Ly do: ");
          Serial.println(reason);
        }
        Serial.println("[COMMAND] =====================================\n");

        // Thuc thi lenh
        if (device == "fan") {
          setFan(action == "on");
        } else if (device == "pump") {
          setPump(action == "on");
        }

        // Xac nhan da thuc thi
        confirmCommand(cmdId);
      }
    }
  }

  http.end();
}

// ==================== XAC NHAN DA THUC THI LENH ====================

void confirmCommand(String commandId) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/devices/commands";

  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");

  // Tao JSON
  StaticJsonDocument<200> doc;
  doc["commandId"] = commandId;
  doc["deviceId"] = DEVICE_ID;

  JsonObject actualState = doc.createNestedObject("actualState");
  actualState["fan"] = fanState;
  actualState["pump"] = pumpState;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.PUT(jsonString);

  if (httpCode == HTTP_CODE_OK) {
    Serial.println("[COMMAND] Da xac nhan thuc thi lenh: " + commandId);
  }

  http.end();
}
