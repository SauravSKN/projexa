import dotenv from 'dotenv';
import { createApp } from './app.js';
import { connectDB } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp();

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.warn(`[PROJEXA] Initial MongoDB connection notice: ${err.message}`);
  }

  const server = app.listen(PORT, () => {
    console.log(`[PROJEXA] Backend server running on port ${PORT}`);
    console.log(`[PROJEXA] Health check available at http://localhost:${PORT}/api/health`);
  });

  return server;
}

const server = start();
export default server;
