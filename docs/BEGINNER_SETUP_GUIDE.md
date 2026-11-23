# Panduan Lengkap Tim & Pengembang: Sistem TumbuhPantau (Sprint 1, Sprint 2 & Pembaruan UI/UX)

Dokumen ini adalah panduan acuan resmi yang siap dibagikan kepada seluruh anggota tim untuk menyiapkan lingkungan lokal, melakukan sinkronisasi perubahan terbaru, memahami alur bisnis lintas peran (Studi Kasus), serta mengoperasikan seluruh fitur Sprint 1 dan Sprint 2.

---

## 1. Langkah Cepat Sinkronisasi Tim (Wajib Dijalankan Anggota Tim)

Setiap kali anggota tim menerima pembaruan kode terbaru (Sprint 1 + Sprint 2 + UI/UX Baru), jalankan **5 perintah wajib** ini secara berurutan di terminal root folder proyek (`tumbuhpantau-main`):

```bash
# 1. Pasang paket dependency (termasuk Chart.js untuk grafik kurva WHO)
npm install

# 2. Pastikan servis MySQL Laragon menyala dan terhubung ke database 'tumbuhpantau'
npm run db:check

# 3. Jalankan migrasi skema database (12 tabel InnoDB & penyesuaian kolom)
npm run db:migrate

# 4. Isi database dengan data sintetis lengkap Sprint 1 & Sprint 2 (60 balita, 3 periode sesi)
npm run db:seed

# 5. Jalankan server Backend (port 3001) & Frontend Vite (port 5173) secara bersamaan
npm run dev
```

Setelah berjalan, buka peramban (browser) di:
- **Landing Page Publik**: `http://127.0.0.1:5173`
- **Halaman Login**: `http://127.0.0.1:5173/login`
- **Health Check Backend API**: `http://127.0.0.1:3001/api/health`

---

## 2. Daftar Lengkap Akun Demo Seluruh Peran (Password: `123456`)

Seluruh akun menggunakan **Username** (bukan email) dan kata sandi yang sama: **`123456`**.  
*(Di halaman `/login` juga tersedia 4 tombol pintas **Kader**, **Petugas**, **Dinas**, dan **Admin** untuk mengisi kredensial dalam 1 klik).*

| Peran (`role`) | Username | Password | Unit Organisasi (`code`) | Cakupan Wilayah & Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `123456` | Dinas Kesehatan Kota (`DINKES-KOTA`) | Kelola struktur unit organisasi, akun pengguna, reset kata sandi, seluruh log audit sistem |
| **Kader Posyandu** | `kader.mlt01` | `123456` | Posyandu Melati 1 (`POS-MLT-01`) | Operasional penuh `POS-MLT-01`: balita, wali, sesi & kehadiran, input/draf/revisi ukur WHO, progres tindak lanjut |
| **Kader Posyandu** | `kader.mlt02` | `123456` | Posyandu Melati 2 (`POS-MLT-02`) | Operasional khusus `POS-MLT-02` (terisolasi dari Posyandu lain) |
| **Kader Posyandu** | `kader.mlt03` | `123456` | Posyandu Melati 3 (`POS-MLT-03`) | Operasional khusus `POS-MLT-03` |
| **Kader Posyandu** | `kader.kng01` | `123456` | Posyandu Kenanga 1 (`POS-KNG-01`) | Operasional khusus `POS-KNG-01` (di bawah Puskesmas Kenanga) |
| **Petugas Puskesmas** | `petugas.melati` | `123456` | Puskesmas Kecamatan Melati (`PKM-MELATI`) | Membawahi `POS-MLT-01`, `02`, `03`: monitoring `< 80%`, antrean review antropometri, buat/tutup tindak lanjut, ekspor CSV, log audit wilayah Melati |
| **Petugas Puskesmas** | `petugas.kenanga` | `123456` | Puskesmas Kecamatan Kenanga (`PKM-KENANGA`) | Membawahi `POS-KNG-01`: monitoring, review antropometri, tindak lanjut, ekspor CSV, log audit wilayah Kenanga |
| **Dinas Kesehatan** | `dinas` | `123456` | Dinas Kesehatan Kota (`DINKES-KOTA`) | Dashboard agregat seluruh Puskesmas/Posyandu & ekspor laporan CSV dengan penyamaran privasi sel kecil (`<5`) |

---

## 3. Pembaruan UI/UX & Fitur Interaktif Terbaru

Selain merampungkan seluruh 40 tiket Jira (Sprint 1 & Sprint 2), antarmuka aplikasi telah dilengkapi dengan peningkatan kenyamanan pengguna berikut:

