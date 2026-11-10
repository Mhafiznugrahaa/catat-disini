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
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../src/shared/errors/AppError.js';

// =====================================================================
// Validasi env database tes (wajib terpisah dari dev)
// =====================================================================
const dbTestName = process.env.DB_DATABASE_TEST;
if (!dbTestName) {
  throw new Error(
    'DB_DATABASE_TEST harus diisi untuk menjalankan tes integrasi. Contoh: DB_DATABASE_TEST=catatdisini_test node --test test/captures.integration.test.js',
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

// =====================================================================
// Koneksi ke database tes (terpisah dari src/db/index.js yang pakai DB_DATABASE)
// =====================================================================
const testPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbTestName,
  charset: process.env.DB_CHARSET || 'utf8mb4',
});

const testDb = drizzle(testPool, { schema, mode: 'default' });

// Service dengan repository yang terhubung ke database tes
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
  // Hapus user lama dengan email yang sama (idempotent, aman untuk run berulang)
  await testDb.delete(schema.users).where(eq(schema.users.email, email));
  const result = await testDb.insert(schema.users).values({ name, email, passwordHash: 'dummy' });
  return getInsertId(result);
}

async function cleanup(userIds) {
  for (const userId of userIds) {
    if (!userId) continue;
    // Hapus data anak terlebih dahulu (karena FK ke users)
    await testDb.delete(schema.captures).where(eq(schema.captures.userId, userId));
    await testDb.delete(schema.notes).where(eq(schema.notes.userId, userId));
    await testDb.delete(schema.tasks).where(eq(schema.tasks.userId, userId));
    await testDb.delete(schema.schedules).where(eq(schema.schedules.userId, userId));
    await testDb.delete(schema.financeTransactions).where(eq(schema.financeTransactions.userId, userId));
    await testDb.delete(schema.users).where(eq(schema.users.id, userId));
  }
}

let userA;
let userB;
let captureNoteId;
let captureScheduleId;
let captureFinanceId;
let captureTaskId;
let captureParallelId;

// =====================================================================
// Setup: buat 2 user dan beberapa capture pending
// =====================================================================
test('0. setup: buat 2 user dan capture pending', async () => {
  userA = await createUser('User A', 'a@test.com');
  userB = await createUser('User B', 'b@test.com');

  const r1 = await testDb.insert(schema.captures).values({
    userId: userA,
    rawText: 'Catatan penting',
    status: 'pending',
  });
  captureNoteId = getInsertId(r1);

  const r2 = await testDb.insert(schema.captures).values({
    userId: userA,
    rawText: 'Jadwal rapat',
    status: 'pending',
  });
  captureScheduleId = getInsertId(r2);

  const r3 = await testDb.insert(schema.captures).values({
    userId: userA,
    rawText: 'Pemasukan bulanan',
    status: 'pending',
  });
  captureFinanceId = getInsertId(r3);

  const r4 = await testDb.insert(schema.captures).values({
    userId: userA,
    rawText: 'Tugas belajar',
    status: 'pending',
  });
  captureTaskId = getInsertId(r4);

  const r5 = await testDb.insert(schema.captures).values({
    userId: userA,
    rawText: 'Capture paralel',
    status: 'pending',
  });
  captureParallelId = getInsertId(r5);

  assert.ok(userA > 0);
  assert.ok(userB > 0);
  assert.ok(captureNoteId > 0);
});

// =====================================================================
// a. Konversi note, task, schedule, finance sukses
// =====================================================================
test('a. konversi note sukses', async () => {
  const result = await service.convertCapture(userA, captureNoteId, { type: 'note', data: {} });
  assert.strictEqual(result.capture.status, 'converted');
  assert.strictEqual(result.capture.convertedType, 'note');
  assert.strictEqual(result.capture.convertedId, result.result.id);
  assert.strictEqual(result.result.content, 'Catatan penting');

  const [note] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, result.result.id));
  assert.ok(note);
  assert.strictEqual(note.userId, userA);
  assert.strictEqual(note.content, 'Catatan penting');
});

