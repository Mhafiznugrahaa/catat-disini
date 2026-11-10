# PROGRESS.md — Kondisi Project catatDisini Saat Ini

> Dokumen ini disusun **hanya** dari isi file yang benar-benar ada di repository
> (src/, test/, docs/, konfigurasi root, dan migrasi drizzle). Tidak ada tebakan.
> Hal yang tidak ditemukan atau tidak bisa dipastikan ditulis apa adanya.

---

## 1. Ringkasan Satu Paragraf

Project ini adalah **backend API** catatDisini (Node.js + Express ESM + Drizzle ORM + MySQL).
Yang sudah berjalan secara kode: autentikasi (register, login, profil "me"), Quick Capture
(catat cepat, daftar, detail, hapus, dan konversi ke note/task/schedule/finance secara atomik),
serta CRUD Task dan CRUD Note. Ada juga repository minimal untuk Schedule dan Finance yang
dipakai oleh proses konversi capture. Struktur database lengkap sudah dibuat lewat satu file
migrasi (users, notes, journals, tasks, schedules, finance_transactions, captures). Namun
**aplikasi tidak bisa dijalankan apa adanya** karena file `src/routes/auth.js` yang diimpor
`src/index.js` rusak (import ke file yang tidak ada), sehingga autentikasi belum aktif dan
seluruh server gagal start. Selain itu belum ada modul Journal, Calendar, Home Dashboard,
Finance/Schedule CRUD, frontend/Tauri, maupun tes HTTP end-to-end.

---

## 2. Daftar Fitur per Modul

Status yang dipakai sesuai permintaan: **LENGKAP / MINIMAL (hanya create untuk konversi) /
BELUM ADA**. Catatan tambahan ditulis bila perlu.

### 2.1 Auth
- **Untuk pengguna:** membuat akun, masuk (login) untuk mendapat token, dan melihat profil sendiri.
- **Endpoint (ada di kode, tetapi belum aktif karena masalah wiring — lihat bagian 8):**
  | Method + Path | Kegunaan |
  |---|---|
  | `POST /api/auth/register` | Mendaftar akun baru; password di-hash, langsung mengembalikan token. |
  | `POST /api/auth/login` | Masuk dengan email + password; mengembalikan token. |
  | `GET /api/auth/me` | Mengambil profil user yang sedang login (butuh token). |
- **Status:** **LENGKAP secara kode**, tetapi **tidak terpasang/berjalan** karena `src/routes/auth.js` rusak.
- **Aturan penting:** email dinormalisasi lowercase + `trim`; password minimal 8 karakter; email divalidasi regex; password di-hash bcrypt (cost 10) dan tidak pernah dikembalikan; pesan login salah seragam ("Email atau password salah"); JWT payload hanya `{ id }`; `JWT_SECRET` wajib minimal 32 karakter; email duplikat → 409; register juga langsung membuat token.

### 2.2 Captures (Quick Capture / Inbox)
- **Untuk pengguna:** menyimpan catatan mentah secepat mungkin tanpa memilih kategori, melihat isi Inbox, lalu mengubahnya menjadi Note/Task/Schedule/Finance kapan saja.
- **Endpoint:**
  | Method + Path | Kegunaan |
  |---|---|
  | `POST /api/captures` | Menyimpan capture baru berstatus `pending`. |
  | `GET /api/captures` | Menampilkan daftar capture dengan filter `status` dan pagination `limit`/`offset`. |
  | `GET /api/captures/:id` | Menampilkan detail satu capture. |
  | `DELETE /api/captures/:id` | Menghapus capture. |
  | `POST /api/captures/:id/convert` | Mengonversi capture menjadi note/task/schedule/finance. |
- **Status:** **LENGKAP**.
- **Aturan penting:** semua endpoint butuh token; filter `userId` di setiap query; data milik user lain → 404; `rawText` wajib, di-`trim`, maksimal 5000 karakter; limit 1–100 (default 20); rate limit 120 request/menit/IP; konversi berjalan dalam satu transaksi database; capture yang sudah `converted` → 409; klaim capture dilakukan atomik (hanya kalau masih `pending`) untuk mencegah konversi ganda.

### 2.3 Tasks
- **Untuk pengguna:** membuat daftar tugas dengan judul, deskripsi, prioritas, status, dan tenggat waktu, lalu mengelola serta memfilternya.
- **Endpoint:**
  | Method + Path | Kegunaan |
  |---|---|
  | `POST /api/tasks` | Membuat task baru. |
  | `GET /api/tasks` | Menampilkan daftar task dengan filter `status`, `priority`, `date`, `overdue` + pagination. |
  | `GET /api/tasks/:id` | Menampilkan detail satu task. |
  | `PATCH /api/tasks/:id` | Mengubah sebagian field task. |
  | `DELETE /api/tasks/:id` | Menghapus task. |
