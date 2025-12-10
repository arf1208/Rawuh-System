// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios'); // Untuk WA API
admin.initializeApp();
const db = admin.firestore();

const JAM_MASUK_TARGET = '07:00:00'; 
const WA_GATEWAY_URL = "http://YOUR_WA_GATEWAY_IP:3000/send-message"; // GANTI!

// --- Fungsi Helper WA ---
async function triggerWhatsappNotification(nama, role, waktu, statusAbsen, noWaTarget) {
    if (!noWaTarget) return;
    const roleText = (role === 'siswa') ? 'Siswa' : 'Guru';
    const message = `🔔 [ABSEN ${statusAbsen} SMK NU]\n${nama} (${roleText}) telah berhasil melakukan absensi ${statusAbsen} pada pukul ${waktu} di SMK NU LAMONGAN. Terima kasih.`;
    
    try {
        await axios.post(WA_GATEWAY_URL, {
            to: noWaTarget, 
            message: message
        });
        console.log(`Notifikasi WA terkirim ke ${noWaTarget}`);
    } catch (error) {
        console.error("Gagal mengirim notifikasi WA:", error.message);
    }
}

// ----------------------------------------------------
// 1. ENDPOINT: submitAbsensi (Dipanggil oleh ESP32)
// ----------------------------------------------------
exports.submitAbsensi = functions.https.onRequest(async (req, res) => {
    // Pastikan hanya menerima POST request
    if (req.method !== 'POST') {
        return res.status(405).send({ status: 'ERROR', msg: 'Method Not Allowed' });
    }

    const uidRfid = req.body.uidRfid;
    if (!uidRfid) {
        return res.status(400).send({ status: 'ERROR', msg: 'UID is required.' });
    }

    // Mendapatkan waktu hari ini dalam zona waktu Jakarta
    const now = new Date();
    // Konversi zona waktu (Firebase Functions default UTC)
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    
    const today = jakartaTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = jakartaTime.toLocaleTimeString('en-US', { hour12: false }); // HH:MM:SS
    const dayOfWeek = jakartaTime.getDay(); // 0 = Minggu, 6 = Sabtu

    try {
        // Cek Hari Libur & Weekend
        if (dayOfWeek === 0 || dayOfWeek === 6) { 
            return res.send({ status: 'HARI_LIBUR', msg: 'Weekend. Absensi Non-Aktif.' });
        }
        const liburSnapshot = await db.collection('hari_libur').where('tanggal', '==', today).limit(1).get();
        if (!liburSnapshot.empty) {
            return res.send({ status: 'HARI_LIBUR', msg: 'Tanggal Merah. Absensi Non-Aktif.' });
        }

        // Validasi UID dan Ambil Data Pengguna
        const userSnapshot = await db.collection('pengguna').where('uidRfid', '==', uidRfid).limit(1).get();

        if (userSnapshot.empty) {
            // Tulis ke log_unknown_uids
            await db.collection('unknown_uids').doc(uidRfid).set({
                uidRfid: uidRfid,
                lastDetected: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return res.send({ status: 'UNREGISTERED', msg: 'Kartu Belum Terdaftar.' });
        }
        
        const userData = userSnapshot.docs[0].data();
        const userId = userSnapshot.docs[0].id;

        // Logika Absensi Masuk/Pulang
        const absensiRef = db.collection('absensi_log');
        const todayLog = await absensiRef.where('userId', '==', userId).where('tanggal', '==', today).limit(1).get();

        let statusAbsen = '';

        if (todayLog.empty) {
            // Absen Masuk
            statusAbsen = (currentTime > JAM_MASUK_TARGET) ? 'Terlambat' : 'Hadir';
            await absensiRef.add({
                userId: userId,
                nama: userData.nama,
                role: userData.role,
                jabatanKelas: userData.jabatanKelas || userData.nisNip,
                tanggal: today,
                jamMasuk: currentTime,
                jamPulang: null,
                status: statusAbsen // Hanya status Hadir/Terlambat
            });
        } else if (todayLog.docs[0].data().jamPulang === null) {
            // Absen Pulang
            statusAbsen = 'Pulang';
            await absensiRef.doc(todayLog.docs[0].id).update({
                jamPulang: currentTime,
            });
        } else {
            return res.send({ status: 'DUPLICATE', msg: 'Sudah absen hari ini.' });
        }
        
        // Pemicu WA
        await triggerWhatsappNotification(userData.nama, userData.role, currentTime, statusAbsen, userData.noWa);

        return res.send({ status: 'SUCCESS', msg: `${userData.nama}, Absen ${statusAbsen} Dicatat.` });

    } catch (error) {
        console.error("Absensi Error:", error);
        return res.status(500).send({ status: 'ERROR', msg: 'Internal Server Error.' });
    }
});

// ----------------------------------------------------
// 2. ENDPOINT: exportToExcel (Ekspor Data)
// ----------------------------------------------------
exports.exportToExcel = functions.https.onRequest(async (req, res) => {
    // Fungsi ini dikembangkan untuk keamanan (Admin Login Wajib)
    // Cek otorisasi admin di sini sebelum query data sensitif
    
    // Asumsi: Ambil semua data absensi dalam 1 bulan terakhir
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 30);
    const dateLimitString = dateLimit.toISOString().split('T')[0];

    try {
        const snapshot = await db.collection('absensi_log')
            .where('tanggal', '>', dateLimitString)
            .orderBy('tanggal', 'desc').get();
        
        let csv = 'Tanggal,Nama,Role,Kelas/NIP,Jam Masuk,Jam Pulang,Status\n';
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            csv += `${data.tanggal},${data.nama},${data.role},${data.jabatanKelas || '-'},${data.jamMasuk},${data.jamPulang || '-'},${data.status}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="rekap_absensi_${new Date().toISOString().split('T')[0]}.csv"`);
        
        return res.status(200).send(csv);

    } catch (error) {
        console.error("Export Error:", error);
        return res.status(500).send("Gagal mengambil data untuk export.");
    }
});
