# Rencana & Hasil Pengujian (Test Plan): TumbuhPantau (Sprint 1 & Sprint 2)

**Status:** Seluruh pengujian unit, integrasi RBAC lintas organisasi, akurasi kalkulasi Z-Score WHO (`TEST-01`), keamanan multi-tenant (`TEST-02`), dan uji beban konkuren 20 Virtual Users (`TEST-03`) telah **diimplementasikan dan lulus 100%**.

---

## 1. Daftar Suite Pengujian Otomatis (`npm test`)

| ID Uji | Tiket Jira | Berkas Uji | Cakupan Verifikasi | Hasil Aktual |
|---|---|---|---|---|
| **TP-BASE-01** | SCRUM-5, 6 | `backend/tests/api.test.js`, `port.test.js`, `demo-data.test.js` | Validasi port, endpoint `/api/health`, info layanan `/api/v1/`, penolakan `401` dasar, dan respons `404 NOT_FOUND` terstruktur. | **PASS (10/10)** |
| **TEST-01** | **SCRUM-35** | `backend/tests/growthCalculator.test.js` | Validasi perhitungan `age_days` (`0..1826` hari), koreksi posisi `+-0,7 cm` tepat pada batas 24 bulan (`730` & `731` hari), klasifikasi Permenkes No. 2/2020, deteksi plausibilitas `\|Z\| > 6`, kurva WHO 61 titik bulan, serta **160 kombinasi uji Z-Score WHO** (0 s.d. 59 bulan, `L`/`P`, `recumbent`/`standing`) dengan deviasi absolut `<= 0.01`. | **PASS (5/5 suite · 160 kombinasi)** |
| **TEST-02** | **SCRUM-36** | `backend/tests/sprint2-integration.test.js` | Uji keamanan isolasi RBAC & lintas organisasi: penolakan `401` tanpa sesi, penolakan `403` saat Kader `POS-MLT-01` mengakses balita/sesi/pengukuran `POS-KNG-01`, penolakan `403` saat Kader mengakses antrean review Puskesmas atau log audit, penolakan `403` saat Petugas Puskesmas Melati mengakses data Puskesmas Kenanga, serta verifikasi pencatatan `ACCESS_DENIED` pada tabel `audit_logs`. | **PASS (100%)** |
| **TP-E2E-F1** | **SCRUM-47, 48, 45** | `backend/tests/sprint2-integration.test.js` | Aktivasi kembali balita nonaktif (`PATCH /children/:id/activate`), ubah status kehadiran pada sesi `open` (`PATCH /sessions/:sessionId/attendances/:id`), penolakan ubah kehadiran pada sesi `closed`, serta filter log audit (`GET /audit-logs`). | **PASS (100%)** |
| **TP-E2E-F2** | **SCRUM-24, 27, 46, 26, 25** | `backend/tests/sprint2-integration.test.js` | Simpan draf pengukuran, hapus draf (`DELETE /measurements/drafts/:id`), kirim pengukuran atomik + replay idempotensi `request_token`, penolakan hapus pengukuran `submitted`, koreksi *append-only* (`POST /measurements/:id/revisions`) + *optimistic lock* `409`, detail pengukuran & histori versi (`GET /measurements/:id`), serta riwayat pertumbuhan & kurva WHO (`GET /children/:id/growth-history`). | **PASS (100%)** |
| **TP-E2E-F345** | **SCRUM-30, 42, 29, 31, 43, 44, 32, 33** | `backend/tests/sprint2-integration.test.js` | Monitoring sesi & peringatan `< 80%`, antrean review Puskesmas, pencatatan keputusan review + pembuatan tindak lanjut otomatis, tambah progres tindak lanjut (`open` -> `in_progress`), tutup tindak lanjut (`closed`) + penolakan update setelah `closed` (`409`), statistik dashboard agregat (`/dashboard/stats`), serta ekspor CSV UTF-8 bebas NIK (`/reports/export-csv`). | **PASS (100%)** |

---

## 2. Hasil Uji Beban & Keandalan Ekspor CSV (`TEST-03` / `SCRUM-37`)

Detail lengkap tersedia di [LOAD_TEST_REPORT.md](LOAD_TEST_REPORT.md). Ringkasan hasil eksekusi **20 Virtual Users konkuren** (300 request HTTP paralel):

- **Skrip k6:** `scripts/k6/sprint2-load-test.js`
- **Runner Verifikasi Lokal:** `node scripts/k6/run-local-load-verification.js`
- **Tingkat Kegagalan (`failures`):** `0%` (`0` dari 300 request)
- **Korupsi Baris / Kebocoran Data CSV (`csvErrors`):** `0`
- **Waktu Respons Persentil ke-95 (`p95`):**
  - `POST /api/v1/measurements/preview`: **`113,90 ms`** (target `<= 2.000 ms`)
  - `GET /api/v1/dashboard/stats`: **`201,91 ms`** (target `<= 2.000 ms`)
  - `GET /api/v1/reports/export-csv`: **`184,54 ms`** (target `<= 2.000 ms`)
  - **Agregat Keseluruhan:** **`190,11 ms`** (Status: **PASS**).

---

## 3. Cara Menjalankan Seluruh Verifikasi

```bash
npm run db:check
npm run check
npm test
node scripts/k6/run-local-load-verification.js
npm run build
```
