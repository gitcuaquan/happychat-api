import app from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";

// Kết nối tới Database trước khi khởi động server
let server;
connectDB()
  .then(() => {
    server = app.listen(config.port, () => {
      console.log(`🚀 Server is running http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  });

// Xử lý các lỗi promise không được catch (unhandled rejections)
process.on("unhandledRejection", (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
