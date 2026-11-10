import { BaseRepository } from '../../shared/BaseRepository.js';
import { db } from '../../db/index.js';
import { captures } from '../../db/schema.js';
import { eq, and, count, desc } from 'drizzle-orm';
import { getAffectedRows } from '../../shared/utils/dbResult.js';

export class CapturesRepository extends BaseRepository {
  constructor(customDb) {
    super(customDb ?? db, captures);
  }

  async findAllByUserWithPagination(userId, { status, limit, offset }, tx) {
    const conditions = [eq(this.table.userId, userId)];
    if (status) conditions.push(eq(this.table.status, status));
    const where = and(...conditions);
    const database = this._db(tx);
    const data = await database
      .select()
      .from(this.table)
      .where(where)
      .orderBy(desc(this.table.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ total }] = await database.select({ total: count() }).from(this.table).where(where);
    return { data, total: Number(total ?? 0) };
  }

  /**
   * Klaim capture secara atomik: hanya berhasil kalau masih status 'pending'.
   * Mengembalikan jumlah baris yang berubah (0 atau 1).
   */
  async claimCapture(id, userId, convertedType, tx) {
    const result = await this._db(tx)
      .update(this.table)
      .set({ status: 'converted', convertedType, convertedAt: new Date() })
      .where(
        and(
          eq(this.table.id, id),
          eq(this.table.userId, userId),
          eq(this.table.status, 'pending'),
        ),
      );
    return getAffectedRows(result);
  }

  /**
   * Simpan convertedId hasil insert tabel tujuan.
   */
  async setConvertedId(id, userId, convertedId, tx) {
    await this._db(tx)
      .update(this.table)
      .set({ convertedId })
      .where(and(eq(this.table.id, id), eq(this.table.userId, userId)));
  }
}
