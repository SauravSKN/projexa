import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../db.js';
import { User } from '../models/User.js';
import { Team } from '../models/Team.js';
import { Project } from '../models/Project.js';
import { seedDevelopment } from './seedDevelopment.js';

dotenv.config();

async function run() {
  try {
    const conn = await connectDB();
    console.log('[PROJEXA] Connected to MongoDB for development seeding...');
    const result = await seedDevelopment({
      User,
      Team,
      Project,
      dbName: conn.name,
      allowSeed: 'true',
      nodeEnv: 'development',
    });
    console.log(`[PROJEXA] Seed completed successfully: ${Object.keys(result.users).length} users, team "${result.team.name}", project "${result.project.title}"`);
  } catch (err) {
    console.error(`[PROJEXA] Seeding notice: ${err.message}`);
  } finally {
    await disconnectDB();
  }
}

run();
