# PRD TumbuhPantau — Pengembangan Lokal (Melanjutkan Starter PM di Laragon)

> **Untuk Agen AI (opencode / LLM):**  
> Dokumen ini adalah **Single Source of Truth (Sumber Kebenaran Tunggal)** untuk melanjutkan pengerjaan web aplikasi **TumbuhPantau**. Starter awal telah dibuat oleh PM (Project Manager) dan tersimpan di folder lokal `C:\laragon\www\tumbuhpantau-main`.  
> Tugas agen adalah **melanjutkan dari starter ini hingga seluruh kebutuhan bisnis selesai**, dengan **ketentuan mutlak: 100% lokal**.

---

## 0. Aturan Mutlak & Instruksi Khusus (WAJIB DIBACA SEBELUM CODING)

1. **BATASAN LOKAL PENUH (STRICTLY LOCAL ONLY — NO GIT PUSH / NO CLOUD UPLOAD)**:
   - Seluruh pekerjaan pengembangan, instalasi paket, migrasi database, dan pengujian **hanya dilakukan di mesin lokal pengguna pada direktori `C:\laragon\www\tumbuhpantau-main`**.
   - **DILARANG KERAS** menjalankan `git push`, menambahkan remote git baru, atau mengunggah source code, file database, env, maupun data apa pun ke GitHub, cloud repository, atau layanan hosting eksternal.
   - Git hanya boleh digunakan secara lokal (misal: `git status`, `git diff`, atau commit lokal jika diperlukan checkpoint riwayat lokal). Pengguna akan memeriksa dan menguji aplikasi secara langsung di browser lokal terlebih dahulu.
2. **LOKASI KERJA RESMI**:
   - Direktori root proyek: `C:\laragon\www\tumbuhpantau-main`.
   - Backend API: `C:\laragon\www\tumbuhpantau-main\backend`.
   - Frontend SPA: `C:\laragon\www\tumbuhpantau-main\frontend`.
   - Dokumentasi: `C:\laragon\www\tumbuhpantau-main\docs`.
3. **LINGKUNGAN SISTEM LOKAL (WINDOWS 11 + LARAGON)**:
   - **Database**: MySQL bawaan Laragon (Host: `127.0.0.1`, Port: `3306`, User: `root`, Password: kosong `""`, Database: `tumbuhpantau`).
   - **Runtime**: Node.js ≥ 22.12 (rekomendasi Node.js 24 LTS) & npm workspaces.
   - **Backend Server**: Port `3001` (`http://127.0.0.1:3001`).
   - **Frontend Vite Dev**: Port `5173` (`http://127.0.0.1:5173`).
4. **MELANJUTKAN KODE STARTER PM (JANGAN OVERWRITE DARI NOL)**:
   - Pertahankan struktur npm workspaces yang sudah ada di `package.json` root.
   - Pertahankan file pondasi dari PM: `backend/src/port.js`, `backend/scripts/check-db.js`, `frontend/vite.config.js` (proxy `/api` ke `http://127.0.0.1:3001`), dan endpoint `GET /api/health`.
   - Jangan mengubah arsitektur monorepo menjadi folder lain (misal: jangan ubah ke `client/` atau `server/`). Tetap gunakan `frontend/` dan `backend/`.
   - Bahasa: JavaScript murni (ESM / `"type": "module"`), **bukan TypeScript**.
5. **EKSEKUSI TERSTRUKTUR PER MILESTONE (BAGIAN 12)**:
   - Kerjakan secara berurutan sesuai tahapan M0 → M1 → M2 → ... → M13. Jika pengguna meminta eksekusi penuh hingga selesai dalam satu sesi, jalankan seluruh milestone yang tersisa (M1 s.d. M13) secara berkesinambungan tanpa berhenti di tengah jalan, sembari terus memvalidasi dan memperbarui `docs/PROGRESS.md` di setiap milestone.
6. **KEAMANAN & OTORISASI SISI SERVER**:
   - Otorisasi dan pembatasan cakupan wilayah (`AccessPolicy`) wajib berada di backend Express, bukan hanya menyembunyikan menu di React.
   - `organization_id` wajib diambil dari sesi login di database, dilarang mengambil dari request body pengguna untuk menentukan hak akses.
7. **IMUTABILITAS DATA KLINIS & AUDIT**:
   - Pengukuran yang berstatus `submitted` **tidak boleh di-UPDATE nilai ukurnya atau di-DELETE**. Koreksi dilakukan dengan membuat baris baru (`revision_no + 1`, `supersedes_id`) dan baris lama diubah menjadi `voided`.
   - Tabel `audit_logs` dan `follow_up_updates` bersifat *append-only* (tidak ada fitur edit atau hapus).
