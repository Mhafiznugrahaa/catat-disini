import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ValidationError } from '../../shared/errors/AppError.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ValidationError('Semua field wajib diisi');
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      throw new ValidationError('Semua field wajib diisi');
    }

    if (typeof password !== 'string' || password.length < 8) {
      throw new ValidationError('Password minimal 8 karakter');
    }

    if (!emailRegex.test(normalizedEmail)) {
      throw new ValidationError('Format email tidak valid');
    }

    const result = await this.authService.register({
      name: normalizedName,
      email: normalizedEmail,
      password,
    });

    res.status(201).json({ success: true, data: result });
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email dan password wajib diisi');
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await this.authService.login({
      email: normalizedEmail,
      password,
    });

    res.json({ success: true, data: result });
  });

  me = asyncHandler(async (req, res) => {
    const user = await this.authService.getProfile(req.user.id);
    res.json({ success: true, data: user });
  });
}
