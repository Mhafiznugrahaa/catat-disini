import express from 'express';
import { TasksRepository } from './tasks.repository.js';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimit } from '../../middleware/rateLimit.js';
import { config } from '../../config/env.js';
import { db } from '../../db/index.js';

const router = express.Router();

const tasksRepo = new TasksRepository(db);
const tasksService = new TasksService({ tasksRepo, db });

const tasksController = new TasksController(tasksService);

const taskRateLimit = createRateLimit({
  windowMs: config.captureRateLimitWindowMs,
  max: config.captureRateLimitMax,
  message: 'Terlalu banyak request ke tasks, coba lagi nanti.',
});

router.use(requireAuth);
router.use(taskRateLimit);

router.post('/', tasksController.create);
router.get('/', tasksController.list);
router.get('/:id', tasksController.getById);
router.patch('/:id', tasksController.update);
router.delete('/:id', tasksController.remove);

export default router;
