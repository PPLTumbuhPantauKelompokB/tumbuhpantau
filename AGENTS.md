# AGENTS.md — Panduan Kerja Proyek TumbuhPantau (Sprint 1 Selesai → Aktif Sprint 2)

> **PENTING:** Repositori ini (`C:\laragon\www\tumbuhpantau-main`) adalah repositori utama yang digunakan untuk **presentasi & penilaian dosen**.  
> Proyek patokan/referensi lengkap berada di `C:\laragon\www\tumbuhpantau-benchmark`.  
> **Saat ini proyek masuk ke tahap Sprint 2 (`Sprint 2 – Operasional & Antropometri`, 20 Nov – 24 Dec).**  
> Baca detail lengkap 20 tiket Jira Sprint 2 di **`docs/SPRINT2_BACKLOG.md`** sebelum menulis atau mengubah kode.

---

## 1. Aturan Mutlak Lingkungan (100% Lokal)
- Bekerja hanya di `C:\laragon\www\tumbuhpantau-main`.
- **DILARANG KERAS** menjalankan `git push`, menambahkan remote baru, atau mengunggah kode/database ke internet.
- **Stack & Konvensi:**
  - Monorepo npm workspaces (`frontend` React/Vite + `backend` Express), JavaScript murni ESM (`"type": "module"`), **bukan TypeScript**.
  - Runtime lokal terverifikasi: Node `v24.22.0`, npm `12.2.1`, Laragon 6 dengan MySQL `8.4.3`.
- **Database MySQL Laragon:** `127.0.0.1:3306`, user `root`, password kosong `""`.
  - Database utama (`main`): `tumbuhpantau` (database uji: `tumbuhpantau_test`).
  - Database benchmark (jangan ditimpa): `tumbuhpantau_benchmark`.
- **Tanpa Data Nyata:** 100% data sintetis/fiktif.

---

## 2. Fondasi Sprint 1 yang WAJIB Dijaga (Jangan Ditimpa dari Benchmark!)
Repositori `tumbuhpantau-main` sudah merampungkan Sprint 1 (20 tiket) dan memiliki beberapa penyempurnaan yang **tidak ada secara terpisah di `tumbuhpantau-benchmark`**:
- **Frontend:** `LandingPage.jsx`, `GuardiansPage.jsx`, `GuardianDetailPage.jsx`.
- **Backend:** `guardians.routes.js`, `PATCH /api/v1/children/:id/deactivate`, `PUT /api/v1/sessions/:id`, `PATCH /api/v1/sessions/:id/cancel`.
- **Aturan Integrasi:** Saat mengadaptasi modul dari `tumbuhpantau-benchmark` ke `tumbuhpantau-main`, lakukan secara **selektif dan inkremental** — jangan menimpa file Sprint 1 secara mentah agar fitur & tampilan PosCare Sprint 1 tetap utuh.

---

## 3. Ruang Lingkup Resmi Sprint 2 (20 Tiket Jira · 115 Story Points)
Detail lengkap *User Story*, *Acceptance Criteria*, dan endpoint ada di **`docs/SPRINT2_BACKLOG.md`**. Ringkasannya:

1. **Pengukuran & Antropometri WHO (`SCRUM-24, 25, 26, 27, 28, 46`):**
   - Engine Z-Score WHO PB/U–TB/U (0–59 bulan, Permenkes No. 2/2020, koreksi posisi `±0,7 cm`, deviasi `<= 0.01`).
   - Input pengukuran mode Draf & Kirim atomik + `request_token`, pembatalan draf (`DELETE /api/v1/measurements/drafts/:id`), detail 1 pengukuran + riwayat versi (`GET /api/v1/measurements/:id`), koreksi *append-only* (`supersedes_id`, `correction_reason`, *optimistic lock*), serta tabel riwayat & grafik kurva WHO (Chart.js).
