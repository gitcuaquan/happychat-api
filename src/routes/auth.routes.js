import { Router } from 'express';
import { register, login, getProfile } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';

const router = Router();

// Gắn middleware validate ngay trước khi gọi controller
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/profile', protect, getProfile);

export default router;
