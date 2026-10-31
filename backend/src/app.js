import express from 'express';
import { safeDemoOverview } from './demo-data.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ status: 'ok', service: 'tumbuhpantau-api', version: '0.1.0', database: 'not-checked' });
  });

  // DEMO ONLY: data sintetis, tidak memerlukan autentikasi. Bukan endpoint data pasien.
  app.get('/api/demo/overview', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json(safeDemoOverview());
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint API tidak tersedia.' } });
  });

  app.use((err, _req, res, _next) => {
    // Jangan bocorkan error internal kepada pengguna maupun menganggapnya log aman.
    if (process.env.NODE_ENV !== 'test') console.error('Unexpected API error:', err?.name || 'Error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server.' } });
  });

  return app;
}
