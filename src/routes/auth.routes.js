import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  facebookAuth,
  getFacebookPages,
  subscribeFacebookPages,
  getConnectedFacebookPages,
  disconnectFacebookPage,
  updateFacebookPageSettings,
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  facebookAuthSchema,
  subscribeFacebookPagesSchema,
} from '../validations/auth.validation.js';

const router = Router();

// Gắn middleware validate ngay trước khi gọi controller
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/profile', protect, getProfile);
router.post('/facebook', validate(facebookAuthSchema), facebookAuth);

// Các endpoint quản lý Fanpage Facebook
router.get('/facebook/pages', protect, getFacebookPages);
router.post('/facebook/pages', protect, validate(subscribeFacebookPagesSchema), subscribeFacebookPages);
router.get('/facebook/connected-pages', protect, getConnectedFacebookPages);
router.delete('/facebook/pages/:pageId', protect, disconnectFacebookPage);
router.put('/facebook/pages/:pageId', protect, updateFacebookPageSettings);

export default router;
