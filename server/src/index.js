import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`[PROJEXA] Backend server running on port ${PORT}`);
  console.log(`[PROJEXA] Health check available at http://localhost:${PORT}/api/health`);
});

export default server;
