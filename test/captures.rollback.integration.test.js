import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';
import { CapturesService } from '../src/modules/captures/captures.service.js';
import { CapturesRepository } from '../src/modules/captures/captures.repository.js';
import { NotesRepository } from '../src/modules/notes/notes.repository.js';
import { TasksRepository } from '../src/modules/tasks/tasks.repository.js';
import { SchedulesRepository } from '../src/modules/schedules/schedules.repository.js';
import { FinanceRepository } from '../src/modules/finance/finance.repository.js';
import { getInsertId } from '../src/shared/utils/dbResult.js';

// =====================================================================
// Guard: database tes wajib terpisah dari database dev
// =====================================================================
const dbTestName = process.env.DB_DATABASE_TEST;
if (!dbTestName) {
  throw new Error(
    'DB_DATABASE_TEST harus diisi untuk menjalankan tes integrasi. Contoh: DB_DATABASE_TEST=catatdisini_test node --test test/captures.rollback.integration.test.js',
  );
}
if (dbTestName === process.env.DB_DATABASE) {
  throw new Error(
    'DB_DATABASE_TEST tidak boleh sama dengan DB_DATABASE. Tes tidak boleh menyentuh database dev.',
  );
}
if (!dbTestName.endsWith('_test')) {
  throw new Error('DB_DATABASE_TEST harus berakhiran "_test" (contoh: catatdisini_test)');
}

const testPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbTestName,
  charset: process.env.DB_CHARSET || 'utf8mb4',
});

const testDb = drizzle(testPool, { schema, mode: 'default' });

const capturesRepo = new CapturesRepository(testDb);
const notesRepo = new NotesRepository(testDb);
const tasksRepo = new TasksRepository(testDb);
const schedulesRepo = new SchedulesRepository(testDb);
const financeRepo = new FinanceRepository(testDb);

const service = new CapturesService({
  capturesRepo,
  notesRepo,
  tasksRepo,
  schedulesRepo,
  financeRepo,
  db: testDb,
});

async function createUser(name, email) {
  const [existing] = await testDb
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (existing) {
    await cleanupUserData(existing.id);
    await testDb.delete(schema.users).where(eq(schema.users.id, existing.id));
  }
  const result = await testDb.insert(schema.users).values({ name, email, passwordHash: 'dummy' });
  return getInsertId(result);
}

async function cleanupUserData(userId) {
  await testDb.delete(schema.captures).where(eq(schema.captures.userId, userId));
  await testDb.delete(schema.notes).where(eq(schema.notes.userId, userId));
  await testDb.delete(schema.tasks).where(eq(schema.tasks.userId, userId));
  await testDb.delete(schema.schedules).where(eq(schema.schedules.userId, userId));
  await testDb.delete(schema.financeTransactions).where(eq(schema.financeTransactions.userId, userId));
  await testDb.delete(schema.journals).where(eq(schema.journals.userId, userId));
}

async function createPendingCapture(userId, rawText) {
  const result = await testDb
    .insert(schema.captures)
    .values({ userId, rawText, status: 'pending' });
  return getInsertId(result);
}

let userA;

test('0. setup user untuk tes rollback', async () => {
  userA = await createUser('Rollback User', 'rollback@test.com');
  assert.ok(userA > 0);
});

test('a. schedule: gagal setelah insert membatalkan seluruh transaksi', async () => {
  const captureId = await createPendingCapture(userA, 'Jadwal rollback');
  let insertedId = null;

  try {
    capturesRepo.setConvertedId = async (id, userId, convertedId) => {
      insertedId = convertedId;
      throw new Error('forced failure after insert');
    };

    await assert.rejects(
      service.convertCapture(userA, captureId, {
        type: 'schedule',
        data: { startTime: '2026-12-01T09:00:00', endTime: '2026-12-01T10:00:00' },
      }),
      /forced failure after insert/,
    );
  } finally {
    delete capturesRepo.setConvertedId;
  }

  assert.ok(insertedId > 0, 'insert ke tabel tujuan harus sempat terjadi sebelum gagal');

  const schedules = await testDb
    .select()
    .from(schema.schedules)
    .where(eq(schema.schedules.title, 'Jadwal rollback'));
  assert.strictEqual(schedules.length, 0, 'row schedule harus ikut dibatalkan');

  const [capture] = await testDb
    .select()
    .from(schema.captures)
    .where(eq(schema.captures.id, captureId));
  assert.strictEqual(capture.status, 'pending');
  assert.strictEqual(capture.convertedType, null);
  assert.strictEqual(capture.convertedId, null);

  await testDb.delete(schema.captures).where(eq(schema.captures.id, captureId));
});

test('b. finance: gagal setelah insert membatalkan seluruh transaksi', async () => {
  const captureId = await createPendingCapture(userA, 'Finance rollback');
  let insertedId = null;

  try {
    capturesRepo.setConvertedId = async (id, userId, convertedId) => {
      insertedId = convertedId;
      throw new Error('forced failure after insert');
    };

    await assert.rejects(
      service.convertCapture(userA, captureId, {
        type: 'finance',
        data: { type: 'expense', amount: 10000 },
      }),
      /forced failure after insert/,
    );
  } finally {
    delete capturesRepo.setConvertedId;
  }

  assert.ok(insertedId > 0, 'insert ke tabel tujuan harus sempat terjadi sebelum gagal');

  const transactions = await testDb
    .select()
    .from(schema.financeTransactions)
    .where(eq(schema.financeTransactions.description, 'Finance rollback'));
  assert.strictEqual(transactions.length, 0, 'row finance harus ikut dibatalkan');

  const [capture] = await testDb
    .select()
    .from(schema.captures)
    .where(eq(schema.captures.id, captureId));
  assert.strictEqual(capture.status, 'pending');
  assert.strictEqual(capture.convertedType, null);
  assert.strictEqual(capture.convertedId, null);

  await testDb.delete(schema.captures).where(eq(schema.captures.id, captureId));
});

after(async () => {
  try {
    if (userA) {
      await cleanupUserData(userA);
      await testDb.delete(schema.users).where(eq(schema.users.id, userA));
    }
  } finally {
    await testPool.end();
  }
});
