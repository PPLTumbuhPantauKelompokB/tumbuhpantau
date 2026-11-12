# Pelacakan Progress Sprint 1: TumbuhPantau (Lokal)

| Tiket Jira | PBI / Modul | Deskripsi | Status | Catatan / Bukti |
|---|---|---|---|---|
| **SCRUM-5** | SETUP | Menjalankan React Vite dengan Express API | done | Starter terkonfigurasi pada port 5173 dan 3001 (`scripts/dev.js`) |
| **SCRUM-6** | DB-01 | Verifikasi koneksi MySQL lokal Laragon | done | `npm run db:check` terverifikasi koneksi database `tumbuhpantau` |
| **SCRUM-7** | REQ-01 | Analisis kebutuhan dan alur posyandu | done | Dokumen spesifikasi kebutuhan dan ruang lingkup Sprint 1 |
| **SCRUM-8** | PLAN-01 | Penyusunan backlog dan alur proses Scrum | done | Board Jira SCRUM dan 20 tiket Sprint 1 terdefinisi |
| **SCRUM-11**| PBI-01 | Rancangan data organisasi dan akun pengguna | done | Skema relasi `organizations` dan `users` InnoDB (`001_init_schema.sql`) |
| **SCRUM-34**| DEC-01 | Runner migrasi SQL berversi dan skema 12 tabel InnoDB | done | `backend/scripts/migrate.js` dan skrip DDL `001_init_schema.sql` lulus migrasi |
| **SCRUM-9** | AUTH-01 | Login/logout aman dengan sesi cookie MySQL & CSRF | done | Endpoint `/auth/login`, `/auth/logout`, `/auth/me`, rate limiter, bcrypt |
| **SCRUM-10**| AUTH-01 | Pengalihan dashboard dan menu sidebar berbasis role | done | `ProtectedRoute`, `AppShell.jsx`, navigasi RBAC 4 peran tanpa item Sprint 2 |
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

## Verifikasi Pengujian

1. **Migrasi Basis Data**: `npm run db:migrate` berhasil menjalankan `001_init_schema.sql` (12 tabel InnoDB).
2. **Data Benih (Seeder)**: `npm run db:seed` berhasil mengisi 1 Dinkes, 2 Puskesmas, 4 Posyandu, 8 Akun Pengguna (password `123456`), 60 Balita, 60 Wali, dan Sesi Posyandu beserta Kehadiran.
3. **Uji Otomatis Unit**: `npm test` menjalankan 10 skenario pengujian dengan status lulus 100%.
4. **Pemeriksaan Sintaks**: `npm run check` lulus memeriksa 26 berkas kode JavaScript backend.
5. **Kompilasi Antarmuka**: `npm run build` berhasil mem-bundle aset produksi frontend tanpa galat.
