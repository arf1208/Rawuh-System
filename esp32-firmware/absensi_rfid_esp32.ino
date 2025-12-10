#include <WiFi.h>
#include <WiFiClientSecure.h> // Wajib untuk HTTPS
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>

// --- KONFIGURASI PINS ---
#define SS_PIN 5      
#define RST_PIN 4     
#define BUZZER_PIN 2  

// --- KONFIGURASI JARINGAN & SERVER ---
const char* ssid = "hayo"; 
const char* password = "ojosaiki";   
// GANTI DENGAN URL FIREBASE FUNCTION ENDPOINT YANG SUDAH DI-DEPLOY
const char* firebaseFunctionUrl = "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/submitAbsensi";

// CA Root Certificate untuk Google Trust Services (Wajib untuk HTTPS)
// Ganti dengan sertifikat CA Google yang valid!
const char* root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIFYjCCBEqgAwIBAgIQAf1NUXEASj... (AMBIL CA DARI GOOGLE CLOUD/FIREBASE)\n" \
"-----END CERTIFICATE-----\n";

// --- INSTANSIASI OBJEK ---
MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2); 
WiFiClientSecure client; 

// --- DEKLARASI FUNGSI HELPER ---
void connectWiFi();
String readRfidUid();
void sendDataToServer(String uid);
void lcdFeedback(String line1, String line2, int delayMs);
void buzzerBeep(int count, int duration);

// ===============================================
// === SETUP ===
// ===============================================
void setup() {
    Serial.begin(115200);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW); 

    lcd.init();
    lcd.backlight();
    lcdFeedback("System Absensi", "SMK NU LAMONGAN", 2000);

    SPI.begin();
    mfrc522.PCD_Init();
    
    connectWiFi();
    lcdFeedback("System ready", "Tap Kartu RFID...", 1000);
}

// ===============================================
// === LOOP ===
// ===============================================
void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        lcdFeedback("WiFi Terputus!", "Mencoba Reconnect", 500);
        connectWiFi();
        return;
    }

    String uid = readRfidUid();
    
    if (uid != "") {
        lcdFeedback("Tap Terdeteksi", "Memproses Data...", 300);
        sendDataToServer(uid);
    }
    delay(100);
}

// ----------------------------------------------------
// FUNGSI UTAMA: sendDataToServer (HTTPS POST)
// ----------------------------------------------------
void sendDataToServer(String uid) {
    if (WiFi.status() == WL_CONNECTED) {
        client.setCACert(root_ca); 
        HTTPClient http;
        
        if (http.begin(client, firebaseFunctionUrl)) { 
            http.addHeader("Content-Type", "application/json");
            
            // Body POST request
            String httpRequestData = "{\"uidRfid\":\"" + uid + "\"}";
            
            int httpResponseCode = http.POST(httpRequestData);

            if (httpResponseCode > 0) {
                String response = http.getString();
                
                // Parsing Response dari JSON Function
                if (response.indexOf("\"SUCCESS\"") != -1) {
                    lcdFeedback("ABSEN BERHASIL!", "Terima Kasih.", 2500);
                    buzzerBeep(1, 400); 
                } else if (response.indexOf("\"DUPLICATE\"") != -1) {
                    lcdFeedback("SUDAH ABSEN", "Selesai Hari Ini.", 2500);
                    buzzerBeep(2, 100); 
                } else if (response.indexOf("\"UNREGISTERED\"") != -1) {
                    lcdFeedback("Kartu Belum", "Terdaftar!", 3000);
                    buzzerBeep(3, 150); 
                } else if (response.indexOf("\"HARI_LIBUR\"") != -1) {
                    lcdFeedback("HARI LIBUR", "Absensi Non-Aktif", 3000);
                    buzzerBeep(2, 200); 
                } else {
                    lcdFeedback("SERVER ERROR:", "Cek Log.", 3000);
                    buzzerBeep(4, 100);
                }
            } else {
                lcdFeedback("HTTPS Gagal:", String(httpResponseCode), 3000);
            }
            http.end();
        } 
    }
}

// ----------------------------------------------------
// FUNGSI HELPER (connectWiFi, readRfidUid, lcdFeedback, buzzerBeep)
// ----------------------------------------------------
void connectWiFi() {
    lcdFeedback("Connecting...", ssid, 0);
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) { 
        delay(500);
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        lcdFeedback("Connected!", WiFi.localIP().toString(), 2000);
        buzzerBeep(1, 150);
    } else {
        lcdFeedback("Koneksi Gagal!", "Mohon Cek WiFi", 5000);
        buzzerBeep(3, 300);
    }
}

String readRfidUid() {
    if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
        return "";
    }
    String content = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        content.concat(String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : ""));
        content.concat(String(mfrc522.uid.uidByte[i], HEX));
    }
    mfrc522.PICC_HaltA(); 
    mfrc522.PCD_StopCrypto1(); 
    content.toUpperCase();
    return content;
}

void lcdFeedback(String line1, String line2, int delayMs) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
    if (delayMs > 0) {
        delay(delayMs);
    }
}

void buzzerBeep(int count, int duration) {
    for (int i = 0; i < count; i++) {
        digitalWrite(BUZZER_PIN, HIGH);
        delay(duration);
        digitalWrite(BUZZER_PIN, LOW);
        delay(duration / 2);
    }
}
