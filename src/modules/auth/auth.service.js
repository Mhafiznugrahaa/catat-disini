import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors/AppError.js';

export class AuthService {
  constructor({ authRepo }) {
    this.authRepo = authRepo;
  }

  async register({ name, email, password }) {
    const existing = await this.authRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await this.authRepo.create({ name, email, passwordHash });

    const token = jwt.sign({ id: userId }, config.jwtSecret, {
      expiresIn: `${config.jwtTtl}s`,
    });

    return { token, user: { id: userId, name, email } };
  }

  async login({ email, password }) {
    const user = await this.authRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Email atau password salah');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Email atau password salah');
    }

    const token = jwt.sign({ id: user.id }, config.jwtSecret, {
      expiresIn: `${config.jwtTtl}s`,
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async getProfile(userId) {
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User tidak ditemukan');
    }
    return { id: user.id, name: user.name, email: user.email };
  }
}
