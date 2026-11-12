# AGENTS.md — Panduan Kerja OpenCode (Sprint 1 TumbuhPantau)

> **PENTING:** Proyek ini adalah repositori presentasi **Sprint 1**.  
> Proyek referensi/benchmark yang sudah lengkap berada di: `C:\laragon\www\tumbuhpantau-benchmark`.  
> Jadikan folder benchmark tersebut sebagai acuan implementasi, namun **batasi ruang lingkup hanya untuk fitur-fitur SPRINT 1**.

---

## 1. Aturan Lingkungan (100% Lokal)
- Bekerja hanya di `C:\laragon\www\tumbuhpantau-main`.
- **DILARANG KERAS** menjalankan `git push` atau mengunggah data/kode ke internet.
- Database: MySQL Laragon `127.0.0.1:3306`, user `root`, password kosong `""`.
  - Database proyek ini: `tumbuhpantau` (atau `tumbuhpantau_sprint1`).
  - Database proyek benchmark: `tumbuhpantau_benchmark`.

---

## 2. Ruang Lingkup Resmi Sprint 1 (Berdasarkan Jira Board `SCRUM`)

Sprint 1 mencakup 20 tiket Jira berikut:
1. **Fondasi & Database (SCRUM-5, 6, 7, 8, 11, 34)**:
   - Inisialisasi skema 12 tabel InnoDB (`organizations`, `users`, `guardians`, `children`, `posyandu_sessions`, `attendances`, `measurements`, `growth_assessments`, `follow_ups`, `follow_up_updates`, `audit_logs`, `reference_versions`).
   - Runner migrasi `backend/scripts/migrate.js` dan skrip DDL `001_init_schema.sql`.
   - Seeder data dasar Sprint 1 (`backend/scripts/seed.js`): Akun organisasi, akun pengguna semua role, data posyandu, data balita awal & wali.
2. **Autentikasi & Pengalihan Peran / RBAC (AUTH-01 | SCRUM-9 & 10)**:
   - Sesi cookie MySQL (`express-session` + `express-mysql-session`), CSRF token, rate limiter login, hashing bcrypt.
   - Endpoint: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
   - Frontend: `LoginPage.jsx` (dengan tombol cepat akun demo), `AuthContext.jsx`, `AppShell.jsx` (sidebar dinamis per role), navigasi terlindungi (`RequireRole` / `ProtectedRoute`), redirect login sesuai role.
3. **Pengelolaan Data Balita & Wali (PBI-02 s.d. PBI-09 | SCRUM-12 s.d. 19)**:
   - Pendaftaran balita baru dengan generator `internal_code` otomatis unik (`POST /api/v1/children`).
   - Validasi usia (< 60 bulan) dan deteksi duplikasi (nama & tgl lahir mirip).
   - Pencarian & daftar balita aktif dalam posyandu (`GET /api/v1/children`).
   - Detail profil balita & riwayat identitas (`GET /api/v1/children/:id`).
   - Ubah/koreksi data identitas balita & pencatatan audit log (`PUT/PATCH /api/v1/children/:id`).
   - Penonaktifan profil balita (*soft-delete* via `inactive_on`) tanpa menghapus riwayat (`PATCH /api/v1/children/:id/deactivate`).
   - Pengelolaan data orang tua/wali: tambah wali, lihat profil wali, ubah kontak wali, dan lepas relasi wali.
4. **Pengelolaan Sesi Kegiatan Posyandu (PBI-10 s.d. PBI-13 | SCRUM-20 s.d. 23)**:
   - Buka sesi Posyandu baru pada tanggal kegiatan (`POST /api/v1/sessions`).
   - Pencegahan sesi ganda pada tanggal yang sama.
   - Daftar riwayat dan rekapitulasi sesi Posyandu (`GET /api/v1/sessions`).
   - Detail sesi dan pencatatan kehadiran anak tunggal/massal (`POST /api/v1/sessions/:id/attendances`).
   - Penyesuaian jadwal sesi selama status masih `open` (`PUT /api/v1/sessions/:id`).
   - Pembatalan sesi kegiatan Posyandu (`PATCH /api/v1/sessions/:id/cancel`).

---

## 3. Batasan Khusus Sprint 1 (Jangan Diimplementasikan di UI Sekarang — Ini Ruang Lingkup Sprint 2)
- **Kalkulasi Z-Score WHO PB/U-TB/U & Grafik Kurva WHO (SCRUM-24, 25, 28)**: Disimpan untuk Sprint 2.
- **Antrean Peninjauan Hasil Puskesmas (SCRUM-29)**: Disimpan untuk Sprint 2.
- **Tugas Tindak Lanjut Lapangan (SCRUM-31)**: Disimpan untuk Sprint 2.
- **Dashboard 3 Grafik Operasional & Ekspor CSV (SCRUM-32, 33)**: Disimpan untuk Sprint 2.
- Di Sprint 1, dashboard menampilkan ringkasan operasional data anak & sesi yang relevan dengan Sprint 1.

---

## 4. Desain UI/UX (Gaya PosCare)
- Mengadopsi tata letak bersih dan ramah pengguna sesuai referensi PosCare:
  - Palet warna: Emerald Green (`#0E7C6B`), Soft Teal (`#E8F5F1`), Canvas (`#F8FAFC`), Slate (`#1E293B`).
  - Kartu statistik dengan kotak ikon SVG `48x48px` berlatar warna lembut di sisi kiri.
  - Form pendaftaran balita dan form buka sesi dibuat rapi (bisa dalam modal atau kartu collapsible agar tidak memenuhi layar).
  - Tabel menggunakan visual ringkas, status badge semantik (warna lembut + teks), dan tombol aksi yang jelas.

---

## 5. Cara Menjalankan & Verifikasi
1. Backend: `npm run dev:backend` (port 3001)
2. Frontend: `npm run dev:frontend` (port 5173)
3. Tes: `npm test` dan `npm run check`
