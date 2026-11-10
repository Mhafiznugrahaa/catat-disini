import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  validateRawText,
  validateLimitOffset,
  validateStatus,
  validateConvertType,
} from './captures.validation.js';

export class CapturesController {
  constructor(capturesService) {
    this.capturesService = capturesService;
  }

  create = asyncHandler(async (req, res) => {
    const rawText = validateRawText(req.body?.rawText);
    const capture = await this.capturesService.createCapture(req.user.id, { rawText });
    res.status(201).json({ success: true, data: capture });
  });

  list = asyncHandler(async (req, res) => {
    const { limit, offset } = validateLimitOffset(req.query.limit, req.query.offset);
    const status = validateStatus(req.query.status);
    const result = await this.capturesService.listCaptures(req.user.id, { status, limit, offset });
    res.json({ success: true, data: result.data, meta: { total: result.total } });
  });

  getById = asyncHandler(async (req, res) => {
    const capture = await this.capturesService.getCaptureById(req.user.id, req.params.id);
    res.json({ success: true, data: capture });
  });

  remove = asyncHandler(async (req, res) => {
    await this.capturesService.deleteCapture(req.user.id, req.params.id);
    res.status(204).send();
  });

  convert = asyncHandler(async (req, res) => {
    const type = validateConvertType(req.body?.type);
    const data = req.body?.data ?? {};
    const result = await this.capturesService.convertCapture(req.user.id, req.params.id, {
      type,
      data,
    });
    res.json({ success: true, data: result });
  });
}