1. **Pop-Up Konfirmasi Otomatis saat Simpan & Edit (`client.js` & `AppShell.jsx`)**:
   - Setiap kali pengguna menekan tombol **Simpan** atau **Edit & Simpan** (pendaftaran/koreksi balita, aktivasi/deaktivasi balita, tambah/ubah wali, buka/ubah/tutup/batalkan sesi, catat kehadiran, simpan/hapus draf ukur, kirim pengukuran WHO, revisi pengukuran, keputusan review Puskesmas, hingga buat/update/tutup tugas tindak lanjut), muncul **Pop-Up Dialog Konfirmasi** di tengah layar.
   - Pop-up dilengkapi **tombol langkah selanjutnya** (misalnya: setelah simpan balita baru muncul tombol *"Lanjut ke Sesi & Kehadiran ->"*, setelah kirim pengukuran muncul tombol *"Lihat Detail & Riwayat Versi"*, dan setelah review Puskesmas muncul tombol *"Lihat Tugas Tindak Lanjut"*).
2. **Bar Panduan "Alur Cepat (Langkah 1 -> 2 -> 3 -> 4)" (`AppShell.jsx`)**:
   - Di bagian atas halaman terdapat bar panduan langkah kerja berurutan sesuai peran yang sedang login.
   - Dapat dibuka atau dilipat secara mulus (*smooth accordion animation*) melalui tombol **Panduan Alur / Sembunyikan Alur** di bilah atas (*topbar*).
3. **Formulir Tambah & Edit Berbentuk Modal Fokus (Tanpa Bayangan Hitam)**:
   - Formulir **+ Daftar Balita Baru**, **+ Tambah Wali Baru**, **+ Buka Sesi Baru**, **Ubah Jadwal Sesi**, **Koreksi Identitas Balita**, **Koreksi Pengukuran (Revisi)**, dan **+ Buat Tugas Baru** tampil sebagai jendela modal di tengah layar tanpa bayangan gelap (*no dark backdrop*) sehingga halaman di belakangnya tetap terang dan bersih.
4. **Tombol Pintas 1-Klik `Hadir & Ukur` + Pratinjau Z-Score Real-Time**:
   - Pada halaman **Detail Sesi (`/sesi/:id`)**, jika balita belum ditandai Hadir, tersedia tombol **`Hadir & Ukur`** yang otomatis mencatat kehadiran sekaligus membuka halaman input pengukuran dalam 1 klik.
   - Pada halaman **Input Pengukuran (`/pengukuran/:attendanceId`)**, grafik indikator Z-Score WHO terhitung otomatis secara *real-time* begitu kader mengetik angka Panjang/Tinggi Badan (`cm`).
5. **Pengaturan 4 Kombinasi Tema Visual (`Terang / Gelap` x `Solid / Glass`)**:
   - Tersedia pasangan tombol **`Gelap / Terang`** dan **`Solid / Glass`** di kanan atas **Landing Page (`/`)**, **Halaman Login (`/login`)**, dan **Topbar Dashboard**.
   - **4 Kombinasi Aktif**: `Terang + Solid`, `Terang + Glass`, `Gelap + Solid`, dan `Gelap + Glass` (tersimpan otomatis di `localStorage` pada kunci `tp_theme_mode` dan `tp_surface_style`).
   - Saat mode **`Glass`** diaktifkan, komponen `InteractiveGlassEngine.jsx` otomatis menjalankan efek *Interactive Liquid Glass* secara halus: pantulan kaca lembut mengikuti kursor (*specular glare*), kemiringan 3D ringan (`0.9° - 1.35°`) pada kartu statistik/alur, bola cahaya *aurora* latar bergerak tenang (*slow ambient drift*), riak klik kaca lembut, serta sorotan *hover* menu sidebar hijau zamrud transparan.
6. **Pencarian Langsung (Live Search) & Pengurutan Data pada 10 Halaman Daftar**:
   - Seluruh halaman daftar data (`Data Balita`, `Data Orang Tua / Wali`, `Sesi Posyandu`, `Detail Sesi`, `Monitoring Ukur`, `Antrean Peninjauan`, `Tugas Tindak Lanjut`, `Laporan Agregat`, `Unit Organisasi`, `Akun Pengguna`, dan `Log Audit`) dilengkapi 1 baris bar filter terpadu (tanpa redundansi) berisi **kotak pencarian nama/kode secara langsung** dan **dropdown pengurutan (`Terbaru Diupload/Diinput`, `Terlama`, `Abjad Nama A - Z`, `Abjad Nama Z - A`, serta pengurutan prioritas seperti `Z-Score Terendah` dan `Tenggat Terdekat`)**.
