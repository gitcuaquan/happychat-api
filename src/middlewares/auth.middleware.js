import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import User from "../models/user.model.js";

// @desc    Middleware bảo vệ route
// @access  Private
export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Lấy token từ header
      token = req.headers.authorization.split(" ")[1];

      // Xác thực token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Lấy thông tin user từ payload của token và loại bỏ trường password
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      next(new Error("Token không hợp lệ"));
    }
  }

  if (!token) {
    res.status(401);
    next(new Error("Không có token"));
  }
};
