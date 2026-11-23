# Sprint 2 Backlog & Panduan Implementasi — TumbuhPantau

> **Sumber Resmi:** Jira Board `PPL Kelompok B` — [Sprint 2 Backlog](https://tumbuhpantau.atlassian.net/jira/software/projects/SCRUM/boards/1/backlog)  
> **Nama Sprint:** Sprint 2 – Operasional & Antropometri (`20 Nov – 24 Dec`)  
> **Sprint Goal:** Implementasi operasional pencatatan pengukuran balita, kalkulasi z-score WHO PB/U-TB/U, peninjauan hasil antropometri, tindak lanjut posyandu, serta dashboard dan pelaporan agregat.  
> **Total Pekerjaan:** 20 tiket (17 Story + 3 Test Task) · 115 Story Points  
> **Repositori Utama (Presentasi Dosen):** `C:\laragon\www\tumbuhpantau-main`  
> **Repositori Referensi/Patokan:** `C:\laragon\www\tumbuhpantau-benchmark`

---

## 1. Ringkasan Pemetaan 20 Tiket Sprint 2

| # | Key | PBI / Task | Pts | Assignee | Status di `main` | Referensi di `benchmark` | Strategi Eksekusi |
|---|---|---|---:|---|---|---|---|
| 1 | SCRUM-24 | PBI-17: Catat pengukuran balita (draf & kirim) | 8 | RADITYA ADHIPRATAMA SUTOPO | Belum | Ada (`measurements.routes.js`, `MeasurementFormPage.jsx`) | Adaptasi dari benchmark |
| 2 | SCRUM-25 | PBI-18: Riwayat & kurva pertumbuhan WHO | 8 | natasyafadila | Belum | Ada (`ChildDetailPage.jsx`, `ZScoreBar.jsx`) | Adaptasi dari benchmark + Chart.js kurva WHO |
| 3 | SCRUM-26 | PBI-19: Koreksi pengukuran (*append-only*) | 5 | RADITYA ADHIPRATAMA SUTOPO | Belum | Ada (`POST /measurements/:id/revise`) | Adaptasi + dukung `/revisions` & optimistic lock |
| 4 | SCRUM-27 | PBI-20: Batalkan/hapus draf pengukuran | 3 | Nadhira Lexandrya Putri | Belum | **Tidak ada di benchmark** | **Bangun baru** (`DELETE /api/v1/measurements/drafts/:id`) |
| 5 | SCRUM-28 | PBI-21: Kalkulasi Z-Score WHO PB/U–TB/U | 13 | RADITYA ADHIPRATAMA SUTOPO | Belum | Ada (`growthCalculator.js`, `referenceService.js`, `import-who.js`) | Adaptasi & verifikasi deviasi ≤ `0.01` |
| 6 | SCRUM-29 | PBI-22: Catat keputusan peninjauan antropometri | 8 | Qizha Ahrist Alaamayanfauka | Belum | Ada (`reviews.routes.js`, `ReviewsPage.jsx`) | Adaptasi + tindak lanjut otomatis |
| 7 | SCRUM-42 | PBI-23: Antrean peninjauan hasil antropometri | 5 | Qizha Ahrist Alaamayanfauka | Belum | Ada (`reviews.routes.js`, `ReviewsPage.jsx`) | Adaptasi (`GET /api/v1/reviews/queue`) |
| 8 | SCRUM-30 | PBI-24: Monitoring balita belum diukur & draf | 5 | natasyafadila | Belum | Ada (`MonitoringPage.jsx`, `reviews.routes.js`) | Adaptasi (`GET /api/v1/sessions/:sessionId/monitoring`) |
| 9 | SCRUM-31 | PBI-25: Tambah tugas tindak lanjut | 8 | Filius Kristo Harefa | Belum | Ada (`followups.routes.js`, `FollowUpsPage.jsx`) | Adaptasi (`POST /api/v1/follow-ups`) |
| 10 | SCRUM-43 | PBI-26: Perbarui progres tugas tindak lanjut | 5 | Filius Kristo Harefa | Belum | Ada (`followups.routes.js`, `FollowUpDetailPage.jsx`) | Adaptasi (`POST /api/v1/follow-ups/:id/updates`) |
| 11 | SCRUM-44 | PBI-27: Tutup tugas tindak lanjut | 3 | Achmad Fazriel Miftahudin | Belum | Ada (`followups.routes.js`, `FollowUpDetailPage.jsx`) | Adaptasi (`PATCH /api/v1/follow-ups/:id/close`) |
| 12 | SCRUM-32 | PBI-28: Dashboard agregat operasional per peran & wilayah | 8 | mohammadilhammaulana | Sebagian (Sprint 1) | Ada (`DashboardPage.jsx`, `reports.routes.js`) | Upgrade Dashboard Sprint 1 ke agregat 3 grafik |
| 13 | SCRUM-33 | PBI-29: Ekspor laporan agregat CSV | 8 | mohammadilhammaulana | Belum | Ada (`reports.routes.js`, `ReportsPage.jsx`) | Adaptasi (`GET /api/v1/reports/export-csv`) |
| 14 | SCRUM-45 | PBI-30: Log audit aktivitas sistem | 5 | DUVALINO APRIARSYAH | **Sudah ada dasar** | Ada (`admin.routes.js`, `AuditLogsPage.jsx`) | Verifikasi filter tanggal/aksi & akses Puskesmas + Admin |
| 15 | SCRUM-46 | PBI-31: Detail satu catatan pengukuran & histori revisi | 3 | Achmad Fazriel Miftahudin | Belum | **Belum khusus** (hanya ada per `attendanceId`) | **Bangun baru** (`GET /api/v1/measurements/:id` + UI detail) |
| 16 | SCRUM-47 | PBI-32: Aktifkan kembali profil balita nonaktif | 2 | DUVALINO APRIARSYAH | Belum (baru ada `deactivate`) | **Tidak ada di benchmark** | **Bangun baru** (`PATCH /api/v1/children/:id/activate` + UI) |
| 17 | SCRUM-48 | PBI-33: Ubah status kehadiran balita pada sesi `open` | 3 | Nadhira Lexandrya Putri | Belum | **Tidak ada di benchmark** | **Bangun baru** (`PATCH /api/v1/sessions/:sessionId/attendances/:id` + UI) |
| 18 | SCRUM-35 | TEST-01: Uji deviasi numerik Z-Score WHO ≤ 0.01 (NFR-04) | 5 | RADITYA ADHIPRATAMA SUTOPO | Belum | Sebagian (`growthCalculator.test.js`) | Perluas hingga ≥ 50 kombinasi + edge case 24 bln |
| 19 | SCRUM-36 | TEST-02: Uji keamanan isolasi RBAC & antar organisasi (NFR-02) | 5 | Qizha Ahrist Alaamayanfauka | Belum | **Belum lengkap** | **Bangun baru** integration test RBAC `401`/`403` + audit log |
| 20 | SCRUM-37 | TEST-03: Load testing k6 p95 ≤ 2 dtk & ekspor CSV (NFR-06, NFR-13) | 5 | mohammadilhammaulana | Belum | **Tidak ada di benchmark** | **Bangun baru** script k6 + dokumentasi hasil uji beban |

---

## 2. Detail Spesifikasi & Acceptance Criteria per Tiket

### A. Penyempurnaan Data Balita & Sesi (Item Baru Non-Benchmark)

#### SCRUM-47 — PBI-32: Aktifkan Kembali Profil Balita Nonaktif (2 pts)
- **User Story:** Sebagai Kader Posyandu, saya ingin mengaktifkan kembali profil balita yang nonaktif, agar balita yang kembali ke Posyandu dapat dilayani lagi.
- **Acceptance Criteria:**
  - Aksi aktifkan kembali hanya tersedia untuk balita berstatus nonaktif.
  - Kolom `inactive_on` dikosongkan (`NULL`) saat balita diaktifkan kembali.
  - Riwayat pengukuran dan kehadiran lama tetap utuh.
  - Perubahan status dicatat pada `audit_logs`.
- **Teknis Backend:** `PATCH /api/v1/children/:id/activate` | Tabel: `children` (`inactive_on = NULL`), `audit_logs`.

#### SCRUM-48 — PBI-33: Ubah Status Kehadiran Balita pada Sesi (3 pts)
- **User Story:** Sebagai Kader Posyandu, saya ingin mengubah status kehadiran balita pada sesi, agar kesalahan pencatatan kehadiran dapat diperbaiki.
- **Acceptance Criteria:**
  - Perubahan status hanya diizinkan selama sesi masih berstatus `open`.
  - Perubahan menyimpan identitas pengubah dan waktu perubahan.
  - Catatan kehadiran pada sesi `closed` atau `cancelled` tidak dapat diubah.
  - Perubahan dicatat pada `audit_logs`.
- **Teknis Backend:** `PATCH /api/v1/sessions/:sessionId/attendances/:id` | Tabel: `attendances`, `audit_logs`.

---

### B. Engine Antropometri WHO & Pengukuran Balita

#### SCRUM-28 — PBI-21: Kalkulasi Z-Score PB/U–TB/U Berbasis WHO (13 pts)
- **User Story:** Sebagai Sistem, saya ingin menghitung nilai Z-Score indikator PB/U–TB/U secara otomatis berdasarkan standar rujukan WHO, sehingga status pertumbuhan anak terverifikasi secara akurat.
- **Acceptance Criteria:**
  - Mengacu pada standar antropometri WHO (Permenkes No. 2 Tahun 2020) untuk usia 0–59 bulan.
  - Menghitung usia anak dalam hari/bulan dari `birth_date` dan `measured_at`.
  - Koreksi penyesuaian panjang terhadap tinggi `0,7 cm` HANYA pada kondisi peralihan posisi sesuai WHO:
    - Anak `< 24 bulan` diukur berdiri (`standing`) → dikoreksi `+0,7 cm`.
    - Anak `>= 24 bulan` diukur terlentang (`recumbent`) → dikoreksi `-0,7 cm`.
  - Kategori antropometri presisi:
    - Sangat pendek: `Z < -3 SD`
    - Pendek: `-3 SD <= Z < -2 SD`
    - Normal: `-2 SD <= Z <= +3 SD`
    - Tinggi: `Z > +3 SD`
  - Menghasilkan `quality_status` jika nilai z-score ekstrem/mencurigakan.
  - Deviasi Z-Score maksimal `0,01` dibandingkan tabel baku WHO Anthro (NFR-04).
- **Teknis Backend:** Referensi `tumbuhpantau-benchmark/backend/src/services/growthCalculator.js`, `referenceService.js`, `scripts/import-who.js` | Tabel: `reference_versions`, `growth_assessments`. Wajib gunakan tabel referensi LMS resmi.

#### SCRUM-24 — PBI-17: Catat Pengukuran Balita — Draf & Kirim (8 pts)
- **User Story:** Sebagai Kader Posyandu, saya ingin mencatat data pengukuran balita (berat badan, panjang/tinggi badan, posisi ukur), agar hasil pengukuran tersimpan dan dapat dinilai.
- **Acceptance Criteria:**
  - Form memuat: Tanggal Ukur, Berat Badan (`kg`, presisi 2 desimal / `DECIMAL(5,2)`), Panjang/Tinggi Badan (`cm`, presisi 1 desimal / `DECIMAL(5,1)`), dan Posisi Ukur (`recumbent` / `standing`).
  - Mendukung simpan sebagai **DRAF** jika data belum lengkap (tidak menghasilkan z-score/status stunting).
  - Tombol **KIRIM** memvalidasi kelengkapan data wajib, rentang wajar, dan tanggal ukur tidak di masa depan.
  - Transaksi atomik menyimpan ke `measurements` + memicu penilaian `growth_assessments` + `audit_logs` (NFR-05).
  - Mencegah duplikasi submit via `request_token` unik (NFR-07).
- **Teknis Backend:** Draf: `POST /api/v1/attendances/:attendanceId/measurements/drafts` (dan kompatibel `/api/v1/measurements/draft`) | Kirim: `POST /api/v1/attendances/:attendanceId/measurements/submit` (dan kompatibel `/api/v1/measurements/submit`). Atribut: `revision_no = 1`, `supersedes_id = null`.

#### SCRUM-27 — PBI-20: Batalkan Draf Pengukuran (3 pts)
- **User Story:** Sebagai Kader Posyandu, saya ingin membatalkan/menghapus draf pengukuran yang belum tervalidasi, agar tidak tercampur data resmi.
- **Acceptance Criteria:**
  - Penghapusan hanya diizinkan untuk pengukuran berstatus `draft`.
  - Pengukuran berstatus `submitted` atau sudah memiliki `growth_assessments` TIDAK BOLEH dihapus (tolak HTTP `400`/`403`).
  - Draf yang dibatalkan dihapus atau ditandai `voided` dan tidak muncul lagi di form sesi.
- **Teknis Backend:** `DELETE /api/v1/measurements/drafts/:id` | Tabel: `measurements`, `audit_logs`.

#### SCRUM-46 — PBI-31: Detail Satu Catatan Pengukuran (3 pts)
- **User Story:** Sebagai Kader Posyandu, saya ingin melihat detail satu catatan pengukuran, agar dapat memverifikasi isi catatan sebelum dilaporkan.
- **Acceptance Criteria:**
  - Menampilkan tanggal ukur, berat, tinggi, posisi ukur, dan pencatat.
  - Menampilkan nomor revisi (`revision_no`) dan alasan koreksi (`correction_reason`) bila pernah direvisi.
  - Riwayat versi sebelumnya dapat dilihat tanpa mengubah data aktif.
  - Data di luar Posyandu pengguna tidak dapat diakses (`403`).
- **Teknis Backend:** `GET /api/v1/measurements/:id` | Tabel: `measurements` JOIN `growth_assessments`.

#### SCRUM-26 — PBI-19: Koreksi Pengukuran dengan Alasan Revisi (5 pts)
- **User Story:** Sebagai Petugas Puskesmas dan Kader, saya ingin mengoreksi pengukuran dengan mencatat revisi beserta alasannya, agar data terkoreksi tanpa menghapus riwayat.
- **Acceptance Criteria:**
  - Bersifat *append-only*: baris pengukuran lama TIDAK diedit/ditimpa.
  - Membuat baris baru di `measurements` dengan `supersedes_id` ke ID sebelumnya dan `revision_no + 1`.
  - Alasan koreksi (`correction_reason`) WAJIB diisi.
  - Memicu kalkulasi ulang z-score dan memperbarui antrean peninjauan hasil jika relevan.
  - Mencegah konflik revisi konkuren dengan pengecekan versi (*optimistic lock*).
- **Teknis Backend:** `POST /api/v1/measurements/:id/revisions` (alias `/revise`) | Tabel: `measurements`, `growth_assessments`, `audit_logs`.

#### SCRUM-25 — PBI-18: Riwayat & Kurva Pertumbuhan Balita (8 pts)
- **User Story:** Sebagai Kader Posyandu dan Petugas Puskesmas, saya ingin melihat riwayat dan kurva pertumbuhan balita, agar dapat memantau perkembangan anak.
- **Acceptance Criteria:**
  - Tabel kronologis pengukuran: tanggal ukur, usia (bulan), berat, tinggi, z-score, dan kategori.
  - Grafik kurva PB/U–TB/U memplot pengukuran balita terhadap garis standar WHO (`-3 SD`, `-2 SD`, `median`, `+2 SD`, `+3 SD`).
  - Grafik berat badan aktual berdasarkan rentang waktu kunjungan.
  - Jika ada revisi, grafik dan histori selalu menggunakan versi revisi terbaru yang aktif.
- **Teknis Backend:** `GET /api/v1/children/:id/growth-history` | Frontend: Chart.js + dataset kurva baku WHO.

---

### C. Monitoring Sesi & Peninjauan Hasil Puskesmas

#### SCRUM-30 — PBI-24: Monitoring Balita Belum Diukur (5 pts)
- **User Story:** Sebagai Kader Posyandu dan Petugas Puskesmas, saya ingin memantau balita yang belum diukur dan yang masih berstatus `draft` pada suatu sesi.
- **Acceptance Criteria:**
  - Daftar balita terdaftar di Posyandu yang belum memiliki kehadiran atau belum diukur pada sesi terpilih.
  - Daftar balita yang pengukurannya masih berstatus `draft`.
  - Indikator peringatan visual jika persentase kehadiran/pengukuran sesi `< 80%`.
  - Dapat difilter per sesi kegiatan dan per Posyandu.
- **Teknis Backend:** `GET /api/v1/sessions/:sessionId/monitoring` | Tabel: `children`, `attendances`, `measurements`.

#### SCRUM-42 — PBI-23: Antrean Peninjauan Hasil Antropometri (5 pts)
- **User Story:** Sebagai Petugas Puskesmas, saya ingin melihat antrean peninjauan hasil antropometri, agar tahu balita mana yang perlu ditinjau lebih dulu.
- **Acceptance Criteria:**
  - Menampilkan balita dengan kategori pendek atau sangat pendek (atau perlu verifikasi).
  - Kolom: nama balita, Posyandu, tanggal ukur, z-score, dan kategori.
  - Filter berdasarkan Posyandu dan status peninjauan.
  - Hanya mencakup wilayah kerja Puskesmas pengguna.
- **Teknis Backend:** `GET /api/v1/reviews/queue` | Hak Akses: Petugas Puskesmas.

#### SCRUM-29 — PBI-22: Catat Keputusan Peninjauan Hasil Antropometri (8 pts)
- **User Story:** Sebagai Petugas Puskesmas, saya ingin mencatat keputusan peninjauan hasil antropometri, agar hasil yang perlu perhatian segera tertangani.
- **Acceptance Criteria:**
  - Keputusan peninjauan: `confirmed` (terkonfirmasi stunting/gizi kurang), `flagged_for_remeasurement` (perlu ukur ulang), atau `monitoring` (pantau berkala).
  - Menyimpan `review_notes`, `reviewed_by`, dan `reviewed_at` di `growth_assessments`.
  - Membuat tugas tindak lanjut (`follow_ups`) otomatis jika hasil memerlukan intervensi lanjutan.
  - Dicatat ke `audit_logs`.
- **Teknis Backend:** `PATCH /api/v1/growth-assessments/:id/review` (dan/atau `POST /api/v1/reviews/:assessmentId`) | Hak Akses: Petugas Puskesmas.

---

### D. Tugas Tindak Lanjut Lapangan (Follow-Ups)

#### SCRUM-31 — PBI-25: Tambah Tugas Tindak Lanjut (8 pts)
- **User Story:** Sebagai Petugas Puskesmas dan Kader, saya ingin menambahkan tugas tindak lanjut balita yang perlu intervensi.
- **Acceptance Criteria:**
  - Membuat tugas baru di `follow_ups` dengan kategori intervensi (`Konseling Gizi`, `Pemberian PMT`, `Rujukan Puskesmas`, `Kunjungan Rumah`).
  - Status tugas: `open`, `in_progress`, `closed`.
  - Menampilkan `due_date` dan penanggung jawab tindak lanjut.
- **Teknis Backend:** `POST /api/v1/follow-ups` | Tabel: `follow_ups`, `audit_logs`.

#### SCRUM-43 — PBI-26: Perbarui Progres Tugas Tindak Lanjut (5 pts)
- **User Story:** Sebagai Petugas Puskesmas, saya ingin memperbarui progres tugas tindak lanjut, agar perkembangan penanganan balita tercatat.
- **Acceptance Criteria:**
  - Menambahkan catatan kemajuan pada `follow_up_updates`.
  - Status tugas dapat diubah dari `open` menjadi `in_progress`.
  - Menyimpan waktu dan identitas pencatat.
  - Riwayat progres bersifat *append-only* (tidak dapat diubah/dihapus).
- **Teknis Backend:** `POST /api/v1/follow-ups/:id/updates` | Tabel: `follow_up_updates`, `follow_ups`, `audit_logs`.

#### SCRUM-44 — PBI-27: Tutup Tugas Tindak Lanjut (3 pts)
- **User Story:** Sebagai Petugas Puskesmas, saya ingin menutup tugas tindak lanjut yang sudah selesai.
- **Acceptance Criteria:**
  - Penutupan wajib menyertakan kesimpulan hasil evaluasi.
  - Status berubah menjadi `closed` dan mengisi `closed_at`.
  - Tugas berstatus `closed` tidak dapat diubah progresnya.
  - Dicatat pada `audit_logs`.
- **Teknis Backend:** `PATCH /api/v1/follow-ups/:id/close` | Tabel: `follow_ups`, `audit_logs`.

---

### E. Dashboard Agregat, Laporan CSV & Log Audit

#### SCRUM-32 — PBI-28: Dashboard Agregat Operasional (8 pts)
- **User Story:** Sebagai Pengguna (Kader, Petugas Puskesmas, Dinas Kesehatan), saya ingin melihat dashboard agregat operasional sesuai peran dan wilayah.
- **Acceptance Criteria:**
  - KPI: Total balita terdaftar & persentase aktif, distribusi status pertumbuhan (Sangat Pendek, Pendek, Normal, Tinggi), jumlah tugas tindak lanjut aktif & penyelesaiannya, serta tren prevalensi stunting per bulan/triwulan.
  - Isolasi multi-tenant otomatis berdasarkan hierarki `organizations`:
    - Kader: Posyandu sendiri.
    - Petugas Puskesmas: Seluruh Posyandu di wilayah kerjanya.
    - Dinas Kesehatan: Agregat seluruh Puskesmas di kota/kabupaten.
  - Waktu pemuatan ≤ 2 detik untuk p95 (NFR-06).
- **Teknis Backend:** `GET /api/v1/dashboard/stats` (selaraskan dengan endpoint `reports.routes.js`).

#### SCRUM-33 — PBI-29: Ekspor Laporan Agregat ke CSV (8 pts)
- **User Story:** Sebagai Petugas Puskesmas dan Dinas Kesehatan, saya ingin mengekspor laporan agregat ke format CSV.
- **Acceptance Criteria:**
  - Unduhan data agregat pengukuran per periode dan per Posyandu.
  - Data disamarkan sesuai prinsip privasi (tanpa NIK dan data sensitif).
  - Format `.csv` standar UTF-8 (`Content-Type: text/csv; charset=utf-8`).
  - Aksi ekspor dicatat ke `audit_logs`.
- **Teknis Backend:** `GET /api/v1/reports/export-csv?posyanduId=&period=`.

#### SCRUM-45 — PBI-30: Log Audit Aktivitas Sistem (5 pts)
- **User Story:** Sebagai Pengguna berwenang, saya ingin melihat log audit aktivitas sistem.
- **Acceptance Criteria:**
  - Menampilkan waktu, pengguna, aksi (`CREATE`, `UPDATE`, `REVIEW`, `LOGIN`, `EXPORT`), dan entitas target.
  - Filter berdasarkan rentang tanggal (`startDate`, `endDate`) dan jenis aksi / `actorId` / `entityType`.
  - Bersifat *read-only* / *append-only* (tidak ada edit/hapus).
  - Cakupan data mengikuti wilayah kewenangan (Hak Akses: Petugas Puskesmas & Administrator).
- **Teknis Backend:** `GET /api/v1/audit-logs` (verifikasi implementasi eksisting di `admin.routes.js` & `AuditLogsPage.jsx`).

---

### F. Pengujian Kualitas & Keamanan (Tasks)

#### SCRUM-35 — TEST-01: Validasi Deviasi Z-Score WHO ≤ 0.01 (5 pts, NFR-04)
- Suite uji otomatis (`node --test`) dengan minimal **50 kombinasi data uji** (usia 0–59 bulan, L/P, posisi terlentang/berdiri).
- Deviasi mutlak vs rujukan WHO Anthro terbukti `<= 0.01`.
- Mencakup edge cases: peralihan usia 24 bulan (koreksi `±0,7 cm`) serta nilai ekstrem (`< -3 SD` dan `> +3 SD`).

#### SCRUM-36 — TEST-02: Keamanan Isolasi RBAC & Lintas Organisasi (5 pts, NFR-02)
- Kader Posyandu A ditolak (`403 Forbidden`) saat mengakses/memanipulasi data Posyandu B.
- Kader Posyandu ditolak pada endpoint peninjauan hasil & audit log Puskesmas.
- Akses tanpa sesi ditolak (`401 Unauthorized`).
- Pelanggaran otorisasi terekam di `audit_logs`.

#### SCRUM-37 — TEST-03: Load Testing k6 & Keandalan CSV (5 pts, NFR-06 & NFR-13)
- Script k6 simulasi minimal `20 VUs` bersamaan untuk pencatatan pengukuran & dashboard.
- Latensi `p95 <= 2 detik` (NFR-06).
- Ekspor CSV agregat berjalan tanpa timeout/OOM (NFR-13).
- Dokumentasi hasil uji beban disimpan di repositori (mis. `docs/LOAD_TEST_REPORT.md` & `scripts/k6/`).

---

## 3. Urutan Eksekusi yang Disarankan

1. **Fase 1 — Penyempurnaan Sprint 1 (Quick Wins):** `SCRUM-47` (aktifkan balita), `SCRUM-48` (ubah status kehadiran sesi), dan verifikasi `SCRUM-45` (audit log Puskesmas + Admin).
2. **Fase 2 — Engine WHO & Pengukuran:** `SCRUM-28` (WHO LMS calculator + import referensi), `SCRUM-24` (draf & kirim pengukuran), `SCRUM-27` (hapus draf), `SCRUM-46` (detail 1 pengukuran), `SCRUM-26` (revisi *append-only*), `SCRUM-25` (riwayat & kurva WHO Chart.js).
3. **Fase 3 — Monitoring & Peninjauan:** `SCRUM-30` (monitoring belum diukur), `SCRUM-42` (antrean peninjauan), `SCRUM-29` (keputusan peninjauan + auto follow-up).
4. **Fase 4 — Tindak Lanjut:** `SCRUM-31` (buat follow-up), `SCRUM-43` (update progres), `SCRUM-44` (tutup follow-up).
5. **Fase 5 — Dashboard Agregat & Ekspor CSV:** `SCRUM-32` (dashboard agregat per role & wilayah), `SCRUM-33` (ekspor CSV + audit log).
6. **Fase 6 — Pengujian & Verifikasi Akhir:** `SCRUM-35` (≥ 50 kasus uji WHO), `SCRUM-36` (integration test RBAC), `SCRUM-37` (script k6 + laporan uji beban), serta verifikasi `npm run check`, `npm test`, `npm run build`, dan `npm run db:check`.