7. **Sentuhan Gradient PosCare, Animasi Transisi Halaman & Simulasi Landing Page Anonim**:
   - Menggunakan gradasi *PosCare Emerald Green (`#0E7C6B` -> `#10B981`) & Soft Teal (`#E8F5F1`)* pada baik Mode Terang maupun Mode Gelap (*Slate Night* `#0B131E` & `#131F2E`).
   - Dilengkapi *Top Progress Bar* hijau zamrud saat berpindah menu serta animasi *staggered cascade* pada kartu statistik dan baris tabel.
   - Widget **Simulasi Presensi Posyandu** di Landing Page bersifat 100% anonim (tanpa mengekspos nama/kode/data klinis balita ke publik) dengan tombol pintas `Tandai Semua (+N)` dan bertransformasi menjadi panel **Rekapitulasi Otomatis 100%** saat mencapai `30 / 30`.
8. **Perintah Pemulihan Tampilan UI (Rollback Instan)**:
   - Kembali ke tampilan tepat sebelum eksperimen gradient (tetap dengan Pop-Up, Animasi & Dark Mode):
     ```bash
     npm run ui:restore-gradient
     ```
   - Kembali ke tampilan awal sebelum seluruh revisi UI/UX:
     ```bash
     npm run ui:restore
     ```

---

## 4. Studi Kasus Pemakaian End-to-End (Alur Integrasi Lintas Peran)

Gunakan urutan 5 tahap berikut saat latihan tim atau presentasi ke dosen untuk memperlihatkan integrasi antar-peran dari hulu ke hilir:

### Tahap 1: Persiapan Organisasi & Akun (Role: Administrator `admin`)
1. Login sebagai **`admin`** (`123456`).
2. Buka **Unit Organisasi (`/organisasi`)**: tunjukkan hierarki 3 tingkat (`Dinas Kesehatan Kota` -> `Puskesmas Kecamatan Melati` -> `Posyandu Melati 1`).
3. Buka **Akun Pengguna (`/pengguna`)**: tunjukkan pembagian akun per unit kerja yang menjadi dasar isolasi data multi-tenant.

### Tahap 2: Pendaftaran, Presensi & Pengukuran Antropometri WHO (Role: Kader `kader.mlt01`)
1. Login sebagai **`kader.mlt01`** (`123456`). Perhatikan bar **Alur Cepat (Langkah 1 -> 2 -> 3 -> 4)** di bagian atas.
2. **Langkah 1 (Data Balita `/anak`)**:
   - Klik **+ Daftar Balita Baru**, isi data balita (misal: *Raka Pratama*, usia 18 bulan, wali *Ibu Sari*), lalu klik **Simpan Data Balita**.
   - Muncul **Pop-Up Konfirmasi** beserta kode unik otomatis (`POS-MLT-01-XXXX`). Klik tombol **"Lanjut ke Sesi & Kehadiran ->"** di dalam pop-up.
3. **Langkah 2 (Sesi & Kehadiran `/sesi`)**:
   - Buka sesi bulan berjalan yang berstatus **Terbuka**.
   - Pada baris *Raka Pratama*, klik **Hadir** (atau langsung klik **`Hadir & Ukur`**).
4. **Langkah 3 (Input Pengukuran WHO `/pengukuran/:attendanceId`)**:
   - Isi Berat Badan `8,8 kg`, Panjang Badan `75,0 cm`, posisi `Terlentang (PB)`.
   - Perhatikan panel kanan langsung menampilkan **Z-Score WHO** secara otomatis (misal `-2,45 SD`, kategori **Pendek**).
   - Coba klik **Simpan Draf** (muncul pop-up draf tersimpan), lalu klik **Kirim Pengukuran**.
   - Muncul **Pop-Up Pengukuran Berhasil Dikirim** yang menginformasikan bahwa karena kategori anak adalah **Pendek**, kasus ini otomatis diteruskan ke **Antrean Peninjauan Petugas Puskesmas**.
   - Untuk mendemonstrasikan koreksi tanpa menghapus data lama (*append-only*), buka **Profil & Kurva Anak (`/anak/:id`)**, klik **Koreksi** pada kartu pertumbuhan, isi alasan koreksi, lalu simpan sebagai **Revisi #2**. Tunjukkan juga **Grafik Kurva Pertumbuhan WHO (`-3SD` s.d. `+3SD`)** di halaman tersebut.