8. **STANDAR ANTROPOMETRI WHO**:
   - Perhitungan z-score PB/U–TB/U hanya menggunakan data tabel LMS WHO resmi (Bagian 6). Dilarang mengarang rumus atau konstanta sendiri.
   - Wajib menyertakan disclaimer klinis di setiap tampilan hasil: *"Hasil antropometri, bukan diagnosis. Interpretasi oleh tenaga kesehatan."*
9. **PRIVASI & DATA DEMO**:
   - Hanya gunakan data sintetis / fiktif. Dilarang memasukkan NIK, foto anak, titik GPS, atau data pribadi nyata.

---

## 1. Analisis Starter PM & Rencana Lanjutan

### 1.1 Kondisi Starter Saat Ini di `C:\laragon\www\tumbuhpantau-main`
| Komponen | Status Saat Ini | Yang Sudah Dibuat PM |
|---|---|---|
| **Root** | Siap | `package.json` (workspaces: `["frontend", "backend"]`), `.nvmrc` (24), `package-lock.json`, `.gitignore`. |
| **Backend** | Starter dasar | Express 5.1, `mysql2` 3.14, `dotenv`. Memiliki `src/app.js` (`/api/health`, `/api/demo/overview`), `src/server.js`, `src/port.js`, `src/demo-data.js`, `scripts/check-db.js`, tes unit `node:test`. Koneksi MySQL lokal sudah terverifikasi lewat `npm run db:check`. |
| **Frontend** | Starter dasar | React 19.1, Vite 6.3, Bootstrap 5.3. Memiliki tampilan dashboard prototipe satu file (`App.jsx`), styling responsif (`styles.css`), proxy Vite ke `http://127.0.0.1:3001`. |
| **Dokumen PM** | Siap | `docs/SDD.md`, `IMPLEMENTATION_PLAN.md`, `AI_CODING_GUIDELINES.md`, `DECISIONS_AND_OPEN_QUESTIONS.md`, `TEST_PLAN.md`, `PROJECT_AUDIT.md`, `SETUP_VERIFICATION.md`, `NEXT_TASKS.md`. |

### 1.2 Hal yang Harus Dilanjutkan oleh Agen AI
1. Menambahkan skrip migrasi database SQL terversi dan membuat 12 tabel inti InnoDB di MySQL Laragon.
2. Membangun modul Autentikasi sesi berbasis cookie MySQL (`express-session` + `express-mysql-session`), proteksi CSRF, dan RBAC (`AccessPolicy`).
3. Mengganti `App.jsx` single-file menjadi Single Page Application terstruktur dengan React Router, modular pages, dan components.
4. Mengimplementasikan kalkulator antropometri WHO PB/U–TB/U (0–59 bulan) berbasis tabel rujukan resmi LMS.
5. Membangun alur operasional: Data Anak & Wali, Sesi Posyandu & Kehadiran, Input & Koreksi Pengukuran, Antrean Peninjauan Puskesmas, Tindak Lanjut, Monitoring Kelengkapan, Dashboard 3 Grafik, dan Ekspor CSV Teranonimisasi.
6. Menyediakan pengujian otomatis (Unit, Integrasi Supertest, dan E2E lokal Playwright).

---

## 2. Kebutuhan Bisnis & Batasan Fungsional

### 2.1 Alur Bisnis Inti
```
1. Pendaftaran Anak & Wali (Posyandu)
   ↓
2. Pembukaan Sesi Kegiatan Posyandu Bulanan
   ↓
3. Pencatatan Kehadiran Anak pada Sesi
   ↓
4. Penginputan Hasil Ukur (Bisa Simpan Draf atau Kirim Pengukuran)
   ↓
5. Perhitungan Otomatis PB/U–TB/U (Z-Score WHO & Kategori Permenkes No. 2/2020)
   ↓
6. Pembaruan Histori & Grafik Kurva Pertumbuhan Anak
   ↓
7. Penandaan Otomatis ke Antrean Peninjauan Puskesmas (Kasus Berisiko/Flag Kualitas)
   ↓
8. Pengambilan Keputusan oleh Petugas Puskesmas (Validasi / Ukur Ulang / Tugas Tindak Lanjut)
   ↓
9. Pelaksanaan Tindak Lanjut & Pencatatan Progres oleh Kader/Petugas
   ↓
10. Evaluasi & Penutupan Tugas oleh Petugas Puskesmas
   ↓
11. Monitoring Anak Belum Diukur, Dashboard Berbasis Peran, & Ekspor CSV Agregat
```

