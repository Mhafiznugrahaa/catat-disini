import { and, eq } from 'drizzle-orm';
import { getInsertId } from '../shared/utils/dbResult.js';

export class BaseRepository {
  constructor(db, table) {
    this.db = db;
    this.table = table;
  }

  _db(tx) {
    return tx ?? this.db;
  }

  async findById(id, userId, tx) {
    const [row] = await this._db(tx)
      .select()
      .from(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.userId, userId)))
      .limit(1);
    return row ?? null;
  }

  async findAllByUser(userId, tx) {
    return this._db(tx).select().from(this.table).where(eq(this.table.userId, userId));
  }

  async create(data, tx) {
    const result = await this._db(tx).insert(this.table).values(data);
    return getInsertId(result);
  }

  async update(id, userId, data, tx) {
    return this._db(tx)
      .update(this.table)
      .set(data)
      .where(and(eq(this.table.id, id), eq(this.table.userId, userId)));
  }

  async delete(id, userId, tx) {
    return this._db(tx).delete(this.table).where(and(eq(this.table.id, id), eq(this.table.userId, userId)));
  }
}