- **Status:** **LENGKAP**.
- **Aturan penting:** semua endpoint butuh token; filter `userId`; data user lain → 404; judul wajib maksimal 255 karakter; deskripsi maksimal 5000 karakter; priority `low/medium/high` (default `medium`); status `todo/completed` (default `todo`); `deadline: null` menghapus tenggat; PATCH tanpa field → 400; urutan daftar: `todo` dulu, deadline terdekat dulu, tanpa deadline paling akhir; id harus bilangan bulat positif; rate limit 120/menit/IP.

### 2.4 Notes
- **Untuk pengguna:** membuat dan mengelola catatan bebas (judul opsional + isi), serta mencari catatan.
- **Endpoint:**
  | Method + Path | Kegunaan |
  |---|---|
  | `POST /api/notes` | Membuat catatan baru. |
  | `GET /api/notes` | Menampilkan daftar catatan dengan pencarian `search` + pagination. |
  | `GET /api/notes/:id` | Menampilkan detail satu catatan. |
  | `PATCH /api/notes/:id` | Mengubah judul dan/atau isi catatan. |
  | `DELETE /api/notes/:id` | Menghapus catatan. |
- **Status:** **LENGKAP**.
- **Aturan penting:** semua endpoint butuh token; filter `userId`; data user lain → 404; `content` wajib maksimal 10000 karakter; `title` wajib (lihat bagian 8 soal judul yang dibuat NOT NULL vs PRD nullable); PATCH tanpa field → 400; id harus bilangan bulat positif; rate limit 120/menit/IP. **Catatan:** query pencarian berpotensi melewati filter `userId` (lihat bagian 8).

### 2.5 Journals
- **Untuk pengguna (rencana):** satu entri jurnal utama per tanggal.
- **Endpoint:** **tidak ada**.
- **Status:** **BELUM ADA**. Baru ada definisi tabel `journals` di `src/db/schema.js` dan migrasi (dengan unique `(user_id, entry_date)`), tanpa repository/service/controller/route.

### 2.6 Schedules
- **Untuk pengguna (rencana):** mencatat jadwal dengan waktu mulai dan waktu selesai opsional.
- **Endpoint:** **tidak ada** (belum ada CRUD).
- **Status:** **MINIMAL** — hanya `SchedulesRepository` (turunan `BaseRepository`) yang dipakai untuk membuat jadwal saat konversi capture. Validasi yang dipakai saat konversi: `startTime` wajib, `endTime` tidak boleh sebelum `startTime`.

### 2.7 Finance
- **Untuk pengguna (rencana):** mencatat pemasukan dan pengeluaran sederhana.
- **Endpoint:** **tidak ada** (belum ada CRUD/dashboard).
- **Status:** **MINIMAL** — hanya `FinanceRepository` (turunan `BaseRepository`) yang dipakai untuk membuat transaksi saat konversi capture. Aturan saat konversi: `type` wajib `income/expense`, `amount` wajib angka positif, `transactionDate` default hari ini.

### 2.8 Modul lain yang disebut PRD tetapi tidak ditemukan
- **Calendar:** **BELUM ADA** (tidak ada folder/file modul, tidak ada endpoint query gabungan).
- **Home Dashboard:** **BELUM ADA**.
- **Logout:** **BELUM ADA**.
- **Profil dasar (ubah profil):** **BELUM ADA** (hanya `GET /api/auth/me`).
- **Frontend Next.js + Tauri:** **tidak ditemukan** di repository.

---

## 3. Peta File

