# Panduan Pengetesan Manual — Endpoint Tasks

Semua endpoint di bawah prefix `/api/tasks` dan **wajib** menyertakan header:
`Authorization: Bearer <JWT_TOKEN>`.

Base URL: `http://localhost:3001`

---

## 1. POST /api/tasks — Buat task baru

### Request
```http
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "title": "Selesaikan laporan",
  "description": "Buat laporan bulanan keuangan",
  "priority": "high",
  "status": "todo",
  "deadline": "2026-12-01T17:00:00"
}
```

### Response sukses (201)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 7,
    "title": "Selesaikan laporan",
    "description": "Buat laporan bulanan keuangan",
    "priority": "high",
    "status": "todo",
    "deadline": "2026-12-01T17:00:00.000Z",
    "createdAt": "2026-11-09T10:00:00.000Z",
    "updatedAt": "2026-11-09T10:00:00.000Z"
  }
}
```

### Validasi gagal (400)
- title kosong / hanya spasi / lebih dari 255 karakter
- priority tidak valid (bukan low/medium/high)
- deadline tidak valid

---

## 2. GET /api/tasks — Daftar task

### Request
```http
GET /api/tasks?status=todo&priority=high&date=2026-12-01&overdue=false&limit=20&offset=0
Authorization: Bearer <TOKEN>
```

Query params:
- `status`: `todo` | `completed`
- `priority`: `low` | `medium` | `high`
- `date`: `YYYY-MM-DD` (task dengan deadline pada tanggal tersebut)
- `overdue`: `true` (deadline sudah lewat dan status todo)
- `limit`: 1–100 (default: 20)
- `offset`: >= 0 (default: 0)

### Urutan default
1. status `todo` dulu, lalu `completed`
2. deadline terdekat dulu; task tanpa deadline di akhir
3. terbaru (createdAt DESC)

### Response sukses (200)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 7,
      "title": "Selesaikan laporan",
      "description": "...",
      "priority": "high",
      "status": "todo",
      "deadline": "2026-12-01T17:00:00.000Z",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": { "total": 1 }
}
```

---

## 3. GET /api/tasks/:id — Detail task

### Request
```http
GET /api/tasks/1
Authorization: Bearer <TOKEN>
```

### Task tidak ada / milik user lain (404)
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Task tidak ditemukan", "details": [] } }
```

### id bukan angka positif (400)
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "id harus bilangan bulat positif", "details": [] } }
```

---

## 4. PATCH /api/tasks/:id — Update sebagian task

### Request
```http
PATCH /api/tasks/1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "title": "Selesaikan laporan revisi",
  "priority": "medium",
  "deadline": null
}
```

Minimal satu field wajib diisi (`title`, `description`, `priority`, `status`, `deadline`).
`deadline: null` untuk menghapus deadline.

### Response sukses (200)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Selesaikan laporan revisi",
    "priority": "medium",
    "deadline": null,
    ...
  }
}
```

### Body kosong (400)
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Minimal satu field wajib diisi untuk update", "details": [] } }
```

---

## 5. DELETE /api/tasks/:id — Hapus task

### Request
```http
DELETE /api/tasks/1
Authorization: Bearer <TOKEN>
```

### Response sukses (204)
Kosong (tanpa body).

### Task tidak ada / milik user lain (404)
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Task tidak ditemukan", "details": [] } }
```

---

## Contoh cURL lengkap

```bash
# Login dulu untuk dapatkan token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@mail.com","password":"password123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

# 1. Buat task
curl -s -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Belajar","priority":"high","deadline":"2026-12-01T10:00:00"}'

# 2. Daftar task
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/tasks?status=todo&limit=20"

# 3. Detail task (ganti <ID>)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/tasks/<ID>

# 4. Update task (ganti <ID>)
curl -s -X PATCH http://localhost:3001/api/tasks/<ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"priority":"medium","deadline":null}'

# 5. Hapus task (ganti <ID>)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/tasks/<ID> -w "\n%{http_code}"
```

---

## Rate limiting

- `/api/tasks`: 120 request per menit per IP (longgar, sama seperti captures).
- Melebihi batas → 429 dengan format error standar AGENTS.md.
