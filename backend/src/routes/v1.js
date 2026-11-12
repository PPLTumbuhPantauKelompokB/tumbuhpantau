import { Router } from 'express';
import { pingDatabase } from '../config/db.js';
import { sendSuccess } from '../lib/respond.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { adminRouter } from '../modules/admin/admin.routes.js';
import { childrenRouter } from '../modules/children/children.routes.js';
import { guardiansRouter } from '../modules/guardians/guardians.routes.js';
import { sessionsRouter } from '../modules/sessions/sessions.routes.js';

export const v1Router = Router();

v1Router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, {
    name: 'TumbuhPantau API v1 (Sprint 1)',
    description: 'Layanan API Sistem Informasi Posyandu & Pemantauan Balita'
  });
});

v1Router.get('/health', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const checkDb = req.app?.locals?.checkDatabase || pingDatabase;
  const dbStatus = await checkDb();
  return sendSuccess(res, {
    status: 'ok',
    database: dbStatus.ok ? 'connected' : 'disconnected'
  });
});

v1Router.use('/auth', authRouter);
v1Router.use('/children', childrenRouter);
v1Router.use('/guardians', guardiansRouter);
v1Router.use('/sessions', sessionsRouter);
v1Router.use('/', adminRouter);
