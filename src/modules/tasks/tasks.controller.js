import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  validateTitle,
  validateDescription,
  validatePriority,
  validateStatus,
  validateDeadline,
  validateLimitOffset,
  validateId,
  validateTaskUpdateBody,
} from './tasks.validation.js';

export class TasksController {
  constructor(tasksService) {
    this.tasksService = tasksService;
  }

  create = asyncHandler(async (req, res) => {
    const task = await this.tasksService.createTask(req.user.id, {
      title: req.body?.title,
      description: req.body?.description,
      priority: req.body?.priority,
      status: req.body?.status,
      deadline: req.body?.deadline,
    });
    res.status(201).json({ success: true, data: task });
  });

  list = asyncHandler(async (req, res) => {
    const { limit, offset } = validateLimitOffset(req.query.limit, req.query.offset);
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      date: req.query.date,
      overdue: req.query.overdue === 'true',
      limit,
      offset,
    };
    const result = await this.tasksService.listTasks(req.user.id, filters);
    res.json({ success: true, data: result.data, meta: { total: result.total } });
  });

  getById = asyncHandler(async (req, res) => {
    const id = validateId(req.params.id);
    const task = await this.tasksService.getTaskById(req.user.id, id);
    res.json({ success: true, data: task });
  });

  update = asyncHandler(async (req, res) => {
    const id = validateId(req.params.id);
    validateTaskUpdateBody(req.body);
    const task = await this.tasksService.updateTask(req.user.id, id, req.body);
    res.json({ success: true, data: task });
  });

  remove = asyncHandler(async (req, res) => {
    const id = validateId(req.params.id);
    await this.tasksService.deleteTask(req.user.id, id);
    res.status(204).send();
  });
}
