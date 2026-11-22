# Pelacakan Progress Sprint 1 & Sprint 2: TumbuhPantau (Lokal)

## 1. Sprint 1 — Fondasi, RBAC, Balita, Wali & Sesi Posyandu (20 Tiket — Selesai)

| Tiket Jira | PBI / Modul | Deskripsi | Status | Catatan / Bukti |
|---|---|---|---|---|
| **SCRUM-5** | SETUP | Menjalankan React Vite dengan Express API | done | Starter terkonfigurasi pada port 5173 dan 3001 (`scripts/dev.js`) |
| **SCRUM-6** | DB-01 | Verifikasi koneksi MySQL lokal Laragon | done | `npm run db:check` terverifikasi koneksi database `tumbuhpantau` |
| **SCRUM-7** | REQ-01 | Analisis kebutuhan dan alur posyandu | done | Dokumen spesifikasi kebutuhan dan ruang lingkup Sprint 1 |
| **SCRUM-8** | PLAN-01 | Penyusunan backlog dan alur proses Scrum | done | Board Jira SCRUM dan 20 tiket Sprint 1 terdefinisi |
| **SCRUM-11**| PBI-01 | Rancangan data organisasi dan akun pengguna | done | Skema relasi `organizations` dan `users` InnoDB (`001_init_schema.sql`) |
| **SCRUM-34**| DEC-01 | Runner migrasi SQL berversi dan skema 12 tabel InnoDB | done | `backend/scripts/migrate.js` dan skrip DDL `001_init_schema.sql` lulus migrasi |
| **SCRUM-9** | AUTH-01 | Login/logout aman dengan sesi cookie MySQL & CSRF | done | Endpoint `/auth/login`, `/auth/logout`, `/auth/me`, rate limiter, bcrypt |
| **SCRUM-10**| AUTH-01 | Pengalihan dashboard dan menu sidebar berbasis role | done | `ProtectedRoute`, `AppShell.jsx`, navigasi RBAC 4 peran |
| **SCRUM-12**| PBI-02 | Pendaftaran balita baru & generate kode internal unik | done | Endpoint `POST /api/v1/children`, format kode `${POS_CODE}-XXXX`, validasi usia < 60 bln |
| **SCRUM-13**| PBI-03 | Pencarian & daftar balita aktif dalam posyandu | done | Endpoint `GET /api/v1/children`, filter status, kata kunci, dan filter Posyandu |
| **SCRUM-14**| PBI-04 | Perbarui/koreksi identitas balita & rekam audit log | done | Endpoint `PATCH /api/v1/children/:id` dan pencatatan riwayat audit log |
| **SCRUM-15**| PBI-05 | Penonaktifan profil balita (soft delete via inactive_on) | done | Endpoint `PATCH /api/v1/children/:id/deactivate`, riwayat audit tetap tersimpan |
| **SCRUM-16**| PBI-06 | Tambah data wali balita beserta relasi pengasuhan | done | Endpoint `POST /api/v1/guardians` dan form penambahan wali |
| **SCRUM-17**| PBI-07 | Lihat detail profil wali dan daftar balita yang diasuh | done | Endpoint `GET /api/v1/guardians/:id` dan halaman `GuardianDetailPage.jsx` |
| **SCRUM-18**| PBI-08 | Ubah kontak telepon dan informasi wali | done | Endpoint `PUT /api/v1/guardians/:id` dan pencatatan audit log |
| **SCRUM-19**| PBI-09 | Kelola hubungan / lepas relasi wali balita | done | Endpoint `PATCH /api/v1/children/:id/guardian`, opsi kaitkan atau lepas wali |
| **SCRUM-20**| PBI-10 | Buka sesi Posyandu baru pada tanggal kegiatan | done | Endpoint `POST /api/v1/sessions`, status 'open', pencegahan tanggal ganda |
| **SCRUM-21**| PBI-11 | Rekapitulasi dan riwayat sesi Posyandu | done | Endpoint `GET /api/v1/sessions` dengan agregasi hadir, absen, dan sasaran balita |
| **SCRUM-22**| PBI-12 | Detail sesi dan pencatatan kehadiran anak tunggal/massal | done | Endpoint `POST /api/v1/sessions/:id/attendances` dan tombol 1-klik Hadir/Absen |
| **SCRUM-23**| PBI-13 | Penyesuaian jadwal dan pembatalan sesi Posyandu | done | Endpoint `PUT /api/v1/sessions/:id` dan `PATCH /api/v1/sessions/:id/cancel` |

