# TumbuhPantau — Implementation Plan v0.1

**Tujuan pertama:** menunjukkan aplikasi React berjalan dan merespons endpoint Express, dengan dokumentasi yang jelas. **Bukan** menyelesaikan fungsionalitas kesehatan.

## Fokus demonstrasi 31 Oktober 2026
| ID | Task | Bukti | Kriteria selesai |
|---|---|---|---|
| SETUP-01 | Buat repo dan folder `frontend`, `backend`, `docs` | Struktur repo | File ada, README ada |
| SETUP-02 | Jalankan React/Vite | Halaman dashboard prototipe | Browser memuat tanpa error |
| SETUP-03 | Jalankan Express API | `GET /api/health` | JSON status API = ok |
| SETUP-04 | Integrasi fetch dari React ke API | Kartu API status | Menampilkan online jika server hidup, offline jika tidak |
| SETUP-05 | Simpan dokumen SDD awal | `docs/SDD.md` | Konflik proposal dicatat |
| SETUP-06 | Commit pertama | Git log | Tidak ada `.env`, secrets, data nyata, `node_modules` |
| DB-01 (opsional) | Uji koneksi MySQL lokal | `npm run db:check` | Hanya cek `SELECT 1`; belum mengklaim schema selesai |

## Sesudah demo (jangan dikerjakan sekaligus)
1. **DEC-01**: sepakati schema migration/ORM; review tabel inti dari ERD.
2. **AUTH-01**: tabel user/organisasi, session store, login/logout, middleware role dan scope, unit/API tests.
3. **PBI-01**: administrasi organisasi dan akun termasuk audit perubahan.
4. **PBI-02**: anak/wali dan duplicate warning, dengan data sintetis.
5. **PBI-03**: sesi dan kehadiran unik (UNIQUE session+child).
6. **PBI-04**: draft/submit measurement, idempotency, transaksi atomik dan validation.
7. **PBI-05**: modul WHO setelah tabel, referensi, test fixtures, precision diverifikasi.
8. **PBI-07**: revisi append-only sebelum chart bergantung pada data versi.
9. **PBI-06 & 09**: histori/grafik dan monitoring kelengkapan.
10. **PBI-08 & 10**: antrean peninjauan dan tindak lanjut.
11. **PBI-11 & 12**: dashboard agregat, CSV aman, dan audit end-to-end.

## Pola satu task per AI coding prompt
```
Baca docs/SDD.md dan docs/IMPLEMENTATION_PLAN.md terlebih dahulu.
Kerjakan HANYA [ID-TASK] tanpa menambah fitur baru.
Tulis rencana perubahan file, implementasikan, lalu jelaskan:
(1) file berubah; (2) cara run; (3) tes yang benar-benar dijalankan;
(4) tes yang belum dijalankan; (5) risiko keamanan dan catatan follow-up.
Jangan mengklaim hasil dari script yang belum dijalankan.
```

## Urutan git minimal
```bash
git init
git add .
git commit -m "chore: scaffold react express and draft sdd"
```
Jika Git belum dikonfigurasi, lakukan `git config --global user.name "..."` dan `git config --global user.email "..."` terlebih dahulu. Gunakan email yang memang milikmu.

## Catatan presentasi progres
Boleh diklaim: SDD draft tersedia, React UI awal, Express API health-check, koneksi frontend/backend (jika diuji), struktur repo Git. **Jangan** klaim: autentikasi aman, database lengkap, grafik WHO akurat, atau deploy production.
