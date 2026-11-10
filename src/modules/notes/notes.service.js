import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import {
  validateTitle,
  validateContent,
  validateId,
  validateLimitOffset,
  validateNoteUpdateBody,
} from './notes.validation.js';

export class NotesService {
  constructor({ notesRepo }) {
    this.notesRepo = notesRepo;
  }

  async createNote(userId, body) {
    const title = validateTitle(body?.title);
    const content = validateContent(body?.content);

    const id = await this.notesRepo.create({
      userId,
      title,
      content,
    });

    return { id, userId, title, content };
  }

  async listNotes(userId, filters) {
    return this.notesRepo.findAllByUserWithPagination(userId, filters);
  }

  async getNoteById(userId, id) {
    const noteId = validateId(id);
    const note = await this.notesRepo.findById(noteId, userId);
    if (!note) throw new NotFoundError('Note tidak ditemukan');
    return note;
  }

  async updateNote(userId, id, body) {
    const noteId = validateId(id);
    const existing = await this.notesRepo.findById(noteId, userId);
    if (!existing) throw new NotFoundError('Note tidak ditemukan');

    validateNoteUpdateBody(body);

    const title = body.title !== undefined ? validateTitle(body.title) : undefined;
    const content = body.content !== undefined ? validateContent(body.content) : undefined;

    const data = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;

    await this.notesRepo.updateNote(noteId, userId, data);

    return this.notesRepo.findById(noteId, userId);
  }

  async deleteNote(userId, id) {
    const noteId = validateId(id);
    const existing = await this.notesRepo.findById(noteId, userId);
    if (!existing) throw new NotFoundError('Note tidak ditemukan');

    await this.notesRepo.deleteNote(noteId, userId);
  }
}
