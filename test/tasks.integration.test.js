import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';
import { TasksService } from '../src/modules/tasks/tasks.service.js';
import { TasksRepository } from '../src/modules/tasks/tasks.repository.js';
import { getInsertId } from '../src/shared/utils/dbResult.js';
import { NotFoundError, ValidationError } from '../src/shared/errors/AppError.js';

// =====================================================================
// Validasi env database tes (wajib terpisah dari dev)
// =====================================================================
const dbTestName = process.env.DB_DATABASE_TEST;
if (!dbTestName) {
  throw new Error(
    'DB_DATABASE_TEST harus diisi untuk menjalankan tes integrasi. Contoh: DB_DATABASE_TEST=catatdisini_test node --test test/tasks.integration.test.js',
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
// Koneksi ke database tes
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

const tasksRepo = new TasksRepository(testDb);
const service = new TasksService({ tasksRepo, db: testDb });

async function createUser(name, email) {
  await testDb.delete(schema.users).where(eq(schema.users.email, email));
  const result = await testDb.insert(schema.users).values({ name, email, passwordHash: 'dummy' });
  return getInsertId(result);
}

async function cleanup(userIds) {
  for (const userId of userIds) {
    if (!userId) continue;
    await testDb.delete(schema.tasks).where(eq(schema.tasks.userId, userId));
    await testDb.delete(schema.users).where(eq(schema.users.id, userId));
  }
}

let userA;
let userB;
let taskIdA;
let taskIdB;
let taskIdOtherUser;

// =====================================================================
// Setup
// =====================================================================
test('0. setup: buat 2 user dan beberapa task', async () => {
  userA = await createUser('User A', 'a-task@test.com');
  userB = await createUser('User B', 'b-task@test.com');

  const r1 = await testDb.insert(schema.tasks).values({
    userId: userA,
    title: 'Task A1',
    description: 'Desc A1',
    priority: 'high',
    status: 'todo',
    deadline: new Date('2026-12-01T10:00:00'),
  });
  taskIdA = getInsertId(r1);

  const r2 = await testDb.insert(schema.tasks).values({
    userId: userA,
    title: 'Task A2 selesai',
    description: 'Desc A2',
    priority: 'low',
    status: 'completed',
    deadline: null,
  });
  taskIdB = getInsertId(r2);

  const r3 = await testDb.insert(schema.tasks).values({
    userId: userB,
    title: 'Task B1',
    description: 'Desc B1',
    priority: 'medium',
    status: 'todo',
    deadline: new Date('2026-12-02T10:00:00'),
  });
  taskIdOtherUser = getInsertId(r3);

  assert.ok(userA > 0);
  assert.ok(userB > 0);
  assert.ok(taskIdA > 0);
});

// =====================================================================
// a. CRUD sukses
// =====================================================================
test('a. create task sukses', async () => {
  const task = await service.createTask(userA, {
    title: 'Baru',
    description: 'Deskripsi baru',
    priority: 'medium',
    status: 'todo',
    deadline: '2026-12-10T09:00:00',
  });
  assert.strictEqual(task.title, 'Baru');
  assert.strictEqual(task.priority, 'medium');
  assert.strictEqual(task.status, 'todo');
  assert.ok(task.id > 0);

  const [dbTask] = await testDb.select().from(schema.tasks).where(eq(schema.tasks.id, task.id));
  assert.ok(dbTask);
  assert.strictEqual(dbTask.userId, userA);
});

test('a. get task by id sukses', async () => {
  const task = await service.getTaskById(userA, taskIdA);
  assert.strictEqual(task.id, taskIdA);
  assert.strictEqual(task.title, 'Task A1');
});

test('a. update task sukses', async () => {
  const updated = await service.updateTask(userA, taskIdA, {
    title: 'Diubah',
    priority: 'low',
  });
  assert.strictEqual(updated.title, 'Diubah');
  assert.strictEqual(updated.priority, 'low');
  // status tidak berubah
  assert.strictEqual(updated.status, 'todo');
});

test('a. delete task sukses', async () => {
  await service.deleteTask(userA, taskIdB);
  await assert.rejects(
    service.getTaskById(userA, taskIdB),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );
});

// =====================================================================
// b. PATCH body kosong → 400; deadline null menghapus deadline
// =====================================================================
test('b. PATCH body kosong → 400', async () => {
  await assert.rejects(
    service.updateTask(userA, taskIdA, {}),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

test('b. PATCH deadline null menghapus deadline', async () => {
  // taskIdA punya deadline dari setup
  const before = await service.getTaskById(userA, taskIdA);
  assert.ok(before.deadline);

  const updated = await service.updateTask(userA, taskIdA, { deadline: null });
  assert.strictEqual(updated.deadline, null);

  const [dbTask] = await testDb.select().from(schema.tasks).where(eq(schema.tasks.id, taskIdA));
  assert.strictEqual(dbTask.deadline, null);
});

// =====================================================================
// c. PATCH nilai sama → 200, bukan 404
// =====================================================================
test('c. PATCH nilai sama → 200, bukan 404', async () => {
  const updated = await service.updateTask(userA, taskIdA, {
    title: 'Diubah',
    priority: 'low',
  });
  assert.strictEqual(updated.priority, 'low');
  assert.strictEqual(updated.title, 'Diubah');
});

// =====================================================================
// d. Task user lain → 404 di GET, PATCH, DELETE
// =====================================================================
test('d. task user lain → 404', async () => {
  // GET
  await assert.rejects(
    service.getTaskById(userB, taskIdA),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // PATCH
  await assert.rejects(
    service.updateTask(userB, taskIdA, { title: 'Coba ubah' }),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // DELETE
  await assert.rejects(
    service.deleteTask(userB, taskIdA),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // Task A tidak berubah
  const [task] = await testDb.select().from(schema.tasks).where(eq(schema.tasks.id, taskIdA));
  assert.strictEqual(task.title, 'Diubah');
  assert.strictEqual(task.userId, userA);
});

// =====================================================================
// e. Filter status, priority, date, overdue
// =====================================================================
test('e. filter status=completed', async () => {
  await service.createTask(userA, {
    title: 'Selesai',
    description: '',
    priority: 'medium',
    status: 'completed',
    deadline: null,
  });
  const result = await service.listTasks(userA, { status: 'completed', limit: 20, offset: 0 });
  assert.ok(result.data.length >= 1);
  result.data.forEach((t) => assert.strictEqual(t.status, 'completed'));
});

test('e. filter priority=high', async () => {
  await service.createTask(userA, {
    title: 'Prioritas tinggi',
    description: '',
    priority: 'high',
    status: 'todo',
    deadline: null,
  });
  const result = await service.listTasks(userA, { priority: 'high', limit: 20, offset: 0 });
  assert.ok(result.data.length >= 1);
  result.data.forEach((t) => assert.strictEqual(t.priority, 'high'));
});

test('e. filter date', async () => {
  await service.createTask(userA, {
    title: 'Tanggal tertentu',
    description: '',
    priority: 'medium',
    status: 'todo',
    deadline: '2026-12-25T10:00:00',
  });
  const result = await service.listTasks(userA, { date: '2026-12-25', limit: 20, offset: 0 });
  assert.ok(result.data.length >= 1);
  result.data.forEach((t) => {
    const d = new Date(t.deadline);
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 11);
    assert.strictEqual(d.getDate(), 25);
  });
});

test('e. filter date', async () => {
  await service.createTask(userA, {
    title: 'Tanggal tertentu',
    description: '',
    priority: 'medium',
    status: 'todo',
    deadline: '2026-12-25T10:00:00',
  });
  const result = await service.listTasks(userA, { date: '2026-12-25', limit: 20, offset: 0 });
  assert.ok(result.data.length >= 1);
  result.data.forEach((t) => {
    const d = new Date(t.deadline);
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 11);
    assert.strictEqual(d.getDate(), 25);
  });
});

test('e. filter overdue=true', async () => {
  // Task todo dengan deadline lewat (harus muncul)
  await service.createTask(userA, {
    title: 'Overdue 1',
    description: '',
    priority: 'medium',
    status: 'todo',
    deadline: '2020-01-01T00:00:00',
  });
  // Task todo dengan deadline lewat lagi
  await service.createTask(userA, {
    title: 'Overdue 2',
    description: '',
    priority: 'low',
    status: 'todo',
    deadline: '2021-06-15T12:00:00',
  });
  // Task todo dengan deadline masa depan (TIDAK boleh muncul)
  await service.createTask(userA, {
    title: 'Masa depan',
    description: '',
    priority: 'high',
    status: 'todo',
    deadline: '2030-12-31T23:59:59',
  });
  // Task todo tanpa deadline (TIDAK boleh muncul)
  await service.createTask(userA, {
    title: 'Tanpa deadline',
    description: '',
    priority: 'medium',
    status: 'todo',
    deadline: null,
  });
  // Task completed dengan deadline lewat (TIDAK boleh muncul)
  await service.createTask(userA, {
    title: 'Selesai tapi lewat',
    description: '',
    priority: 'high',
    status: 'completed',
    deadline: '2019-12-31T00:00:00',
  });

  const result = await service.listTasks(userA, { overdue: true, limit: 50, offset: 0 });

  const overdueTitles = result.data.map((t) => t.title);
  assert.ok(overdueTitles.includes('Overdue 1'), 'Overdue 1 harus muncul');
  assert.ok(overdueTitles.includes('Overdue 2'), 'Overdue 2 harus muncul');
  assert.ok(!overdueTitles.includes('Masa depan'), 'Masa depan tidak boleh muncul');
  assert.ok(!overdueTitles.includes('Tanpa deadline'), 'Tanpa deadline tidak boleh muncul');
  assert.ok(!overdueTitles.includes('Selesai tapi lewat'), 'Selesai tapi lewat tidak boleh muncul');

  // Semua yang muncul harus status todo dan deadline lewat
  result.data.forEach((t) => {
    assert.strictEqual(t.status, 'todo');
    assert.ok(t.deadline);
    assert.ok(new Date(t.deadline) < new Date());
  });
});

// =====================================================================
// f. Urutan: todo dulu, deadline terdekat, tanpa deadline paling akhir
// =====================================================================
test('f. urutan list: todo dulu, deadline terdekat, tanpa deadline akhir', async () => {
  // Buat task tambahan untuk pengujian urutan
  await service.createTask(userA, {
    title: 'Tanpa deadline',
    description: '',
    priority: 'medium',
    status: 'todo',
    deadline: null,
  });
  await service.createTask(userA, {
    title: 'Deadline dekat',
    description: '',
    priority: 'medium',
    status: 'todo',
    deadline: '2026-11-15T08:00:00',
  });

  const result = await service.listTasks(userA, { status: 'todo', limit: 50, offset: 0 });
  const todoTasks = result.data.filter((t) => t.status === 'todo');

  // Semua todo harus ada di depan sebelum completed
  const firstCompletedIndex = todoTasks.findIndex((t) => t.status === 'completed');
  assert.strictEqual(firstCompletedIndex, -1, 'tidak ada completed dalam filtered todo');

  // Cek urutan deadline: non-null dulu, null paling akhir
  const withDeadline = todoTasks.filter((t) => t.deadline);
  const withoutDeadline = todoTasks.filter((t) => !t.deadline);
  assert.ok(withDeadline.length > 0);
  if (withoutDeadline.length > 0) {
    // Semua withDeadline harus di depan withoutDeadline
    const lastWithDeadlineIdx = todoTasks.lastIndexOf(withDeadline[withDeadline.length - 1]);
    const firstWithoutDeadlineIdx = todoTasks.indexOf(withoutDeadline[0]);
    assert.ok(lastWithDeadlineIdx < firstWithoutDeadlineIdx);
  }
});

// =====================================================================
// g. Validasi
// =====================================================================
test('g. title kosong → 400', async () => {
  await assert.rejects(
    service.createTask(userA, { title: '   ' }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

test('g. title terlalu panjang → 400', async () => {
  await assert.rejects(
    service.createTask(userA, { title: 'x'.repeat(256) }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

test('g. priority invalid → 400', async () => {
  await assert.rejects(
    service.createTask(userA, { title: 'Test', priority: 'urgent' }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

test('g. deadline invalid → 400', async () => {
  await assert.rejects(
    service.createTask(userA, { title: 'Test', deadline: 'not-a-date' }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

test('g. GET/PATCH/DELETE id tidak valid → 400', async () => {
  const invalidIds = ['abc', '-1', '0'];

  for (const id of invalidIds) {
    // GET
    await assert.rejects(
      service.getTaskById(userA, id),
      (err) => err instanceof ValidationError && err.statusCode === 400,
    );

    // PATCH
    await assert.rejects(
      service.updateTask(userA, id, { title: 'Coba' }),
      (err) => err instanceof ValidationError && err.statusCode === 400,
    );

    // DELETE
    await assert.rejects(
      service.deleteTask(userA, id),
      (err) => err instanceof ValidationError && err.statusCode === 400,
    );
  }
});

// =====================================================================
// Cleanup
// =====================================================================
after(async () => {
  try {
    await cleanup([userA, userB]);
  } finally {
    await testPool.end();
  }
});
