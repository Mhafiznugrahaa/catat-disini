import 'dotenv/config';

const required = [
  'DB_HOST',
  'DB_PORT',
  'DB_DATABASE',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_CHARSET',
  'JWT_SECRET',
  'JWT_TTL',
  'PORT',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Env wajib tidak tersedia: ${missing.join(', ')}`);
}

const jwtSecret = process.env.JWT_SECRET;
if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET minimal 32 karakter');
}

const port = Number(process.env.PORT);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error('PORT harus berupa angka positif');
}

const jwtTtl = Number(process.env.JWT_TTL);
if (!Number.isFinite(jwtTtl) || jwtTtl <= 0) {
  throw new Error('JWT_TTL harus berupa angka positif (detik)');
}

export const config = {
  port,
  jwtSecret,
  jwtTtl,
  captureRateLimitMax: 120,
  captureRateLimitWindowMs: 60 * 1000,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    charset: process.env.DB_CHARSET,
  },
};
