# Audit starter TumbuhPantau · 30 Oktober 2026

**Kesimpulan.** Starter sudah memiliki aplikasi presentasi dan API demo yang terpisah. Tidak satu pun dari 12 PBI telah memenuhi kriteria penerimaan produk. Bukti eksekusi ada di SETUP_VERIFICATION.md. Audit memakai ZIP v0.1, README, keenam dokumen di docs/, manifest workspace, konfigurasi, source dan test, serta Bab 2–5 proposal. Pedoman AI dan pembagian tugas kelas tetap merujuk Bab 6.

## Dari kode ke arsitektur

| Lapisan | Ditemukan | Masih rancangan |
|---|---|---|
| Presentasi | main.jsx memuat React dan Bootstrap. App.jsx mengambil dua JSON melalui proxy Vite, mengganti angka dengan tanda kosong jika gagal. CSS memiliki tata letak responsif. | Form, grafik pertumbuhan dan tiga dashboard sesuai peran. Delapan kartu modul adalah pilihan dari backlog. |
| Aplikasi | Express memisahkan app dan listener, menyediakan GET /api/health, GET /api/demo/overview, JSON 404 dan fixture yang disalin per respons. | Modul domain, controller/service/repository, sesi, otorisasi, transaksi dan audit. Arsitektur tujuan tetap modular monolith. |
| Data | mysql2, contoh konfigurasi tanpa password dan skrip SELECT 1 opsional. | Seluruh 12 tabel, migrasi, seed sintetis, backup dan pemulihan. API demo tidak mengakses MySQL. |
| Tooling | npm workspaces, .nvmrc, .gitignore, skrip build/check/test. | ZIP asal tanpa lockfile, riwayat Git, remote maupun workflow CI aktif. Lockfile kini disertakan. |

## Keterlacakan proposal Bab 3.1

Semua baris berikut masih direncanakan. AUTH-01 adalah prasyarat terpisah dari 12 PBI.

| FR | Backlog | Bukti yang kelak diperlukan |
|---|---|---|
| FR-01 | AUTH-01 | Login/logout, penolakan akun nonaktif, pesan generik |
| FR-02 | PBI-01 | Admin mengelola organisasi, akun, peran dan cakupan dengan audit |
| FR-03 | PBI-02 | Anak/wali dalam wilayah, peringatan duplikat dan riwayat |
| FR-04 | PBI-03 | Satu kehadiran per anak per sesi, sesi dapat ditutup |
| FR-05 | PBI-04 | Simpan draf, validasi dan pengiriman lengkap |
| FR-06 | PBI-05 | Penilaian PB/U–TB/U dapat dibandingkan terhadap rujukan |
| FR-07 | PBI-06 | Tabel/grafik merujuk pengukuran dan versi yang sesuai |
| FR-08 | PBI-09 | Bedakan belum diukur dari hadir dengan isian belum lengkap |
| FR-09 | PBI-08 | Keputusan dan identitas petugas peninjau tersimpan |
| FR-10 | PBI-10 | Tugas operasional kader, penugasan dan penutupan sesuai kewenangan |
| FR-11 | PBI-11 | Tiga grafik dan agregasi sesuai peran dan wilayah |
| FR-12 | PBI-12 | CSV agregat sesuai filter dan dashboard |
| FR-13 | PBI-12 | Audit aksi penting, termasuk ekspor, tanpa fasilitas edit |
| FR-14 | PBI-07 | Revisi beserta alasan, hitung ulang dan versi lama utuh |

Empat peran ada dalam desain saja. Kader bekerja dalam Posyandu sendiri. Petugas Puskesmas meninjau dalam wilayahnya. Dinas menerima agregat wilayah. Administrator mengelola akun dan organisasi tanpa akses klinis otomatis. Dua endpoint publik sekarang hanya memberi status dan fixture sintetis.

## Kualitas · Bab 3.2

