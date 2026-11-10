import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';
import { NotesService } from '../src/modules/notes/notes.service.js';
import { NotesRepository } from '../src/modules/notes/notes.repository.js';
import { getInsertId } from '../src/shared/utils/dbResult.js';
import { NotFoundError, ValidationError } from '../src/shared/errors/AppError.js';

// =====================================================================
// Validasi env database tes (wajib terpisah dari dev)
// =====================================================================
const dbTestName = process.env.DB_DATABASE_TEST;
if (!dbTestName) {
  throw new Error(
    'DB_DATABASE_TEST harus diisi untuk menjalankan tes integrasi. Contoh: DB_DATABASE_TEST=catatdisini_test node --test test/notes.integration.test.js',
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

const notesRepo = new NotesRepository(testDb);
const service = new NotesService({ notesRepo });

async function createUser(name, email) {
  await testDb.delete(schema.users).where(eq(schema.users.email, email));
  const result = await testDb.insert(schema.users).values({ name, email, passwordHash: 'dummy' });
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
let noteIdA;
let noteIdB;
let noteIdOtherUser;

// =====================================================================
// Setup
// =====================================================================
test('0. setup: buat 2 user dan beberapa note', async () => {
  userA = await createUser('User A', 'a-note@test.com');
  userB = await createUser('User B', 'b-note@test.com');

  const r1 = await testDb.insert(schema.notes).values({
    userId: userA,
    title: 'Note A1',
    content: 'Isi catatan A1',
  });
  noteIdA = getInsertId(r1);

  const r2 = await testDb.insert(schema.notes).values({
    userId: userA,
    title: 'Note A2',
    content: 'Isi catatan A2',
  });
  noteIdB = getInsertId(r2);

  const r3 = await testDb.insert(schema.notes).values({
    userId: userB,
    title: 'Note B1',
    content: 'Isi catatan B1',
  });
  noteIdOtherUser = getInsertId(r3);

  assert.ok(userA > 0);
  assert.ok(userB > 0);
  assert.ok(noteIdA > 0);
});

// =====================================================================
// a. CRUD sukses
// =====================================================================
test('a. create note sukses', async () => {
  const note = await service.createNote(userA, {
    title: 'Baru',
    content: 'Isi catatan baru',
  });
  assert.strictEqual(note.title, 'Baru');
  assert.strictEqual(note.content, 'Isi catatan baru');
  assert.ok(note.id > 0);

  const [dbNote] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, note.id));
  assert.ok(dbNote);
  assert.strictEqual(dbNote.userId, userA);
});

test('a. get note by id sukses', async () => {
  const note = await service.getNoteById(userA, noteIdA);
  assert.strictEqual(note.id, noteIdA);
  assert.strictEqual(note.title, 'Note A1');
});

test('a. update note sukses', async () => {
  const updated = await service.updateNote(userA, noteIdA, {
    title: 'Diubah',
    content: 'Isi yang diubah',
  });
  assert.strictEqual(updated.title, 'Diubah');
  assert.strictEqual(updated.content, 'Isi yang diubah');
});

test('a. delete note sukses', async () => {
  await service.deleteNote(userA, noteIdB);
  await assert.rejects(
    service.getNoteById(userA, noteIdB),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );
});

// =====================================================================
// b. PATCH body kosong → 400
// =====================================================================
test('b. PATCH body kosong → 400', async () => {
  await assert.rejects(
    service.updateNote(userA, noteIdA, {}),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

// =====================================================================
// c. PATCH nilai sama → 200, bukan 404
// =====================================================================
test('c. PATCH nilai sama → 200, bukan 404', async () => {
  const updated = await service.updateNote(userA, noteIdA, {
    title: 'Diubah',
    content: 'Isi yang diubah',
  });
  assert.strictEqual(updated.title, 'Diubah');
  assert.strictEqual(updated.content, 'Isi yang diubah');
});

// =====================================================================
// d. Note user lain → 404 di GET, PATCH, DELETE
// =====================================================================
test('d. note user lain → 404', async () => {
  // GET
  await assert.rejects(
    service.getNoteById(userB, noteIdA),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // PATCH
  await assert.rejects(
    service.updateNote(userB, noteIdA, { title: 'Coba ubah' }),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // DELETE
  await assert.rejects(
    service.deleteNote(userB, noteIdA),
    (err) => err instanceof NotFoundError && err.statusCode === 404,
  );

  // Note A tidak berubah
  const [note] = await testDb.select().from(schema.notes).where(eq(schema.notes.id, noteIdA));
  assert.strictEqual(note.title, 'Diubah');
  assert.strictEqual(note.userId, userA);
});

// =====================================================================
// e. Filter search
// =====================================================================
test('e. filter search', async () => {
  const result = await service.listNotes(userA, { search: 'Diubah', limit: 20, offset: 0 });
  assert.ok(result.data.length >= 1);
  result.data.forEach((t) => {
    assert.ok(t.title.includes('Diubah') || t.content.includes('Diubah'));
  });
});

// =====================================================================
// f. Pagination
// =====================================================================
test('f. pagination limit dan offset', async () => {
  const result1 = await service.listNotes(userA, { limit: 1, offset: 0 });
  assert.strictEqual(result1.data.length, 1);

  const result2 = await service.listNotes(userA, { limit: 1, offset: 1 });
  assert.strictEqual(result2.data.length, 1);
  assert.notStrictEqual(result1.data[0].id, result2.data[0].id);
});

// =====================================================================
// g. Validasi title, content
// =====================================================================
test('g. title kosong → 400', async () => {
  await assert.rejects(
    service.createNote(userA, { title: '   ', content: 'isi' }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

test('g. title terlalu panjang → 400', async () => {
  await assert.rejects(
    service.createNote(userA, { title: 'x'.repeat(256), content: 'isi' }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

test('g. content kosong → 400', async () => {
  await assert.rejects(
    service.createNote(userA, { title: 'Judul', content: '   ' }),
    (err) => err instanceof ValidationError && err.statusCode === 400,
  );
});

// =====================================================================
// h. GET/PATCH/DELETE id tidak valid → 400 (abc, -1, 0)
// =====================================================================
test('h. GET/PATCH/DELETE id tidak valid → 400', async () => {
  const invalidIds = ['abc', '-1', '0'];

  for (const id of invalidIds) {
    // GET
    await assert.rejects(
      service.getNoteById(userA, id),
      (err) => err instanceof ValidationError && err.statusCode === 400,
    );

    // PATCH
    await assert.rejects(
      service.updateNote(userA, id, { title: 'Coba' }),
      (err) => err instanceof ValidationError && err.statusCode === 400,
    );

    // DELETE
    await assert.rejects(
      service.deleteNote(userA, id),
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
