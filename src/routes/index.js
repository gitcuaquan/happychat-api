import { Router } from "express";
import authRoutes from "./auth.routes.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Happy Chat API is running...!");
});
router.use("/auth", authRoutes);

export default router;
