# catatDisini — Product Requirement Document

> Versi: 1.1 (PRD v1.0 + keputusan teknis & platform)
> Dokumen ini adalah **sumber kebenaran** untuk apa yang dibangun dan kenapa. Aturan penulisan kode ada di `AGENTS.md`, aturan tampilan ada di `docs/DESIGN.md`. Kalau ada konflik, urutan prioritasnya: PRD.md → AGENTS.md → DESIGN.md.

---

## 1. Ringkasan Produk

**catatDisini** adalah all-in-one workspace dan personal hub untuk mencatat, merencanakan, dan mengelola aktivitas sehari-hari dalam satu tempat.

> "Apa pun yang ingin kamu catat, catat di sini dulu."

| | |
|---|---|
| Tipe produk | Personal productivity & digital journal |
| Business model | Freemium |
| Fokus MVP | Capture, Notes, Journal, Tasks, Schedule, Calendar, Finance |
| Platform | Desktop widget (prioritas pertama), lalu web, lalu mobile |

### Prinsip produk
Produk **tidak** berusaha menggantikan Notion, Todoist, Google Calendar, atau aplikasi finance secara mendalam. Nilai utamanya adalah **integrasi + simplicity + habit**. Aktivitas dasar harus terasa cukup dalam satu tempat tanpa memaksa pengguna mempelajari sistem yang kompleks.

---

## 2. Perubahan Keputusan dari PRD v1.0

PRD awal menulis "Mobile-first". Keputusan terbaru:

| Topik | v1.0 | v1.1 (berlaku sekarang) |
|---|---|---|
| Platform pertama | Mobile-first | **Desktop widget dulu**, web dan mobile menyusul |
| Urutan eksekusi | Tidak ditentukan | Backend → Desktop app → Web → Mobile |
| Penyimpanan data | Tidak ditentukan | **Realtime ke API**, tanpa database lokal |
| Fitur per platform | Tidak dibahas | Semua fitur sama di semua platform (tidak ada versi "lite") |

Visi jangka panjang tetap sama: satu produk, satu backend, banyak platform.

---

## 3. Target User

| Persona | Kebutuhan | Goal |
|---|---|---|
| Mahasiswa | Jadwal kuliah, deadline tugas, catatan, journal, pengeluaran harian | Buka satu aplikasi dan langsung tahu apa yang harus dilakukan |
| Young Professional | Meeting, task, catatan, pencatatan keuangan | Mengelola aktivitas personal tanpa sistem rumit |
| Writer / Content Creator | Menangkap ide, draft, journal, content planning | Tidak kehilangan ide yang muncul tiba-tiba |
| Productivity Beginner | Ingin mulai mengatur hidup secara digital | Alternatif yang tidak serumit Notion |

---

## 4. Problem & Solution

**Problem utama:** *"Saya punya banyak hal yang ingin dicatat dan diingat, tetapi tempat untuk menyimpannya tersebar di mana-mana."*

Akar masalah: data terfragmentasi, context switching antar aplikasi, informasi antar aktivitas terputus, dan aplikasi productivity lain terlalu kompleks.

**Solusi: Capture First.** Pengguna tidak harus langsung memilih kategori. Mereka cukup menulis dulu, lalu mengategorikan nanti.

```
User punya sesuatu
   ↓
Quick Capture (tulis secepat mungkin)
   ↓
Simpan dulu (status: pending di Inbox)
   ↓
Pilih tipe kapan saja: Note | Task | Schedule | Finance
   ↓
Muncul kembali di konteks yang relevan
```

**Core loop:** Capture → Organize → Plan → Do → Reflect → Capture lagi.

---

## 5. Goals & Metrik

| Goal | Target |
|---|---|
| Kurangi fragmentasi | ≥60% active user memakai minimal 2 modul |
| Bangun kebiasaan harian | Retensi D1 ≥35%, D7 ≥20%, D30 ≥10% |
| Capture cepat | Catatan sederhana masuk dalam kurang dari 10 detik |
| Trust & privasi | Data journal dan finance diperlakukan sebagai data pribadi dan dilindungi ketat |

**North Star Metric:** Weekly Meaningful Captures.

---

## 6. Fitur MVP

### 6.1 Quick Capture — Must Have
Tempat tercepat memasukkan informasi tanpa memilih modul dulu.
- User bisa membuka Quick Capture dari Home / Glance mode.
- User memasukkan teks, lalu **boleh langsung disimpan tanpa kategori**.
- Capture yang belum dikategorikan tampil di **Inbox** (status `pending`).
- User bisa mengonversi capture menjadi Note, Task, Schedule, atau Finance kapan saja.
- Capture tidak boleh hilang datanya dalam kondisi apa pun.

### 6.2 Notes & Journal — Must Have
- CRUD note dan journal dengan format dasar: bold, italic, heading, bullet, numbered list, link.
- Note = catatan bebas. Journal = satu entry utama per tanggal.

### 6.3 Daily Planner & To-Do — Must Have
- Task dengan title, deskripsi, deadline, priority (Low / Medium / High), status (Todo / Completed).

