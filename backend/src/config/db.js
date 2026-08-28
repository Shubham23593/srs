const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 3000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database] Live MongoDB connection failed (${error.message}). Running in mock/standalone mode if configured, or retrying...`);
  }
};

module.exports = { connectDB, mongoose };
