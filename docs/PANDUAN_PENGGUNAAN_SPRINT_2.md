# Panduan Operasional & Skenario Presentasi Sprint 2: TumbuhPantau

Dokumen ini melengkapi [PANDUAN_PENGGUNAAN_SPRINT_1.md](PANDUAN_PENGGUNAAN_SPRINT_1.md) dengan panduan langkah demi langkah untuk mendemonstrasikan **20 fitur baru Sprint 2 (Operasional, Antropometri WHO, Peninjauan Puskesmas, Tindak Lanjut, Dashboard Agregat, dan Ekspor CSV)** saat presentasi dosen.

---

## 1. Ringkasan Menu Sidebar & Fitur UI/UX Baru (Sprint 1 + Sprint 2)

Seluruh akun demo menggunakan kata sandi: **`123456`**.

### Fitur Kenyamanan Antarmuka (UI/UX) Baru:
- **Pop-Up Konfirmasi Otomatis saat Simpan & Edit**: Setiap aksi simpan/edit menampilkan dialog konfirmasi di tengah layar beserta tombol pintas langkah selanjutnya.
- **Bar Panduan "Alur Cepat (Langkah 1 -> 2 -> 3 -> 4)"**: Panduan tahapan kerja interaktif di bagian atas halaman yang dapat dibuka/ditutup dengan animasi akordeon mulus lewat tombol **Panduan Alur / Sembunyikan Alur**.
- **Formulir Modal Fokus (Tanpa Bayangan Hitam)**: Form pendaftaran balita, tambah wali, buka/ubah sesi, koreksi identitas/pengukuran, dan buat tindak lanjut tampil sebagai jendela modal di tengah layar tanpa menggelapkan halaman di belakangnya.
- **Tombol Pintas 1-Klik `Hadir & Ukur` & Kalkulasi Z-Score Otomatis**: Di halaman Detail Sesi tersedia tombol **`Hadir & Ukur`**, dan di halaman Input Pengukuran grafik Z-Score WHO terhitung otomatis begitu tinggi/panjang badan diketik.
- **Mode Gelap (Dark Mode) & Mode Terang (Light Mode)**: Tombol **Gelap / Terang** tersedia di kanan atas Landing Page (`/`), Halaman Login (`/login`), dan Topbar Dashboard.
- **Simulasi Presensi Anonim Interaktif di Landing Page**: Menampilkan progres pencatatan publik tanpa mengekspos nama/data klinis balita, lengkap dengan panel **Rekapitulasi Otomatis 100%** saat mencapai `30 / 30`.

| Peran | Username Demo | Unit Kerja | Menu Navigasi di Sidebar |
| :--- | :--- | :--- | :--- |
| **Kader Posyandu** | `kader.mlt01` | Posyandu Melati 1 (`POS-MLT-01`) | **Dashboard**, **Data Balita**, **Data Wali**, **Sesi Posyandu**, **Kelengkapan Ukur**, **Peninjauan Gizi**, **Tindak Lanjut** |
| **Petugas Puskesmas** | `petugas.melati` | Puskesmas Melati (`PKM-MELATI`) | **Dashboard**, **Data Balita**, **Data Wali**, **Sesi Posyandu**, **Kelengkapan Ukur**, **Peninjauan Gizi**, **Tindak Lanjut**, **Laporan CSV**, **Log Audit** |
| **Dinas Kesehatan** | `dinas` | Dinas Kesehatan Kota (`DINKES-KOTA`) | **Dashboard**, **Laporan CSV** |
| **Administrator** | `admin` | Dinas Kesehatan Kota (`DINKES-KOTA`) | **Unit Organisasi**, **Akun Pengguna**, **Log Audit** |

---

## 2. Alur Demonstrasi Presentasi Sprint 2 (End-to-End)

### A. Skenario 1: Kader Posyandu (`kader.mlt01` / `123456`)
1. **Aktifkan Kembali Balita Nonaktif (`SCRUM-47`)**:
   - Buka menu **Data Balita (`/anak`)**, ubah filter status menjadi **Semua Status (Termasuk Nonaktif)** atau **Hanya Nonaktif**.
   - Klik tombol **Aktifkan Kembali** pada balita nonaktif (atau dari halaman **Detail Balita `/anak/:id`**). Status balita kembali menjadi `Aktif` (`inactive_on = NULL`) dan tercatat di log audit.
2. **Ubah Status Kehadiran pada Sesi Terbuka (`SCRUM-48`)**:
   - Buka menu **Sesi Posyandu (`/sesi`)**, pilih sesi yang berstatus **Terbuka (`open`)**.
   - Pada daftar kehadiran balita, klik tombol **Hadir** atau **Absen** untuk mengubah status kehadiran anak secara langsung. Jika sesi sudah `closed` atau `cancelled`, tombol pengubahan otomatis dikunci.
3. **Input Pengukuran Mode Draf, Hapus Draf, dan Kirim Atomik (`SCRUM-24, 27, 28`)**:
   - Pada baris balita yang berstatus **Hadir**, klik tombol **Catat Ukur** untuk membuka halaman **Formulir Pengukuran (`/pengukuran/:attendanceId`)**.
   - Masukkan Berat Badan (kg), Panjang/Tinggi Badan (cm), dan Posisi Ukur (`Telentang / PB` atau `Berdiri / TB`).
   - Panel **Pratinjau Kalkulasi WHO (Real-Time)** di sisi kanan langsung menghitung Usia (hari & bulan), Koreksi Posisi (`0,0 cm`, `+0,7 cm`, atau `-0,7 cm` sesuai batas 24 bulan / `731` hari), **Z-Score PB/U atau TB/U**, Kategori Pertumbuhan Permenkes No. 2/2020, serta **Disclaimer Klinis**.
   - Klik **Simpan sebagai Draf** untuk menyimpan sementara (`status = 'draft'`), atau klik **Batalkan / Hapus Draf** (`SCRUM-27`) untuk menghapus draf yang belum dikirim.
   - Klik **Kirim & Hitung Z-Score** untuk menyimpan pengukuran secara permanen (`status = 'submitted'`).
