import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';
import { NotesRepository } from '../src/modules/notes/notes.repository.js';
import { getInsertId } from '../src/shared/utils/dbResult.js';

// =====================================================================
// Guard: database tes wajib terpisah dari database dev
// =====================================================================
const dbTestName = process.env.DB_DATABASE_TEST;
if (!dbTestName) {
  throw new Error(
    'DB_DATABASE_TEST harus diisi untuk menjalankan tes integrasi. Contoh: DB_DATABASE_TEST=catatdisini_test node --test test/notes.repository.integration.test.js',
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
const notesRepo = new NotesRepository(testDb);

async function createUser(name, email) {
  const [existing] = await testDb
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (existing) {
    await testDb.delete(schema.notes).where(eq(schema.notes.userId, existing.id));
    await testDb.delete(schema.users).where(eq(schema.users.id, existing.id));
  }
  const result = await testDb.insert(schema.users).values({ name, email, passwordHash: 'dummy' });
  return getInsertId(result);
}

async function createNote(userId, title, content) {
  const result = await testDb.insert(schema.notes).values({ userId, title, content });
  return getInsertId(result);
}

async function cleanup(userIds) {
  for (const userId of userIds) {
    if (!userId) continue;
    await testDb.delete(schema.notes).where(eq(schema.notes.userId, userId));
    await testDb.delete(schema.users).where(eq(schema.users.id, userId));
  }
}

let userA;
let userB;
let noteA1;
let noteA2;
let noteA3;
let noteA4;
let noteB1;
let noteB2;
let noteB3;
let noteB4;

test('0. setup: dua user dengan kata yang sama di title dan content', async () => {
  userA = await createUser('User A', 'note-repo-a@test.com');
  userB = await createUser('User B', 'note-repo-b@test.com');

  noteA1 = await createNote(userA, 'Kunci A', 'isi biasa A');
  noteA2 = await createNote(userA, 'Judul dua', 'kunci ada di isi A');
  noteB1 = await createNote(userB, 'Catatan B', 'berisi kunci rahasia B');
  noteB2 = await createNote(userB, 'Kunci B', 'isi biasa B');

  noteA3 = await createNote(userA, 'Diskon 50% spesial', 'promo persen');
  noteB3 = await createNote(userB, 'Promo umum', 'tanpa diskon');

  noteA4 = await createNote(userA, 'kode a_b', 'literal underscore');
  noteB4 = await createNote(userB, 'kode axb', 'huruf x');

  assert.ok(userA > 0);
  assert.ok(userB > 0);
});

test('a. pencarian "kunci" sebagai A hanya mengembalikan note milik A', async () => {
  const result = await notesRepo.findAllByUserWithPagination(userA, {
    search: 'kunci',
    limit: 20,
    offset: 0,
  });

  const ids = result.data.map((n) => n.id);
  assert.ok(ids.includes(noteA1), 'note A dengan kata di title harus muncul');
  assert.ok(ids.includes(noteA2), 'note A dengan kata di content harus muncul');
  assert.ok(!ids.includes(noteB1), 'note B tidak boleh muncul');
  assert.ok(!ids.includes(noteB2), 'note B tidak boleh muncul');
  result.data.forEach((n) => assert.strictEqual(n.userId, userA));
  assert.strictEqual(result.total, 2);
});

test('b. pencarian "%" diperlakukan sebagai karakter literal, bukan wildcard', async () => {
  const result = await notesRepo.findAllByUserWithPagination(userA, {
    search: '%',
    limit: 20,
    offset: 0,
  });

  assert.strictEqual(result.data.length, 1);
  assert.strictEqual(result.data[0].id, noteA3);
  assert.strictEqual(result.data[0].userId, userA);
});

test('c. pencarian "a_b" tidak cocok dengan "axb" (underscore di-escape)', async () => {
  const result = await notesRepo.findAllByUserWithPagination(userA, {
    search: 'a_b',
    limit: 20,
    offset: 0,
  });

  const ids = result.data.map((n) => n.id);
  assert.deepStrictEqual(ids, [noteA4]);
  assert.ok(!ids.includes(noteB4), 'note "axb" milik B tidak boleh cocok');
});

after(async () => {
  try {
    await cleanup([userA, userB]);
  } finally {
    await testPool.end();
  }
});