### 3.1 Folder `src/` (root)
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/index.js` | Merakit Express app, memasang CORS + JSON parser, mendaftarkan route auth/captures/tasks/notes, endpoint `/` dan `/health`, error handler, lalu `app.listen`. | Entry point (`node src/index.js`); tidak diimpor file lain. |

### 3.2 Folder `src/config/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/config/env.js` | Membaca env lewat dotenv, memvalidasi env wajib + panjang `JWT_SECRET` + `PORT`/`JWT_TTL`, mengekspor objek `config` (port, jwtSecret, jwtTtl, batas rate limit captures, konfigurasi DB). | `src/index.js`, `src/middleware/auth.js`, `captures.routes.js`, `tasks.routes.js`, `notes.routes.js`. |

### 3.3 Folder `src/db/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/db/index.js` | Membuat pool `mysql2/promise` dan instance Drizzle (`db`), mengekspor `db` + `poolConnection`. Membaca `process.env` langsung (bukan lewat `config/env.js`). | Semua repository (`auth`, `captures`, `notes`, `tasks`, `schedules`, `finance`), route files, dan `GET /health`. |
| `src/db/schema.js` | Definisi tabel Drizzle: `users`, `notes`, `journals`, `tasks`, `schedules`, `financeTransactions`, `captures` beserta unique/FK. | `src/db/index.js`, semua repository, `captures.service.js` (import tidak terpakai), test integrasi, `drizzle.config.js` (untuk generate). |

### 3.4 Folder `src/middleware/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/middleware/auth.js` | `requireAuth`: membaca header `Authorization: Bearer`, verifikasi JWT, mengisi `req.user.id`, atau melempar `UnauthorizedError`. | `captures.routes.js`, `tasks.routes.js`, `notes.routes.js`, `src/routes/auth.js` (path import-nya salah). |
| `src/middleware/errorHandler.js` | Mengubah `AppError` menjadi response error standar; error lain → 500 generik dan `console.error`. | `src/index.js`. |
| `src/middleware/rateLimit.js` | `createRateLimit`: rate limiter in-memory per IP, membalas 429 dengan format error standar. **Tidak** mengekspor `rateLimitAuth`. | `captures.routes.js`, `tasks.routes.js`, `notes.routes.js`. |

### 3.5 Folder `src/routes/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/routes/auth.js` | Seharusnya merakit router auth (register/login/me). **Rusak:** mengimpor `./auth.repository.js`, `./auth.service.js`, `./auth.controller.js` yang tidak ada di folder ini, memakai path middleware `../../middleware/...` yang salah, dan mengimpor `rateLimitAuth` yang tidak diekspor. | `src/index.js` (sehingga server gagal start). |

### 3.6 Folder `src/modules/auth/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/modules/auth/auth.controller.js` | Validasi input register/login, normalisasi email, memanggil service, mengirim response 201/200. Validasi masih inline (tidak ada `auth.validation.js`). | `src/routes/auth.js` (yang rusak); tidak dipakai route lain. |
| `src/modules/auth/auth.repository.js` | Query tabel `users`: `findByEmail`, `findById`, `create` (pakai `getInsertId`); memakai `db` global (tidak injectable). | `src/routes/auth.js` (rusak) dan tidak dipakai test (test memakai mock). |
| `src/modules/auth/auth.service.js` | Logika register (cek duplikat, hash bcrypt, buat user, buat JWT), login (cek user, bandingkan password, buat JWT), getProfile. | `test/auth.service.test.js`; seharusnya `src/routes/auth.js`. |

### 3.7 Folder `src/modules/captures/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/modules/captures/captures.routes.js` | Merakit repository (captures/notes/tasks/schedules/finance), service, controller; memasang `requireAuth` + rate limit; mendaftarkan 5 endpoint captures. | `src/index.js`. |
| `src/modules/captures/captures.controller.js` | Membaca body/query, memanggil helper validasi, memanggil service, mengirim response (201/200/204). | `captures.routes.js`. |
| `src/modules/captures/captures.service.js` | Logika bisnis capture: create, list, get, delete, dan `convertCapture` (transaksi + peta `converters` per tipe). | `captures.controller.js`, `test/captures.service.test.js`, `test/captures.integration.test.js`. |
| `src/modules/captures/captures.repository.js` | Query tabel `captures`: pagination + filter status, `claimCapture` (update atomik `pending`→`converted`), `setConvertedId`, plus warisan `BaseRepository`. | `captures.routes.js`, `captures.service.js`, test captures. |
| `src/modules/captures/captures.validation.js` | Helper validasi `rawText`, `limit`/`offset`, `status`, `convertType`, `amount`, `date`, `timeRange`, plus konstanta tipe/prioritas/status. | `captures.controller.js`, `captures.service.js`. |

### 3.8 Folder `src/modules/tasks/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/modules/tasks/tasks.routes.js` | Merakit repo/service/controller, memasang `requireAuth` + rate limit, mendaftarkan 5 endpoint tasks. | `src/index.js`. |
| `src/modules/tasks/tasks.controller.js` | Membaca body/query, validasi id/limit, memanggil service, mengirim response. | `tasks.routes.js`. |
| `src/modules/tasks/tasks.service.js` | Logika bisnis task: create, list, get, update (cek dulu agar PATCH nilai sama tidak 404), delete. | `tasks.controller.js`, `test/tasks.integration.test.js`. |
| `src/modules/tasks/tasks.repository.js` | Query tabel `tasks`: pagination + filter status/priority/date/overdue, urutan khusus, `updateTask`, `deleteTask`, plus warisan `BaseRepository`. | `tasks.routes.js`, `tasks.service.js`, `captures.routes.js` (untuk konversi), test tasks. |
| `src/modules/tasks/tasks.validation.js` | Helper validasi title/description/priority/status/deadline/id/limit-offset/body update. | `tasks.controller.js`, `tasks.service.js`. |

### 3.9 Folder `src/modules/notes/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/modules/notes/notes.routes.js` | Merakit repo/service/controller, memasang `requireAuth` + rate limit, mendaftarkan 5 endpoint notes. | `src/index.js`. |
| `src/modules/notes/notes.controller.js` | Membaca body/query, validasi id/limit, memanggil service, mengirim response. | `notes.routes.js`. |
| `src/modules/notes/notes.service.js` | Logika bisnis note: create, list, get, update (cek dulu), delete. Mengimpor `validateLimitOffset` yang tidak dipakai. | `notes.controller.js`, `test/notes.integration.test.js`. |
| `src/modules/notes/notes.repository.js` | Query tabel `notes`: pagination + pencarian `title`/`content`, `updateNote`, `deleteNote`, plus warisan `BaseRepository`. | `notes.routes.js`, `notes.service.js`, `captures.routes.js` (untuk konversi), test notes. |
| `src/modules/notes/notes.validation.js` | Helper validasi title/content/id/limit-offset/body update. | `notes.controller.js`, `notes.service.js`. |

### 3.10 Folder `src/modules/schedules/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/modules/schedules/schedules.repository.js` | Repository tabel `schedules`; hanya mewarisi `BaseRepository` (find/create/update/delete). Konstruktor mengabaikan argumen `customDb`. | `captures.routes.js` (konversi), `test/captures.integration.test.js`. |

### 3.11 Folder `src/modules/finance/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/modules/finance/finance.repository.js` | Repository tabel `finance_transactions`; hanya mewarisi `BaseRepository`. Konstruktor mengabaikan argumen `customDb`. | `captures.routes.js` (konversi), `test/captures.integration.test.js`. |

### 3.12 Folder `src/shared/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `src/shared/BaseRepository.js` | CRUD generik berbasis `this.table` + filter `userId`; menyediakan `_db(tx)` untuk memilih transaksi atau koneksi biasa. | Diwarisi `CapturesRepository`, `TasksRepository`, `NotesRepository`, `SchedulesRepository`, `FinanceRepository`. |
| `src/shared/errors/AppError.js` | Kelas `AppError` + turunan `ValidationError` (400), `UnauthorizedError` (401), `NotFoundError` (404), `ConflictError` (409). | Hampir semua service/controller/middleware dan test. |
| `src/shared/utils/asyncHandler.js` | Wrapper handler async agar error diteruskan ke `next()`. | Semua controller (auth, captures, tasks, notes). |
| `src/shared/utils/dbResult.js` | `getInsertId` dan `getAffectedRows`: mengekstrak nilai dari hasil Drizzle+mysql2 (array atau objek) dan melempar error bila tidak ada. | `BaseRepository.js`, `AuthRepository.js`, `CapturesRepository.js`, test integrasi, `test/dbResult.test.js`. |

