import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async () => {
  try {
    console.log('⏳ Đang kết nối tới MongoDB...');
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000 // Giảm thời gian chờ xuống 5s thay vì 30s mặc định
    });
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Thoát app nếu không kết nối được DB
  }
};
