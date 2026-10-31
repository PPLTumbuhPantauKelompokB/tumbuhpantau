# TumbuhPantau — Starter Development v0.1

**React + Vite (frontend) · Node.js + Express (backend) · MySQL (direncanakan)**  
Tanggal: 30 Oktober 2026 · **Tujuan demo: 31 Oktober 2026**

> **STATUS:** Ini adalah foundation / starter project, **bukan** sistem kesehatan yang siap digunakan. Dashboard menggunakan **data sintetis**, tidak menggunakan data anak nyata. Login, database aplikasi, antropometri WHO, dan fitur operasional belum dibuat. Proposal akademik masih menyebut Laravel; perubahan stack menjadi React/Express **belum disinkronkan ke proposal**.

## Apa yang sudah ada

- UI dashboard React responsif dengan indikator simulasi dan ringkasan modul TumbuhPantau.
- Express server dengan `GET /api/health` dan `GET /api/demo/overview` (seluruh data sintetis).
- Integrasi Vite proxy `/api` ke backend; UI memperlihatkan koneksi API online/offline.
- Test sederhana untuk memastikan data demo ditandai sebagai sintetis.
- `docs/SDD.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/AI_CODING_GUIDELINES.md`, serta keputusan teknis.
- Skrip **opsional** mengecek koneksi ke database MySQL; tidak ada schema yang dibuat.

## Persyaratan

- **Node.js 24 LTS direkomendasikan** (minimal 22.12 sesuai `package.json`) dan npm.
- Editor kode seperti VS Code.
- MySQL hanya dibutuhkan jika mau mencoba `db:check`, **tidak diperlukan untuk demo dashboard awal**.
- Koneksi internet saat pertama kali `npm install` untuk mengunduh dependency.

Cek versi:

```bash
node -v
npm -v
```

## Setup paling singkat

**1.** Ekstrak ZIP, kemudian buka folder `tumbuhpantau-starter` di VS Code.

**2.** Buka terminal pada **root project** (folder yang memuat `frontend/` dan `backend/`):

```bash
npm ci
```

> `npm ci` memasang versi yang tercatat pada `package-lock.json` di root. Jika instalasi gagal karena jaringan, pastikan akses ke npm Registry tersedia.

**3.** Jalankan backend di **Terminal A**:

```bash
npm run dev:backend
```

Periksa di browser `http://127.0.0.1:3001/api/health`. Respons yang diharapkan:

```json
{"status":"ok","service":"tumbuhpantau-api","version":"0.1.0","database":"not-checked"}
```

**4.** Jalankan frontend di **Terminal B**, dari root project:

```bash
npm run dev:frontend
```

Buka `http://127.0.0.1:5173` di browser. Halaman dashboard akan menampilkan indikator **API terhubung** dan angka demonstrasi sintetis.

**5.** Jalankan pengujian di **Terminal C**:

```bash
npm run test
npm run check
```

Jika aplikasi tidak bisa mengambil data, periksa terlebih dahulu Terminal A, kemudian klik **Periksa koneksi lagi** pada dashboard.

## Opsional: cek MySQL lokal

Belum ada migration/tabel database karena desain ORM/migration sedang diputuskan tim.

1. Jalankan MySQL dan buat database kosong `tumbuhpantau` menggunakan tool MySQL favoritmu.
2. Salin `backend/.env.example` menjadi `backend/.env`, lalu isi konfigurasi `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` sesuai MySQL lokal.
3. Jalankan `npm run db:check` dari root project.

**PowerShell (Windows)**:

```powershell
Copy-Item backend/.env.example backend/.env
```

**macOS / Linux**:

```bash
cp backend/.env.example backend/.env
```

File `.env` dikecualikan dari Git. Jangan menaruh identitas anak atau data pribadi pada seed/demo.

## Struktur project

```text
tumbuhpantau-starter/
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # UI prototipe dan fetch API
│   │   ├── main.jsx          # titik masuk React
│   │   └── styles.css        # styling dashboard responsif
│   ├── index.html
│   ├── package.json
│   └── vite.config.js        # proxy ke backend
├── backend/
│   ├── src/
│   │   ├── app.js            # routing Express
│   │   ├── server.js         # server listen di port 3001
│   │   └── demo-data.js      # fixture sintetis
│   ├── scripts/check-db.js   # ping MySQL opsional
│   ├── tests/demo-data.test.js
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── SDD.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── AI_CODING_GUIDELINES.md
│   ├── DECISIONS_AND_OPEN_QUESTIONS.md
│   ├── TEST_PLAN.md
│   └── BEGINNER_SETUP_GUIDE.md
├── package.json
├── .gitignore
└── README.md
```

## Endpoint awal

| Method | URL | Keterangan |
|---|---|---|
| GET | `/api/health` | Health-check Express saja; **tidak memverifikasi koneksi DB** |
| GET | `/api/demo/overview` | Data sintetis, publik, untuk demo UI awal; **bukan API klinis** |

**Jangan** menambahkan endpoint pasien atau pengukuran tanpa autentikasi dan pembatasan organisasi pada backend.

## Memulai Git

Setelah instalasi dan pengujian:

```bash
git init
git add .
git commit -m "chore: scaffold tumbuhpantau react express"
```

Cek `git status` terlebih dahulu agar `.env`, `node_modules`, dan data nyata tidak pernah masuk commit.

## Progress yang boleh dilaporkan kepada dosen

- Draft SDD berbasis proposal selesai ditulis.
- Struktur monorepo frontend/backend dibuat.
- React UI demo dan Express health API telah diimplementasikan sebagai source code.
- Setelah **kamu berhasil menjalankan lokal**, frontend dapat menampilkan status koneksi backend.
- Database aplikasi, auth, modul WHO, dan fitur operasional **belum** diimplementasikan.

Lihat `docs/BEGINNER_SETUP_GUIDE.md` untuk penjelasan lebih detail dan troubleshooting.

Hasil audit dan uji aktual tersedia pada PROJECT_AUDIT.md, SETUP_VERIFICATION.md, dan NEXT_TASKS.md di root.
