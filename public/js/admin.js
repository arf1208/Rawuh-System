// public/js/admin.js

// --- 1. KONFIGURASI DAN INISIALISASI FIREBASE ---
const firebaseConfig = {
    // GANTI DENGAN KREDENSIAL PROYEK FIREBASE ANDA
    // apiKey: "...",
    // authDomain: "...",
    // projectId: "...",
    // storageBucket: "...",
    // messagingSenderId: "...",
    // appId: "...",
    // measurementId: "..."
};

// Inisialisasi Firebase HANYA JIKA BELUM DIINISIALISASI
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ----------------------------------------------------
// 2. OTENTIKASI & LOGOUT
// ----------------------------------------------------
document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    handleLogin(username, password);
});

async function handleLogin(username, password) {
    const errorDisplay = document.getElementById('error-message');
    errorDisplay.textContent = '';
    
    // Asumsi menggunakan otentikasi kustom (Firestore)
    try {
        const adminRef = db.collection('admin').where('username', '==', username).limit(1);
        const snapshot = await adminRef.get();

        if (snapshot.empty) {
            errorDisplay.textContent = "Username tidak ditemukan.";
            return;
        }

        const adminData = snapshot.docs[0].data();
        
        // Cek Password Hash (Karena Node.js Function tidak bisa dipanggil langsung dari frontend,
        // di sini kita hanya menggunakan perbandingan string sederhana untuk DEMO/MOCKUP. 
        // Seharusnya menggunakan Firebase Auth atau Function terpisah untuk verifikasi hash.)
        if (password === "smknuadmin") { // GANTI dengan logika verifikasi hash yang aman!
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('adminUser', username);
            window.location.href = 'dashboard.html';
        } else {
            errorDisplay.textContent = "Password salah.";
        }
    } catch (error) {
        errorDisplay.textContent = "Terjadi kesalahan sistem.";
        console.error("Login Error:", error);
    }
}

function checkAuth() {
    if (window.location.pathname.endsWith('index.html') && localStorage.getItem('isLoggedIn') === 'true') {
        // Jika sudah login, redirect ke dashboard
        window.location.href = 'dashboard.html';
        return;
    }
    if (!window.location.pathname.endsWith('index.html') && localStorage.getItem('isLoggedIn') !== 'true') {
        // Jika belum login, redirect ke login
        window.location.href = 'index.html';
    }
}
checkAuth(); // Panggil saat memuat setiap halaman

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('adminUser');
    window.location.href = 'index.html';
}

// ----------------------------------------------------
// 3. LOGIKA DASHBOARD (dashboard.html)
// ----------------------------------------------------
function loadDashboardRealtime() {
    const today = new Date().toISOString().split('T')[0];
    const liveLogList = document.getElementById('live-log');
    const totalHadir = document.getElementById('total-hadir');
    const totalTerlambat = document.getElementById('total-terlambat');

    db.collection('absensi_log')
      .where('tanggal', '==', today)
      .limit(10) // Hanya 10 log terakhir
      .onSnapshot((snapshot) => {
        liveLogList.innerHTML = '';
        let hadirCount = 0;
        let terlambatCount = 0;

        snapshot.forEach((doc) => {
            const log = doc.data();
            const li = document.createElement('li');
            li.textContent = `[${log.jamMasuk}] ${log.nama} - ${log.status}`;
            liveLogList.prepend(li); // Tampilkan yang terbaru di atas

            if (log.status === 'Hadir') hadirCount++;
            if (log.status === 'Terlambat') terlambatCount++;
        });

        totalHadir.textContent = hadirCount;
        totalTerlambat.textContent = terlambatCount;
    });
}

// ----------------------------------------------------
// 4. LOGIKA MANAJEMEN PENGGUNA (data_users.html)
// ----------------------------------------------------
// ... (loadUsersRealtime, addNewUser, fillFormWithUid - sama seperti deskripsi sebelumnya) ...


// ----------------------------------------------------
// 5. LOGIKA REKAP ABSENSI (rekap_absensi.html)
// ----------------------------------------------------
// ... (loadAbsensiRealtime, triggerExport - sama seperti deskripsi sebelumnya) ...
