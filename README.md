# ⚡ Absensi RFID Serverless Real-time | SMK NU LAMONGAN 🏛👨‍🎓👩🏻‍🎓👨🏻‍🏫👩🏻‍🏫
[![GitHub license](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/AriefRahman/absensi-rfid-smknu/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/AriefRhaman/absensi-rfid-smknu.svg?style=social)](https://github.com/AriefRahman/absensi-rfid-smknu/stargazers)
[![Firebase Deployment](https://img.shields.io/badge/Deployed%20on-Firebase-FFA611?style=flat&logo=firebase)](https://firebase.google.com/)

Sistem absensi terintegrasi penuh yang menggunakan Perangkat Keras **ESP32/RFID** untuk pencatatan kehadiran *real-time*, didukung oleh arsitektur **Serverless** yang modern, aman, dan *scalable* menggunakan Google Firebase.

## 🎯 Visi Proyek

Tujuan utama proyek ini adalah menyediakan solusi absensi yang:
1.  **Instan:** Pencatatan absensi yang langsung tercermin di dashboard admin.
2.  **Aman:** Menggunakan protokol **HTTPS/TLS** (SSL) antara ESP32 dan Backend.
3.  **Otomatis:** Integrasi WhatsApp notifikasi kepada Wali/Guru secara otomatis.
4.  **Gratis & Open Source:** Dibangun menggunakan teknologi tanpa lisensi berbayar (Firebase Spark Plan, Arduino, Node.js).

---

## 🏗️ I. Arsitektur Sistem

Proyek ini dibangun di atas *Full-Stack* Serverless. 

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Perangkat Keras** | **ESP32** (C++), RC522, LCD I2C | Membaca UID, mengirim data via HTTPS/POST. |
| **Backend** | **Firebase Functions** (Node.js 18+) | Menangani Logika (Hari Libur, Validasi UID, WA Trigger). |
| **Database** | **Cloud Firestore** | Database NoSQL real-time untuk semua data absensi dan pengguna. |
| **Frontend Admin** | HTML/JS/Firebase SDK | Dashboard interaktif, CRUD Pengguna, dan Rekap Data. |
| **Integrasi** | Axios / API Gateway WhatsApp Self-Hosted | Pengiriman notifikasi real-time. |

---

## ⚙️ II. Panduan Instalasi & Setup

Ikuti langkah-langkah ini untuk menginstal dan menjalankan sistem secara lokal maupun di cloud.

### A. Setup Environment Lokal

1.  **Kloning Repositori:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/absensi-rfid-smknu.git](https://github.com/YOUR_USERNAME/absensi-rfid-smknu.git)
    cd absensi-rfid-smknu
    ```
2.  **Instal Firebase CLI:**
    ```bash
    npm install -g firebase-tools
    firebase login
    firebase init
    ```
    *(Pilih Firestore, Functions, Hosting, dan gunakan `public` sebagai direktori hosting.)*

### B. Konfigurasi Backend (Functions)

1.  Masuk ke folder Functions dan instal dependensi:
    ```bash
    cd functions
    npm install
    ```
2.  **Konfigurasi Esensial:**
    * Edit `functions/index.js`: Ganti variabel `WA_GATEWAY_URL`.
    * Setel zona waktu Functions ke WIB (Waktu Indonesia Barat):
        ```bash
        firebase functions:config:set system.timezone="Asia/Jakarta"
        ```

### C. Konfigurasi Frontend (Kredensial)

1.  Buka Firebase Console, salin *config object* proyek Anda.
2.  Edit `public/js/admin.js` dan ganti `firebaseConfig` dengan kredensial proyek Anda.

### D. Deployment Akhir 🚀

Kembali ke root folder dan *deploy* semua layanan:

```bash
firebase deploy
