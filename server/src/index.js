import 'dotenv/config';
import mongoose from 'mongoose';
import { loadConfig } from './config/env.js';
import { connectDatabase, syncModelIndexes } from './config/db.js';
import { createApp } from './app.js';
import { installMember4Audit } from './services/audit/installMember4Audit.js';

const config = loadConfig();
const app = createApp({ config });

if (config.configurationProblems.length > 0) {
  console.warn(
    `[PROJEXA] Configuration warnings: ${config.configurationProblems.join('; ')}`,
  );
}

async function start() {
  try {
    await connectDatabase(config.mongodbUri);
    await syncModelIndexes();
    console.log(`[PROJEXA] MongoDB connected (database: ${mongoose.connection.name})`);
  } catch (error) {
    if (config.isProduction) {
      console.error('[PROJEXA] Fatal: could not connect to MongoDB:', error.message);
      process.exit(1);
    }
    console.error(
      '[PROJEXA] Warning: MongoDB is unavailable, database-backed endpoints will fail.',
    );
  }

  const audit = await installMember4Audit({ mongoose });
  console.log(
    audit.installed
      ? '[PROJEXA] Member 4 audit service connected'
      : `[PROJEXA] Audit service not installed (${audit.reason})`,
  );

  const server = app.listen(config.port, () => {
    console.log(`[PROJEXA] Backend server running on port ${config.port}`);
    console.log(`[PROJEXA] Health check available at http://localhost:${config.port}/api/health`);
  });

  const shutdown = async (signal) => {
    console.log(`[PROJEXA] ${signal} received, shutting down`);
    server.close(async () => {
      try {
        await mongoose.connection.close();
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

const server = await start();

export default server;
