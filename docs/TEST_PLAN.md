# Test Plan — TumbuhPantau v0.1

**Status:** baseline prototype, pengujian terbatas. Seluruh pengujian produk klinis berikutnya **belum dilakukan**.

## Test yang dapat dijalankan sekarang

| ID | Test | Langkah | Hasil diharapkan |
|---|---|---|---|
| TP-SETUP-01 | Syntax backend | `npm run check` | Syntax JavaScript backend valid |
| TP-SETUP-02 | Demo fixture sintetis | `npm run test` | Seluruh fixture dilabeli sintetis dan tidak berbagi mutable state |
| TP-SETUP-03 | API health | Jalankan backend, buka `/api/health` | `status: ok`; database `not-checked` |
| TP-SETUP-04 | Demo API | Buka `/api/demo/overview` | JSON hanya berisi data sintetis dan `demo: true` |
| TP-SETUP-05 | Frontend ↔ API | Jalankan React dan Express | Status di dashboard berubah menjadi `API terhubung` |
| TP-SETUP-06 | Frontend offline | Matikan Express, refresh UI | Status `API belum terhubung` dan metrik tidak memakai angka stale |
| TP-SETUP-07 | Responsif | Lebar browser 360px, 768px, 1366px | Konten dapat dibaca dan dinavigasi |
| TP-SETUP-08 | MySQL opsional | Konfigurasi `.env`, `npm run db:check` | `SELECT 1` berhasil; tidak melakukan DDL |

**Catatan:** test TP-SETUP-03 sampai TP-SETUP-08 memerlukan browser/server atau MySQL lokal; dokumentasikan hasil aktual setelah kamu menjalankannya.

## Requirement test berikutnya (belum diimplementasikan)

- `FR-01`, `NFR-01`: login, logout, akun tidak aktif, generic error, rate limit, session expiry.
- `FR-02`, `NFR-02`: role dan isolasi akses lintas organisasi dalam seluruh endpoint.
- `FR-03`: registrasi anak, peringatan duplikasi, penonaktifan menjaga histori.
- `FR-04`: unique attendance per sesi, penolakan penambahan setelah sesi ditutup.
- `FR-05`, `FR-14`: draf vs terkirim, validasi unit/tanggal, idempotency, revisi non-destruktif, konflik edit.
- `FR-06`, `NFR-04`: algoritma WHO validasi pembanding dan 0,7 cm sesuai posisi/umur.
- `FR-07`–`FR-10`: histori versi, review oleh petugas, follow-up assigned/closed.
- `FR-11`–`FR-13`, `NFR-14`: dashboard role-based, agregat aman, audit, CSV tanpa identitas.
- `NFR-05`–`NFR-13`: integritas transaksi, performa dan backup-recovery, aksesibilitas, usability.

## Hasil uji aktual

Catat command, timestamp, output, commit ID, status PASS/FAIL/NOT RUN. Jangan mengklaim tes selesai tanpa bukti eksekusi.
