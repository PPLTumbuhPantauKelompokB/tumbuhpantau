# Verifikasi foundation · 30 Oktober 2026

Lingkungan uji Linux, Node v24.22.1, npm 11.9.0. Semua perintah npm di bawah dijalankan dari root starter. Hasil berlaku untuk paket ini pada mesin uji. MySQL tidak diperlukan untuk mengulangi demo.

| Pemeriksaan yang dijalankan | Hasil aktual |
|---|---|
| unzip -t pada ZIP sumber, lalu ekstraksi | Arsip utuh. README, enam dokumen desain/panduan dan kedua workspace dapat dibaca. |
| npm install --fetch-retries=0 --fetch-timeout=12000 --no-audit | Berhasil, 143 paket ditambahkan, lockfile root terbentuk. |
| npm ci --no-audit | Instalasi bersih dari lockfile berhasil, 144 paket ditambahkan menurut npm. |
| npm test sebelum dan sesudah perubahan | Awalnya 2/2 tes fixture lulus. Sesudah perbaikan 4/4 lulus, 0 gagal, 0 dilewati. |
| npm run check | Lulus pemeriksaan sintaks app.js, server.js dan demo-data.js. |
| node --check backend/src/port.js dan node --check backend/scripts/check-db.js | Keduanya lulus. Pemeriksaan sintaks tidak menjalankan layanan. |
| npm run build | Vite 6.4.5 mentransformasi 30 modul, menghasilkan frontend/dist/index.html, CSS dan JS. |
| npm run dev:backend dan npm run dev:frontend | Listener melaporkan 127.0.0.1:3001 dan 127.0.0.1:5173. |
| PORT=3001abc npm start -w backend (Linux) | Ditolak sebelum listen, pesan PORT harus angka antara 1 hingga 65535. |
| GET /api/health langsung di port 3001 dan lewat Vite di 5173 | HTTP 200, status ok, service tumbuhpantau-api, version 0.1.0, database not-checked. |
| GET /api/demo/overview melalui port 5173, GET /api/absent langsung di 3001 | HTTP 200 dengan demo=true dan source=synthetic-fixture. Rute tidak terdaftar membalas 404 dengan kode NOT_FOUND. |
| Chromium 153 headless + Playwright, halaman React di port 5173 | Status API terhubung dan angka 128, 8, 94, 5. Express dihentikan dan tombol periksa ditekan. Status menjadi API belum terhubung, keempat angka berubah menjadi tanda kosong. Setelah Express hidup dan tombol ditekan lagi, status kembali online. Tidak ada exception halaman JavaScript pada skenario ini. |
| Lebar 360, 768, 1366 piksel | Lebar dokumen tidak melebihi viewport pada ketiganya. Ini pemeriksaan overflow horizontal saja. Navigasi keyboard, kontras, dan keterbacaan visual lengkap belum dinilai. |
| DB-01 / TP-SETUP-08 | NOT RUN. Tidak ada konfigurasi MySQL uji yang disediakan. |
| Git/GitHub, CI, deployment dan acceptance produk | NOT RUN. Paket diserahkan sebagai ZIP. |

Untuk uji browser, Vite dijalankan dengan npm run dev:frontend, Express dengan node backend/src/server.js agar proses bisa dihentikan dan dinyalakan kembali. Playwright dan Chromium hanya dipasang di folder alat uji sementara, di luar dependency aplikasi.

**Kendala yang ditemui.** Percobaan menjalankan build/server sebelum instalasi selesai menunjukkan vite tidak ditemukan dan ERR_MODULE_NOT_FOUND untuk dotenv. Percobaan instalasi offline saat cache belum lengkap menghasilkan ENOTCACHED. Setelah instalasi normal selesai dan npm ci berhasil, pengujian diulang. Permintaan terlalu dini atau ke listener pada proses uji yang terisolasi sempat ditolak. Hasil HTTP dalam tabel diperoleh ketika server dan klien berjalan dalam satu lingkungan jaringan. Chromium awal gagal menyiapkan berkas sementara (EINVAL/ETXTBSY). Setelah binary pengujian diekstrak ke lokasi terpisah, skenario browser berhasil.

## Perubahan yang dibawa ZIP

- backend/src/server.js menggunakan backend/src/port.js untuk membaca seluruh nilai PORT. Sebelumnya parseInt memotong teks seperti 3001abc dan pecahan 3001.5 menjadi 3001. Kini keduanya ditolak, sementara nilai default tetap 3001.
- backend/tests/port.test.js menguji default, batas 1 dan 65535, nilai cacat, serta angka di luar rentang. Test lama tetap ada.
- package-lock.json mengunci versi kedua workspace. README.md dan docs/BEGINNER_SETUP_GUIDE.md kini mengarahkan pengguna paket hasil audit ke npm ci.
- docs/SDD.md dan docs/DECISIONS_AND_OPEN_QUESTIONS.md menyelaraskan status keputusan stack. SDD juga mengakui kedua endpoint demo.
- PROJECT_AUDIT.md, SETUP_VERIFICATION.md dan NEXT_TASKS.md mencatat cakupan, bukti dan urutan tindak lanjut.

## Ulangi di laptop dan presentasikan

Ekstrak ZIP. Buka folder tumbuhpantau-starter yang memuat package-lock.json. Dari terminal pertama jalankan perintah satu per satu. Bila satu langkah gagal, baca kesalahannya sebelum melanjutkan.

```sh
node -v
npm -v
npm ci
npm test
npm run check
npm run build
npm run dev:backend
```

Biarkan terminal itu terbuka. Kunjungi http://127.0.0.1:3001/api/health dan cari status ok. Pada terminal kedua, dari folder yang sama, jalankan:

```sh
npm run dev:frontend
```

1. Buka http://127.0.0.1:5173 dan cari **API terhubung**, 128 anak sintetis, 8 sesi, 94 pengukuran dan 5 menunggu peninjauan.
2. Buka DevTools → Network. Klik **Periksa koneksi lagi**. Periksa kedua request /api/ melalui port 5173 dan respons 200. Buka juga http://127.0.0.1:5173/api/health untuk memeriksa proxy terpisah dari tampilan.
3. Hentikan terminal backend dengan Ctrl+C. Klik tombol yang sama. Status menjadi offline dan angka lama hilang. Nyalakan backend kembali dan klik tombol untuk memulihkan tampilan.
4. Bila health langsung gagal, periksa terminal backend. Pesan EADDRINUSE berarti port sudah digunakan. Bila health langsung berhasil tetapi health melalui 5173 gagal, cocokkan target frontend/vite.config.js dengan port Express. Jika npm ci gagal, cek versi Node, koneksi ke registry dan keberadaan lockfile di root.
5. Hentikan kedua server dengan Ctrl+C setelah demo. MySQL dapat diuji terpisah mengikuti bagian opsional README. .env hanya disimpan lokal.

## Verifikasi DB-01 di laptop

- Lingkungan: Windows, Laragon, database lokal `tumbuhpantau`.
- Perintah dari folder utama proyek: `npm run db:check`.
- Hasil: LULUS. Skrip backend berhasil login ke MySQL dan menjalankan `SELECT 1`.
- Pesan terminal: `MySQL terhubung ke database 'tumbuhpantau'.`