### Tahap 3: Monitoring Cakupan & Keputusan Peninjauan Gizi (Role: Petugas Puskesmas `petugas.melati`)
1. Login sebagai **`petugas.melati`** (`123456`).
2. **Langkah 1 (Monitoring Ukur `/monitoring`)**:
   - Tinjau cakupan pengukuran Posyandu binaan. Jika cakupan `< 80%`, sistem menampilkan banner peringatan kuning beserta daftar balita yang masih berstatus draf atau belum diukur.
3. **Langkah 2 (Antrean Peninjauan `/peninjauan`)**:
   - Kasus *Raka Pratama* dari `kader.mlt01` otomatis muncul di daftar antrean sebelah kiri.
   - Klik nama *Raka Pratama*, pilih keputusan **"Validasi & Buat Tugas Tindak Lanjut"**, pilih kategori intervensi (misal *Kunjungan Rumah & PMT*), pilih penanggung jawab **`kader.mlt01`**, lalu klik **Simpan Keputusan**.
   - Muncul **Pop-Up Keputusan Tersimpan** dengan nomor Tugas Tindak Lanjut otomatis.

### Tahap 4: Progres Kunjungan Lapangan & Penutupan Evaluasi (Kader `kader.mlt01` -> Petugas `petugas.melati`)
1. **Kader Mencatat Progres (`kader.mlt01`)**:
   - Login sebagai **`kader.mlt01`**, klik ikon **Notifikasi** di kanan atas atau menu **Tugas Tindak Lanjut (`/tindak-lanjut`)**.
   - Klik **Detail & Progres** pada tugas *Raka Pratama*, tambahkan catatan hasil kunjungan rumah, lalu klik **Simpan Catatan Progres**. Status tugas berubah dari `Terbuka` menjadi `Sedang Berjalan`.
2. **Petugas Puskesmas Menutup Tugas (`petugas.melati`)**:
   - Login kembali sebagai **`petugas.melati`**, buka detail tugas tersebut di `/tindak-lanjut/:id`.
   - Isi **Kesimpulan Hasil Evaluasi Penutupan (Wajib)** lalu klik **Selesaikan & Tutup Tugas**. Status tugas berubah menjadi `Selesai` dan terkunci permanen.

### Tahap 5: Dashboard Eksekutif, Ekspor CSV Privasi `<5` & Audit Log (Dinas `dinas` & Admin `admin`)
1. **Dinas Kesehatan (`dinas` / `123456`)**:
   - Buka **Dashboard Agregat (`/dashboard`)**: tinjau KPI lintas Puskesmas, grafik distribusi status pertumbuhan WHO, dan **Grafik Tren Prevalensi Stunting (%)** lintas bulan.
   - Buka **Laporan & CSV (`/laporan`)**: klik **Unduh CSV (UTF-8)**. Tunjukkan bahwa file CSV yang terunduh bebas dari NIK/nama balita, dan angka sensitif `1..4` disamarkan menjadi **`<5`**.
2. **Administrator (`admin`) / Petugas Puskesmas (`petugas.melati`)**:
   - Buka **Log Audit (`/audit-log`)**: filter berdasarkan rentang tanggal, jenis aksi (`CHILD_REGISTERED`, `MEASUREMENT_SUBMITTED`, `MEASUREMENT_REVISED`, `ASSESSMENT_REVIEWED`, `FOLLOW_UP_CLOSED`, `REPORT_CSV_EXPORTED`, `ACCESS_DENIED`), atau entitas untuk membuktikan seluruh aktivitas tercatat secara *append-only*.

---

## 5. Daftar 40 Tiket Jira (Sprint 1 & Sprint 2) yang Telah Selesai

### Sprint 1 (20 Tiket — Fondasi, RBAC, Balita, Wali & Sesi)
- `SCRUM-5, 6, 7, 8, 11, 34`: Monorepo React + Express, koneksi MySQL Laragon, skema 12 tabel InnoDB, runner migrasi & seeder.
- `SCRUM-9, 10`: Autentikasi sesi cookie MySQL, proteksi CSRF, rate limiter, dan navigasi RBAC 4 peran.
- `SCRUM-12, 13, 14, 15`: Registrasi balita + kode unik otomatis, pencarian & filter, koreksi identitas + audit log, nonaktifkan balita (`PATCH /api/v1/children/:id/deactivate`).
- `SCRUM-16, 17, 18, 19`: Tambah wali, detail profil wali & anak asuh, ubah kontak wali, kaitkan/lepas wali balita.
- `SCRUM-20, 21, 22, 23`: Buka sesi Posyandu (cegah tanggal ganda), rekap sesi, presensi kehadiran tunggal/massal, ubah jadwal (`PUT /api/v1/sessions/:id`) & batalkan sesi (`PATCH /api/v1/sessions/:id/cancel`).

