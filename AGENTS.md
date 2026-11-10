# AGENTS.md — Aturan Kode catatDisini

Dokumen ini dibaca oleh setiap AI agent (dan developer) sebelum menulis kode di project ini. Tujuannya: kode **rapi, reusable, mudah dibaca, mudah di-debug, dan tidak campur aduk**.

Baca juga: `docs/PRD.md` (apa yang dibangun) dan `docs/DESIGN.md` (tampilan).

---

## 0. Cara Kerja Agent

1. **Baca dulu, tulis kemudian.** Lihat struktur dan file yang sudah ada sebelum membuat file baru. Ikuti pola yang sudah ada.
2. **Kerjakan hanya yang diminta.** Jangan menambah fitur, file, atau refactor di luar scope. Kalau menemukan hal yang perlu diperbaiki di luar tugas, sebutkan di akhir, jangan langsung diubah.
3. **Jangan install package diam-diam.** Kalau butuh dependency baru, sebutkan nama dan alasannya dulu.
4. **Jangan mengubah `schema.js` atau migration** kecuali tugasnya memang soal itu.
5. **Jangan pernah menulis ulang file utuh kalau cukup mengedit bagian yang perlu.**
6. **Kalau ragu, tanya.** Lebih baik satu pertanyaan singkat daripada menebak dan salah arah.
7. Di akhir tugas, laporkan: file yang dibuat/diubah, cara mengetes, dan hal yang belum ditangani.

## Aturan Penyelesaian Tugas

- Tugas BELUM selesai sebelum server dinyalakan dan fiturnya dibuktikan lewat request HTTP asli. Tes service saja tidak cukup. Tampilkan request dan responsnya.
- Setelah memindahkan atau mengganti file, cari dan hapus file lama yang tidak dipakai lagi (grep dulu untuk memastikan tidak ada yang meng-import-nya).
- `.env.example` hanya berisi placeholder. Jangan pernah menyalin nilai dari `.env` ke file mana pun, dan jangan menampilkan nilai rahasia di output.
- Jangan mengandalkan ingatan tentang perilaku library (Drizzle, mysql2). Kalau ragu soal bentuk hasil query, tulis tes kecil ke database tes untuk memastikannya.
- Di akhir tiap tugas, laporkan secara jujur apa yang BELUM dibuktikan.
---

## 1. Stack & Aturan Dasar

| Area | Aturan |
|---|---|
| Runtime | Node.js, **ESM only** |
| Backend | Express.js |
| ORM | Drizzle ORM + MySQL (`mysql2/promise`) |
| Frontend | Next.js (static export) + React, dibungkus Tauri |
| Bahasa | JavaScript (ESM). TypeScript boleh di frontend jika disepakati. |

### ESM (wajib)
- Gunakan `import` / `export`. **Dilarang** `require()` dan `module.exports`.
- Import relatif **wajib pakai ekstensi `.js`**, dan untuk folder tulis lengkap `./db/index.js`.
- `package.json` harus memiliki `"type": "module"`.
- Tidak ada `__dirname` bawaan; pakai `import.meta.url` bila perlu.

---

## 2. Arsitektur Backend: Layered

Satu arah, tidak boleh melompat layer:

```
Route → Controller → Service → Repository → Database (Drizzle)
```

| Layer | Tanggung jawab | Tidak boleh |
|---|---|---|
| **Route** | Mendaftarkan path, pasang middleware, arahkan ke controller | Berisi logika apa pun |
| **Controller** | Baca request, panggil service, kirim response | Query database, logika bisnis |
| **Service** | Logika bisnis, aturan domain, transaksi | Akses `req`/`res`, menulis query langsung |
| **Repository** | Satu-satunya tempat query Drizzle ke database | Logika bisnis, tahu soal HTTP |
| **Middleware** | Auth, validasi, error handler, rate limit | Logika bisnis fitur |

### Struktur folder