### 2.2 Batasan Sistem (Out of Scope)
- **Batas Usia**: Hanya memproses perhitungan antropometri untuk anak usia `< 60 bulan` (0–59 bulan) pada tanggal ukur.
- **Satu Anak Satu Posyandu**: Tidak ada mutasi lintas posyandu pada tahap ini.
- **Indikator Otomatis**: Hanya **PB/U–TB/U**. Berat badan dicatat dan ditampilkan pada grafik riwayat aktual, tanpa penilaian kategori z-score otomatis.
- **Tanpa Fitur Medis Kompleks**: Tidak ada diagnosis klinis, resep obat, rekomendasi terapi individual, atau chatbot AI medis.
- **Tanpa Integrasi Luar**: Tidak ada koneksi ke SATUSEHAT, ASIK, BPJS, WhatsApp Gateway, atau notifikasi SMS.
- **Koneksi**: Dijalankan sepenuhnya di jaringan lokal (Localhost).

---

## 3. Spesifikasi Arsitektur & Teknologi

### 3.1 Stack Teknologi
- **Frontend SPA**: React 19, React Router v7 (`react-router-dom`), Bootstrap 5.3, Chart.js 4 + `react-chartjs-2`, `chartjs-plugin-annotation`.
- **Backend API**: Node.js (ESM), Express 5, `mysql2/promise`, `express-session`, `express-mysql-session`, `bcryptjs` (cost factor 12), `zod` (validasi skema), `helmet`, `express-rate-limit`.
- **Database**: MySQL 8.0 / MariaDB 10.6 (Laragon), Storage Engine `InnoDB`, Charset `utf8mb4`, Collation `utf8mb4_unicode_ci`.
- **Testing**: `node:test` (bawaan Node.js) + `supertest` untuk backend, `vitest` + `testing-library` untuk frontend, `@playwright/test` untuk E2E browser lokal.

### 3.2 Struktur Direktori Target di `C:\laragon\www\tumbuhpantau-main`
```text
C:\laragon\www\tumbuhpantau-main\
├── package.json                 # Workspaces root
├── .nvmrc                       # Node 24
├── AGENTS.md                    # Panduan cepat instruksi agen AI
├── docs/
│   ├── PRD.md                   # Dokumen spesifikasi ini
│   ├── PROGRESS.md              # Lembar pelacakan milestone
│   ├── AI_USAGE_LOG.md          # Log aktivitas pengembangan AI
│   └── ... (dokumen PM lainnya)
├── backend/
│   ├── .env.example             # Template konfigurasi env
│   ├── package.json
│   ├── db/
│   │   ├── migrations/          # 001_init_schema.sql (12 tabel inti)
│   │   ├── seeds/               # Data seeder sintetis & akun awal
│   │   └── reference/           # Tabel referensi WHO JSON + metadata
│   ├── scripts/
│   │   ├── check-db.js          # Skrip verifikasi koneksi MySQL
│   │   ├── check-syntax.js      # Verifikasi sintaks JS
│   │   ├── migrate.js           # Runner migrasi SQL berversi
│   │   └── import-who.js        # Konverter rujukan WHO
│   ├── src/
│   │   ├── app.js               # Komposisi Express app & middleware
│   │   ├── server.js            # Listener port 3001
│   │   ├── port.js              # Validasi PORT
│   │   ├── config/              # Konfigurasi DB & env
│   │   ├── middlewares/         # Auth, RBAC, CSRF, RequestId, ErrorHandler
│   │   ├── lib/                 # AppError, response helper, date util
│   │   ├── policies/            # AccessPolicy (aturan isolasi wilayah)
│   │   ├── services/            # Logika bisnis (Kalkulator WHO, Audit, Notifikasi)
│   │   └── modules/             # Modul domain (auth, org, child, session, dll.)
│   └── tests/
│       ├── unit/                # Unit test kalkulator WHO & policy
│       ├── integration/         # API test dengan Supertest
│       └── helpers/             # Test database setup & fixtures
├── frontend/
│   ├── index.html
│   ├── vite.config.js           # Proxy /api -> http://127.0.0.1:3001
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx              # Router & providers
│   │   ├── styles.css           # Variabel desain & tata letak
│   │   ├── api/                 # Fetch client wrapper (CSRF & cookie)
│   │   ├── context/             # AuthContext, NotificationContext
│   │   ├── components/          # AppShell, Sidebar, Charts, Badges, Modals
│   │   ├── pages/               # Halaman-halaman antarmuka
│   │   └── utils/               # Formatter tanggal, z-score, umur
└── tests/
    ├── e2e/                     # Pengujian alur browser lokal Playwright
    └── load/                    # Pengujian performa lokal k6
```

