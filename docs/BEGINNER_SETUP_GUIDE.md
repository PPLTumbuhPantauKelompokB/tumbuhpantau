# Panduan Pemula — Menjalankan TumbuhPantau

## 0. Tujuan

Kamu akan menjalankan dua aplikasi lokal:
1. **Express API** di `http://127.0.0.1:3001`.
2. **React + Vite** di `http://127.0.0.1:5173`.

Saat keduanya hidup, dashboard React dapat mengambil data JSON sintetis dari Express.

## 1. Persiapan

Install Node.js LTS dari https://nodejs.org. Node 24 LTS direkomendasikan untuk proyek, minimal Node 22.12. Install VS Code dari https://code.visualstudio.com, dan Git dari https://git-scm.com.

Setelah instalasi, restart VS Code. Buka terminal (`Ctrl` + backtick). Jalankan:

```bash
node -v
npm -v
git --version
```

Apabila `node` tidak dikenali pada Windows, buka terminal baru atau restart; pastikan Node ada di PATH.

## 2. Buka project

Download dan ekstrak file ZIP, lalu di VS Code pilih **File → Open Folder** dan pilih folder **tumbuhpantau-starter**. File `package.json` harus terlihat pada folder utama, bukan hanya pada `frontend`.

## 3. Install dependency

Di terminal pada folder utama:

```bash
npm ci
```

`npm` membaca `package.json` dan mengambil dependency Express, React, Vite, Bootstrap, MySQL driver, dll. Versi mengikuti lockfile di root. Jika berhasil akan ada `node_modules`.

**Jangan salin** `node_modules` ke Git; commit `package-lock.json` agar versi dependency dapat direproduksi tim.

## 4. Jalankan Express

Di terminal pertama:

```bash
npm run dev:backend
```

Terminal akan menampilkan alamat `http://127.0.0.1:3001/api/health`. Jika tidak muncul, baca pesan error di terminal. Buka URL itu di browser; hasilnya JSON `status: ok`. Ini belum berarti database terkoneksi.

## 5. Jalankan React

Buka terminal baru **tanpa menutup backend**, kemudian:

```bash
npm run dev:frontend
```

Buka `http://127.0.0.1:5173`. UI menampilkan status API terhubung jika frontend berhasil mengambil JSON. Jika indikator offline, lihat langkah troubleshooting.

## 6. Jalankan test

Buka terminal ketiga:

```bash
npm run test
npm run check
```

Saat ini `test` mengecek fixture sintetis dan validasi port backend; belum ada integration test atau test auth. `check` memeriksa syntax beberapa file backend. Jangan klaim seluruh produk lulus pengujian.

## 7. Kenali file penting

- `frontend/src/App.jsx` — mengatur komponen tampilan React dan memanggil API.
- `frontend/src/styles.css` — styling dan tampilan mobile.
- `frontend/vite.config.js` — meneruskan request `/api` ke Express saat development.
- `backend/src/app.js` — endpoint API.
- `backend/src/demo-data.js` — data sintetis untuk prototipe.
- `docs/SDD.md` — acuan arsitektur dan kebutuhan teknis.

## 8. Konsep yang wajib diingat

- **React**: merender UI dan mengirim request. React **tidak boleh** menjadi satu-satunya penentu izin akses.
- **Express**: menerima HTTP request, validasi, autentikasi, otorisasi, dan logika bisnis.
- **MySQL**: penyimpanan persisten. Dalam starter ini **belum** dipakai untuk menyimpan anak atau pengukuran.
- **JSON**: format pertukaran data frontend ↔ backend.
- **Git**: menyimpan riwayat perubahan proyek.

## 9. Cek MySQL (opsional)

Buat database `tumbuhpantau` di MySQL lokal, salin `backend/.env.example` ke `backend/.env`, isi konfigurasi lokal. Jalankan:

```bash
npm run db:check
```

Skrip ini hanya melakukan query `SELECT 1`; tidak membuat tabel. Jangan pernah commit `.env`.

## 10. Troubleshooting

| Masalah | Cara memeriksa |
|---|---|
| `node is not recognized` | Install Node LTS dan restart terminal; cek PATH |
| `npm install` gagal network | Periksa internet, proxy, dan akses `registry.npmjs.org` |
| Port 3001 sudah dipakai | Matikan service lama atau ubah port backend dan target Vite proxy secara konsisten |
| Dashboard bertuliskan API belum terhubung | Pastikan terminal backend masih berjalan; kunjungi `/api/health`; klik Periksa koneksi lagi |
| Port 5173 sudah dipakai | Tutup aplikasi Vite lain; port dibuat strict untuk mempermudah pengecekan |
| `db:check` gagal | Pastikan MySQL berjalan; nama database, username, password, dan port benar |
| `git commit` meminta identitas | Atur `git config user.name` dan `git config user.email` sesuai identitas Git pribadimu |

## 11. Setelah starter berhasil dijalankan

Langkah berikutnya adalah memutuskan migration/ORM dan membangun **AUTH-01 + role/organization scope**. Baca `docs/IMPLEMENTATION_PLAN.md` dan `docs/AI_CODING_GUIDELINES.md` sebelum meminta AI membuat kode fitur berikutnya.

## 12. Menghentikan server

Pada terminal backend dan frontend, tekan `Ctrl + C`. Program berhenti, tetapi source code tetap aman.
