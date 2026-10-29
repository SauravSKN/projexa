import mongoose from 'mongoose';
import { databaseNameFromUri } from './env.js';

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB. Throws on failure so the caller decides whether the
 * process can continue (development) or must abort (production/CI).
 */
export async function connectDatabase(uri, options = {}) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 5000,
    maxPoolSize: options.maxPoolSize ?? 10,
    autoIndex: options.autoIndex ?? true,
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

/** Database status safe to expose over HTTP (never contains credentials). */
export function getDatabaseStatus() {
  return {
    connected: isDatabaseConnected(),
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    name: mongoose.connection.name || databaseNameFromUri(mongoose.connection.client?.s?.url || '') || null,
  };
}

/**
 * Ensures every index declared on the models exists. Called once at startup
 * so query performance does not depend on background index builds.
 */
export async function syncModelIndexes() {
  const names = Object.keys(mongoose.models);
  for (const name of names) {
    await mongoose.models[name].syncIndexes();
  }
  return names;
}
