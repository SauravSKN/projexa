import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/projexa_dev') {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[PROJEXA] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[PROJEXA] MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}
