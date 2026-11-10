import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import {
  validateTitle,
  validateDescription,
  validatePriority,
  validateStatus,
  validateDeadline,
  validateLimitOffset,
  validateTaskUpdateBody,
  validateId,
} from './tasks.validation.js';

export class TasksService {
  constructor({ tasksRepo, db }) {
    this.tasksRepo = tasksRepo;
    this.db = db;
  }

  async createTask(userId, body) {
    const title = validateTitle(body?.title);
    const description = validateDescription(body?.description);
    const priority = validatePriority(body?.priority);
    const status = validateStatus(body?.status);
    const deadline = validateDeadline(body?.deadline);

    const id = await this.tasksRepo.create({
      userId,
      title,
      description,
      priority,
      status,
      deadline,
    });

    return { id, userId, title, description, priority, status, deadline };
  }

  async listTasks(userId, filters) {
    return this.tasksRepo.findAllByUserWithPagination(userId, filters);
  }

  async getTaskById(userId, id) {
    const taskId = validateId(id);
    const task = await this.tasksRepo.findById(taskId, userId);
    if (!task) throw new NotFoundError('Task tidak ditemukan');
    return task;
  }

  async updateTask(userId, id, body) {
    const taskId = validateId(id);
    // Cek keberaan dulu supaya update tanpa perubahan nilai tidak jadi 404
    const existing = await this.tasksRepo.findById(taskId, userId);
    if (!existing) throw new NotFoundError('Task tidak ditemukan');

    validateTaskUpdateBody(body);

    const title = body.title !== undefined ? validateTitle(body.title) : undefined;
    const description = body.description !== undefined ? validateDescription(body.description) : undefined;
    const priority = body.priority !== undefined ? validatePriority(body.priority) : undefined;
    const status = body.status !== undefined ? validateStatus(body.status) : undefined;
    const deadline = body.deadline !== undefined ? validateDeadline(body.deadline) : undefined;

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) data.status = status;
    if (deadline !== undefined) data.deadline = deadline;

    await this.tasksRepo.updateTask(taskId, userId, data);

    return this.tasksRepo.findById(taskId, userId);
  }

  async deleteTask(userId, id) {
    const taskId = validateId(id);
    const existing = await this.tasksRepo.findById(taskId, userId);
    if (!existing) throw new NotFoundError('Task tidak ditemukan');

    await this.tasksRepo.deleteTask(taskId, userId);
  }
}