### 3.13 Folder `test/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `test/auth.service.test.js` | Uji `AuthService` dengan repository palsu (register, duplikat, login salah/benar, profil, profil tidak ada). | Dijalankan manual dengan `node test/auth.service.test.js`. |
| `test/captures.service.test.js` | Uji `CapturesService` dengan repository palsu + `db.transaction` palsu. | Dijalankan manual dengan `node test/captures.service.test.js`. |
| `test/dbResult.test.js` | Uji unit `getInsertId`/`getAffectedRows` untuk berbagai bentuk hasil query. | `node --test test/dbResult.test.js`. |
| `test/captures.integration.test.js` | Uji `CapturesService` + repository terhadap MySQL tes (konversi 4 tipe, rollback, 409, race condition paralel, akses user lain, validasi). | `npm run test:integration`. |
| `test/tasks.integration.test.js` | Uji `TasksService` + repository terhadap MySQL tes (CRUD, filter, urutan, validasi, akses user lain). | `npm run test:integration:tasks`. |
| `test/notes.integration.test.js` | Uji `NotesService` + repository terhadap MySQL tes (CRUD, pencarian, pagination, validasi, akses user lain). | `npm run test:integration:notes`. |

### 3.14 Folder `docs/`
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `docs/PRD.md` | Sumber kebenaran produk: fitur MVP, arsitektur, skema DB, roadmap, Definition of Done. | Dibaca developer/agent. |
| `docs/DESIGN.md` | Panduan visual (warna, tipografi, komponen, layout Glance/Focus/Expanded). | Dibaca developer frontend (belum ada frontend). |
| `docs/api-tests/captures.md` | Panduan manual + contoh cURL endpoint captures. | Dokumentasi/testing manual. |
| `docs/api-tests/tasks.md` | Panduan manual + contoh cURL endpoint tasks. | Dokumentasi/testing manual. |
| `docs/PROGRESS.md` | Dokumen ini: ringkasan kondisi project. | Dokumentasi. |

### 3.15 Root & migrasi
| Path | Fungsi | Dipakai oleh |
|---|---|---|
| `package.json` | Metadata + dependency (express, drizzle-orm, mysql2, bcryptjs, jsonwebtoken, cors, dotenv) dan script test integrasi. Script `test` masih placeholder. | npm. |
| `.env.example` | Contoh variabel env DB/JWT/PORT. **Berisi password DB dan JWT secret bernilai nyata** (lihat bagian 8). | Acuan konfigurasi lokal. |
| `drizzle.config.js` | Konfigurasi drizzle-kit (schema, folder output `./drizzle`, dialek MySQL, kredensial dari env). | Perintah drizzle-kit. |
| `.gitignore` | Mengabaikan `.env`, `node_modules`, build, dll. | Git. |
| `drizzle/0000_cloudy_banshee.sql` | Satu migrasi awal: membuat 7 tabel + FK ke `users` + unique email dan unique `(user_id, entry_date)`. | Database MySQL. |
| `drizzle/meta/_journal.json` | Jurnal migrasi drizzle-kit (1 entri migrasi). | drizzle-kit. |

---

## 4. Alur Penting

