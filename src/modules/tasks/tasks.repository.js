import { BaseRepository } from '../../shared/BaseRepository.js';
import { db } from '../../db/index.js';
import { tasks } from '../../db/schema.js';
import { eq, and, count, desc, sql } from 'drizzle-orm';
import { getAffectedRows } from '../../shared/utils/dbResult.js';

export class TasksRepository extends BaseRepository {
  constructor(customDb) {
    super(customDb ?? db, tasks);
  }

  async findAllByUserWithPagination(userId, filters, tx) {
    const { status, priority, date, overdue, limit, offset } = filters;
    const conditions = [eq(this.table.userId, userId)];

    if (status) conditions.push(eq(this.table.status, status));
    if (priority) conditions.push(eq(this.table.priority, priority));
    if (date) conditions.push(sql`DATE(${this.table.deadline}) = ${date}`);
    if (overdue) {
      conditions.push(eq(this.table.status, 'todo'));
      conditions.push(sql`${this.table.deadline} < NOW()`);
    }

    const where = and(...conditions);
    const database = this._db(tx);

    const data = await database
      .select()
      .from(this.table)
      .where(where)
      .orderBy(
        sql`CASE WHEN ${this.table.status} = 'todo' THEN 0 ELSE 1 END`,
        sql`${this.table.deadline} IS NULL`,
        sql`${this.table.deadline} ASC`,
        desc(this.table.createdAt)
      )
      .limit(limit)
      .offset(offset);

    const [{ total }] = await database.select({ total: count() }).from(this.table).where(where);
    return { data, total: Number(total ?? 0) };
  }

  async updateTask(id, userId, data, tx) {
    const result = await this._db(tx)
      .update(this.table)
      .set(data)
      .where(and(eq(this.table.id, id), eq(this.table.userId, userId)));
    return getAffectedRows(result);
  }

  async deleteTask(id, userId, tx) {
    const result = await this._db(tx)
      .delete(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.userId, userId)));
    return getAffectedRows(result);
  }
}
