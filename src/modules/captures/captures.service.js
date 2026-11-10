import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/AppError.js';
import { captures } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  CAPTURE_TYPES,
  TASK_PRIORITIES,
  FINANCE_TYPES,
  validateRawText,
  validatePositiveAmount,
  validateDate,
  validateTimeRange,
  validateConvertType,
} from './captures.validation.js';

const converters = {
  note: async ({ tx, capture, data, repos }) => {
    const id = await repos.notesRepo.create(
      { userId: capture.userId, title: data?.title ?? null, content: capture.rawText },
      tx,
    );
    return { id, title: data?.title ?? null, content: capture.rawText };
  },

  task: async ({ tx, capture, data, repos }) => {
    const title = (data?.title ?? capture.rawText).slice(0, 255);
    const priority = data?.priority ?? 'medium';
    if (!TASK_PRIORITIES.includes(priority)) {
      throw new ValidationError(`priority harus salah satu: ${TASK_PRIORITIES.join(', ')}`);
    }
    const deadline = validateDate(data?.deadline, 'deadline');
    const id = await repos.tasksRepo.create(
      {
        userId: capture.userId,
        title,
        description: data?.description ?? null,
        priority,
        deadline,
      },
      tx,
    );
    return { id, title, description: data?.description ?? null, priority, deadline };
  },

  schedule: async ({ tx, capture, data, repos }) => {
    const title = (data?.title ?? capture.rawText).slice(0, 255);
    const startTime = validateDate(data?.startTime, 'startTime');
    if (!startTime) {
      throw new ValidationError('startTime wajib diisi untuk jadwal');
    }
    const endTime = validateDate(data?.endTime, 'endTime');
    validateTimeRange(startTime, endTime);
    const id = await repos.schedulesRepo.create(
      {
        userId: capture.userId,
        title,
        description: data?.description ?? null,
        startTime,
        endTime,
      },
      tx,
    );
    return { id, title, description: data?.description ?? null, startTime, endTime };
  },

  finance: async ({ tx, capture, data, repos }) => {
    const type = data?.type;
    if (!FINANCE_TYPES.includes(type)) {
      throw new ValidationError(`type harus salah satu: ${FINANCE_TYPES.join(', ')}`);
    }
    const amount = validatePositiveAmount(data?.amount, 'amount');
    const transactionDate = validateDate(data?.transactionDate, 'transactionDate') ?? new Date();
    const id = await repos.financeRepo.create(
      {
        userId: capture.userId,
        type,
        amount,
        description: data?.description ?? capture.rawText,
        transactionDate,
      },
      tx,
    );
    return { id, type, amount, description: data?.description ?? capture.rawText, transactionDate };
  },
};

export class CapturesService {
  constructor({ capturesRepo, notesRepo, tasksRepo, schedulesRepo, financeRepo, db }) {
    this.capturesRepo = capturesRepo;
    this.notesRepo = notesRepo;
    this.tasksRepo = tasksRepo;
    this.schedulesRepo = schedulesRepo;
    this.financeRepo = financeRepo;
    this.db = db;
  }

  async createCapture(userId, body) {
    const rawText = validateRawText(body?.rawText);
    const id = await this.capturesRepo.create({ userId, rawText, status: 'pending' });
    return { id, userId, rawText, status: 'pending' };
  }

  async listCaptures(userId, query) {
    return this.capturesRepo.findAllByUserWithPagination(userId, {
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  }

  async getCaptureById(userId, id) {
    const capture = await this.capturesRepo.findById(id, userId);
    if (!capture) throw new NotFoundError('Capture tidak ditemukan');
    return capture;
  }

  async deleteCapture(userId, id) {
    const capture = await this.capturesRepo.findById(id, userId);
    if (!capture) throw new NotFoundError('Capture tidak ditemukan');
    await this.capturesRepo.delete(id, userId);
  }

  async convertCapture(userId, captureId, body) {
    const type = validateConvertType(body?.type);
    const data = body?.data ?? {};

    // Pre-check: capture harus ada dan milik user (404 kalau tidak).
    // Pengecekan ini di luar transaksi; klaim atomik di dalam transaksi
    // yang menangani race condition.
    const capture = await this.capturesRepo.findById(captureId, userId);
    if (!capture) throw new NotFoundError('Capture tidak ditemukan');

    const repos = {
      notesRepo: this.notesRepo,
      tasksRepo: this.tasksRepo,
      schedulesRepo: this.schedulesRepo,
      financeRepo: this.financeRepo,
    };

    const result = await this.db.transaction(async (tx) => {
      // (a) Klaim capture secara atomik: hanya berhasil kalau masih 'pending'.
      const claimed = await this.capturesRepo.claimCapture(captureId, userId, type, tx);
      if (!claimed) {
        throw new ConflictError('Capture sudah dikonversi sebelumnya');
      }

      // (b) Insert ke tabel tujuan.
      const converter = converters[type];
      if (!converter) {
        throw new ValidationError(`type harus salah satu: ${CAPTURE_TYPES.join(', ')}`);
      }
      const created = await converter({ tx, capture, data, repos });

      // (c) Isi convertedId dari insertId hasil insert (bukan .returning()).
      await this.capturesRepo.setConvertedId(captureId, userId, created.id, tx);

      return { result: created };
    });
    // Re-fetch capture untuk dapat status terbaru dari DB setelah transaksi commit
    const captureFresh = await this.capturesRepo.findById(captureId, userId);
    return { capture: captureFresh, result: result.result };
  }
}