### 4.1 Satu request lewat API (contoh `POST /api/captures`)
1. **Masuk Express** (`src/index.js`): `cors()` → `express.json()` → router `/api/captures`.
2. **Route** (`captures.routes.js`): `router.use(requireAuth)` lalu `router.use(captureRateLimit)`, kemudian `router.post('/', capturesController.create)`.
3. **Middleware auth** (`middleware/auth.js`): ambil header `Authorization: Bearer <token>`, `jwt.verify` dengan secret, isi `req.user = { id }`; gagal → `UnauthorizedError` (401).
4. **Middleware rate limit**: hitung request per IP; lebih dari 120/menit → 429.
5. **Controller** (`captures.controller.js`): ambil `req.body.rawText`, panggil `validateRawText` (wajib, trim, ≤5000 karakter), lalu `capturesService.createCapture(req.user.id, { rawText })`.
6. **Service** (`captures.service.js`): validasi ulang `rawText`, panggil `capturesRepo.create({ userId, rawText, status: 'pending' })`.
7. **Repository** (`captures.repository.js` → warisan `BaseRepository.create`): `INSERT INTO captures ...` lewat Drizzle; ambil `insertId` dengan `getInsertId` (hasil mysql2 bisa berupa array).
8. **Database MySQL** menyimpan baris.
9. **Response**: controller mengirim `201 { success: true, data: { id, userId, rawText, status: 'pending' } }`.
10. Jika ada error di service/repository, `asyncHandler` meneruskannya ke `errorHandler`, yang mengubah `AppError` menjadi `{ success: false, error: { code, message, details } }` dengan status yang sesuai; error tak terduga → 500 generik.

### 4.2 Konversi capture jadi task (dan pencegahan race condition)
1. Controller memvalidasi `type` (`note/task/schedule/finance`) dan mengambil `data` dari body.
2. Service melakukan **pre-check** `findById(captureId, userId)` di luar transaksi; jika tidak ada / milik orang lain → 404.
3. Service membuka **satu transaksi** `db.transaction(async (tx) => { ... })`.
4. **(a) Klaim atomik** — `capturesRepo.claimCapture(id, userId, 'task', tx)` menjalankan `UPDATE captures SET status='converted', converted_type=..., converted_at=... WHERE id=? AND user_id=? AND status='pending'`. Jika `affectedRows` = 0, berarti capture sudah dikonversi (atau bukan milik user) → lempar `ConflictError` (409) dan transaksi dibatalkan.
5. **(b) Insert tujuan** — converter `task` memvalidasi `priority` dan `deadline`, lalu `tasksRepo.create({ userId, title, description, priority, deadline }, tx)` di dalam transaksi yang sama.
6. **(c) Simpan id hasil** — `capturesRepo.setConvertedId(captureId, userId, created.id, tx)` mengisi `converted_id`.
7. Transaksi **commit**; setelah itu service mengambil ulang capture untuk mengembalikan status terbaru, dan controller membalas `{ success: true, data: { capture, result } }`.
8. **Race condition dicegah** oleh langkah (a): dua request paralel sama-sama mencoba `UPDATE ... WHERE status='pending'`. MySQL mengunci baris itu, sehingga hanya satu yang mendapat `affectedRows=1`; yang kalah mendapat 0 → 409. Test `e. konversi paralel` di `captures.integration.test.js` memverifikasi tepat satu sukses dan satu gagal serta hanya satu record tujuan dibuat.
9. **Atomisitas:** jika validasi/insert gagal (mis. schedule tanpa `startTime`, finance amount negatif), seluruh transaksi rollback sehingga capture tetap `pending` dan tidak ada baris di tabel tujuan (diuji di test b dan c).

### 4.3 Login: pembuatan dan pemakaian token
1. **Pembuatan:** `POST /api/auth/login` (secara kode) → `AuthController.login` menormalisasi email → `AuthService.login` mencari user lewat `authRepo.findByEmail`, membandingkan password dengan `bcrypt.compare`, lalu `jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: `${config.jwtTtl}s` })`. Token dikembalikan bersama data user `{ id, name, email }` (tanpa `passwordHash`).
2. **Register** juga langsung membuat token dengan cara yang sama setelah membuat user.
3. **Pemakaian:** client mengirim header `Authorization: Bearer <token>`; `requireAuth` memverifikasi token dengan `config.jwtSecret`, lalu mengisi `req.user = { id: decoded.id }`. Semua query data memakai `req.user.id` sebagai `userId`, sehingga user hanya bisa mengakses datanya sendiri.
4. **Catatan penting:** alur di atas adalah isi kode service/controller/middleware. Endpoint login **belum bisa dipakai** karena `src/routes/auth.js` rusak (lihat bagian 8).

---

## 5. Tes