### 6.4 Schedule & Calendar — Must Have
- Schedule punya waktu mulai dan opsional waktu selesai.
- **Calendar adalah view gabungan**, bukan source of truth. Isinya dikumpulkan dari task deadline, schedule, journal, dan transaksi finance berdasarkan tanggal. Calendar **tidak punya tabel sendiri** dan tidak membuat data duplikat.

### 6.5 Simple Finance Tracker — Must Have
- Catat income dan expense manual.
- Dashboard cukup: Income, Expense, Net, Recent Transactions. Tanpa analytics kompleks.

### 6.6 Home Dashboard — Must Have
Menjawab: *"Apa yang sedang terjadi dalam hidup saya hari ini?"*
- Today, Upcoming, Recent Notes, Quick Capture, jumlah capture di Inbox.
- Hindari dashboard penuh statistik.

---

## 7. Perilaku Platform: Desktop Widget

Desktop app dibuat dengan **Tauri** dan **tiga level window**:

| Mode | Ukuran kasar | Isi dan fungsi | Cara masuk |
|---|---|---|---|
| **Glance** | ±320×420 | Ringkasan Home (task hari ini, upcoming) **plus Quick Capture yang bisa langsung dipakai mengetik dan menyimpan**. Bukan sekadar tampilan info. | Mode default, menempel di desktop |
| **Focus** | ±400×600 | Satu modul dalam bentuk ringkas, misalnya menulis Note, melihat Task list dengan checkbox | Klik item atau menu dari Glance |
| **Expanded** | Penuh, resizable | Semua modul lengkap: Notes, Journal, Tasks, Schedule, Calendar, Finance | Tombol expand |

Pengaturan window Tauri: tanpa dekorasi bawaan OS, background transparan, ukuran Glance dikunci, selalu di lapisan bawah (menempel di wallpaper) pada mode Glance.

Catatan: notifikasi (reminder deadline/schedule) **ditunda**, belum masuk scope tahap ini.

---

## 8. Arsitektur Teknis

```
┌────────────────────────────────────────┐
│ Desktop App (Tauri)                    │
│  Next.js static export + React         │
│  Glance / Focus / Expanded             │
└───────────────┬────────────────────────┘
                │ HTTP (fetch) + JWT (Authorization: Bearer)
                ▼
┌────────────────────────────────────────┐
│ Backend API                            │
│  Node.js + Express (ESM)               │
│  Drizzle ORM                           │
└───────────────┬────────────────────────┘
                │ mysql2
                ▼
┌────────────────────────────────────────┐
│ MySQL (source of truth tunggal)        │
└────────────────────────────────────────┘
```

| Layer | Teknologi |
|---|---|
| Desktop shell | Tauri |
| Frontend | Next.js (`output: 'export'`) + React |
| Backend | Node.js + Express.js, **ESM only** |
| ORM | Drizzle ORM |
| Database | MySQL (charset `utf8mb4`) |
| Auth | JWT + bcryptjs; token disimpan di secure storage Tauri |

### Keputusan arsitektur
1. **Desktop app tidak pernah terhubung langsung ke database.** Semua lewat API.
2. **Realtime ke API.** Setiap create/update/delete langsung ke server. Konsekuensi: aplikasi **wajib online**. Cache lokal dicatat sebagai future improvement.
3. **Satu backend untuk semua platform.** Web dan mobile nanti memakai API yang sama.
4. **Secret tidak pernah ada di kode client.** Semua kredensial dan secret hanya di backend.

---

## 9. Skema Database

Semua tabel punya `id` (PK, auto increment), `created_at`, dan `updated_at` kecuali dicatat lain. Semua data milik user memiliki `user_id` (FK ke `users`).

### `users`
| Kolom | Tipe | Catatan |
|---|---|---|
| name | varchar(255) | |
| email | varchar(255) | unique, disimpan lowercase |
| password_hash | varchar(255) | hasil bcrypt, tidak pernah dikirim ke client |

### `notes`
| Kolom | Tipe | Catatan |
|---|---|---|
| title | varchar(255) | nullable |
| content | text | |

### `journals`
| Kolom | Tipe | Catatan |
|---|---|---|
| entry_date | date | |
| content | text | |
| — | unique(user_id, entry_date) | satu entry utama per tanggal |

### `tasks`
| Kolom | Tipe | Catatan |
|---|---|---|
| title | varchar(255) | |
| description | text | nullable |
| priority | enum(low, medium, high) | default medium |
| status | enum(todo, completed) | default todo |
| deadline | datetime | nullable |

### `schedules`
| Kolom | Tipe | Catatan |
|---|---|---|
| title | varchar(255) | |
| description | text | nullable |
| start_time | datetime | |
| end_time | datetime | nullable |

### `finance_transactions`
| Kolom | Tipe | Catatan |
|---|---|---|
| type | enum(income, expense) | |
| amount | decimal(12,2) | |
| description | varchar(255) | nullable |
| transaction_date | date | |

