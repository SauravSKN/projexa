import { Router } from 'express';
import { getDatabaseStatus } from '../config/db.js';

export const healthRouter = Router();

/**
 * Liveness probe. Always answers 200 while the process is running and
 * reports the database state explicitly so a caller can tell whether the
 * API is actually able to serve database-backed requests.
 */
healthRouter.get('/', (req, res) => {
  const database = getDatabaseStatus();

  res.status(200).json({
    success: true,
    data: {
      status: database.connected ? 'healthy' : 'degraded',
      service: 'projexa-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: database.connected ? 'connected' : 'disconnected',
    },
  });
});

/**
 * Readiness probe. Returns 503 when MongoDB is unavailable, so the platform
 * never routes traffic to a backend that cannot serve database requests.
 */
healthRouter.get('/ready', (req, res) => {
  const database = getDatabaseStatus();

  if (!database.connected) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is not available',
      },
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    },
  });
});

export default healthRouter;