### 3.3 Konfigurasi Environment Lokal (`backend/.env`)
Salin dari `backend/.env.example` ke `backend/.env`:
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
SEED_DEFAULT_PASSWORD=PasswordTumbuh123!
APP_TIMEZONE=Asia/Jakarta
```

---

## 4. Matriks Peran Pengguna & Batasan Wilayah (RBAC)

### 4.1 Hierarki Organisasi (`organizations`)
1. `dinas_kesehatan` (`parent_id = NULL`): Tingkat Kota/Kabupaten.
2. `puskesmas` (`parent_id = id_dinas`): Membawahi beberapa Posyandu.
3. `posyandu` (`parent_id = id_puskesmas`): Unit pelayanan lapangan.

### 4.2 Matriks Hak Akses (`AccessPolicy`)
| Aksi / Endpoint | Kader Posyandu | Petugas Puskesmas | Dinas Kesehatan | Administrator |
|---|---|---|---|---|
| Login / Logout / Profil Pribadi | Ya | Ya | Ya | Ya |
| Kelola Organisasi & Pengguna | Ditolak (403) | Ditolak (403) | Ditolak (403) | **Ya (Penuh)** |
| Data Anak & Wali | **Posyandunya** | **Wilayah Puskesmas** | Ditolak (403) | Ditolak (403) |
| Sesi Posyandu & Kehadiran | **Posyandunya** | Baca Saja | Ditolak (403) | Ditolak (403) |
| Input & Koreksi Pengukuran | **Posyandunya** | **Wilayah Puskesmas** | Ditolak (403) | Ditolak (403) |
| Histori & Kurva Pertumbuhan Anak | **Posyandunya** | **Wilayah Puskesmas** | Ditolak (403) | Ditolak (403) |
| Monitoring Belum Diukur | **Posyandunya** | **Wilayah Puskesmas** | Ditolak (403) | Ditolak (403) |
| Antrean Peninjauan Hasil | **Baca Saja** | **Putuskan (Validasi/Ukur Ulang/TL)** | Ditolak (403) | Ditolak (403) |
| Buat Tugas Tindak Lanjut | Tugas Operasional | Semua Jenis Tugas | Ditolak (403) | Ditolak (403) |
| Catat Progres Tindak Lanjut | Tugas Ditugaskan | **Wilayah Puskesmas** | Ditolak (403) | Ditolak (403) |
| Tutup Tugas Tindak Lanjut | Ditolak (403) | **Ya (Wilayahnya)** | Ditolak (403) | Ditolak (403) |
| Dashboard KPI & Grafik | **Skup Posyandu** | **Skup Puskesmas** | **Skup Dinas** | Ditolak (403) |
| Ekspor CSV Agregat | **Skup Posyandu** | **Skup Puskesmas** | **Skup Dinas (Anonim)** | Ditolak (403) |
| Log Audit Sistem | Ditolak (403) | Audit Layanan Wilayah | Ditolak (403) | Audit Administratif |

---

## 5. Skema Database (12 Tabel Inti InnoDB)

Seluruh tabel menggunakan `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`. Primary Key bertipe `INT UNSIGNED AUTO_INCREMENT`. Foreign Key menggunakan `ON DELETE NO ACTION ON UPDATE NO ACTION`.

### 5.1 Definisi 12 Tabel
1. **`organizations`**: `id`, `parent_id` (FK self-ref, NULLable), `type` (`dinas_kesehatan`, `puskesmas`, `posyandu`), `code` (UNIQUE), `name`, `is_active` (TINYINT 1).
2. **`users`**: `id`, `organization_id` (FK), `name`, `username` (UNIQUE), `password_hash`, `role` (`kader`, `petugas_puskesmas`, `dinas_kesehatan`, `administrator`), `is_active`.
3. **`guardians`**: `id`, `organization_id` (FK posyandu), `name`, `phone` (NULLable).
4. **`children`**: `id`, `organization_id` (FK posyandu), `guardian_id` (FK), `guardian_relationship`, `internal_code` (UNIQUE, misal: `POS-MLT-03-0014`), `name`, `birth_date`, `sex` (`L`/`P`), `registered_on`, `inactive_on` (NULLable).
5. **`posyandu_sessions`**: `id`, `organization_id` (FK posyandu), `session_date`, `status` (`open`, `closed`), `created_by` (FK users). Constraint: `UNIQUE(organization_id, session_date)`.
6. **`attendances`**: `id`, `session_id` (FK), `child_id` (FK), `status` (`present`, `absent`), `recorded_by` (FK), `recorded_at`. Constraint: `UNIQUE(session_id, child_id)`.
7. **`measurements`**: `id`, `attendance_id` (FK), `revision_no` (DEFAULT 1), `supersedes_id` (FK measurements, NULLable), `measured_at`, `weight_kg` (DECIMAL 5,2), `length_height_cm` (DECIMAL 5,1), `position` (`recumbent`, `standing`), `status` (`draft`, `submitted`, `voided`), `correction_reason` (NULLable, wajib jika `revision_no > 1`), `created_by` (FK), `created_at`, `request_token` (UNIQUE, UUID klien).
8. **`reference_versions`**: `id`, `name`, `source_url`, `file_checksum` (SHA-256), `algorithm_version`, `activated_at`.
9. **`growth_assessments`**: `id`, `measurement_id` (FK measurements, UNIQUE), `reference_version_id` (FK), `birth_date_used`, `sex_used`, `age_days`, `adjustment_cm` (DECIMAL 3,1), `adjusted_length_height_cm` (DECIMAL 5,1), `z_score` (DECIMAL 5,2), `category` (`sangat_pendek`, `pendek`, `normal`, `tinggi`), `quality_status` (`valid`, `flagged_plausibility`), `review_reason` (NULLable), `review_status` (`not_flagged`, `pending`, `validated`, `remeasure_requested`), `reviewed_by` (FK users, NULLable), `reviewed_at`, `review_note`.
10. **`follow_ups`**: `id`, `child_id` (FK), `assessment_id` (FK growth_assessments, NULLable), `type` (`clinical_review`, `remeasurement`, `operational_measurement`), `description`, `assigned_to` (FK users), `created_by` (FK users), `due_date`, `status` (`open`, `in_progress`, `closed`), `closed_by` (FK users, NULLable), `closed_at`, `closure_note`.
11. **`follow_up_updates`**: `id`, `follow_up_id` (FK), `actor_id` (FK users), `activity_at`, `note`, `result` (`contacted`, `visited`, `unreachable`, `referred`, `remeasured`, `system_revision_notice`), `created_at`.
12. **`audit_logs`**: `id`, `actor_id` (FK users, NULLable), `organization_id` (FK organizations, NULLable), `action`, `entity_type`, `entity_id`, `occurred_at`, `request_id`, `change_summary` (VARCHAR 500 ringkas, dilarang menyimpan password/token/PII).

Tabel infrastruktur pendukung yang diizinkan: `schema_migrations` (pelacak migrasi) dan `sessions` (dibuat otomatis oleh `express-mysql-session`).

---

## 6. Algoritma Antropometri PB/U–TB/U (WHO & Permenkes No. 2/2020)

### 6.1 Rumus Perhitungan
1. **Umur Anak dalam Hari**: `age_days = DATEDIFF(DATE(measured_at), birth_date)`:
   - `age_days < 0` → Ditolak (422: Tanggal ukur sebelum lahir).
   - `age_days > 1826` (≥ 60 bulan) → Ditolak (422: Di luar cakupan layanan balita 0–59 bulan).
2. **Koreksi Posisi Pengukuran (`adjustment_cm`)**:
   - Usia `< 24 bulan` (`age_days < 731 hari`): Standar ukur adalah **Terlentang (`recumbent`)**. Jika diukur Berdiri (`standing`) → `adjustment_cm = +0.7 cm`.
   - Usia `≥ 24 bulan` (`age_days ≥ 731 hari`): Standar ukur adalah **Berdiri (`standing`)**. Jika diukur Terlentang (`recumbent`) → `adjustment_cm = -0.7 cm`.
   - `adjusted_length_height_cm = length_height_cm + adjustment_cm`.
3. **Z-Score LMS**:
   - Ambil $L, M, S$ dari tabel rujukan WHO harian sesuai jenis kelamin dan `age_days`.
   - Rumus: $Z = \frac{(y / M)^L - 1}{L \cdot S}$ (jika $L \neq 0$), di mana $y = \text{adjusted\_length\_height\_cm}$.
4. **Klasifikasi Kategori (Menggunakan Nilai Z Presisi Penuh)**:
   - $Z < -3.00$: **Sangat pendek** (`sangat_pendek`).
   - $-3.00 \leq Z < -2.00$: **Pendek** (`pendek`).
   - $-2.00 \leq Z \leq +3.00$: **Normal** (`normal`).
   - $Z > +3.00$: **Tinggi** (`tinggi`).
5. **Pemeriksaan Plausibilitas & Antrean Peninjauan**:
   - Jika $|Z| > 6.00$: `quality_status = 'flagged_plausibility'`, `review_status = 'pending'`, `review_reason = 'Pemeriksaan kualitas: nilai di luar rentang rujukan wajar (|Z| > 6)'`.
   - Jika Sangat pendek, Pendek, atau Tinggi: `quality_status = 'valid'`, `review_status = 'pending'`.
   - Jika Normal dan tidak ada flag: `quality_status = 'valid'`, `review_status = 'not_flagged'`.

---

## 7. Siklus Transaksi Kritis

### 7.1 Pengiriman Pengukuran Baru (`POST /api/v1/measurements/submit`)
Dijalankan dalam 1 transaksi atomik database:
1. Validasi idempotensi: Jika `request_token` sudah ada dan berstatus `submitted`, kembalikan data yang ada (`meta.idempotentReplay = true`).
2. Kunci baris kehadiran (`attendances`) dengan `FOR UPDATE`.
3. Hitung z-score dan kategori dengan modul `growthCalculator`.
4. Jika sebelumnya ada draf, perbarui menjadi `submitted`. Jika belum ada, lakukan `INSERT` baris pengukuran baru (`revision_no = 1`).
5. Simpan hasil penilaian ke tabel `growth_assessments`.
6. Simpan rekaman log ke tabel `audit_logs` (`action = 'MEASUREMENT_SUBMITTED'`).
7. Commit transaksi.

### 7.2 Koreksi / Revisi Pengukuran (`POST /api/v1/measurements/:id/revise`)
Dijalankan dalam 1 transaksi atomik database:
1. Ambil baris pengukuran lama dengan `FOR UPDATE`. Pastikan statusnya `submitted`. Jika sudah `voided`, gagalkan dengan `409 Conflict`.
2. Validasi input: Alasan koreksi (`correction_reason`) wajib diisi minimal 5 karakter.
3. Ubah status pengukuran lama menjadi `status = 'voided'`.
4. Simpan pengukuran baru: `revision_no = lama + 1`, `supersedes_id = lama.id`, `status = 'submitted'`, nilai ukur baru.
5. Hitung ulang z-score dan simpan baris baru di `growth_assessments`.
6. Sinkronisasi tugas tindak lanjut aktif: Jika ada tugas di `follow_ups` yang terikat pada asesmen lama, alihkan ke asesmen baru dan catat riwayat otomatis di `follow_up_updates` (`result = 'system_revision_notice'`).
7. Simpan log audit `MEASUREMENT_REVISED`.
8. Commit transaksi.

### 7.3 Keputusan Peninjauan (`POST /api/v1/reviews/:assessmentId/decision`)
- Hanya dapat diakses oleh pengguna dengan role `petugas_puskesmas` (Kader ditolak `403 Forbidden`).
- Pilihan keputusan:
  1. `validated`: Mengesahkan data pengukuran.
  2. `remeasure_requested`: Meminta pengukuran ulang (catatan wajib diisi).
  3. `follow_up_required`: Mengesahkan dan langsung membuat tugas di `follow_ups` dalam satu transaksi atomik.

---

## 8. Notifikasi, Dashboard, & Ekspor Agregat

### 8.1 Notifikasi In-App (`GET /api/v1/notifications`)
Notifikasi dihasilkan secara dinamis (tanpa tabel terpisah) berdasarkan query kondisi terkini:
- **Petugas Puskesmas**: Pengukuran baru menunggu peninjauan (`review_status = 'pending'`), tindak lanjut terlambat (*overdue*), pembaruan perkembangan tugas dari kader.
- **Kader Posyandu**: Permintaan ukur ulang dari petugas (`review_status = 'remeasure_requested'`), tugas tindak lanjut baru yang ditugaskan kepadanya, sesi posyandu yang masih memiliki anak hadir tanpa pengukuran lengkap.

### 8.2 Dashboard 3 Grafik Utama (Chart.js)
Menampilkan 4 kartu ringkasan KPI dan 3 grafik operasional:
1. **Grafik 1 — Distribusi Kategori PB/U–TB/U**: Proporsi status gizi anak (Doughnut untuk Posyandu, Stacked Bar per unit untuk Puskesmas & Dinas).
2. **Grafik 2 — Kelengkapan Pemantauan**: Membandingkan anak *Sudah Diukur*, *Hadir — Pengukuran Belum Lengkap*, dan *Belum Diukur*.
3. **Grafik 3 — Progres Peninjauan & Tindak Lanjut**: Memantau antrean verifikasi petugas dan status penyelesaian tugas tindak lanjut di lapangan.

### 8.3 Ekspor CSV Agregat Teranonimisasi
- Endpoint `GET /api/v1/reports/aggregate/export?period=YYYY-MM`.
- Berkas CSV menyajikan ringkasan jumlah per unit organisasi: `periode, kode_organisasi, nama_organisasi, tipe_organisasi, total_anak_aktif, jumlah_diukur_lengkap, jumlah_belum_diukur, jumlah_pengukuran_draf, kategori_sangat_pendek, kategori_pendek, kategori_normal, kategori_tinggi, perlu_peninjauan, tindak_lanjut_aktif, tindak_lanjut_selesai, disamarkan`.
- **Perlindungan Privasi**: DILARANG KERAS memuat nama anak, kode anak, tanggal lahir anak, nama wali, atau nomor kontak wali.
- **Penyamaran Kelompok Kecil (Dinas Kesehatan)**: Jika nilai sel kategori berada di antara 1 sampai 4 anak, nilai diganti menjadi string `<5` untuk mencegah pelacakan identitas.

---

## 9. Desain Antarmuka (UI/UX) di Frontend

### 9.1 Sistem Desain & Palet Warna
- **Brand Primary**: Emerald Green (`#0E7C6B`), Hover (`#095E51`), Soft Surface (`#E8F5F1`).
- **Canvas Background**: Off-White / Warm Cream (`#F7F6F1`).
- **Card Surface**: Putih (`#FFFFFF`), Border `1px solid #E5E4DC`, Radius `12px`.
- **Badges Status Semantik**: Menggunakan kombinasi warna latar, warna teks kontras, dan titik ikon (tidak mengandalkan warna semata).

