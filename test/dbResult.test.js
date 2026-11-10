import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getInsertId, getAffectedRows } from '../src/shared/utils/dbResult.js';

test('dbResult.getInsertId dengan array ResultSetHeader', () => {
  const result = [{ insertId: 42, affectedRows: 1 }];
  assert.strictEqual(getInsertId(result), 42);
});

test('dbResult.getInsertId dengan objek tunggal', () => {
  const result = { insertId: 7, affectedRows: 1 };
  assert.strictEqual(getInsertId(result), 7);
});

test('dbResult.getInsertId melempar kalau tidak ada', () => {
  assert.throws(() => getInsertId([{ affectedRows: 1 }]), /insertId tidak ditemukan/);
  assert.throws(() => getInsertId({ affectedRows: 1 }), /insertId tidak ditemukan/);
  assert.throws(() => getInsertId([]), /insertId tidak ditemukan/);
  assert.throws(() => getInsertId(null), /insertId tidak ditemukan/);
});

test('dbResult.getAffectedRows dengan array ResultSetHeader', () => {
  const result = [{ insertId: 42, affectedRows: 3 }];
  assert.strictEqual(getAffectedRows(result), 3);
});

test('dbResult.getAffectedRows dengan objek tunggal', () => {
  const result = { insertId: 7, affectedRows: 0 };
  assert.strictEqual(getAffectedRows(result), 0);
});

test('dbResult.getAffectedRows melempar kalau tidak ada', () => {
  assert.throws(() => getAffectedRows([{ insertId: 42 }]), /affectedRows tidak ditemukan/);
  assert.throws(() => getAffectedRows({ insertId: 7 }), /affectedRows tidak ditemukan/);
  assert.throws(() => getAffectedRows([]), /affectedRows tidak ditemukan/);
  assert.throws(() => getAffectedRows(null), /affectedRows tidak ditemukan/);
});
