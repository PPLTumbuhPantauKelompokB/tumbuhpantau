# Panduan Operasional Sistem TumbuhPantau (Sprint 1)

Dokumen ini adalah panduan operasional resmi yang disusun **persis sesuai antarmuka dan alur sistem riil** yang telah diimplementasikan pada proyek `tumbuhpantau-main`.

---

## 1. Akun Pengguna & Hak Akses Nyata

Masuk ke sistem menggunakan **Username** (bukan email) dan **Password**. Seluruh akun demo menggunakan sandi: `123456`.

| Peran | Username | Akses Unit Kerja | Menu yang Muncul di Sidebar |
| :--- | :--- | :--- | :--- |
| **Kader Posyandu** | `kader.mlt01` | Posyandu Melati 01 | **Dashboard Posyandu**, **Data Balita**, **Data Orang Tua / Wali**, **Sesi & Kehadiran** |
| **Petugas Puskesmas** | `petugas.melati` | Puskesmas Melati | **Dashboard Wilayah**, **Data Balita**, **Data Orang Tua / Wali**, **Sesi Posyandu**, **Log Audit** |
| **Dinas Kesehatan** | `dinas` | Dinas Kesehatan Kab. | **Dashboard Wilayah**, **Unit Organisasi** |
| **Administrator** | `admin` | Tingkat Sistem | **Unit Organisasi**, **Akun Pengguna**, **Log Audit Sistem** |

*(Di halaman `/login` tersedia 4 tombol pintas: **Kader**, **Petugas**, **Dinas**, dan **Admin** yang langsung mengisi username dan sandi secara otomatis).*

---

## 2. Alur Operasional Nyata (Hari H Posyandu)

Berikut urutan penggunaan aplikasi yang dapat dicoba saat demonstrasi ke dosen:

```
[1. Login] ───────────────► Klik tombol cepat "Kader" (kader.mlt01 / 123456)
     │
     ▼
[2. Dashboard] ───────────► Tinjau 4 kartu metrik (Balita Aktif, Wali, Sesi Terbuka, Kehadiran %)
     │
     ▼
[3. Registrasi Balita] ───► Menu "Data Balita" -> "+ Daftar Balita Baru" (Kode dibuat otomatis)
     │
     ▼
[4. Profil & Relasi Wali] ► Menu "Data Balita" -> Klik "Detail" -> Tautkan / Ganti Wali Pengasuh
     │
     ▼
[5. Buka Sesi Posyandu] ──► Menu "Sesi & Kehadiran" -> "+ Buka Sesi Baru" (Pilih tanggal)
     │
     ▼
[6. Catat Presensi] ──────► Klik "Buka Presensi" -> Klik tombol "Hadir" / "Absen" per anak
     │                      (atau tombol massal "Tandai Semua Hadir")
     ▼
[7. Tutup Sesi] ──────────► Klik tombol "Tutup Sesi Selesai" jika kegiatan posyandu telah rampung
     │
     ▼
[8. Supervisi & Audit] ───► Login sebagai Petugas (petugas.melati) atau Admin (admin)
                            untuk melihat Log Audit Aktivitas
```

---

## 3. Detail Setiap Halaman & Formulir Sesuai Sistem Riil

### A. Landing Page Utama (`/`)
- **Tampilan**: Halaman landing publik yang intuitif dan profesional dengan palet Emerald Green TumbuhPantau.
- **Bagian-bagian Halaman**:
  1. **Top Navbar**: Logo resmi TumbuhPantau, tautan navigasi (`Alur Pelayanan`, `Fitur Unggulan`, `Akses Peran`, `Spesifikasi Teknis`), serta tombol aksi **Masuk ke Sistem**.
  2. **Hero Section**: Judul utama, ringkasan manfaat, metrik faktual (12 Tabel InnoDB, 4 Peran Pengguna, Validasi WHO 0-59 bulan), dan **Interactive App Mockup Frame** yang menampilkan simulasi sesi dan presensi kehadiran nyata.
  3. **Alur Pelayanan**: Tiga langkah operasional posyandu (Pendaftaran & Kode Unik, Buka Sesi, Presensi 1-Klik).
  4. **Fitur Unggulan**: Kartu fungsionalitas Sprint 1 (Generator kode otomatis, manajemen wali, presensi cepat, soft-delete aman, deteksi duplikasi, dan log audit).
  5. **Akses Peran**: Penjelasan peran Kader, Petugas Puskesmas, Dinkes, dan Administrator beserta username demo masing-masing.
  6. **Spesifikasi Teknis**: Penjelasan arsitektur data dan keamanan sistem.
  7. **CTA Banner**: Ajakan masuk ke portal sistem.
  8. **Footer**: Navigasi internal dan informasi hak cipta.

