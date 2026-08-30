const mongoose = require('mongoose');
const env = require('./env');
const dataStore = require('../db/dataStore');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return mongoose;

  try {
    const conn = await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 3000,
      autoIndex: true
    });
    isConnected = true;
    dataStore.setPersistMode('mongodb', true);
    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    dataStore.setPersistMode('inmemory', false);
    console.warn(
      `[Database] MongoDB unavailable (${error.message}).` +
      ` Falling back to in-process persistence (inMemoryDB) so the full pipeline remains runnable.`
    );
  }
  return mongoose;
};

module.exports = { connectDB, mongoose, isConnected: () => isConnected };