---

## 2. Sprint 2 — Operasional & Antropometri (20 Tiket · 115 Story Points)

| Tiket Jira | Fase | PBI / Modul | Deskripsi | Status | Catatan / Bukti |
|---|---|---|---|---|---|
| **SCRUM-47** | Fase 1 | PBI-32 | Aktifkan kembali profil balita nonaktif (`inactive_on = NULL`) | done | `PATCH /api/v1/children/:id/activate`, tombol UI di `ChildrenPage.jsx` & `ChildDetailPage.jsx`, audit log `CHILD_ACTIVATED` |
| **SCRUM-48** | Fase 1 | PBI-33 | Ubah status kehadiran balita pada sesi `open` | done | `PATCH /api/v1/sessions/:sessionId/attendances/:id`, tolak sesi `closed`/`cancelled`, UI `SessionDetailPage.jsx`, audit log `ATTENDANCE_UPDATED` |
| **SCRUM-45** | Fase 1 | PBI-30 | Log audit aktivitas sistem dengan filter tanggal, aksi & entitas | done | `GET /api/v1/audit-logs` & `AuditLogsPage.jsx` untuk Petugas Puskesmas (sesuai wilayah) & Administrator |
| **SCRUM-28** | Fase 2 | PBI-21 | Kalkulasi Z-Score WHO PB/U-TB/U (0-59 bln, Permenkes 2/2020) | done | `growthCalculator.js`, `referenceService.js`, `import-who.js` (koreksi `+-0,7 cm`, `quality_status`, disclaimer klinis) |
| **SCRUM-24** | Fase 2 | PBI-17 | Catat pengukuran balita (mode draf & kirim atomik) | done | `POST /measurements/draft` & `/attendances/:id/measurements/drafts`, `POST /measurements/submit` & `/attendances/:id/measurements/submit`, `MeasurementFormPage.jsx` |
| **SCRUM-27** | Fase 2 | PBI-20 | Batalkan/hapus draf pengukuran (`DELETE /measurements/drafts/:id`) | done | `DELETE /api/v1/measurements/drafts/:id`, tolak `submitted`, tombol UI & audit log `MEASUREMENT_DRAFT_DELETED` |
| **SCRUM-46** | Fase 2 | PBI-31 | Detail satu catatan pengukuran & histori revisi (`GET /measurements/:id`) | done | `GET /api/v1/measurements/:id` & halaman `MeasurementDetailPage.jsx` (`/pengukuran/detail/:id`) terisolasi per Posyandu |
| **SCRUM-26** | Fase 2 | PBI-19 | Koreksi pengukuran *append-only* dengan *optimistic lock* | done | `POST /api/v1/measurements/:id/revisions` & `/revise`, `supersedes_id`, `correction_reason` wajib, `expected_revision_no` |
| **SCRUM-25** | Fase 2 | PBI-18 | Riwayat & kurva pertumbuhan WHO Chart.js | done | `GET /api/v1/children/:id/growth-history` & `ChildDetailPage.jsx` (kurva WHO `-3SD`..`+3SD` + grafik BB aktual) |
| **SCRUM-30** | Fase 3 | PBI-24 | Monitoring balita belum diukur & draf (`< 80%` warning) | done | `GET /api/v1/sessions/:sessionId/monitoring` & `/monitoring/completeness`, `MonitoringPage.jsx` |
| **SCRUM-42** | Fase 3 | PBI-23 | Antrean peninjauan hasil antropometri Puskesmas | done | `GET /api/v1/reviews/queue` & `/reviews`, filter Posyandu/kategori/status di `ReviewsPage.jsx` |
| **SCRUM-29** | Fase 3 | PBI-22 | Catat keputusan peninjauan & buat tindak lanjut otomatis | done | `PATCH /api/v1/growth-assessments/:id/review` & `POST /reviews/:id/decision`, keputusan `confirmed`/`flagged_for_remeasurement`/`monitoring` |
| **SCRUM-31** | Fase 4 | PBI-25 | Tambah & lihat tugas tindak lanjut (`follow_ups`) | done | `GET/POST /api/v1/follow-ups`, kategori intervensi, `due_date`, penanggung jawab di `FollowUpsPage.jsx` |
| **SCRUM-43** | Fase 4 | PBI-26 | Perbarui progres tugas tindak lanjut *append-only* | done | `POST /api/v1/follow-ups/:id/updates`, transisi `open` -> `in_progress`, `FollowUpDetailPage.jsx` |
| **SCRUM-44** | Fase 4 | PBI-27 | Tutup tugas tindak lanjut dengan kesimpulan evaluasi wajib | done | `PATCH /api/v1/follow-ups/:id/close` (& alias `POST`), isi `closed_at` & `closure_note`, tolak update jika `closed` |
| **SCRUM-32** | Fase 5 | PBI-28 | Dashboard agregat operasional per peran & wilayah | done | `GET /api/v1/dashboard/stats` & `/dashboard/summary`, `DashboardPage.jsx` (KPI, distribusi WHO, tren prevalensi stunting) |
| **SCRUM-33** | Fase 5 | PBI-29 | Ekspor laporan agregat ke CSV UTF-8 + audit log | done | `GET /api/v1/reports/export-csv` & `/reports/aggregate/export`, `ReportsPage.jsx`, audit log `REPORT_CSV_EXPORTED` |
| **SCRUM-35** | Fase 6 | TEST-01 | Validasi deviasi numerik Z-Score WHO <= 0.01 (>= 50 kombinasi) | done | `backend/tests/growthCalculator.test.js` (160 kombinasi uji 0-59 bln, L/P, posisi, edge case 24 bln, deviasi <= 0.01) |
| **SCRUM-36** | Fase 6 | TEST-02 | Integration test isolasi RBAC & lintas organisasi (`401`/`403` + audit) | done | `backend/tests/sprint2-integration.test.js` (isolasi RBAC, lintas Posyandu/Puskesmas `401`/`403`, audit log `ACCESS_DENIED`) |
| **SCRUM-37** | Fase 6 | TEST-03 | Load testing k6 (`>= 20 VUs`, `p95 <= 2 dtk`) & laporan uji beban | done | `scripts/k6/sprint2-load-test.js`, `scripts/k6/run-local-load-verification.js`, `docs/LOAD_TEST_REPORT.md` (`p95 = 190.11 ms`) |

