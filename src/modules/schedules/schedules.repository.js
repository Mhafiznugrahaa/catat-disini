import { BaseRepository } from '../../shared/BaseRepository.js';
import { db } from '../../db/index.js';
import { schedules } from '../../db/schema.js';

export class SchedulesRepository extends BaseRepository {
  constructor(customDb) {
    super(customDb ?? db, schedules);
  }
}
