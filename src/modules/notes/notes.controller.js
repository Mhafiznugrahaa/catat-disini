import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  validateTitle,
  validateContent,
  validateId,
  validateLimitOffset,
  validateNoteUpdateBody,
} from './notes.validation.js';

export class NotesController {
  constructor(notesService) {
    this.notesService = notesService;
  }

  create = asyncHandler(async (req, res) => {
    const note = await this.notesService.createNote(req.user.id, {
      title: req.body?.title,
      content: req.body?.content,
    });
    res.status(201).json({ success: true, data: note });
  });

  list = asyncHandler(async (req, res) => {
    const { limit, offset } = validateLimitOffset(req.query.limit, req.query.offset);
    const filters = {
      search: req.query.search,
      limit,
      offset,
    };
    const result = await this.notesService.listNotes(req.user.id, filters);
    res.json({ success: true, data: result.data, meta: { total: result.total } });
  });

  getById = asyncHandler(async (req, res) => {
    const id = validateId(req.params.id);
    const note = await this.notesService.getNoteById(req.user.id, id);
    res.json({ success: true, data: note });
  });

  update = asyncHandler(async (req, res) => {
    const id = validateId(req.params.id);
    validateNoteUpdateBody(req.body);
    const note = await this.notesService.updateNote(req.user.id, id, req.body);
    res.json({ success: true, data: note });
  });

  remove = asyncHandler(async (req, res) => {
    const id = validateId(req.params.id);
    await this.notesService.deleteNote(req.user.id, id);
    res.status(204).send();
  });
}