4. **Detail Pengukuran, Histori Revisi, dan Koreksi Append-Only (`SCRUM-46, 26`)**:
   - Setelah pengukuran terkirim, klik **Lihat Detail & Riwayat Versi** (`/pengukuran/detail/:id`) untuk melihat rincian lengkap satu catatan pengukuran beserta tabel rantai versi (`revision_no`, waktu ukur, status `Aktif` vs `Digantikan / Voided`, dan alasan koreksi).
   - Untuk mengoreksi kesalahan input tanpa menimpa data lama, klik **Buat Revisi Pengukuran**, isi **Alasan Koreksi** (wajib minimal 10 karakter), lalu kirim. Sistem membuat baris baru (`revision_no = 2`, `supersedes_id`) dan menandai versi sebelumnya sebagai `voided`.
5. **Grafik Kurva Pertumbuhan WHO & Berat Badan (`SCRUM-25`)**:
   - Buka halaman **Detail Balita (`/anak/:id`)**.
   - Tinjau **Grafik 1: Kurva Pertumbuhan Panjang/Tinggi Badan menurut Umur (WHO PB/U dan TB/U)** yang menampilkan 5 garis referensi (`-3 SD`, `-2 SD`, `Median`, `+2 SD`, `+3 SD`) bersama titik pengukuran aktual anak.
   - Tinjau **Grafik 2: Tren Berat Badan Aktual (BB)** dan **Tabel Riwayat Pengukuran Kronologis** di bawahnya.

---

### B. Skenario 2: Petugas Puskesmas (`petugas.melati` / `123456`)
1. **Monitoring Kelengkapan Pengukuran & Peringatan `< 80%` (`SCRUM-30`)**:
   - Buka menu **Kelengkapan Ukur (`/monitoring`)**.
   - Pilih periode bulan atau Posyandu binaan. Sistem menampilkan persentase kelengkapan pengukuran, banner peringatan jika cakupan **`< 80%`**, daftar balita yang hadir namun pengukurannya masih `draft`, serta daftar balita aktif yang belum diukur.
2. **Antrean Peninjauan Gizi & Keputusan Klinis (`SCRUM-42, 29`)**:
   - Buka menu **Peninjauan Gizi (`/peninjauan`)**.
   - Filter antrean berdasarkan Posyandu, Status Peninjauan (`Menunggu Peninjauan`, `Diminta Ukur Ulang`, `Tervalidasi`), atau Kategori WHO (`Sangat Pendek`, `Pendek`).
   - Klik **Tinjau Kasus** pada salah satu balita, pilih keputusan:
     - **Validasi & Buat Tugas Tindak Lanjut** (`confirmed` / `monitoring`),
     - **Validasi Pengukuran (Tanpa Tindak Lanjut)**, atau
     - **Minta Kader Ukur Ulang** (`flagged_for_remeasurement`).
3. **Manajemen Tugas Tindak Lanjut (`SCRUM-31, 43, 44`)**:
   - Buka menu **Tindak Lanjut (`/tindak-lanjut`)**.
   - Petugas Puskesmas dapat membuat tugas baru (**+ Buat Tindak Lanjut Baru**) dengan memilih balita, kategori intervensi (`Konseling Gizi`, `Pemberian PMT`, `Rujukan Puskesmas`, `Kunjungan Rumah`, `Pengukuran Ulang`), tenggat waktu (`due_date`), dan kader penanggung jawab.
   - Klik **Detail & Progres** (`/tindak-lanjut/:id`) untuk menambahkan catatan perkembangan lapangan *append-only* (`open` -> `in_progress`) atau menutup tugas (**Tutup Tugas Selesai**) dengan kesimpulan evaluasi wajib (`closure_note`).
4. **Log Audit Wilayah Puskesmas (`SCRUM-45`)**:
   - Buka menu **Log Audit (`/audit-log`)** dan gunakan filter Rentang Tanggal, Jenis Aksi, serta Entitas untuk mengaudit seluruh aktivitas di wilayah Puskesmas Melati.

---

### C. Skenario 3: Dashboard Agregat & Ekspor CSV (`SCRUM-32, 33`)
1. **Dashboard Agregat Multi-Tenant (`/dashboard`)**:
   - Menampilkan kartu KPI (Balita Aktif & persentase dari terdaftar, Balita Terukur Lengkap, Risiko Stunting & prevalensi, serta Tindak Lanjut Aktif/Selesai).
   - Menampilkan **3 Grafik Operasional**: Distribusi Kategori Pertumbuhan WHO, Progres Kelengkapan Sesi & Tindak Lanjut, serta **Grafik Tren Prevalensi Stunting (%)** lintas bulan.
2. **Ekspor Laporan Agregat CSV UTF-8 (`/laporan`)**:
   - Buka menu **Laporan CSV (`/laporan`)**, pilih periode bulan dan unit Posyandu, lalu klik **Unduh Laporan CSV (UTF-8)**.
   - Jika login sebagai **Dinas Kesehatan (`dinas` / `123456`)**, sel kategori sensitif bernilai `1..4` otomatis disamarkan menjadi `<5` dan tidak ada NIK atau identitas pribadi balita yang ikut terekspor.
