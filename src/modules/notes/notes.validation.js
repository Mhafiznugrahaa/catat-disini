import { ValidationError } from '../../shared/errors/AppError.js';

export const MAX_TITLE_LENGTH = 255;
export const MAX_CONTENT_LENGTH = 10000;

export function validateTitle(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('title wajib diisi dan tidak boleh kosong');
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`title maksimal ${MAX_TITLE_LENGTH} karakter`);
  }
  return trimmed;
}

export function validateContent(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('content wajib diisi dan tidak boleh kosong');
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    throw new ValidationError(`content maksimal ${MAX_CONTENT_LENGTH} karakter`);
  }
  return trimmed;
}

export function validateId(value) {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
    throw new ValidationError('id harus bilangan bulat positif');
  }
  return id;
}

export function validateLimitOffset(limit, offset) {
  const parsedLimit = limit === undefined ? 20 : Number(limit);
  const parsedOffset = offset === undefined ? 0 : Number(offset);
  if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new ValidationError('limit harus antara 1 dan 100');
  }
  if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
    throw new ValidationError('offset harus angka >= 0');
  }
  return { limit: parsedLimit, offset: parsedOffset };
}

export function validateNoteUpdateBody(body) {
  const fields = ['title', 'content'];
  const hasField = fields.some((f) => f in body);
  if (!hasField) {
    throw new ValidationError('Minimal satu field wajib diisi untuk update');
  }
}