```
src/
├── config/            # env.js (baca & validasi env), konstanta
├── db/
│   ├── schema.js
│   └── index.js
├── middleware/        # auth.js, validate.js, errorHandler.js, rateLimit.js
├── modules/           # satu folder per fitur (domain)
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   └── auth.validation.js
│   ├── captures/
│   │   ├── captures.routes.js
│   │   ├── captures.controller.js
│   │   ├── captures.service.js
│   │   ├── captures.repository.js
│   │   └── captures.validation.js
│   ├── notes/ tasks/ journals/ schedules/ finance/ calendar/
├── shared/
│   ├── errors/        # AppError.js dan turunannya
│   ├── utils/         # helper murni (tanggal, response, dll)
│   └── BaseRepository.js
├── app.js             # rakit Express app (middleware + routes), tanpa listen
└── server.js          # listen saja
```

Aturan struktur:
- **Satu folder per modul fitur.** Jangan menaruh semua controller di satu folder besar.
- `app.js` dan `server.js` dipisah supaya app bisa dites tanpa membuka port.
- File berisi **satu tanggung jawab**. Kalau file melewati ±200 baris, curigai dan pecah.

---

## 3. OOP & SOLID (secara pragmatis)

Gunakan **class** untuk Controller, Service, dan Repository. Fungsi biasa untuk helper murni. **Jangan memaksakan OOP** di tempat yang tidak butuh (misalnya util kecil, middleware sederhana).

### S — Single Responsibility
Satu class, satu alasan untuk berubah. `NotesService` mengurus aturan note, bukan format response dan bukan query SQL.

### O — Open/Closed
Tambah perilaku dengan menambah kode baru, bukan membongkar yang lama. Contoh: konversi capture memakai peta handler per tipe, sehingga menambah tipe baru cukup menambah satu handler.

```js
// captures.service.js (cuplikan konsep)
const converters = {
  note: (ctx, capture, data) => ctx.notesRepo.create(...),
  task: (ctx, capture, data) => ctx.tasksRepo.create(...),
};
```

### L — Liskov Substitution
Semua repository turunan `BaseRepository` harus bisa dipakai di tempat `BaseRepository` dipakai, dengan method yang kontraknya sama (`findById`, `findAllByUser`, `create`, `update`, `delete`).

### I — Interface Segregation
Jangan memaksa class bergantung pada method yang tidak dipakainya. Service hanya menerima repository yang benar-benar dibutuhkan.

### D — Dependency Inversion
Class menerima dependensinya lewat **constructor** (dependency injection), tidak membuatnya sendiri di dalam.

```js
// captures.service.js
export class CapturesService {
  constructor({ capturesRepo, notesRepo, tasksRepo, db }) {
    this.capturesRepo = capturesRepo;
    this.notesRepo = notesRepo;
    this.tasksRepo = tasksRepo;
    this.db = db;
  }
}
```

Perakitan (wiring) dilakukan di satu tempat, misalnya `modules/captures/index.js` atau file `container.js`. Dengan begini service mudah dites memakai repository palsu.

### Contoh pola lengkap (acuan gaya)

```js
// shared/BaseRepository.js
import { and, eq } from 'drizzle-orm';

export class BaseRepository {
  constructor(db, table) {
    this.db = db;
    this.table = table;
  }

  async findById(id, userId) {
    const [row] = await this.db
      .select()
      .from(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.userId, userId)))
      .limit(1);
    return row ?? null;
  }

  async findAllByUser(userId) {
    return this.db.select().from(this.table).where(eq(this.table.userId, userId));
  }
}
```

```js
// modules/notes/notes.controller.js
export class NotesController {
  constructor(notesService) {
    this.notesService = notesService;
  }

  create = async (req, res) => {
    const note = await this.notesService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: note });
  };
}
```

Catatan: handler memakai arrow function property (`create = async ...`) supaya `this` tidak hilang saat dipasang di route. Error dari handler async diteruskan ke error handler global lewat wrapper `asyncHandler` (lihat bagian 5).

