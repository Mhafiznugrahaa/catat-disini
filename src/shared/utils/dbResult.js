/**
 * Ekstrak insertId dan affectedRows dari hasil query Drizzle + mysql2.
 *
 * Drizzle dengan driver mysql2 mengembalikan hasil dalam bentuk array:
 *   [ ResultSetHeader, ... ]
 *
 * Helper ini menangani bentuk array maupun objek tunggal, dan melempar
 * Error dengan pesan jelas kalau nilai yang diharapkan tidak ditemukan
 * (jangan diam-diam mengembalikan NaN atau 0).
 */

export function getInsertId(result) {
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header.insertId !== 'number' || header.insertId <= 0) {
    throw new Error('insertId tidak ditemukan pada hasil query Drizzle');
  }
  return header.insertId;
}

export function getAffectedRows(result) {
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header.affectedRows !== 'number') {
    throw new Error('affectedRows tidak ditemukan pada hasil query Drizzle');
  }
  return header.affectedRows;
}
