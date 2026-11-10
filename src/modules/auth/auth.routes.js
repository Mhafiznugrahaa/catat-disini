import express from 'express';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimit } from '../../middleware/rateLimit.js';
import { config } from '../../config/env.js';

const router = express.Router();

const authRepo = new AuthRepository();
const authService = new AuthService({ authRepo });
const authController = new AuthController(authService);

const authRateLimit = createRateLimit({
  windowMs: config.captureRateLimitWindowMs,
  max: config.captureRateLimitMax,
  message: 'Terlalu banyak request ke auth, coba lagi nanti.',
});

router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);
router.get('/me', requireAuth, authController.me);

export default router;