---

## 4. Konvensi Penamaan

| Hal | Aturan | Contoh |
|---|---|---|
| File | `nama.peran.js`, huruf kecil | `captures.service.js` |
| Class | PascalCase | `CapturesService` |
| Fungsi/variabel | camelCase | `findAllByUser` |
| Konstanta | UPPER_SNAKE_CASE | `MAX_CAPTURE_LENGTH` |
| Tabel & kolom DB | snake_case | `finance_transactions`, `user_id` |
| Properti di schema JS | camelCase | `userId`, `createdAt` |
| Route | kata benda jamak, huruf kecil | `/api/notes`, `/api/captures` |
| Boolean | awalan `is`/`has`/`can` | `isConverted` |

Nama harus **menjelaskan maksud**, bukan singkatan misterius. `getPendingCaptures` lebih baik daripada `getPc`.

---

## 5. Konvensi API

### Format response (wajib konsisten)

Sukses:
```json
{ "success": true, "data": { } }
```
Sukses dengan daftar:
```json
{ "success": true, "data": [ ], "meta": { "total": 0 } }
```
Error:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Pesan untuk manusia", "details": [] } }
```

### Status code
| Kode | Pemakaian |
|---|---|
| 200 | Berhasil (GET, PUT, PATCH) |
| 201 | Berhasil membuat data |
| 204 | Berhasil hapus, tanpa body |
| 400 | Validasi gagal |
| 401 | Tidak login / token tidak valid |
| 403 | Login tapi tidak berhak |
| 404 | Data tidak ditemukan (termasuk data milik orang lain) |
| 409 | Konflik (misal email sudah terdaftar) |
| 429 | Terlalu banyak request |
| 500 | Kesalahan server (pesan generik ke client) |

### Error handling terpusat
- Buat `AppError` (dan turunan: `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ConflictError`) di `shared/errors/`.
- Service/controller **melempar** error, tidak membalas error sendiri-sendiri.
- Satu `errorHandler` middleware di akhir yang mengubah error jadi response berformat di atas.
- Bungkus handler async dengan `asyncHandler` supaya tidak perlu try/catch berulang.
- **Jangan bocorkan** detail error internal (stack trace, pesan SQL) ke client. Catat di server saja.

---

## 6. Database & Drizzle

- Semua query **hanya di Repository**.
- **Setiap query data milik user wajib memfilter `userId`.** Ini aturan keamanan terpenting. Akses data orang lain harus menghasilkan 404, bukan 403.
- Operasi yang menyentuh lebih dari satu tabel (misal konversi capture) **wajib dalam satu transaksi** (`db.transaction`).
- Jangan `select *` untuk data besar; pilih kolom yang perlu jika memungkinkan.
- Daftar panjang harus punya pagination (`limit` + `offset` atau cursor).
- MySQL: ambil ID hasil insert dari `result.insertId`. **Jangan** pakai `.returning()` (itu fitur PostgreSQL).
- Perubahan schema dilakukan lewat `schema.js` + `drizzle-kit generate` + `migrate`. Jangan ubah tabel manual di database.

---

## 7. Validasi & Keamanan

- Validasi semua input di **middleware validasi** sebelum masuk controller. Direkomendasikan library `zod` (minta persetujuan sebelum install).
- Normalisasi input: `trim`, email `lowercase`.
- Password: hash dengan bcryptjs, **tidak pernah** disimpan mentah, di-log, atau dikirim balik.
- JWT: payload hanya berisi `id`. Secret dari env, minimal 32 karakter.
- Pesan login salah **sama** untuk email salah dan password salah.
- Rate limiting wajib di login dan register.
- **Jangan pernah** commit `.env`. Sediakan `.env.example` tanpa nilai rahasia.
- **Jangan pernah menaruh secret, password database, atau API key di kode client/desktop app.**
- Jangan log data sensitif (password, token, isi journal, data finance).

---

## 8. Konfigurasi

- Semua pembacaan `process.env` dikumpulkan di `src/config/env.js`, divalidasi saat startup (gagal cepat kalau ada yang kurang).
- Bagian lain **mengimpor dari `config/env.js`**, bukan membaca `process.env` langsung.
- Tidak ada angka atau string ajaib tersebar di kode; jadikan konstanta bernama.

---

## 9. Kualitas Kode & Debugging

- **Fungsi kecil dan fokus.** Idealnya di bawah ±30 baris.
- **Hindari nested berlebihan.** Pakai early return.
- **Tidak ada kode mati**, `console.log` sisa debug, atau blok yang di-comment.
- **Komentar menjelaskan "kenapa"**, bukan "apa". Kode yang jelas tidak butuh komentar yang mengulang isinya.
- **Jangan duplikasi.** Kalau logika sama muncul tiga kali, jadikan helper atau method bersama. Tapi jangan abstraksi prematur untuk hal yang baru muncul sekali.
- **Logging terstruktur** untuk server: level (`info`, `warn`, `error`), konteks (modul, userId, requestId), tanpa data sensitif.
- Setiap error yang dilempar membawa **kode error yang spesifik**, supaya mudah dilacak.
- Fungsi murni dan class yang menerima dependensi lewat constructor = mudah dites dan mudah di-debug.

---

## 10. Pengujian

- Service diuji dengan repository palsu (mock), tanpa database sungguhan.
- Endpoint penting diuji end-to-end: happy path, validasi gagal, tanpa token, dan **akses data milik user lain** (harus 404).
- Setiap fitur baru menyertakan minimal contoh request untuk dites manual.

---

## 11. Aturan Frontend (Next.js + Tauri)

- Next.js **wajib** `output: 'export'`. Dilarang memakai fitur yang butuh server Next.js: `getServerSideProps`, Server Actions, route handler dinamis, middleware Next, dan `next/image` optimizer bawaan.
- Semua panggilan ke backend lewat **satu API client** di `lib/api.js` (base URL dari konfigurasi, otomatis menyertakan token, menangani error format standar). Komponen **tidak** memanggil `fetch` langsung.
- Pisahkan: komponen tampilan, hook data (`useCaptures`, `useTasks`), dan API client.
- Token JWT disimpan di **secure storage Tauri**, bukan `localStorage` biasa.
- Setiap layar memiliki state **loading, error, dan empty** yang dirancang, bukan dibiarkan kosong.
- Komponen kecil dan reusable; satu komponen satu tujuan. Props bernama jelas.
- Ikuti `DESIGN.md` untuk semua keputusan visual. Jangan menulis warna, ukuran font, atau jarak sembarangan; pakai token yang sudah didefinisikan.
- Aksesibilitas dasar: fokus keyboard terlihat, label pada input, kontras cukup.

---

## 12. Git & Proses

- Commit kecil dan fokus, pesan jelas dalam format: `tipe: ringkasan` (`feat: tambah endpoint captures`, `fix: filter userId di notes`, `refactor: ...`, `docs: ...`).
- Satu fitur = satu cabang (`feat/captures`, `fix/login-error`).
- Jangan commit: `.env`, `node_modules`, file build, kredensial.

---

## 13. Daftar Cek Sebelum Menyatakan Selesai

- [ ] ESM murni, tidak ada `require` / `module.exports`, import relatif pakai `.js`
- [ ] Mengikuti layer Route → Controller → Service → Repository
- [ ] Query hanya di repository, dan **selalu** memfilter `userId`
- [ ] Input divalidasi, format response dan error sesuai standar
- [ ] Operasi multi-tabel memakai transaksi
- [ ] Tidak ada secret/password yang bocor di kode atau log
- [ ] Tidak ada kode mati, `console.log` debug, atau duplikasi yang jelas
- [ ] Tidak menambah fitur di luar permintaan
- [ ] Contoh cara mengetes disertakan
- [ ] Hal yang belum ditangani disebutkan di laporan akhir
