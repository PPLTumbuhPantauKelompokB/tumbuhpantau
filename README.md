# TumbuhPantau: Sistem Pemantauan Tumbuh Kembang Balita (Sprint 1 & Sprint 2)

Repositori resmi pengembangan aplikasi **TumbuhPantau** (Status: **Sprint 1 & Sprint 2 Selesai 100%**, total **40 tiket Jira**).  
Aplikasi web responsif untuk pencatatan operasional, kalkulasi antropometri WHO (PB/U dan TB/U), peninjauan klinis Puskesmas, tugas tindak lanjut intervensi gizi, dan pelaporan agregat Dinas Kesehatan.

---

## 1. Cakupan Fitur Proyek (Sprint 1 & Sprint 2)

### A. Sprint 1: Fondasi, RBAC, Balita, Wali & Sesi Posyandu (20 Tiket Jira)
1. **Fondasi & Basis Data (`SCRUM-5, 6, 7, 8, 11, 34`)**:
   - Skema 12 tabel InnoDB dengan relasi foreign key dan pencatatan `audit_logs` *append-only*.
   - Runner migrasi otomatis (`backend/scripts/migrate.js`) dan skrip DDL SQL (`001_init_schema.sql`).
   - Seeder data sintetis (`backend/scripts/seed.js`) mencakup 1 Dinas Kesehatan, 2 Puskesmas, 4 Posyandu, 8 akun pengguna (4 peran), 60 balita, 60 wali, dan 3 periode sesi kegiatan.
2. **Autentikasi & RBAC (`SCRUM-9, 10`)**:
   - Sesi cookie aman di MySQL (`express-mysql-session`), proteksi CSRF (`X-CSRF-Token`), rate limiting, dan hashing kata sandi bcrypt.
   - Navigasi dan pembatasan akses berbasis peran serta cakupan wilayah (`AccessPolicy.js`).
3. **Pengelolaan Data Balita & Wali (`SCRUM-12 s.d. 19`)**:
   - Pendaftaran balita dengan generator kode internal unik otomatis (`POS-MLT-01-0001`, dst.), validasi usia (< 60 bulan), dan deteksi duplikasi.
   - Pencarian, filter status, pembaruan identitas balita, serta penonaktifan balita (*soft delete* via `inactive_on`) tanpa menghapus riwayat.
   - Pengelolaan data wali: tambah wali baru, lihat profil wali, perbarui kontak, dan kaitkan/lepas relasi wali balita.
4. **Pengelolaan Sesi Kegiatan Posyandu (`SCRUM-20 s.d. 23`)**:
   - Pembukaan sesi Posyandu baru pada tanggal kegiatan dengan pencegahan tanggal ganda.
   - Rekapitulasi daftar sesi, pencatatan kehadiran anak (tunggal maupun massal), penyesuaian jadwal sesi, dan pembatalan sesi.

### B. Sprint 2: Operasional, Antropometri WHO & Tindak Lanjut (20 Tiket Jira · 115 SP)
1. **Penyempurnaan Operasional Balita, Kehadiran & Audit (`SCRUM-47, 48, 45`)**:
   - Pengaktifan kembali profil balita nonaktif (`PATCH /api/v1/children/:id/activate`).
   - Pengubahan status kehadiran balita selama sesi masih `open` (`PATCH /api/v1/sessions/:sessionId/attendances/:id`).
   - Log audit aktivitas sistem (`GET /api/v1/audit-logs`) dengan filter rentang tanggal, jenis aksi, dan entitas untuk Petugas Puskesmas (sesuai wilayah) serta Administrator.
2. **Engine Antropometri WHO & Pengukuran Balita (`SCRUM-28, 24, 27, 46, 26, 25`)**:
   - Engine kalkulasi Z-Score WHO PB/U dan TB/U usia 0 sampai 59 bulan (`0..1826` hari) sesuai Permenkes No. 2 Tahun 2020 dengan koreksi posisi ukur `+-0,7 cm` pada batas 24 bulan (`731` hari), deteksi plausibilitas ekstrem (`|Z| > 6`), dan disclaimer klinis wajib.
   - Pencatatan pengukuran mode Draf (`status = 'draft'`) dan Kirim atomik (`status = 'submitted'`) dengan token idempotensi (`request_token`).
   - Pembatalan/penghapusan draf pengukuran (`DELETE /api/v1/measurements/drafts/:id`) dengan proteksi imutabilitas pada data `submitted`.
   - Halaman detail satu catatan pengukuran beserta rantai histori revisi (`GET /api/v1/measurements/:id` dan halaman `/pengukuran/detail/:id`).
   - Koreksi pengukuran *append-only* (`POST /api/v1/measurements/:id/revisions`, `supersedes_id`, `correction_reason` wajib, dan *optimistic locking*).
   - Tabel riwayat pertumbuhan kronologis serta grafik kurva standar WHO (`-3SD`, `-2SD`, `median`, `+2SD`, `+3SD`) dan grafik berat badan aktual (Chart.js).