### 9.2 Spesifikasi Halaman Utama
1. **Login Page (`/login`)**: Autentikasi sesi cookie, pesan kegagalan generik.
2. **Dashboard Page (`/dashboard`)**: KPI Cards, 3 Grafik Chart.js, tabel rekap data.
3. **Sesi & Kehadiran (`/sesi`, `/sesi/:id`)**: Buka/tutup sesi, pencatatan kehadiran cepat (*single* & *bulk*).
4. **Form Pengukuran (`/sesi/:sessionId/ukur/:attendanceId`)**: Form input hasil ukur 2 kolom, perhitungan visual z-score horizontal bar, penanda otomatis posisi ukur, tombol Draf dan Kirim.
5. **Profil Anak & Grafik Pertumbuhan (`/anak/:id`)**: Kurva pertumbuhan WHO PB/U–TB/U lengkap dengan area normal hijau, garis referensi -3 s.d. +3 SD, garis batas 24 bulan, grafik berat aktual, serta tabel riwayat revisi dan tombol `✎ Koreksi`.
6. **Antrean Peninjauan (`/peninjauan`)**: Panel kiri daftar kasus berisiko; panel kanan formulir keputusan petugas (atau kartu terkunci bagi kader).
7. **Monitoring Kelengkapan (`/monitoring`)**: Daftar anak belum diukur dan anak hadir dengan draf menggantung, disertai tombol penugasan kader.
8. **Tindak Lanjut (`/tindak-lanjut`, `/tindak-lanjut/:id`)**: Daftar tugas berpenanggung jawab, pelacakan tenggat (*overdue*), log perkembangan (*append-only*), dan evaluasi penutupan tugas.
9. **Laporan & Ekspor (`/laporan`)**: Pratinjau agregat tabel dan tombol unduh CSV ber-BOM UTF-8.
10. **Manajemen Admin (`/admin/organisasi`, `/admin/pengguna`, `/audit`)**: CRUD organisasi & pengguna, penonaktifan akun instan, log audit sistem.

