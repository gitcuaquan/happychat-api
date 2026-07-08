import jwt from "jsonwebtoken";
import userRepository from "../repositories/user.repository.js";
import { config } from "../config/env.js";
import { sendSuccess } from "../utils/response.js";

// Tạo JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

// @desc    Đăng ký user mới
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { username, password, fullName } = req.body;

    // Kiểm tra xem user đã tồn tại chưa thông qua repository
    const userExists = await userRepository.findOne({ username });

    if (userExists) {
      res.status(400);
      throw new Error("Tên người dùng đã tồn tại");
    }

    // Tạo user mới bằng repository
    const user = await userRepository.create({
      username,
      password,
      fullName,
    });

    if (user) {
      const token = generateToken(user.id);
      sendSuccess(res, 201, {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        token,
      });
    } else {
      res.status(400);
      throw new Error("Dữ liệu không hợp lệ");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Đăng nhập & nhận token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Tìm user theo username và yêu cầu trả về cả trường password (để kiểm tra)
    const user = await userRepository.findByUsernameWithPassword(username);

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user.id);
      sendSuccess(res, 200, { token });
    } else {
      res.status(401);
      throw new Error("Sai tài khoản hoặc mật khẩu");
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thông tin profile của user
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (user) {
      sendSuccess(res, 200, user.toJSON());
    } else {
      res.status(404);
      throw new Error("Không tìm thấy người dùng");
    }
  } catch (error) {
    next(error);
  }
};
