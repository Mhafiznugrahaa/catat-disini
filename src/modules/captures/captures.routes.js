import express from 'express';
import { CapturesRepository } from './captures.repository.js';
import { NotesRepository } from '../notes/notes.repository.js';
import { TasksRepository } from '../tasks/tasks.repository.js';
import { SchedulesRepository } from '../schedules/schedules.repository.js';
import { FinanceRepository } from '../finance/finance.repository.js';
import { CapturesService } from './captures.service.js';
import { CapturesController } from './captures.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimit } from '../../middleware/rateLimit.js';
import { config } from '../../config/env.js';
import { db } from '../../db/index.js';

const router = express.Router();

const capturesRepo = new CapturesRepository();
const notesRepo = new NotesRepository();
const tasksRepo = new TasksRepository();
const schedulesRepo = new SchedulesRepository();
const financeRepo = new FinanceRepository();
const capturesService = new CapturesService({
  capturesRepo,
  notesRepo,
  tasksRepo,
  schedulesRepo,
  financeRepo,
  db,
});
const capturesController = new CapturesController(capturesService);

const captureRateLimit = createRateLimit({
  windowMs: config.captureRateLimitWindowMs,
  max: config.captureRateLimitMax,
  message: 'Terlalu banyak request ke captures, coba lagi nanti.',
});

router.use(requireAuth);
router.use(captureRateLimit);

router.post('/', capturesController.create);
router.get('/', capturesController.list);
router.get('/:id', capturesController.getById);
router.delete('/:id', capturesController.remove);
router.post('/:id/convert', capturesController.convert);

export default router;
