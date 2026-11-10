/**
 * Middleware rate limit sederhana dengan in-memory store.
 * Cocok untuk single-instance. Untuk multi-instance gunakan Redis.
 *
 * @param {Object} options
 * @param {number} options.windowMs - ukuran jendela waktu dalam ms
 * @param {number} options.max - maksimal request per jendela per IP
 * @param {string} options.message - pesan error saat melebihi batas
 */
export function createRateLimit({ windowMs = 60 * 1000, max = 100, message = 'Terlalu banyak request, coba lagi nanti.' }) {
  const records = new Map();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let record = records.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
    }

    record.count += 1;
    records.set(key, record);

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message,
          details: [],
        },
      });
    }

    next();
  };
}