test('a. konversi task sukses', async () => {
  const result = await service.convertCapture(userA, captureTaskId, {
    type: 'task',
    data: { title: 'Belajar', priority: 'high' },
  });
  assert.strictEqual(result.capture.status, 'converted');
  assert.strictEqual(result.capture.convertedType, 'task');
  assert.strictEqual(result.capture.convertedId, result.result.id);
  assert.strictEqual(result.result.title, 'Belajar');
  assert.strictEqual(result.result.priority, 'high');

  const [task] = await testDb.select().from(schema.tasks).where(eq(schema.tasks.id, result.result.id));
  assert.ok(task);
  assert.strictEqual(task.userId, userA);
});

test('a. konversi schedule sukses', async () => {
  const result = await service.convertCapture(userA, captureScheduleId, {
    type: 'schedule',
    data: { startTime: '2026-12-01T09:00:00', endTime: '2026-12-01T10:00:00' },
  });
  assert.strictEqual(result.capture.status, 'converted');
  assert.strictEqual(result.capture.convertedType, 'schedule');
  assert.strictEqual(result.capture.convertedId, result.result.id);

  const [sched] = await testDb
    .select()
    .from(schema.schedules)
    .where(eq(schema.schedules.id, result.result.id));
  assert.ok(sched);
  assert.strictEqual(sched.userId, userA);
});

test('a. konversi finance sukses', async () => {
  const result = await service.convertCapture(userA, captureFinanceId, {
    type: 'finance',
    data: { type: 'income', amount: 1000000 },
  });
  assert.strictEqual(result.capture.status, 'converted');
  assert.strictEqual(result.capture.convertedType, 'finance');
  assert.strictEqual(result.capture.convertedId, result.result.id);
  assert.strictEqual(result.result.amount, 1000000);
  assert.strictEqual(result.result.type, 'income');

  const [fin] = await testDb
    .select()
    .from(schema.financeTransactions)
    .where(eq(schema.financeTransactions.id, result.result.id));
  assert.ok(fin);
  assert.strictEqual(fin.userId, userA);
});

