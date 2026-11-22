import 'dotenv/config';
import { parsePort } from '../port.js';

export const env = Object.freeze({
  port: parsePort(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  db: Object.freeze({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.NODE_ENV === 'test'
      ? (process.env.DB_NAME_TEST || 'tumbuhpantau_test')
      : (process.env.DB_NAME || 'tumbuhpantau'),
    timezone: process.env.APP_TIMEZONE || 'Asia/Jakarta'
  }),
  session: Object.freeze({
    secret: process.env.SESSION_SECRET || 'kunci-rahasia-sesi-lokal-tumbuhpantau-min-32-karakter',
    idleMinutes: Number(process.env.SESSION_IDLE_MINUTES || '30')
  }),
  seed: Object.freeze({
    defaultPassword: process.env.SEED_DEFAULT_PASSWORD || '123456'
  })
});