### `captures` (Inbox Quick Capture)
| Kolom | Tipe | Catatan |
|---|---|---|
| raw_text | text | isi mentah |
| status | enum(pending, converted) | default pending |
| converted_type | enum(note, task, schedule, finance) | nullable, diisi saat konversi |
| converted_id | int | nullable, id row hasil konversi |
| created_at | timestamp | |
| converted_at | timestamp | nullable |

**Alur konversi capture** (harus dalam satu transaksi database):
```
INSERT row baru di tabel tujuan
   → UPDATE captures: status='converted', converted_type, converted_id, converted_at
```
Kalau salah satu langkah gagal, keduanya dibatalkan.

---

## 10. Konvensi API (ringkas)

Detail implementasi ada di `AGENTS.md`. Di level produk:
- Semua endpoint di bawah prefix `/api`.
- Semua endpoint selain register/login membutuhkan JWT.
- User **hanya boleh mengakses data miliknya sendiri**.
- Format response sukses dan error konsisten di seluruh endpoint.

Daftar endpoint dirancang bertahap sesuai urutan di bagian 12.

---

## 11. Scope

### In scope (MVP)
Auth (register, login, logout), profil dasar, Quick Capture + Inbox, Notes & Journal CRUD, Tasks, Schedule, Integrated Calendar, Finance sederhana, Home Dashboard, pengaturan dasar, keamanan dan QA.

### Out of scope (MVP)
AI assistant, OCR, integrasi bank, investment tracking, budgeting kompleks, habit tracker, goal tracker, project management, kolaborasi tim, social feed, advanced analytics, plugin system.

### Future premium
Cloud sync multi-device, custom theme/font, export PDF/CSV/JSON, backup, storage media lebih besar.

### MoSCoW
| Prioritas | Fitur |
|---|---|
| Must | Auth, Home, Quick Capture, Notes, Journal, Tasks, Schedule, Calendar, Finance |
| Should | Search, filter, dark mode, reminder, archive |
| Could | Attachment, kategori custom, tags, recurring schedule, export |
| Won't | AI, integrasi bank, habit, goals, social, kolaborasi, advanced analytics |

**Decision rule:** fitur yang tidak memperkuat aktivitas "mencatat dan mengorganisasi kehidupan sehari-hari" tidak masuk MVP.

---

## 12. Roadmap Eksekusi

| Fase | Isi | Status |
|---|---|---|
| 0 | Setup backend: Express, Drizzle, MySQL, schema, migration | Selesai |
| 1 | Auth: register, login, me, middleware JWT | Berikutnya |
| 2 | Captures + Inbox + konversi ke tabel tujuan | |
| 3 | CRUD Notes, Journals, Tasks, Schedules, Finance | |
| 4 | Endpoint Calendar (query gabungan) dan Home summary | |
| 5 | Hardening: rate limiting, validasi lengkap, pengujian | |
| 6 | Desktop app: setup Tauri + Next.js, Glance mode + Quick Capture | |
| 7 | Focus mode dan Expanded mode, semua modul | |
| 8 | Build installer (.exe/.msi) | |
| 9 | Web dan mobile (PWA atau Tauri Mobile, belum diputuskan) | |

---

## 13. Definition of Done

Fitur dianggap selesai jika siap dipakai user, bukan hanya "sudah bisa diklik".

**Functional**
- Happy path sesuai requirement.
- Validasi input, error state, dan loading state ditangani.
- Data tersimpan dan bisa diambil kembali.
- User hanya mengakses data miliknya.

**Technical**
- Mengikuti arsitektur dan konvensi di `AGENTS.md`.
- Format response dan error konsisten.
- Constraint database yang diperlukan terpasang.
- Query tidak mengambil data berlebihan.
- Endpoint penting memiliki authorization.

**Security**
- Password di-hash, autentikasi aman.
- HTTPS di production.
- Input divalidasi dan disanitasi; SQL injection dan XSS dicegah.
- Rate limiting pada endpoint sensitif (login, register).

**UX**
- Alur tanpa langkah yang tidak perlu.
- Empty, loading, dan error state jelas dan informatif.
- Quick Capture selalu mudah dijangkau.

**Acceptance akhir MVP:** Register → Login → Quick Capture → Note → Task → Schedule → Finance → Calendar → Journal → Home. Semua data tersimpan, hanya bisa diakses pemiliknya, dan core loop bisa dijalankan tanpa kebingungan.

> MVP berhasil bukan karena banyak fitur, tetapi karena pengguna merasa: *"Gue nggak perlu mikir ini masuk aplikasi mana. Catat aja di catatDisini."*

---

## 14. Keputusan Terbuka

- Notifikasi desktop (native OS) — ditunda.
- Strategi mobile: PWA vs Tauri Mobile — belum diputuskan.
- Cache lokal untuk mode offline — ditunda, bukan bagian MVP.
- Refresh token dan reset password — belum dirancang; masa berlaku token saat ini dari `JWT_TTL`.