| File tes | Yang dites | Jenis | Jumlah tes/skenario |
|---|---|---|---|
| `test/dbResult.test.js` | `getInsertId` & `getAffectedRows`: array result, objek tunggal, dan kasus nilai tidak ada (harus melempar). | Unit murni, tanpa DB | 6 `test()` |
| `test/auth.service.test.js` | Register sukses, email duplikat → 409, login salah (password/email) → 401 seragam, login benar, profil, profil tidak ada → 404. | Mock repository (tanpa DB) | 6 skenario (script `main()`, bukan `node:test`) |
| `test/captures.service.test.js` | Create, validasi rawText, list + pagination, get, akses user lain → 404, delete, konversi ganda → 409, tipe invalid, konversi note/finance/schedule (termasuk validasi). | Mock repository + `db.transaction` palsu | 12 skenario (script `main()`, bukan `node:test`) |
| `test/captures.integration.test.js` | Konversi note/task/schedule/finance, rollback saat validasi gagal, 409 saat sudah converted, race condition paralel, akses user lain → 404, validasi rawText. | Integrasi MySQL sungguhan | 12 `test()` |
| `test/tasks.integration.test.js` | CRUD, PATCH body kosong, PATCH nilai sama, `deadline: null`, akses user lain → 404, filter status/priority/date/overdue, urutan, validasi, id invalid. | Integrasi MySQL sungguhan | 20 `test()` (ada 1 tes "filter date" duplikat) |
| `test/notes.integration.test.js` | CRUD, PATCH body kosong, PATCH nilai sama, akses user lain → 404, pencarian, pagination, validasi title/content, id invalid. | Integrasi MySQL sungguhan | 14 `test()` |

**Cara menjalankan:**
- Unit murni: `node --test test/dbResult.test.js`
- Unit berbasis script: `node test/auth.service.test.js` dan `node test/captures.service.test.js`
- Integrasi: `npm run test:integration` / `npm run test:integration:tasks` / `npm run test:integration:notes`
- Perintah `npm test` **belum berguna** karena script-nya masih `echo "Error: no test specified" && exit 1`.