---

## 10. Kontrak Format API & Kode Status

Format Standar Respons Sukses (`200 OK` / `201 Created`):
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req-uuid-v4",
    "timestamp": "2026-11-10T11:00:00.000Z"
  }
}
```

Format Standar Respons Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data pengukuran belum valid.",
    "fieldErrors": {
      "length_height_cm": "Panjang/tinggi badan harus berupa angka positif."
    }
  },
  "meta": {
    "requestId": "req-uuid-v4"
  }
}
```

---

## 11. Strategi Data Uji Lokal (Seeder)

Untuk memfasilitasi pengujian mandiri oleh pengguna di mesin lokal:
1. `npm run db:seed`: Mengisi data dasar terstruktur:
   - 1 Dinas Kesehatan, 2 Puskesmas, 4 Posyandu.
   - Akun pengguna uji: `admin`, `dinas`, `petugas.melati`, `petugas.kenanga`, `kader.mlt01`, `kader.mlt03`, `kader.kng01`, `kader.kng02` (Password seragam dari `.env`: `SEED_DEFAULT_PASSWORD`).
   - ±40 anak sintetis per posyandu dengan data historis pengukuran lintas 3 bulan terakhir.
2. `npm run seed:synthetic -- --children=1000 --measurements=12000`: Seeder volume data besar lokal untuk verifikasi performa rendering grafik dan kueri database.

