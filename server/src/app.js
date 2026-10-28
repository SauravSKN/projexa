import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/healthRoutes.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check endpoints
  app.use('/api/health', healthRouter);
  app.use('/api/v1/health', healthRouter);

  // Central 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Central error handling middleware
  // Maps status and error codes to standard Projexa JSON envelope
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status || 500;
    const code = err.code || (status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');
    const message = err.message || 'An unexpected internal error occurred';

    res.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  });

  return app;
}
