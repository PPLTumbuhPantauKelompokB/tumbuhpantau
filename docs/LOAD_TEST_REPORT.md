# Laporan Uji Beban (Load Testing) & Keandalan Ekspor CSV: Sprint 2 (`SCRUM-37` / `TEST-03`)

## 1. Tujuan & Kriteria Penerimaan (`TEST-03`)
Menguji ketahanan performa API backend **TumbuhPantau** dan keandalan unduhan laporan CSV agregat di bawah beban konkuren:
- **Konkurensi:** Minimal **20 Virtual Users (VUs)** berjalan secara bersamaan.
- **Skenario Uji:**
  1. Kalkulasi dan pratinjau Z-Score antropometri WHO (`POST /api/v1/measurements/preview`).
  2. Agregasi KPI dan grafik dashboard operasional (`GET /api/v1/dashboard/stats?period=2026-11`).
  3. Ekspor laporan agregat CSV UTF-8 (`GET /api/v1/reports/export-csv?period=2026-11`) beserta pencatatan `audit_logs`.
- **Target SLA:**
  - Persentil ke-95 waktu respons (**p95**) <= **2.000 ms (2 detik)**.
  - Tingkat kegagalan permintaan (`http_req_failed`) = **0%**.
  - Struktur CSV utuh tanpa korupsi baris dan bebas dari NIK atau data pribadi sensitif.

---

## 2. Artefak Skrip Uji Beban
1. **Skrip Standar Grafana k6:** `scripts/k6/sprint2-load-test.js`
   - Menjalankan skenario `ramping-vus` hingga **20 VUs** dengan ambang batas (`thresholds`) otomatis `http_req_failed: ['rate==0']` dan `http_req_duration: ['p(95)<=2000']`.
   - Cara menjalankan dengan CLI k6:
     ```bash
     k6 run scripts/k6/sprint2-load-test.js
     ```
2. **Skrip Verifikasi Konkuren Lokal (Node.js 20-VU Runner):** `scripts/k6/run-local-load-verification.js`
   - Menjalankan server Express + MySQL Laragon lokal (`127.0.0.1:3306`, database `tumbuhpantau`) dan mengeksekusi **20 Virtual Users paralel** (`Promise.all`) masing-masing 5 iterasi penuh (total **300 request HTTP** konkuren).
   - Cara menjalankan:
     ```bash
     node scripts/k6/run-local-load-verification.js
     ```

---

## 3. Hasil Pengukuran Aktual (20 VUs · 300 Request Konkuren)

Lingkungan eksekusi lokal terverifikasi:
- **Runtime:** Node.js `v24.22.0` (Windows, Laragon 6, MySQL `8.4.3`)
- **Dataset:** 60 Balita sintetis, 60 Wali, 4 Posyandu, 2 Puskesmas, 1 Dinas Kesehatan, 3 periode sesi dan pengukuran antropometri (`2026-09`, `2026-10`, `2026-11`).
- **Waktu Eksekusi Total:** `1.380,55 ms` untuk 300 request HTTP konkuren.

| Skenario Endpoint | Jumlah Request | Min (ms) | Rata-rata (ms) | Median / p50 (ms) | p95 (ms) | Maks (ms) | Target p95 | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `POST /api/v1/measurements/preview` | 100 | 8,73 | 45,25 | 38,44 | **113,90** | 115,48 | <= 2.000 ms | **LULUS** |
| `GET /api/v1/dashboard/stats` | 100 | 35,45 | 112,53 | 108,68 | **201,91** | 211,06 | <= 2.000 ms | **LULUS** |
| `GET /api/v1/reports/export-csv` | 100 | 32,98 | 101,19 | 105,40 | **184,54** | 200,71 | <= 2.000 ms | **LULUS** |
| **Agregat Keseluruhan** | **300** | **8,73** | **86,32** | **75,71** | **190,11** | **211,06** | **<= 2.000 ms** | **LULUS (0% Gagal)** |

---

## 4. Verifikasi Integritas & Keamanan CSV
Selama 100 unduhan CSV konkuren oleh 20 Virtual Users:
- **Korupsi Baris (`csvErrors`):** `0` (seluruh respons memiliki header `periode,kode_organisasi,nama_organisasi,puskesmas,balita_aktif,hadir_sesi,terukur_valid,sangat_pendek,pendek,normal,tinggi,perlu_ukur_ulang,disamarkan` dan baris data lengkap).
- **Perlindungan Data Sensitif:** `0` kebocoran NIK, nomor telepon wali, atau nama individu balita pada hasil ekspor agregat.
- **Pencatatan Audit:** Setiap ekspor laporan mencatat entri `REPORT_CSV_EXPORTED` secara atomik pada tabel `audit_logs`.