---

## 12. Rencana Eksekusi Milestone (Tahapan Kerja Agen)

Pengerjaan dilakukan secara bertahap di folder lokal `C:\laragon\www\tumbuhpantau-main`:

| Milestone | Deskripsi Pekerjaan | Output / Bukti Terverifikasi |
|---|---|---|
| **M0: Fondasi Backend** | Setup dependensi lokal backend, standardisasi error handler & response, router `/api/v1`, ping DB pada `/api/health`, skrip cek sintaks. | `npm test` dan `npm run check` lulus. |
| **M1: Skema Database** | Skrip `scripts/migrate.js` dan file DDL `001_init_schema.sql` (12 tabel InnoDB, index, foreign keys). | 12 tabel terbentuk di MySQL Laragon via `npm run db:migrate`. |
| **M2: Modul Autentikasi (AUTH-01)** | Stateful cookie session MySQL, login/logout, middleware `requireAuth`, CSRF token, rate limiter, hash bcrypt 12, seeder akun demo dasar. | Endpoint `/auth/login`, `/auth/me`, `/auth/logout` lulus uji Supertest. |
| **M3: Frontend Shell & Auth UI** | Setup React Router, `api/client.js`, `AuthContext`, halaman login, navigasi AppShell dinamis per role, status badge. | Login di browser lokal berhasil, navigasi sidebar menyesuaikan role pengguna. |
| **M4: Manajemen Organisasi & Pengguna (PBI-01)** | Implementasi `AccessPolicy`, CRUD organisasi dan pengguna oleh Admin, audit log administratif, UI admin di frontend. | Admin dapat menambah puskesmas/posyandu dan membuat akun baru. |
| **M5: Kalkulator Antropometri WHO (PBI-05)** | Impor tabel LMS WHO, modul fungsi murni `growthCalculator.js`, unit test komparatif rentang umur dan koreksi posisi ±0.7 cm. | Seluruh skenario batas umur dan deviasi z-score $\le 0.01$ lulus unit test. |
| **M6: Manajemen Anak & Wali (PBI-02)** | Registrasi anak & wali, pembuatan `internal_code` otomatis, deteksi duplikasi nama/tgl lahir, UI daftar & form anak. | Form pendaftaran anak berhasil menyimpan data dan memunculkan peringatan jika duplikat. |
| **M7: Sesi Posyandu & Kehadiran (PBI-03)** | Buka/tutup sesi posyandu, pencatatan kehadiran anak tunggal/bulk, UI manajemen sesi. | Sesi dapat dibuka, daftar anak aktif muncul untuk dicatat kehadirannya. |
| **M8: Form Pengukuran & Z-Score (PBI-04)** | Form input hasil ukur 2 kolom, simpan draf, kirim pengukuran atomik, perhitungan z-score real-time, disclaimer klinis. | Kader dapat menginput BB/TB, hasil perhitungan Z-Score dan kartu indikator muncul. |
| **M9: Histori Pertumbuhan & Koreksi (PBI-06 & PBI-07)** | Transaksi revisi imutabel (`voided` + baris baru), profil anak dengan grafik kurva WHO dan grafik berat aktual, modal koreksi data. | Titik kurva tampil di grafik WHO, tombol `✎ Koreksi` menghasilkan revisi baru. |
| **M10: Monitoring & Peninjauan Hasil (PBI-08 & PBI-09)** | Antrean peninjauan bagi Petugas Puskesmas (3 keputusan), halaman baca-saja bagi Kader, halaman monitoring kelengkapan pengukuran. | Kasus stunting/flag otomatis masuk antrean petugas, kader tidak bisa memvalidasi. |
| **M11: Modul Tindak Lanjut & Notifikasi (PBI-10)** | Penugasan tugas tindak lanjut, log progres beruntun (*append-only*), penutupan tugas oleh petugas, notifikasi lonceng di topbar. | Tugas berhasil dibuat dari antrean review, kader dapat mencatat update kunjungan. |
| **M12: Dashboard & Ekspor CSV (PBI-11 & PBI-12)** | 3 grafik operasional Chart.js sesuai wilayah peran, ekspor CSV agregat aman dengan masking dinas, log audit aktivitas. | Dashboard menampilkan data akurat, tombol unduh CSV menghasilkan file terformat rapi. |
| **M13: Pengujian Menyeluruh & Verifikasi Lokal** | Pengujian alur E2E browser Playwright di localhost, verifikasi responsivitas layar (360px, 768px, 1366px), dokumentasi final. | Seluruh skenario bisnis teruji di browser lokal pengguna tanpa ada error. |

---

## 13. Panduan Menjalankan di Mesin Lokal (Untuk Pengguna & Agen)

1. **Persiapan Database**:
   - Buka Laragon, klik **Start All** (pastikan MySQL menyala di port 3306).
   - Pastikan database `tumbuhpantau` sudah dibuat di MySQL Laragon.
2. **Instalasi Dependency**:
   - Buka terminal di `C:\laragon\www\tumbuhpantau-main`:
   ```bash
   npm install
   ```
3. **Eksekusi Migrasi & Seeder Database**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. **Menjalankan Aplikasi**:
   - **Terminal 1 (Backend API)**:
     ```bash
     npm run dev:backend
     ```
     (Layanan aktif di `http://127.0.0.1:3001/api/health`)
   - **Terminal 2 (Frontend React)**:
     ```bash
     npm run dev:frontend
     ```
     (Buka di browser: `http://127.0.0.1:5173`)
5. **Menjalankan Pengujian**:
   ```bash
   npm test
   npm run check
   ```