3. **Monitoring Kelengkapan & Peninjauan Hasil Puskesmas (`SCRUM-30, 42, 29`)**:
   - Monitoring balita belum diukur dan draf belum dikirim (`GET /api/v1/sessions/:sessionId/monitoring` & `/monitoring/completeness`) dilengkapi indikator peringatan cakupan `< 80%`.
   - Antrean peninjauan hasil antropometri (`GET /api/v1/reviews/queue`) dan pencatatan keputusan Petugas Puskesmas (`PATCH /api/v1/growth-assessments/:id/review`: `confirmed`, `flagged_for_remeasurement`, `monitoring`) beserta pembuatan tugas tindak lanjut otomatis.
4. **Tugas Tindak Lanjut (`SCRUM-31, 43, 44`)**:
   - Pembuatan dan pemantauan tugas tindak lanjut (`GET/POST /api/v1/follow-ups`), pencatatan progres *append-only* (`POST /api/v1/follow-ups/:id/updates`), dan penutupan tugas (`PATCH /api/v1/follow-ups/:id/close`) dengan kesimpulan evaluasi wajib.
5. **Dashboard Agregat & Ekspor CSV (`SCRUM-32, 33`)**:
   - Dashboard agregat operasional (`GET /api/v1/dashboard/stats`) yang menyajikan KPI multi-tenant, grafik distribusi kategori pertumbuhan WHO, progres sesi, dan tren prevalensi stunting lintas periode.
   - Ekspor laporan agregat CSV UTF-8 (`GET /api/v1/reports/export-csv`) tanpa NIK/data sensitif, penyamaran sel kecil (`<5`) bagi Dinas Kesehatan, dan pencatatan audit log (`REPORT_CSV_EXPORTED`).
6. **Pengujian Kualitas, Keamanan RBAC & Uji Beban (`SCRUM-35, 36, 37`)**:
   - `TEST-01`: Unit test validasi 160 kombinasi Z-Score WHO dengan deviasi absolut `<= 0.01` (`backend/tests/growthCalculator.test.js`).
   - `TEST-02`: Integration test isolasi keamanan RBAC & lintas organisasi (`401`/`403` + verifikasi `ACCESS_DENIED` di `audit_logs`) serta alur E2E Sprint 2 (`backend/tests/sprint2-integration.test.js`).
   - `TEST-03`: Skrip load testing k6 20 Virtual Users (`scripts/k6/sprint2-load-test.js`, `scripts/k6/run-local-load-verification.js`) dan laporan hasil uji beban (`docs/LOAD_TEST_REPORT.md`, `p95 = 190,11 ms`).

---

## 2. Persyaratan Lingkungan (Prerequisites)

- **Node.js**: Versi 22 LTS atau 24 LTS (terverifikasi pada `v24.22.0`).
- **npm**: Versi 10+ (terverifikasi pada `12.2.1`).
- **MySQL Database**: MySQL 8.0+ / 8.4 (Laragon 6 dengan MySQL `8.4.3` pada `127.0.0.1:3306`).
- **Web Browser**: Google Chrome, Mozilla Firefox, atau Microsoft Edge versi terbaru.

---

## 3. Langkah Instalasi & Menjalankan Aplikasi (Lokal)

### Langkah 1: Pasang Dependency
```bash
npm install
```

### Langkah 2: Konfigurasi File Lingkungan (`.env`)
Salin `backend/.env.example` menjadi `backend/.env` jika belum tersedia:
```powershell
Copy-Item backend/.env.example backend/.env
```

Pastikan konfigurasi `backend/.env` sesuai dengan MySQL Laragon lokal:
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

### Langkah 3: Jalankan Migrasi dan Seeder Data Sintetis
```bash
# 1. Cek koneksi MySQL lokal
npm run db:check

# 2. Jalankan migrasi 12 tabel InnoDB
npm run db:migrate

# 3. Isi database dengan data sintetis lengkap Sprint 1 & Sprint 2
npm run db:seed
```

### Langkah 4: Jalankan Server Backend & Frontend
Anda dapat menjalankan keduanya sekaligus dalam satu terminal:
```bash
npm run dev
```
Atau pada dua terminal terpisah:
- **Backend API (`http://127.0.0.1:3001`)**: `npm run dev:backend`
- **Frontend Vite (`http://127.0.0.1:5173`)**: `npm run dev:frontend`