---

## Verifikasi Pengujian

1. **Migrasi Basis Data**: `npm run db:migrate` berhasil menjalankan `001_init_schema.sql` (12 tabel InnoDB).
2. **Data Benih (Seeder)**: `npm run db:seed` berhasil mengisi 1 Dinkes, 2 Puskesmas, 4 Posyandu, 8 Akun Pengguna (password `123456`), 60 Balita, 60 Wali, 3 periode Sesi Posyandu, Kehadiran, Pengukuran Antropometri WHO, Peninjauan Puskesmas, dan Tugas Tindak Lanjut.
3. **Uji Otomatis Unit & Integrasi**: `npm test` menjalankan 19 skenario pengujian (termasuk `TEST-01` 160 kombinasi Z-Score WHO dan `TEST-02` integrasi RBAC & alur E2E Sprint 2) dengan status lulus 100%.
4. **Uji Beban (`TEST-03`)**: 20 Virtual Users konkuren (300 request) menghasilkan `p95 = 190,11 ms` (`<= 2.000 ms`) dengan tingkat kegagalan `0%`.
5. **Pemeriksaan Sintaks**: `npm run check` lulus memeriksa 35 berkas kode JavaScript backend.
6. **Kompilasi Antarmuka & Peningkatan UI/UX**: `npm run build` berhasil mem-bundle aset produksi frontend tanpa galat, mencakup:
   - Pop-up dialog konfirmasi otomatis saat Simpan & Edit disertai tombol pintas langkah berikutnya (`frontend/src/api/client.js` & `frontend/src/components/AppShell.jsx`).
   - Bar panduan **Alur Cepat (Langkah 1 -> 2 -> 3 -> 4)** dengan animasi akordeon mulus (`frontend/src/components/AppShell.jsx`).
   - Formulir tambah & edit berbasis modal fokus tanpa bayangan hitam (*no dark backdrop*).
   - Tombol pintas 1-klik **`Hadir & Ukur`** pada detail sesi dan pratinjau Z-Score WHO otomatis secara *real-time*.
   - Pengubah **Mode Gelap (Dark Mode) & Mode Terang (Light Mode)** di Landing Page, Login Page, dan Topbar Dashboard.
   - Estetika **Gradient PosCare (Emerald Green & Soft Teal)**, animasi transisi halaman *staggered cascade*, widget simulasi presensi anonim interaktif di Landing Page, serta skrip *rollback* tampilan (`npm run ui:restore-gradient` dan `npm run ui:restore`).
