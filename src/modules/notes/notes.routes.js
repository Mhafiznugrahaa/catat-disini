import express from 'express';
import { NotesRepository } from './notes.repository.js';
import { NotesService } from './notes.service.js';
import { NotesController } from './notes.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimit } from '../../middleware/rateLimit.js';
import { config } from '../../config/env.js';

const router = express.Router();

const notesRepo = new NotesRepository();
const notesService = new NotesService({ notesRepo });
const notesController = new NotesController(notesService);

const noteRateLimit = createRateLimit({
  windowMs: config.captureRateLimitWindowMs,
  max: config.captureRateLimitMax,
  message: 'Terlalu banyak request ke notes, coba lagi nanti.',
});

router.use(requireAuth);
router.use(noteRateLimit);

router.post('/', notesController.create);
router.get('/', notesController.list);
router.get('/:id', notesController.getById);
router.patch('/:id', notesController.update);
router.delete('/:id', notesController.remove);

export default router;
