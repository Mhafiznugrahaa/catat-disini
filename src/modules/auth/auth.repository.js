import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getInsertId } from '../../shared/utils/dbResult.js';

export class AuthRepository {
  async findByEmail(email) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  }

  async findById(id) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(data) {
    const result = await db.insert(users).values(data);
    return getInsertId(result);
  }
}