### B. Halaman Masuk (`/login`)
- **Tampilan**: Form login dengan kolom Username, Password, toggle lihat sandi, serta 4 tombol demo cepat (`Kader`, `Petugas`, `Dinas`, `Admin`).
- **Aksi**:
  - Klik tombol **Kader**, lalu klik **Masuk ke Sistem**.
  - Sistem mengarahkan Kader ke `/dashboard`.
  - Jika masuk sebagai `admin`, sistem langsung mengarahkan ke `/organisasi`.

---

### B. Dashboard Operasional (`/dashboard`)
- **Tampilan**:
  - Header ucapan selamat datang: Nama kader, unit kerja (`Posyandu Melati 01`), dan perannya.
  - Dua tombol aksi cepat: **Daftar Balita Baru** (langsung ke `/anak`) dan **Buka Sesi Posyandu** (langsung ke `/sesi`).
  - **4 Kartu Statistik**:
    1. *Balita Aktif Terdaftar* (ikon anak hijau).
    2. *Wali Terdaftar* (ikon orang biru).
    3. *Sesi Kegiatan Terbuka* (ikon kalender kuning).
    4. *Tingkat Kehadiran (%)* (ikon perisai hijau).
  - **Kartu Sesi Terbuka Hari Ini**: Jika ada sesi yang berstatus `open`, muncul kartu ringkas beserta tombol **Masuk ke Pencatatan Kehadiran**.
  - **Kotak Panduan Kader**: Langkah kerja operasional Posyandu.

---

### C. Data Balita (`/anak`)
- **Daftar & Filter**:
  - Input pencarian: mencari balita berdasarkan Nama, Kode Unik internal, atau Nama Wali.
  - Filter Status: `Balita Aktif (Default)` atau `Semua Status (Termasuk Nonaktif)`.
- **Form Pendaftaran Balita Baru** (Klik tombol **Daftar Balita Baru**):
  - *Nama Lengkap Balita* (wajib, contoh: `Arka Pratama`).
  - *Tanggal Lahir* (wajib, sistem memvalidasi usia harus 0-59 bulan).
  - *Jenis Kelamin* (pilihan: `Laki-laki (L)` atau `Perempuan (P)`).
  - *Nama Orang Tua / Wali* (wajib, contoh: `Ibu Wulandari`).
  - *Hubungan Pengasuh* (pilihan: `Ibu Kandung`, `Ayah Kandung`, `Nenek / Kakek`, `Wali Lainnya`).
  - *No. Telepon Wali* (opsional, contoh: `0812-3456-7890`).
  - Klik **Simpan Balita**.
- **Fitur Deteksi Duplikat**:
  - Jika nama dan tanggal lahir balita serupa dengan data yang sudah terdaftar, muncul banner kuning: *Peringatan Kemungkinan Data Duplikat*.
  - Kader dapat memilih **Tetap Simpan (Balita Berbeda)** jika memang anak kembar/berbeda, atau **Periksa Kembali** untuk membatalkan.
- **Hasil**: Kode internal posyandu otomatis terbit (misal: `MEL-0061`) dan balita langsung masuk ke tabel.

---

### D. Detail Balita (`/anak/:id`)
- **Kartu Identitas Balita**: Menampilkan Nama, Kode Internal, Usia dalam bulan, Jenis Kelamin, Tanggal Lahir, Posyandu, dan Status (Aktif/Nonaktif).
- **Aksi Identitas**:
  - **Edit Data Balita**: Membuka form edit untuk mengubah nama balita, nama wali, hubungan, dan nomor telepon.
  - **Nonaktifkan Balita**: Melakukan soft-delete jika anak pindah domisili atau lulus balita (status menjadi `Nonaktif`, tanggal `inactive_on` tercatat, data riwayat tetap aman).
  - **Aktifkan Kembali**: Mengembalikan status balita menjadi aktif jika diperlukan.
- **Kartu Relasi Orang Tua / Wali**:
  - Menampilkan wali yang terhubung secara database.
  - Terdapat dropdown untuk memilih wali dari daftar orang tua yang ada di posyandu tersebut, memilih hubungan pengasuh, lalu klik **Kaitkan Wali**.
  - Tombol **Lepas Hubungan** untuk mencopot keterikatan wali dari balita bersangkutan tanpa menghapus data profil wali.
- **Tabel Riwayat Kehadiran**: Menampilkan daftar sesi posyandu yang pernah dihadiri balita ini beserta tanggal dan status kehadirannya.

---

