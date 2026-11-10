import { ValidationError } from '../../shared/errors/AppError.js';

export const TASK_STATUSES = ['todo', 'completed'];
export const TASK_PRIORITIES = ['low', 'medium', 'high'];
export const MAX_TITLE_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 5000;

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

export function validateDescription(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ValidationError('description harus berupa teks');
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`description maksimal ${MAX_DESCRIPTION_LENGTH} karakter`);
  }
  return trimmed;
}

export function validatePriority(value) {
  if (value === undefined || value === null) return 'medium';
  if (!TASK_PRIORITIES.includes(value)) {
    throw new ValidationError(`priority harus salah satu: ${TASK_PRIORITIES.join(', ')}`);
  }
  return value;
}

export function validateStatus(value) {
  if (value === undefined || value === null) return 'todo';
  if (!TASK_STATUSES.includes(value)) {
    throw new ValidationError(`status harus salah satu: ${TASK_STATUSES.join(', ')}`);
  }
  return value;
}

export function validateDeadline(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new ValidationError('deadline tidak valid');
  }
  return d;
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

export function validateTaskUpdateBody(body) {
  const fields = ['title', 'description', 'priority', 'status', 'deadline'];
  const hasField = fields.some((f) => f in body);
  if (!hasField) {
    throw new ValidationError('Minimal satu field wajib diisi untuk update');
  }
}
