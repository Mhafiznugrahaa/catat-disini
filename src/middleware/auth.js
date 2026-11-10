import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../shared/errors/AppError.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token tidak valid');
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    throw new UnauthorizedError('Token tidak valid atau telah kedaluwarsa');
  }
}