2. **Monitoring & Peninjauan Hasil Puskesmas (`SCRUM-29, 30, 42`):**
   - Monitoring balita belum diukur & draf belum final + peringatan `< 80%`.
   - Antrean peninjauan hasil antropometri & pencatatan keputusan (`confirmed`, `flagged_for_remeasurement`, `monitoring`) beserta pembuatan tindak lanjut otomatis.
3. **Tugas Tindak Lanjut (`SCRUM-31, 43, 44`):**
   - Buat tugas (`follow_ups`), tambah progres *append-only* (`follow_up_updates`), dan tutup tugas (`closed`) dengan kesimpulan evaluasi wajib.
4. **Dashboard Agregat, Ekspor CSV & Log Audit (`SCRUM-32, 33, 45`):**
   - Upgrade Dashboard ke agregat KPI & 3 grafik operasional sesuai peran/wilayah (`kader`, `petugas_puskesmas`, `dinas_kesehatan`).
   - Ekspor CSV agregat UTF-8 tanpa data sensitif/NIK + pencatatan audit log.
   - Verifikasi `GET /api/v1/audit-logs` & `AuditLogsPage.jsx` untuk akses Petugas Puskesmas (sesuai wilayah) & Administrator.
5. **Penyempurnaan Operasional Balita & Kehadiran (`SCRUM-47, 48`):**
   - Aktifkan kembali balita nonaktif (`PATCH /api/v1/children/:id/activate`).
   - Ubah status kehadiran balita selama sesi masih `open` (`PATCH /api/v1/sessions/:sessionId/attendances/:id`).
6. **Pengujian Kualitas & Keamanan (`SCRUM-35, 36, 37`):**
   - `TEST-01`: Uji validasi Z-Score WHO ≥ 50 kombinasi + edge case 24 bulan (deviasi ≤ `0.01`).
   - `TEST-02`: Uji isolasi keamanan RBAC & lintas organisasi (`401`/`403` + audit log).
   - `TEST-03`: Script load testing **k6** (≥ 20 VUs, `p95 <= 2 dtk`, ekspor CSV) + laporan hasil.

### Item Sprint 2 yang TIDAK Ada di Benchmark (Wajib Dibangun Baru)
- `SCRUM-27` (`DELETE /api/v1/measurements/drafts/:id`)
- `SCRUM-46` (`GET /api/v1/measurements/:id` + UI detail pengukuran & histori revisi)
- `SCRUM-47` (`PATCH /api/v1/children/:id/activate` + UI)
- `SCRUM-48` (`PATCH /api/v1/sessions/:sessionId/attendances/:id` + UI)
- `SCRUM-36` (Integration test RBAC & lintas organisasi)
- `SCRUM-37` (Script load testing k6 + laporan hasil)

---

## 4. Prinsip Teknis & Desain UI/UX (Gaya PosCare)
- **Otorisasi Sisi Server:** Wajib cek peran dan cakupan wilayah di middleware backend (`AccessPolicy.js`).
- **Imutabilitas Data:** Pengukuran `submitted` tidak boleh diubah/dihapus (wajib alur revisi *append-only* via `supersedes_id`). `audit_logs` dan `follow_up_updates` bersifat *append-only*.
- **Disclaimer Klinis:** Wajib tampilkan disclaimer klinis pada tampilan hasil Z-Score/antropometri.
- **Palet & Gaya UI PosCare:** Emerald Green (`#0E7C6B`), Soft Teal (`#E8F5F1`), Canvas (`#F8FAFC`), Slate (`#1E293B`), kartu statistik dengan ikon SVG `48x48px`, form rapi (modal/collapsible), status badge semantik.

---

## 5. Cara Menjalankan & Verifikasi
1. Cek koneksi database: `npm run db:check`
2. Migrasi & Seed: `npm run db:migrate` dan `npm run db:seed`
3. Jalankan Backend: `npm run dev:backend` (`http://127.0.0.1:3001`)
4. Jalankan Frontend: `npm run dev:frontend` (`http://127.0.0.1:5173`)
5. Verifikasi wajib setiap selesai fase: `npm run check`, `npm test`, dan `npm run build`
