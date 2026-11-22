import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

export async function query(sql, params = []) {
  const [rows, fields] = await pool.query(sql, params);
  return [rows, fields];
}

export async function withTransaction(action) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await action(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function pingDatabase() {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    const isOk = Array.isArray(rows) && rows.length > 0 && Number(rows[0].ok) === 1;
    return { ok: isOk };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function closePool() {
  await pool.end();
}
