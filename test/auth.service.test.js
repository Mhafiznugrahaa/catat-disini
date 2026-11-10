import assert from 'node:assert/strict';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../src/shared/errors/AppError.js';

class MockRepo {
  constructor(users = []) {
    this.users = users;
  }
  async findByEmail(email) {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async findById(id) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async create(data) {
    const id = this.users.length + 1;
    this.users.push({ id, ...data });
    return id;
  }
}

async function main() {
  const repo = new MockRepo();
  const service = new AuthService({ authRepo: repo });

  // register berhasil
  const reg = await service.register({
    name: 'Asep',
    email: 'asep@mail.com',
    password: 'rahasia123',
  });
  assert.ok(reg.token);
  assert.strictEqual(reg.user.email, 'asep@mail.com');
  assert.strictEqual(reg.user.passwordHash, undefined);
  assert.ok(repo.users[0].passwordHash, 'password harus dihash');
  console.log('register OK');

  // duplikat email -> 409
  await assert.rejects(
    service.register({ name: 'Asep2', email: 'asep@mail.com', password: 'rahasia123' }),
    (err) => err instanceof ConflictError && err.statusCode === 409
  );
  console.log('duplicate email -> 409 OK');

  // login salah -> 401 (seragam)
  await assert.rejects(
    service.login({ email: 'asep@mail.com', password: 'salah' }),
    (err) => err instanceof UnauthorizedError && err.statusCode === 401
  );
  await assert.rejects(
    service.login({ email: 'tidakada@mail.com', password: 'rahasia123' }),
    (err) => err instanceof UnauthorizedError && err.statusCode === 401
  );
  console.log('login salah -> 401 seragam OK');

  // login benar
  const login = await service.login({ email: 'asep@mail.com', password: 'rahasia123' });
  assert.ok(login.token);
  assert.strictEqual(login.user.id, 1);
  console.log('login benar OK');

  // get profile
  const profile = await service.getProfile(1);
  assert.strictEqual(profile.id, 1);
  assert.strictEqual(profile.name, 'Asep');
  console.log('get profile OK');

  // profile tidak ditemukan -> 404
  await assert.rejects(
    service.getProfile(999),
    (err) => err instanceof NotFoundError && err.statusCode === 404
  );
  console.log('profile tidak ditemukan -> 404 OK');

  console.log('SEMUA TES BERHASIL');
}

main().catch((err) => {
  console.error('TES GAGAL:', err.message);
  process.exit(1);
});