| ID | Target dan status pada starter |
|---|---|
| NFR-01 | HTTPS demo, hash, pembatasan login dan kedaluwarsa setelah 30 menit tidak aktif belum diuji. |
| NFR-02 | Isolasi peran dan lintas organisasi belum dapat diuji. |
| NFR-03 | Fixture sintetis, contoh konfigurasi tanpa rahasia dan aturan ignore tersedia. Riwayat repo publik tidak tersedia untuk diaudit. |
| NFR-04 | Deviasi z-score maksimum 0,01 dan seluruh kategori batas cocok. Belum ada algoritma/fixture pembanding. |
| NFR-05 | Transaksi pengukuran, penilaian dan audit belum tersedia. |
| NFR-06 | Belum ada uji 1.000 anak, 12.000 pengukuran, 20 pengguna, p95 ≤2 detik dan ekspor ≤10 detik. |
| NFR-07 | Idempotensi dan konflik edit belum tersedia. |
| NFR-08 | Keberhasilan ≥90% tanpa bantuan setelah orientasi belum diukur. |
| NFR-09 | CSS responsif dan teks status tersedia. Hasil pemeriksaan demo ada di SETUP_VERIFICATION.md. Alur produk dan aksesibilitas lengkap belum diuji. |
| NFR-10 | Belum ada audit aktor, waktu, tindakan dan objek. |
| NFR-11 | README, test dasar dan lockfile tersedia. Tes perhitungan dan otorisasi masih menunggu modulnya. |
| NFR-12 | Backup terenkripsi harian, RPO ≤24 jam dan RTO ≤4 jam belum disimulasikan. |
| NFR-13 | Belum diuji dengan 10.000 anak, 120.000 pengukuran dan 20 pengguna untuk p95 ≤3 detik. |
| NFR-14 | CSV belum tersedia. Aturan kelompok kecil dan kombinasi filter belum diputuskan. |

## ERD, batas MVP dan keputusan yang memengaruhi implementasi

Proposal §4.3 menetapkan organizations → users/guardians/children/posyandu_sessions. Anak dan sesi bertemu di attendances. Setiap kehadiran dapat memiliki beberapa versi measurements. Setiap versi memiliki maksimal satu growth_assessments dengan reference_versions. follow_ups terhubung ke anak dan opsional ke assessment, lalu memiliki follow_up_updates. audit_logs mencatat perubahan. Ke-12 entitas baru ada di dokumen.

- Saat menyusun migrasi, gunakan ERD lengkap. Ringkasan SDD melewatkan children.guardian_relationship dan measurements.created_at. Organisasi akar boleh tanpa induk. FK proposal membatasi ON UPDATE dan ON DELETE dengan NO ACTION.
- Stack implementasi mengikuti handoff. Penyelarasan proposal dan persetujuan akademik tetap perlu dicatat terpisah. SDD dan catatan ADR telah diselaraskan untuk keputusan stack dan endpoint demo yang benar-benar ada.
- PBI-04 dan PBI-05 saling terkait. Draf dapat dibangun dahulu. Submit lengkap menunggu perhitungan tervalidasi dan transaksi audit. Bab 5 proposal memang membagi pekerjaan itu ke Sprint 3 dan 4. Mulai audit saat fitur mutasi pertama, meskipun pelaporan audit ada di PBI-12.
- FR-10 membolehkan kader membuat tugas pengukuran operasional. Matriks peran SDD hanya menyebut pembaruan tugas kader. Tegaskan perbedaannya dengan tindak lanjut hasil peninjauan sebelum merancang otorisasi.
- MVP mencakup anak 0–59 bulan saat diukur dan satu Posyandu per anak selama pilot. Berat aktual boleh digrafikkan. Kategori otomatis dibatasi pada PB/U–TB/U. Diagnosis, prediksi medis, akun orang tua, sinkronisasi offline dan integrasi eksternal berada di luar MVP.
- Vite meneruskan /api ke port 3001 secara tetap. Gunakan port default untuk demo. Jika diganti, target proxy juga harus sama. Build statis memerlukan routing /api tersendiri bila kelak dipasang di hosting.
- Middleware kesalahan Express menyamaratakan error parser JSON menjadi 500. Sebelum endpoint tulis tersedia, bedakan JSON rusak dan payload terlalu besar dari kesalahan internal, lalu uji status dan pesan aman. Tidak menghalangi demo GET.
