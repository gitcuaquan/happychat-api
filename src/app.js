import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.js";

const app = express();

// Các middleware bảo mật và tiện ích
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware ghi log (morgan)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Khai báo các Route của API
app.use("/api/v1", routes);

// Các middleware xử lý lỗi
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
