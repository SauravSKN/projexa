import 'dotenv/config';
import mongoose from 'mongoose';
import { loadConfig, isSafeDevelopmentDatabase } from '../config/env.js';
import { connectDatabase } from '../config/db.js';
import { hashPassword } from '../services/authService.js';

/**
 * BE1-controlled CLI that invokes Member 4's deterministic development seed.
 *
 * The seed module lives on Member 4's branch; it is imported dynamically so
 * this script keeps working before and after that pull request is merged.
 */
async function main() {
  const config = loadConfig();

  if (!isSafeDevelopmentDatabase(config.mongodbUri)) {
    throw new Error(
      'Refusing to seed: the target database name must contain dev, test or local',
    );
  }

  let seedModule;
  try {
    seedModule = await import('../seeds/seedDevelopment.js');
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        "Member 4's seedDevelopment module is not present on this branch yet",
      );
    }
    throw error;
  }

  await connectDatabase(config.mongodbUri);

  const result = await seedModule.seedDevelopment({
    User: (await import('../models/User.js')).default,
    Team: (await import('../models/Team.js')).default,
    Project: (await import('../models/Project.js')).default,
    hashPassword,
    nodeEnv: config.nodeEnv,
    allowSeed: process.env.ALLOW_DEV_SEED,
    password: config.seedDemoPassword,
    dbName: mongoose.connection.name,
  });

  console.log(
    `[PROJEXA] Development seed complete in database ${mongoose.connection.name} (team: ${result.team.name}).`,
  );

  await mongoose.connection.close();
}

main().catch((error) => {
  console.error(`[PROJEXA] Seeding failed: ${error.message}`);
  process.exitCode = 1;
});