---

## 4. Kredensial Akun Demo (Password: `123456`)

| Peran (`role`) | Username | Password | Unit Organisasi (`code`) | Hak Akses & Demonstrasi Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `123456` | Dinas Kesehatan Kota (`DINKES-KOTA`) | Manajemen unit organisasi, pengguna, seluruh log audit sistem |
| **Kader Posyandu** | `kader.mlt01` | `123456` | Posyandu Melati 1 (`POS-MLT-01`) | Balita, wali, sesi & kehadiran, input/draf/revisi pengukuran WHO, progres tindak lanjut |
| **Kader Posyandu** | `kader.mlt02` | `123456` | Posyandu Melati 2 (`POS-MLT-02`) | Operasional Posyandu Melati 2 (terisolasi dari Posyandu lain) |
| **Kader Posyandu** | `kader.mlt03` | `123456` | Posyandu Melati 3 (`POS-MLT-03`) | Operasional Posyandu Melati 3 |
| **Kader Posyandu** | `kader.kng01` | `123456` | Posyandu Kenanga 1 (`POS-KNG-01`) | Operasional Posyandu Kenanga 1 (di bawah Puskesmas Kenanga) |
| **Petugas Puskesmas** | `petugas.melati` | `123456` | Puskesmas Kecamatan Melati (`PKM-MELATI`) | Monitoring kelengkapan (`< 80%`), antrean review & keputusan, buat/tutup tindak lanjut, ekspor CSV & audit wilayah Melati |
| **Petugas Puskesmas** | `petugas.kenanga` | `123456` | Puskesmas Kecamatan Kenanga (`PKM-KENANGA`) | Monitoring, review antropometri, tindak lanjut, ekspor CSV & audit wilayah Kenanga |
| **Dinas Kesehatan** | `dinas` | `123456` | Dinas Kesehatan Kota (`DINKES-KOTA`) | Dashboard agregat lintas Puskesmas & ekspor laporan CSV dengan penyamaran privasi (`<5`) |

---

## 5. Pengujian, Verifikasi Mutu & Manajemen Tampilan UI

```bash
# 1. Pemeriksaan sintaks seluruh berkas JavaScript backend (35 berkas)
npm run check

# 2. Menjalankan 19 suite unit & integration test (termasuk TEST-01 & TEST-02)
npm test

# 3. Verifikasi uji beban konkuren 20 Virtual Users (TEST-03)
node scripts/k6/run-local-load-verification.js

# 4. Kompilasi produksi frontend React Vite
npm run build

# 5. (Opsional) Kembalikan tampilan ke versi sebelum eksperimen gradient
npm run ui:restore-gradient

# 6. (Opsional) Kembalikan tampilan ke versi awal sebelum revisi UI/UX
npm run ui:restore
```

---

## 6. Indeks Dokumentasi Proyek (`docs/`)

- [BEGINNER_SETUP_GUIDE.md](docs/BEGINNER_SETUP_GUIDE.md): **Panduan Lengkap Tim & Studi Kasus End-to-End** (Setup, Sinkronisasi, Fitur UI/UX Baru, Alur Integrasi 4 Peran).
- [PROGRESS.md](docs/PROGRESS.md): Pelacakan status dan bukti penyelesaian 20 tiket Sprint 1 & 20 tiket Sprint 2.
- [SPRINT2_BACKLOG.md](docs/SPRINT2_BACKLOG.md): Spesifikasi lengkap 20 tiket Jira Sprint 2 (User Story, Acceptance Criteria, Endpoint).
- [PANDUAN_PENGGUNAAN_SPRINT_1.md](docs/PANDUAN_PENGGUNAAN_SPRINT_1.md): Panduan operasional fitur fondasi Sprint 1.
- [PANDUAN_PENGGUNAAN_SPRINT_2.md](docs/PANDUAN_PENGGUNAAN_SPRINT_2.md): Panduan operasional & skenario presentasi dosen fitur Sprint 2 + UI/UX baru.
- [TEST_PLAN.md](docs/TEST_PLAN.md): Rencana dan hasil eksekusi pengujian unit, integrasi RBAC, dan validasi WHO.
- [LOAD_TEST_REPORT.md](docs/LOAD_TEST_REPORT.md): Laporan hasil uji beban 20 Virtual Users (`TEST-03`) dan keandalan ekspor CSV.
- [PRD.md](docs/PRD.md) & [SDD.md](docs/SDD.md): Dokumen kebutuhan produk dan desain arsitektur sistem.
