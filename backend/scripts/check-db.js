import 'dotenv/config';
import mysql from 'mysql2/promise';

// Cek koneksi saja: belum membuat/mengubah tabel maupun menyimpan data pasien.
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error('Isi DB_HOST, DB_USER, DB_NAME di backend/.env sebelum menjalankan db:check.');
  process.exit(1);
}

let connection;
try {
  connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT || '3306'),
    user: DB_USER,
    password: DB_PASSWORD || '',
    database: DB_NAME,
    connectTimeout: 5000
  });
  await connection.query('SELECT 1 AS ok');
  console.log(`MySQL terhubung ke database '${DB_NAME}'.`);
} catch (err) {
  console.error('Tidak bisa menghubungkan MySQL. Periksa server, kredensial dan nama database.');
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
