import express from 'express';
import helmet from 'helmet';
import { safeDemoOverview } from './demo-data.js';
import { pingDatabase } from './config/db.js';
import { requestId } from './middlewares/requestId.js';
import { createSessionMiddleware } from './middlewares/auth.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import { v1Router } from './routes/v1.js';

export function createApp({
  checkDatabase = pingDatabase,
  useMemorySession = checkDatabase !== pingDatabase
} = {}) {
  const app = express();
  app.locals.checkDatabase = checkDatabase;

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(requestId);
  app.use(express.json({ limit: '32kb' }));
  app.use(createSessionMiddleware({ useMemoryStore: useMemorySession }));

  app.get('/api/health', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const dbStatus = await checkDatabase();
    res.status(200).json({
      status: 'ok',
      service: 'tumbuhpantau-api',
      version: '0.1.0',
      database: dbStatus.ok ? 'connected' : 'disconnected'
    });
  });

  app.get('/api/demo/overview', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json(safeDemoOverview());
  });

  app.use('/api/v1', v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
