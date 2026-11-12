# TumbuhPantau - Sistem Pemantauan Tumbuh Kembang Balita

Repositori resmi pengembangan aplikasi **TumbuhPantau** (Fokus: **Sprint 1**).  
Aplikasi web responsif untuk pencatatan dan pemantauan balita di tingkat Posyandu, Puskesmas, dan Dinas Kesehatan.

---

## 1. Status Proyek: Sprint 1 (Selesai 100%)

Sprint 1 mencakup 20 tiket Jira yang telah selesai diimplementasikan, diuji, dan diverifikasi:

1. **Fondasi & Basis Data (SCRUM-5, 6, 7, 8, 11, 34)**:
   - Skema 12 tabel InnoDB dengan relasi foreign key dan audit log.
   - Runner migrasi otomatis (`backend/scripts/migrate.js`) dan skrip DDL SQL (`001_init_schema.sql`).
   - Seeder data awal (`backend/scripts/seed.js`) mencakup Dinkes, Puskesmas, Posyandu, Pengguna semua role, 60 Balita, 60 Wali, dan Sesi Kegiatan.
2. **Autentikasi & RBAC (SCRUM-9, 10)**:
   - Sesi cookie aman di MySQL (`express-mysql-session`), proteksi CSRF, rate limiting, hashing password bcrypt.
   - Navigasi dan pembatasan akses berbasis peran (Superadmin, Kader, Petugas Puskesmas, Dinas Kesehatan).
3. **Pengelolaan Data Balita & Wali (SCRUM-12 s.d. 19)**:
   - Pendaftaran balita dengan generator kode internal unik otomatis (`MEL-0001`, dst.).
   - Validasi usia (< 60 bulan) dan deteksi duplikasi.
   - Pencarian, filter status, pengubahan identitas anak, dan pencatatan audit log.
   - Penonaktifan anak (*soft delete* via `inactive_on`) tanpa menghapus riwayat.
   - Pengelolaan data wali: tambah wali baru, lihat profil wali, perbarui kontak, dan lepas/ganti wali balita.
4. **Pengelolaan Sesi Kegiatan Posyandu (SCRUM-20 s.d. 23)**:
   - Pembukaan sesi posyandu baru pada tanggal kegiatan (pencegahan sesi ganda pada tanggal yang sama).
   - Rekapitulasi daftar sesi beserta kehadiran dan sasaran anak.
   - Detail sesi dan pencatatan kehadiran anak (Hadir / Tidak Hadir) secara langsung.
   - Penyesuaian jadwal sesi selama status masih `open` dan pembatalan sesi kegiatan.

> **Catatan Batasan Sprint 1**:  
> Fitur kalkulasi Z-Score kurva WHO, antrean peninjauan puskesmas, tindak lanjut intervensi, dan ekspor CSV sengaja dibatasi untuk **Sprint 2**.

---

## 2. Persyaratan Lingkungan (Prerequisites)

- **Node.js**: Versi 20 LTS, 22 LTS, atau 24 LTS.
- **npm**: Versi 10+.
- **MySQL Database**: MySQL 8.0+ / 8.4 (Laragon, XAMPP, atau MySQL standalone lokal).
- **Web Browser**: Google Chrome, Mozilla Firefox, atau Microsoft Edge versi terbaru.

---

## 3. Langkah Instalasi Cepat (Setup untuk Rekan Tim)

Ikuti langkah-langkah berikut untuk menjalankan proyek di komputer lokal:

### Langkah 1: Clone Repositori
```bash
git clone <URL_REPOSITORI_GITHUB>
cd tumbuhpantau-main
```

### Langkah 2: Pasang Dependency
Jalankan perintah ini di root folder proyek:
```bash
npm install
```