### Sprint 2 (20 Tiket · 115 Story Points — Operasional, Antropometri WHO & Pengujian)
- **Fase 1 (`SCRUM-47, 48, 45`)**:
  - `SCRUM-47`: Aktifkan kembali balita nonaktif (`PATCH /api/v1/children/:id/activate`).
  - `SCRUM-48`: Ubah status kehadiran pada sesi terbuka (`PATCH /api/v1/sessions/:sessionId/attendances/:id`).
  - `SCRUM-45`: Filter log audit aktivitas sistem (`GET /api/v1/audit-logs`) untuk Puskesmas & Admin.
- **Fase 2 (`SCRUM-28, 24, 27, 46, 26, 25`)**:
  - `SCRUM-28`: Engine kalkulasi Z-Score WHO PB/U dan TB/U (0-59 bln, Permenkes 2/2020, koreksi posisi `+-0,7 cm`, flag plausibilitas `|Z| > 6`, disclaimer klinis).
  - `SCRUM-24`: Input pengukuran mode Draf & Kirim atomik + idempotensi `request_token`.
  - `SCRUM-27`: Hapus/batalkan draf pengukuran (`DELETE /api/v1/measurements/drafts/:id`).
  - `SCRUM-46`: Detail satu catatan pengukuran & rantai histori versi (`GET /api/v1/measurements/:id` & `/pengukuran/detail/:id`).
  - `SCRUM-26`: Koreksi pengukuran *append-only* (`POST /api/v1/measurements/:id/revisions`, `supersedes_id`, *optimistic lock* `409`).
  - `SCRUM-25`: Riwayat kronologis & grafik kurva pertumbuhan WHO Chart.js (`GET /api/v1/children/:id/growth-history`).
- **Fase 3 (`SCRUM-30, 42, 29`)**:
  - `SCRUM-30`: Monitoring balita belum diukur & draf belum dikirim + peringatan cakupan `< 80%` (`GET /api/v1/sessions/:sessionId/monitoring`).
  - `SCRUM-42`: Antrean peninjauan hasil antropometri Puskesmas (`GET /api/v1/reviews/queue`).
  - `SCRUM-29`: Keputusan peninjauan (`PATCH /api/v1/growth-assessments/:id/review`) & pembuatan tindak lanjut otomatis.
- **Fase 4 (`SCRUM-31, 43, 44`)**:
  - `SCRUM-31`: Buat & daftar tugas tindak lanjut (`GET/POST /api/v1/follow-ups`).
  - `SCRUM-43`: Tambah catatan progres *append-only* (`POST /api/v1/follow-ups/:id/updates`, `open` -> `in_progress`).
  - `SCRUM-44`: Tutup tugas tindak lanjut dengan kesimpulan evaluasi wajib (`PATCH /api/v1/follow-ups/:id/close`).
- **Fase 5 (`SCRUM-32, 33`)**:
  - `SCRUM-32`: Dashboard agregat operasional & grafik tren prevalensi stunting (`GET /api/v1/dashboard/stats`).
  - `SCRUM-33`: Ekspor laporan CSV UTF-8 bebas NIK + masking `<5` Dinas + audit log (`GET /api/v1/reports/export-csv`).
- **Fase 6 (`SCRUM-35, 36, 37`)**:
  - `SCRUM-35` (`TEST-01`): Validasi 160 kombinasi Z-Score WHO dengan deviasi `<= 0.01` (`backend/tests/growthCalculator.test.js`).
  - `SCRUM-36` (`TEST-02`): Integration test isolasi RBAC & lintas organisasi (`401`/`403` + audit `ACCESS_DENIED`) (`backend/tests/sprint2-integration.test.js`).
  - `SCRUM-37` (`TEST-03`): Skrip load testing k6 20 Virtual Users (`scripts/k6/sprint2-load-test.js`, `scripts/k6/run-local-load-verification.js`) & laporan hasil (`docs/LOAD_TEST_REPORT.md`, `p95 = 190,11 ms`).

---

## 6. Perintah Verifikasi Kualitas Sebelum Presentasi / Commit

```bash
npm run db:check
npm run check
npm test
node scripts/k6/run-local-load-verification.js
npm run build
```
