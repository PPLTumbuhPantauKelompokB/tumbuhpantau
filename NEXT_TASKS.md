# Lima tugas berikutnya

| Urutan | Tugas | Bergantung pada | Bukti selesai |
|---|---|---|---|
| 1 | Ulangi SETUP-02–04 di laptop presentasi | ZIP hasil audit dan Node 24 | npm ci, test dan build sukses. Tunjukkan health, angka sintetis, mode offline dan pemulihan langsung. |
| 2 | Simpan baseline Git (SETUP-06) | Langkah 1 lulus di laptop | Periksa git status dan git diff --cached sebelum commit. Simpan source, dokumen dan package-lock.json. Pastikan .env dan node_modules tidak terdaftar. Catat hash commit. |
| 3 | DB-01, cek koneksi MySQL lokal | Baseline dapat dipulihkan | Pada database kosong khusus lokal, npm run db:check menghasilkan pesan koneksi berhasil. Tidak perlu membuat tabel produk. |
| 4 | DEC-01, tetapkan cara migrasi | Baseline dan akses MySQL terkonfirmasi | Catatan keputusan SQL berversi atau ORM, pemilik migrasi, urutan organisasi lalu pengguna, aturan FK dan cara menguji rollback pada DB uji. |
| 5 | Tinjau kesiapan AUTH-01 bersama tim | Keputusan migrasi dan batas peran disepakati | Sepakati session store, cookie, CSRF, pembatasan login, cakupan wilayah, expiry dan kasus akses ditolak. Periksa sinkronisasi stack ke proposal. Akhiri dengan daftar acceptance test sebelum membuka task implementasi terpisah. |
