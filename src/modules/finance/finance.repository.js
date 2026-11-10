import { BaseRepository } from '../../shared/BaseRepository.js';
import { db } from '../../db/index.js';
import { financeTransactions } from '../../db/schema.js';

export class FinanceRepository extends BaseRepository {
  constructor(customDb) {
    super(customDb ?? db, financeTransactions);
  }
}