### Langkah 3: Siapkan Basis Data MySQL
1. Pastikan servis MySQL lokal Anda telah berjalan (misalnya aktifkan MySQL di Laragon / XAMPP).
2. Buat database baru bernama `tumbuhpantau` melalui HeidiSQL, phpMyAdmin, DBeaver, atau terminal MySQL:
   ```sql
   CREATE DATABASE IF NOT EXISTS tumbuhpantau CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### Langkah 4: Konfigurasi File Lingkungan (.env)
Salin template konfigurasi dari `backend/.env.example` menjadi `backend/.env`:

- **Windows (PowerShell)**:
  ```powershell
  Copy-Item backend/.env.example backend/.env
  ```
- **macOS / Linux**:
  ```bash
  cp backend/.env.example backend/.env
  ```

Buka `backend/.env` dan pastikan kredensial MySQL sesuai dengan setelan lokal Anda:
```env
PORT=3001
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tumbuhpantau
DB_NAME_TEST=tumbuhpantau_test
SESSION_SECRET=kunci-rahasia-sesi-lokal-tumbuhpantau-min-32-karakter
SESSION_IDLE_MINUTES=30
SEED_DEFAULT_PASSWORD=123456
APP_TIMEZONE=Asia/Jakarta
```
*(Catatan: Jika MySQL Laragon default menggunakan user `root` tanpa password, biarkan `DB_PASSWORD=` kosong).*

### Langkah 5: Jalankan Migrasi dan Seeder Data
Dari root folder proyek, jalankan:
```bash
# 1. Jalankan pembuatan 12 tabel InnoDB
npm run db:migrate

# 2. Isi database dengan data demo Sprint 1
npm run db:seed
```

### Langkah 6: Jalankan Aplikasi
Buka dua jendela terminal terpisah di root folder:

- **Terminal 1 (Backend API - Port 3001)**:
  ```bash
  npm run dev:backend
  ```
- **Terminal 2 (Frontend React - Port 5173)**:
  ```bash
  npm run dev:frontend
  ```

Buka peramban (browser) dan akses:  
👉 **`http://localhost:5173`** (Landing Page interaktif)  
👉 **`http://localhost:5173/login`** (Halaman masuk langsung)

---

## 4. Kredensial Akun Uji Coba (Demo)

Semua akun demo di bawah ini menggunakan **Username** dan kata sandi yang sama:  
🔑 **Password:** `123456`

| Peran (Role) | Username Login | Akses Unit Kerja | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Kader Posyandu** | `kader.mlt01` | Posyandu Melati 01 | Pendaftaran balita, data wali, buka sesi posyandu, catat kehadiran |
| **Petugas Puskesmas** | `petugas.melati` | Puskesmas Melati | Monitoring operasional balita & sesi wilayah kerja puskesmas, audit log |
| **Dinas Kesehatan** | `dinas` | Dinas Kesehatan | Monitoring cakupan agregat wilayah & hierarki organisasi |
| **Administrator** | `admin` | Sistem | Manajemen organisasi (Puskesmas/Posyandu), pengguna, & audit log sistem |

*(Di halaman `/login` tersedia 4 tombol pintas: **Kader**, **Petugas**, **Dinas**, dan **Admin** yang langsung mengisi username dan sandi secara otomatis).*

---

## 5. Pengujian dan Verifikasi Mutu Kode

Jalankan perintah berikut untuk memastikan aplikasi berfungsi tanpa kesalahan:

```bash
# Menjalankan 10 unit test otomatis backend
npm test

# Memeriksa sintaks seluruh berkas JavaScript backend
npm run check

# Memastikan build frontend berhasil tanpa error
npm run build
```

---

## 6. Struktur Direktori Proyek

```text
tumbuhpantau-main/
├── backend/
│   ├── db/
│   │   └── migrations/        # Berkas DDL SQL berversi (001_init_schema.sql)
│   ├── scripts/               # Runner migrasi, seeder, dan syntax checker
│   ├── src/
│   │   ├── config/            # Konfigurasi database pool, environment, sesi
│   │   ├── middleware/        # Autentikasi sesi, CSRF, RBAC, error handler
│   │   ├── modules/           # Modul logika bisnis: auth, children, guardians, sessions, admin
│   │   ├── app.js             # Express application setup
│   │   └── server.js          # Entry point Express listener
│   └── tests/                 # Unit test otomatis
├── frontend/
│   ├── src/
│   │   ├── components/        # Layout AppShell, Navbar, Modal konfirmasi
│   │   ├── context/           # AuthContext & Session management
│   │   ├── pages/             # Halaman: Login, Dashboard, Balita, Wali, Sesi, Admin
│   │   ├── services/          # Klien API fetch terstandarisasi (client.js)
│   │   ├── App.jsx            # Routing dan Role Guards
│   │   └── main.jsx           # Entry point React Vite
├── docs/                      # Dokumentasi PROGRESS.md, PRD, SDD, alur kerja
├── package.json               # Root workspace konfigurasi
└── README.md                  # Dokumentasi panduan ini
```

---

## 7. Lisensi dan Ketentuan

Proyek ini dikembangkan untuk keperluan akademik dan demonstrasi operasional Posyandu Digital. Dilarang menyebarluaskan data pribadi riil pada repositori ini.
