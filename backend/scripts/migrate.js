import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

const migrationsDir = fileURLToPath(new URL('../db/migrations', import.meta.url));

async function ensureSprint1Columns(connection, targetDbName) {
  const [cols] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('guardians', 'children', 'posyandu_sessions')`,
    [targetDbName]
  );

  const hasCol = (t, c) => cols.some((r) => r.TABLE_NAME === t && r.COLUMN_NAME === c);

  if (!hasCol('guardians', 'address')) {
    await connection.query('ALTER TABLE guardians ADD COLUMN address VARCHAR(255) NULL AFTER phone');
  }
  if (!hasCol('guardians', 'is_active')) {
    await connection.query('ALTER TABLE guardians ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER address');
  }
  if (!hasCol('guardians', 'updated_at')) {
    await connection.query(
      'ALTER TABLE guardians ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
    );
  }

  const guardianIdCol = cols.find((r) => r.TABLE_NAME === 'children' && r.COLUMN_NAME === 'guardian_id');
  if (guardianIdCol && guardianIdCol.IS_NULLABLE === 'NO') {
    await connection.query('ALTER TABLE children MODIFY COLUMN guardian_id INT UNSIGNED NULL');
  }

  if (!hasCol('posyandu_sessions', 'notes')) {
    await connection.query('ALTER TABLE posyandu_sessions ADD COLUMN notes VARCHAR(500) NULL AFTER status');
  }
  if (!hasCol('posyandu_sessions', 'cancelled_at')) {
    await connection.query('ALTER TABLE posyandu_sessions ADD COLUMN cancelled_at DATETIME NULL AFTER closed_at');
  }
  if (!hasCol('posyandu_sessions', 'cancel_reason')) {
    await connection.query('ALTER TABLE posyandu_sessions ADD COLUMN cancel_reason VARCHAR(500) NULL AFTER cancelled_at');
  }

  const statusCol = cols.find((r) => r.TABLE_NAME === 'posyandu_sessions' && r.COLUMN_NAME === 'status');
  if (statusCol && !String(statusCol.COLUMN_TYPE).includes('cancelled')) {
    await connection.query(
      "ALTER TABLE posyandu_sessions MODIFY COLUMN status ENUM('open', 'closed', 'cancelled') NOT NULL DEFAULT 'open'"
    );
  }
}

export async function runMigrations(targetDbName = env.db.name) {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${targetDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.changeUser({ database: targetDbName });

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(120) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [appliedRows] = await connection.query('SELECT version FROM schema_migrations');
    const appliedSet = new Set(appliedRows.map((r) => r.version));

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const newlyApplied = [];
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
      newlyApplied.push(file);
    }

    await ensureSprint1Columns(connection, targetDbName);

    return { database: targetDbName, newlyApplied, totalMigrations: files.length };
  } finally {
    await connection.end();
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runMigrations()
    .then(({ database, newlyApplied }) => {
      if (newlyApplied.length === 0) {
        console.log(`Database '${database}' sudah mutakhir (tidak ada migrasi baru).`);
      } else {
        console.log(`Database '${database}' berhasil dimigrasi: ${newlyApplied.join(', ')}`);
      }
    })
    .catch((err) => {
      console.error('Gagal menjalankan migrasi database:', err.message);
      process.exit(1);
    });
}