**Prasyarat tes integrasi:**
- Database MySQL tes yang terpisah dari database dev. Env `DB_DATABASE_TEST` wajib diisi, **tidak boleh sama** dengan `DB_DATABASE`, dan namanya **harus berakhiran `_test`** (contoh `catatdisini_test`) — ketentuan ini diperiksa di awal file tes dan akan langsung gagal bila tidak terpenuhi.
- Env koneksi: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_CHARSET` (dipakai dengan default tertentu di file tes).
- Skema database tes sudah dimigrasi (tabel `users`, `notes`, `tasks`, `schedules`, `finance_transactions`, `captures`). File tes tidak membuat tabel sendiri.
- Tidak ada file setup/teardown database khusus; tes membuat lalu menghapus user & data terkait di `after()`.

---

## 6. Pekerjaan yang Sudah Dilakukan

Hal-hal berikut dapat dipastikan dari isi kode/komentar/tes:

| Masalah | Diperbaiki di | Bagaimana |
|---|---|---|
| Hasil `INSERT` Drizzle+mysql2 bisa berbentuk array, sehingga `insertId`/`affectedRows` bisa `NaN`/0 diam-diam. | `src/shared/utils/dbResult.js` | Helper `getInsertId`/`getAffectedRows` menangani array maupun objek dan melempar error jelas bila nilai tidak ada; diuji di `test/dbResult.test.js`. |
| Konversi capture bisa terjadi dua kali (double submit/request paralel). | `src/modules/captures/captures.repository.js` (`claimCapture`) + `captures.service.js` | Klaim atomik `UPDATE ... WHERE status='pending'` di dalam transaksi; yang kalah mendapat 409. Diuji di `captures.integration.test.js` (tes d & e). |
| Konversi bisa meninggalkan data setengah jadi (tabel tujuan terisi tapi capture tetap pending, atau sebaliknya). | `src/modules/captures/captures.service.js` | Semua langkah (klaim, insert tujuan, isi `converted_id`) dibungkus `db.transaction`; rollback saat validasi gagal. Diuji di tes b & c. |
| PATCH dengan nilai yang sama bisa salah dianggap 404 karena `affectedRows=0`. | `src/modules/tasks/tasks.service.js`, `src/modules/notes/notes.service.js` | Cek keberadaan data (`findById`) sebelum update, lalu baru update. Diuji tes "c. PATCH nilai sama → 200". |
| Akses data milik user lain harus 404, bukan 403. | Semua service + `BaseRepository` | Setiap `findById`/update/delete memakai `userId`; service melempar `NotFoundError`. Diuji di test integrasi (tes d/f). |
| `deadline` tidak bisa dihapus saat update. | `src/modules/tasks/tasks.service.js` + `tasks.validation.js` | `validateDeadline(null)` mengembalikan `null`, dan nilai `null` ikut di-set ke DB. Diuji tes "deadline null menghapus deadline". |
| Rentang waktu jadwal bisa terbalik. | `src/modules/captures/captures.validation.js` (`validateTimeRange`) | Menolak `endTime` sebelum `startTime`. |
| Validasi input capture (kosong/terlalu panjang) dan finance (amount wajib positif) belum ada. | `captures.validation.js` + `captures.service.js` | Validasi `rawText` (wajib, ≤5000), `amount` > 0, `startTime` wajib. Diuji di tes unit & integrasi. |
| Pesan login bisa membocorkan mana yang salah (email vs password). | `src/modules/auth/auth.service.js` | Keduanya melempar `UnauthorizedError('Email atau password salah')`. Diuji di `auth.service.test.js`. |
| Password berisiko ikut terkirim ke client. | `src/modules/auth/auth.service.js` | Response register/login/getProfile hanya memuat `{ id, name, email }`; tes memastikan `passwordHash` undefined. |
| Daftar task perlu urutan yang masuk akal. | `src/modules/tasks/tasks.repository.js` | Urutan `todo` dulu, deadline terdekat, tanpa deadline di akhir. Diuji tes f. |
| Daftar panjang tanpa batas. | `captures.repository.js`, `tasks.repository.js`, `notes.repository.js` | Semua daftar memakai `limit` + `offset`, dengan validasi 1–100. |
| Tes integrasi berisiko menyentuh database dev. | Ketiga file `*.integration.test.js` | Wajib `DB_DATABASE_TEST`, harus beda dari `DB_DATABASE`, dan harus berakhiran `_test`. |

---

## 7. Yang Belum Ada atau Belum Ditangani

### 7.1 Belum dibuat (fitur/modul)
- **Modul Journal:** belum ada endpoint/repository/service sama sekali (hanya tabel).
- **Modul Calendar:** belum ada modul maupun endpoint query gabungan.
- **Home Dashboard:** belum ada endpoint ringkasan.
- **CRUD Schedule:** hanya repository; belum ada route/controller/service/validation.
- **CRUD Finance + dashboard:** hanya repository; belum ada route/controller/service/validation.
- **Logout:** belum ada endpoint.
- **Ubah profil / pengaturan dasar:** belum ada (hanya `GET /api/auth/me`).
- **Frontend Next.js + Tauri** (Glance/Focus/Expanded): tidak ditemukan di repository; roadmap fase 6–9 belum dikerjakan.
- **Script npm** untuk `start`/`dev`, `generate`/`migrate`, dan unit test: belum ada.
- **Lint/typecheck:** tidak ada konfigurasi atau script.
- **Refresh token / reset password:** disebut PRD sebagai keputusan terbuka, belum dirancang.

### 7.2 Ada tapi belum berfungsi / belum benar
- **Endpoint auth (register/login/me):** kode service/controller ada, tetapi tidak terpasang karena `src/routes/auth.js` rusak. Server bahkan gagal start (lihat 8.1). Ini bukan "belum dibuat", tapi "ada dan belum bisa dipakai".
- **Rate limiting login/register:** AGENTS mewajibkan; `rateLimitAuth` yang diimpor tidak ada, dan route auth tidak aktif. Belum berfungsi.
- **Pencarian notes:** berpotensi membocorkan catatan user lain (lihat 8.6). Belum diperbaiki.

### 7.3 Ada tapi belum dites
- **Tes HTTP end-to-end lewat Express** (mis. supertest): tidak ada. AGENTS meminta pengujian endpoint (happy path, validasi, tanpa token, akses data user lain) — yang ada baru level service + DB, bukan lewat HTTP.
- **Auth di level endpoint/DB:** hanya diuji dengan mock service; tidak ada tes integrasi DB/HTTP.
- **Rate limiting:** tidak ada tes.
- **Health endpoint `/health` dan `/`:** tidak ada tes.
- **Error handler 500 generik:** tidak ada tes.
- **Perilaku `GET /api/captures` tanpa `status`:** tidak ada tes, dan dokumentasi menyebut default `pending` padahal kode mengembalikan semua status.
- **Pengecekan zona waktu:** tidak ditemukan konfigurasi zona waktu. Tanggal/tenggat diproses dengan `new Date(value)` dan filter `DATE(deadline) = ?`, serta `NOW()` untuk overdue — semuanya bergantung pada zona waktu server/klien dan belum diverifikasi.
- **Schedules/Finance:** belum ada tes khusus selain jalur konversi di tes captures.

---

## 8. Ketidaksesuaian

Dilaporkan saja, tidak diperbaiki.

1. **`src/routes/auth.js` rusak dan menempati lokasi yang salah.**
   - Mengimpor `./auth.repository.js`, `./auth.service.js`, `./auth.controller.js` yang tidak ada (file aslinya di `src/modules/auth/`).
   - Path middleware salah: `../../middleware/...` (seharusnya `../middleware/...` dari `src/routes/`).
   - Mengimpor `rateLimitAuth` yang tidak diekspor `src/middleware/rateLimit.js` (hanya ada `createRateLimit`).
   - `src/index.js` mengimpor file ini, sehingga **server gagal start**.
   - Menyimpang dari AGENTS bagian 2 (route auth seharusnya di `src/modules/auth/auth.routes.js`) dan membuat modul auth tidak terpakai.

2. **Struktur app tidak sesuai AGENTS bagian 2.** AGENTS meminta `src/app.js` (rakit app tanpa listen) dan `src/server.js` (listen saja). Yang ada adalah `src/index.js` yang melakukan keduanya sekaligus, sehingga app sulit dites tanpa membuka port.

3. **Wiring antar-layer dilakukan di file route.**
   AGENTS bagian 3 menyarankan perakitan di `modules/<fitur>/index.js` atau `container.js`. Saat ini `captures.routes.js`, `tasks.routes.js`, dan `notes.routes.js` membuat repository/service/controller sendiri. Tidak fatal, tetapi menyimpang dari saran dan menyulitkan penggantian dependency saat tes.

4. **Validasi tidak di middleware.** AGENTS bagian 7 meminta validasi input di middleware (dan struktur menyebut `middleware/validate.js`). Kenyataannya tidak ada `validate.js`; validasi dilakukan inline di controller dan service. Selain itu `auth.validation.js` yang disebut struktur AGENTS tidak ada.

5. **`.env.example` membocorkan nilai rahasia.** Berisi `DB_PASSWORD=Hafiz123` dan `JWT_SECRET` bernilai nyata. AGENTS bagian 7: `.env.example` harus tanpa nilai rahasia.

6. **Potensi kebocoran `userId` pada pencarian notes.** Di `src/modules/notes/notes.repository.js`, kondisi dibuat dengan `and(eq(userId), sql\`title LIKE ? OR content LIKE ?\`)`. Drizzle membungkus `and` menjadi `(user_id = ? and title LIKE ? OR content LIKE ?)`; karena `OR` tanpa tanda kurung, cabang `content LIKE ?` **tidak terkena filter `user_id`**. Artinya pencarian isi dapat mengembalikan note milik user lain. Menyimpang dari AGENTS bagian 6 (setiap query wajib memfilter `userId`).

7. **Repository Schedules & Finance mengabaikan database kustom.** `SchedulesRepository` dan `FinanceRepository` punya konstruktor tanpa parameter (`super(db, table)`), tidak seperti `Captures/Tasks/NotesRepository` yang menerima `customDb`. Akibatnya `new SchedulesRepository(testDb)` di `test/captures.integration.test.js` tidak benar-benar memakai `testDb` untuk operasi non-transaksi (saat ini aman hanya karena konversi selalu mengirim `tx`). Menyimpang dari pola Dependency Inversion/ konsistensi di AGENTS bagian 3.

8. **Env dibaca langsung, tidak lewat `src/config/env.js`.**
   - `src/db/index.js` memakai `process.env.*` langsung tanpa validasi.
   - `drizzle.config.js` juga membaca `process.env.*` langsung.
   - AGENTS bagian 8 meminta semua pembacaan env dikumpulkan di `config/env.js`.

9. **Kode/import mati.** `src/modules/captures/captures.service.js` mengimpor `captures` dan `eq` yang tidak dipakai; `src/modules/notes/notes.service.js` mengimpor `validateLimitOffset` yang tidak dipakai. AGENTS bagian 9 melarang kode mati.

10. **Tes duplikat.** `test/tasks.integration.test.js` mendefinisikan tes bernama `e. filter date` dua kali dengan isi hampir identik. AGENTS bagian 9 melarang duplikasi yang jelas.

11. **Dokumentasi captures tidak sesuai kode.**
    - `docs/api-tests/captures.md` menyebut `GET /api/captures` default `status=pending`, padahal kode mengembalikan semua status bila `status` kosong.
    - Contoh response menampilkan `updatedAt`, padahal tabel/schema `captures` tidak punya kolom `updated_at`/`updatedAt`.

12. **Format/logging.** `errorHandler.js` memakai `console.error(err)` tak terstruktur dan `src/index.js` memakai `console.log` saat start; AGENTS bagian 9 meminta logging terstruktur (level + konteks). Endpoint `/health` juga mengirim `err.message` mentah ke client, sedangkan AGENTS bagian 5 melarang membocorkan detail error internal.

13. **`package.json`.** Script `test` masih placeholder (`exit 1`), `"main": "index.js"` menunjuk file yang tidak ada di root, dan tidak ada script `start`/`dev`/`migrate`/`generate`. Ini menyimpang dari kebutuhan proses di AGENTS bagian 12 dan mempersulit menjalankan project.

14. **Aturan frontend (AGENTS bagian 11) belum bisa dinilai.** Tidak ditemukan file Next.js/Tauri/frontend apa pun di repository, jadi tidak ada `lib/api.js`, hook data, atau secure storage untuk dibandingkan.

---

### Catatan metode
Ringkasan ini dibuat dari 49 berkas yang dibaca: seluruh `src/` (32), seluruh `test/` (6),
`docs/` yang ada (4, sebelum PROGRESS.md), `drizzle/0000_cloudy_banshee.sql` +
`drizzle/meta/_journal.json` (2), serta `AGENTS.md`, `package.json`, `.env.example`,
`drizzle.config.js`, dan `.gitignore` (5). File `.env`, `package-lock.json`, dan
`drizzle/meta/0000_snapshot.json` **tidak dibuka**. Tidak ada file yang diubah/dihapus
selain membuat `docs/PROGRESS.md` ini.
