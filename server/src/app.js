import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig } from './config/env.js';
import { healthRouter } from './routes/healthRoutes.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createUserRouter } from './routes/userRoutes.js';
import { createTeamRouter } from './routes/teamRoutes.js';
import { createProjectRouter } from './routes/projectRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express application without connecting to MongoDB or opening a
 * port, so automated tests can import it safely.
 */
export function createApp({ config = loadConfig() } = {}) {
  const app = express();

  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigins.length === 1
        ? config.clientOrigins[0]
        : config.clientOrigins.length > 1
          ? config.clientOrigins
          : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  if (!config.isTest) {
    app.use(
      '/api/',
      rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests, please try again later',
          },
        },
      }),
    );
  }

  // Health checks
  app.use('/api/health', healthRouter);
  app.use('/api/v1/health', healthRouter);

  // Authentication and authorization
  app.use('/api/v1/auth', createAuthRouter({ config }));
  app.use('/api/v1/users', createUserRouter({ config }));
  app.use('/api/v1/teams', createTeamRouter({ config }));
  app.use('/api/v1/projects', createProjectRouter({ config }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
