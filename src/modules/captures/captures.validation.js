import { ValidationError } from '../../shared/errors/AppError.js';

export const CAPTURE_TYPES = ['note', 'task', 'schedule', 'finance'];
export const TASK_PRIORITIES = ['low', 'medium', 'high'];
export const FINANCE_TYPES = ['income', 'expense'];
export const CAPTURE_STATUSES = ['pending', 'converted'];
export const MAX_RAW_TEXT_LENGTH = 5000;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function validateRawText(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('rawText wajib diisi dan tidak boleh kosong');
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_RAW_TEXT_LENGTH) {
    throw new ValidationError(`rawText maksimal ${MAX_RAW_TEXT_LENGTH} karakter`);
  }
  return trimmed;
}

export function validateLimitOffset(limit, offset) {
  const parsedLimit = limit === undefined ? DEFAULT_LIMIT : Number(limit);
  const parsedOffset = offset === undefined ? 0 : Number(offset);
  if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
    throw new ValidationError(`limit harus antara 1 dan ${MAX_LIMIT}`);
  }
  if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
    throw new ValidationError('offset harus angka >= 0');
  }
  return { limit: parsedLimit, offset: parsedOffset };
}

export function validateStatus(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!CAPTURE_STATUSES.includes(value)) {
    throw new ValidationError(`status harus salah satu: ${CAPTURE_STATUSES.join(', ')}`);
  }
  return value;
}

export function validateConvertType(value) {
  if (!value || !CAPTURE_TYPES.includes(value)) {
    throw new ValidationError(`type harus salah satu: ${CAPTURE_TYPES.join(', ')}`);
  }
  return value;
}

export function validatePositiveAmount(value, field = 'amount') {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new ValidationError(`${field} harus angka positif`);
  }
  return num;
}

export function validateDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new ValidationError(`${field} tidak valid`);
  }
  return d;
}

export function validateTimeRange(startTime, endTime) {
  if (!endTime) return;
  if (new Date(endTime) < new Date(startTime)) {
    throw new ValidationError('endTime tidak boleh sebelum startTime');
  }
}
