import assert from 'node:assert/strict';
import { CapturesService } from '../src/modules/captures/captures.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../src/shared/errors/AppError.js';

const makeRepo = (items = []) => {
  let nextId = items.length > 0 ? Math.max(...items.map((i) => i.id), 0) + 1 : 1;
  return {
    items,
    async create(data) {
      const id = nextId++;
      this.items.push({ id, ...data });
      return id;
    },
    async findById(id, userId) {
      return this.items.find((i) => i.id === id && i.userId === userId) ?? null;
    },
    async findAllByUserWithPagination(userId, { status, limit, offset }) {
      let filtered = this.items.filter((i) => i.userId === userId);
      if (status) filtered = filtered.filter((i) => i.status === status);
      const total = filtered.length;
      const data = filtered.slice(offset, offset + limit);
      return { data, total };
    },
    async update(id, userId, data) {
      const idx = this.items.findIndex((i) => i.id === id && i.userId === userId);
      if (idx !== -1) this.items[idx] = { ...this.items[idx], ...data };
      return { affectedRows: 1 };
    },
    async claimCapture(id, userId, convertedType) {
      const idx = this.items.findIndex(
        (i) => i.id === id && i.userId === userId && i.status === 'pending',
      );
      if (idx === -1) return 0;
      this.items[idx] = {
        ...this.items[idx],
        status: 'converted',
        convertedType,
        convertedAt: new Date(),
      };
      return 1;
    },
    async setConvertedId(id, userId, convertedId) {
      const idx = this.items.findIndex((i) => i.id === id && i.userId === userId);
      if (idx !== -1) this.items[idx] = { ...this.items[idx], convertedId };
      return {};
    },
    async delete(id, userId) {
      this.items = this.items.filter((i) => !(i.id === id && i.userId === userId));
      return {};
    },
  };
};

async function main() {
  const capturesRepo = makeRepo([
    { id: 1, userId: 1, rawText: 'belanja', status: 'pending', userId: 1 },
    { id: 2, userId: 1, rawText: 'sudah dikonversi', status: 'converted', userId: 1 },
    { id: 3, userId: 99, rawText: 'orang lain', status: 'pending', userId: 99 },
  ]);
  const notesRepo = makeRepo();
  const tasksRepo = makeRepo();
  const schedulesRepo = makeRepo();
  const financeRepo = makeRepo();
  const db = { transaction: async (fn) => fn({}) };
  const service = new CapturesService({
    capturesRepo,
    notesRepo,
    tasksRepo,
    schedulesRepo,
    financeRepo,
    db,
  });

  // create capture
  const created = await service.createCapture(1, { rawText: '  belanja bulanan  ' });
  assert.strictEqual(created.status, 'pending');
  assert.strictEqual(created.rawText, 'belanja bulanan');
  const newCaptureId = created.id;
  console.log('create capture OK');

  // create capture rawText kosong -> 400
  await assert.rejects(
    service.createCapture(1, { rawText: '   ' }),
    (err) => err instanceof ValidationError && err.statusCode === 400
  );
  console.log('rawText kosong -> 400 OK');

  // list capture default pending + pagination
  const listAll = await service.listCaptures(1, { status: undefined, limit: 2, offset: 0 });
  assert.strictEqual(listAll.data.length, 2);
  assert.strictEqual(listAll.total, 3);
  const listPending = await service.listCaptures(1, { status: 'pending', limit: 2, offset: 0 });
  assert.strictEqual(listPending.data.length, 2);
  assert.strictEqual(listPending.total, 2);
  console.log('list capture OK');

  // get capture by id
  const cap = await service.getCaptureById(1, 1);
  assert.strictEqual(cap.id, 1);
  console.log('get capture by id OK');

  // akses capture user lain -> 404 (bukan 403)
  await assert.rejects(
    service.getCaptureById(1, 3),
    (err) => err instanceof NotFoundError && err.statusCode === 404
  );
  console.log('capture user lain -> 404 OK');

  // delete capture
  await service.deleteCapture(1, 1);
  await assert.rejects(
    service.getCaptureById(1, 1),
    (err) => err instanceof NotFoundError
  );
  console.log('delete capture OK');

  // convert capture yang sudah converted -> 409
  await assert.rejects(
    service.convertCapture(1, 2, { type: 'task', data: {} }),
    (err) => err instanceof ConflictError && err.statusCode === 409
  );
  console.log('convert sudah converted -> 409 OK');

  // convert type invalid -> 400 (capture id 4 masih pending)
  await assert.rejects(
    service.convertCapture(1, newCaptureId, { type: 'abc', data: {} }),
    (err) => err instanceof ValidationError && err.statusCode === 400
  );
  console.log('convert type invalid -> 400 OK');

  // convert note sukses (dalam transaksi)
  const conv = await service.convertCapture(1, newCaptureId, { type: 'note', data: {} });
  assert.strictEqual(conv.capture.id, newCaptureId);
  assert.strictEqual(conv.result.content, 'belanja bulanan');
  assert.ok(notesRepo.items.find((n) => n.id === conv.result.id));
  console.log('convert note OK');

  // convert finance tanpa amount -> 400 (capture baru, tetap pending)
  await service.createCapture(1, { rawText: 'gaji gagal' });
  const gajiFailId = capturesRepo.items.find((c) => c.rawText === 'gaji gagal').id;
  await assert.rejects(
    service.convertCapture(1, gajiFailId, { type: 'finance', data: { type: 'income' } }),
    (err) => err instanceof ValidationError
  );
  console.log('finance tanpa amount -> 400 OK');

  // convert finance sukses (capture baru)
  await service.createCapture(1, { rawText: 'gaji sukses' });
  const gajiId = capturesRepo.items.find((c) => c.rawText === 'gaji sukses').id;
  const fin = await service.convertCapture(1, gajiId, {
    type: 'finance',
    data: { type: 'income', amount: 500000 },
  });
  assert.strictEqual(fin.result.amount, 500000);
  assert.strictEqual(fin.result.description, 'gaji sukses');
  console.log('convert finance OK');

  // convert schedule tanpa startTime -> 400
  await service.createCapture(1, { rawText: 'rapat' });
  const rapatId = capturesRepo.items.find((c) => c.rawText === 'rapat').id;
  await assert.rejects(
    service.convertCapture(1, rapatId, { type: 'schedule', data: {} }),
    (err) => err instanceof ValidationError
  );
  console.log('schedule tanpa startTime -> 400 OK');

  console.log('SEMUA TES CAPTURES BERHASIL');
}

main().catch((err) => {
  console.error('TES GAGAL:', err.message);
  process.exit(1);
});