// =====================================================================
// b. Konversi schedule tanpa startTime -> 400, capture tetap pending
// =====================================================================
test('b. konversi schedule tanpa startTime -> 400, capture tetap pending', async () => {
  const r = await testDb.insert(schema.captures).values({
    userId: userA,
    rawText: 'Jadwal tanpa startTime',
    status: 'pending',
  });
  const capId = getInsertId(r);

  await assert.rejects(
    service.convertCapture(userA, capId, { type: 'schedule', data: {} }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );

  const [cap] = await testDb
    .select()
    .from(schema.captures)
    .where(eq(schema.captures.id, capId));
  assert.strictEqual(cap.status, 'pending');

  // Tidak ada schedule yang dibuat untuk capture ini (cek berdasarkan title default dari rawText)
  const scheds = await testDb
    .select()
    .from(schema.schedules)
    .where(eq(schema.schedules.title, 'Jadwal tanpa startTime'));
  assert.strictEqual(scheds.length, 0);

  await testDb.delete(schema.captures).where(eq(schema.captures.id, capId));
});

// =====================================================================
// c. Konversi finance amount invalid -> 400, capture tetap pending
// =====================================================================
test('c. konversi finance amount invalid -> 400, capture tetap pending', async () => {
  const r = await testDb.insert(schema.captures).values({
    userId: userA,
    rawText: 'Finance error',
    status: 'pending',
  });
  const capId = getInsertId(r);

  // amount negatif
  await assert.rejects(
    service.convertCapture(userA, capId, { type: 'finance', data: { type: 'expense', amount: -50000 } }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );

  // amount bukan angka
  await assert.rejects(
    service.convertCapture(userA, capId, { type: 'finance', data: { type: 'expense', amount: 'abc' } }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );

  const [cap] = await testDb
    .select()
    .from(schema.captures)
    .where(eq(schema.captures.id, capId));
  assert.strictEqual(cap.status, 'pending');

  // Tidak ada finance yang dibuat untuk capture ini (cek berdasarkan description default dari rawText)
  const fins = await testDb
    .select()
    .from(schema.financeTransactions)
    .where(eq(schema.financeTransactions.description, 'Finance error'));
  assert.strictEqual(fins.length, 0);

  await testDb.delete(schema.captures).where(eq(schema.captures.id, capId));
});

// =====================================================================
// d. Konversi capture yang sudah converted -> 409
// =====================================================================
test('d. konversi capture yang sudah converted -> 409', async () => {
  // captureNoteId sudah converted dari tes 'a'
  await assert.rejects(
    service.convertCapture(userA, captureNoteId, { type: 'task', data: {} }),
    (err) => err instanceof ConflictError && err.statusCode === 409,
  );

  // Tabel tujuan hanya punya satu record dari capture ini
  const notes = await testDb.select().from(schema.notes).where(eq(schema.notes.userId, userA));
  const notesForCapture = notes.filter((n) => n.content === 'Catatan penting');
  assert.strictEqual(notesForCapture.length, 1);
});

// =====================================================================
// e. Konversi paralel: satu sukses, satu 409
// =====================================================================
test('e. konversi paralel: tepat satu sukses dan satu 409', async () => {
  const results = await Promise.allSettled([
    service.convertCapture(userA, captureParallelId, { type: 'note', data: {} }),
    service.convertCapture(userA, captureParallelId, { type: 'task', data: {} }),
  ]);

  const statuses = results.map((r) => r.status);
  assert.ok(statuses.includes('fulfilled'), 'harus ada satu yang sukses');
  assert.ok(statuses.includes('rejected'), 'harus ada satu yang gagal');

  const fulfilled = results.find((r) => r.status === 'fulfilled');
  assert.ok(fulfilled, 'satu hasil harus fulfilled');

  // Tabel tujuan hanya punya satu record dari capture paralel
  const notes = await testDb.select().from(schema.notes).where(eq(schema.notes.userId, userA));
  const parallelNotes = notes.filter((n) => n.content === 'Capture paralel');
  assert.strictEqual(parallelNotes.length, 1, 'hanya satu record note yang dibuat');
});

// =====================================================================
// f. User B mengakses capture milik user A -> 404
// =====================================================================
test('f. user B akses capture user A -> 404 (GET, DELETE, convert)', async () => {
  // GET
  await assert.rejects(
    service.getCaptureById(userB, captureNoteId),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // DELETE
  await assert.rejects(
    service.deleteCapture(userB, captureNoteId),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // Convert
  await assert.rejects(
    service.convertCapture(userB, captureNoteId, { type: 'note', data: {} }),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // Capture A tidak berubah
  const [cap] = await testDb
    .select()
    .from(schema.captures)
    .where(eq(schema.captures.id, captureNoteId));
  assert.strictEqual(cap.status, 'converted');
  assert.strictEqual(cap.userId, userA);
});

// =====================================================================
// g. Validasi rawText kosong / lebih dari 5000 karakter -> 400
// =====================================================================
test('g. validasi rawText kosong -> 400', async () => {
  await assert.rejects(
    service.createCapture(userA, { rawText: '   ' }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );

  await assert.rejects(
    service.createCapture(userA, { rawText: '' }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

test('g. validasi rawText > 5000 karakter -> 400', async () => {
  const longText = 'x'.repeat(5001);
  await assert.rejects(
    service.createCapture(userA, { rawText: longText }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

// =====================================================================
// Cleanup (jalankan walau ada tes yang gagal)
// =====================================================================
after(async () => {
  try {
    await cleanup([userA, userB]);
  } finally {
    await testPool.end();
  }
});