### E. Data Orang Tua & Wali (`/wali`)
- **Daftar & Pencarian**: Mencari orang tua berdasarkan nama, telepon, atau alamat.
- **Form Tambah Wali** (Klik tombol **+ Tambah Orang Tua / Wali**):
  - *Nama Lengkap Wali* (wajib).
  - *Nomor Telepon / WhatsApp* (opsional, contoh: `081234567890`).
  - *Alamat Tempat Tinggal* (opsional, contoh: `RT 02 / RW 01 Dusun Krajan`).
  - Klik **Simpan Orang Tua / Wali**.
- **Tabel Wali**: Menampilkan Nama, Posyandu, Kontak, Alamat, dan Jumlah Balita yang Diasuh. Klik tombol **Lihat Profil** untuk melihat detail.

---

### F. Detail Profil Wali (`/wali/:id`)
- Menampilkan profil lengkap wali.
- Tombol **Ubah Kontak / Data** untuk memperbarui nama, nomor telepon, atau alamat jika ada perubahan.
- **Tabel Daftar Balita yang Diasuh**: Menampilkan seluruh anak asuh dari wali tersebut dengan link langsung menuju profil balita masing-masing.

---

### G. Sesi Kegiatan Posyandu (`/sesi`)
- **Rekapitulasi Sesi**:
  - Tabel menampilkan seluruh riwayat sesi: Tanggal Kegiatan, Posyandu, Catatan Agenda, Sasaran Balita, Jumlah Hadir, Jumlah Belum Hadir, Persentase Kehadiran, dan Status (`Buka`, `Selesai`, atau `Dibatalkan`).
- **Form Buka Sesi Baru** (Klik tombol **Buka Sesi Baru**):
  - *Tanggal Pelaksanaan Sesi* (wajib, input date).
  - *Catatan / Agenda Sesi* (opsional, contoh: `Penimbangan rutin dan vitamin A`).
  - Klik **Konfirmasi Buka**.
  - *Pencegahan Sesi Ganda*: Jika pada tanggal yang sama sudah ada sesi aktif, sistem akan menolak dan memberi peringatan.
  - Setelah sukses dibuka, sistem langsung mengarahkan kader ke halaman Detail Presensi sesi tersebut.

---

### H. Detail Sesi & Pencatatan Presensi (`/sesi/:id`)
- **Kartu Metrik Sesi**: Menampilkan Status Sesi (`Buka`), Total Sasaran Balita, Jumlah Balita Hadir, Jumlah Belum Dicatat / Absen, dan Persentase Kehadiran yang bergerak dinamis.
- **Tombol Aksi Kader** (tersedia jika status sesi masih `open`):
  1. **Sesuaikan Jadwal**: Membuka form untuk mengubah tanggal pelaksanaan atau catatan sesi jika ada pergeseran jadwal.
  2. **Tandai Semua Hadir (N)**: Menandai seluruh sasaran anak yang belum tercatat menjadi hadir sekaligus dalam 1 klik.
  3. **Batalkan Sesi**: Membuka formulir konfirmasi pembatalan sesi disertai alasan (misal: cuaca ekstrem atau balai warga dipakai kegiatan lain).
  4. **Tutup Sesi Selesai**: Menutup sesi posyandu setelah pelayanan hari itu selesai (status menjadi `closed`).
- **Tabel Kehadiran Sasaran Balita**:
  - Menampilkan seluruh balita yang terdaftar di posyandu tersebut.
  - Dilengkapi kolom filter/cari balita cepat berdasarkan nama atau kode anak.
  - Pada baris tiap balita tersedia tombol presensi instan:
    - Tombol hijau **Hadir**: Klik untuk menandai anak hadir (langsung tersimpan ke database).
    - Tombol abu-abu **Absen**: Klik untuk mencatat bahwa anak tidak hadir.

---

### I. Fitur Pengawasan & Tata Kelola (Puskesmas, Dinkes, Admin)

1. **Petugas Puskesmas (`petugas.melati`)**:
   - Dapat melihat seluruh data balita dan sesi posyandu binaan puskesmas.
   - Mengakses menu **Log Audit** untuk memantau aktivitas pendaftaran dan pencatatan kader di lapangan.
2. **Dinas Kesehatan (`dinas`)**:
   - Melihat Dashboard Wilayah dan memantau struktur **Unit Organisasi** se-kabupaten.
3. **Administrator Sistem (`admin`)**:
   - **Unit Organisasi (`/organisasi`)**: Menambah Puskesmas baru (induk: Dinkes) atau Posyandu baru (induk: Puskesmas).
   - **Akun Pengguna (`/pengguna`)**: Menambah akun baru dengan peran tertentu serta fitur **Reset Password**.
   - **Log Audit Sistem (`/audit-log`)**: Filter seluruh aktivitas sistem berdasarkan aksi (misal: `CHILD_REGISTERED`, `SESSION_OPENED`, `ATTENDANCE_RECORDED`, dll.) lengkap dengan timestamp dan data payload JSON.
