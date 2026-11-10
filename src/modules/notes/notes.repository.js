import { BaseRepository } from '../../shared/BaseRepository.js';
import { db } from '../../db/index.js';
import { notes } from '../../db/schema.js';
import { eq, and, or, like, count, desc } from 'drizzle-orm';
import { getAffectedRows } from '../../shared/utils/dbResult.js';

function escapeLikePattern(value) {
  return String(value).replace(/[\\%_]/g, (char) => `\\${char}`);
}

export class NotesRepository extends BaseRepository {
  constructor(customDb) {
    super(customDb ?? db, notes);
  }

  async findAllByUserWithPagination(userId, filters, tx) {
    const { search, limit, offset } = filters;
    const conditions = [eq(this.table.userId, userId)];
    if (search) {
      const pattern = `%${escapeLikePattern(search)}%`;
      conditions.push(
        or(
          like(this.table.title, pattern),
          like(this.table.content, pattern),
        ),
      );
    }
    const where = and(...conditions);
    const database = this._db(tx);
    const data = await database
      .select()
      .from(this.table)
      .where(where)
      .orderBy(desc(this.table.updatedAt), desc(this.table.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ total }] = await database.select({ total: count() }).from(this.table).where(where);
    return { data, total: Number(total ?? 0) };
  }

  async updateNote(id, userId, data, tx) {
    const result = await this._db(tx)
      .update(this.table)
      .set(data)
      .where(and(eq(this.table.id, id), eq(this.table.userId, userId)));
    return getAffectedRows(result);
  }

  async deleteNote(id, userId, tx) {
    const result = await this._db(tx)
      .delete(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.userId, userId)));
    return getAffectedRows(result);
  }
}
