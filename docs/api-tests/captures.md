# Panduan Pengetesan Manual — Endpoint Captures

Semua endpoint di bawah prefix `/api/captures` dan **wajib** menyertakan header:
`Authorization: Bearer <JWT_TOKEN>`.

Base URL: `http://localhost:3001`

---

## 1. POST /api/captures — Simpan capture baru

### Request
```http
POST /api/captures
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "rawText": "Belanja bulanan ke pasar"
}
```

### Response sukses (201)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 7,
    "rawText": "Belanja bulanan ke pasar",
    "status": "pending"
  }
}
```

### Validasi gagal (400)
- rawText kosong / hanya spasi:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "rawText wajib diisi dan tidak boleh kosong", "details": [] } }
```
- rawText lebih dari 5000 karakter:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "rawText maksimal 5000 karakter", "details": [] } }
```

---

## 2. GET /api/captures — Daftar capture (Inbox)

### Request
```http
GET /api/captures?status=pending&limit=20&offset=0
Authorization: Bearer <TOKEN>
```

Query params:
- `status`: `pending` | `converted` (opsional; jika tidak diisi, semua status dikembalikan)
- `limit`: 1–100 (default: 20)
- `offset`: >= 0 (default: 0)

### Response sukses (200)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 7,
      "rawText": "Belanja bulanan ke pasar",
      "status": "pending",
      "convertedType": null,
      "convertedId": null,
      "convertedAt": null,
      "createdAt": "2026-11-09T10:00:00.000Z"
    }
  ],
  "meta": { "total": 1 }
}
```

---

## 3. GET /api/captures/:id — Detail satu capture

### Request
```http
GET /api/captures/1
Authorization: Bearer <TOKEN>
```

### Response sukses (200)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 7,
    "rawText": "Belanja bulanan ke pasar",
    "status": "pending",
    ...
  }
}
```

### Capture tidak ada / milik user lain (404)
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Capture tidak ditemukan", "details": [] } }
```

---

## 4. DELETE /api/captures/:id — Hapus capture

### Request
```http
DELETE /api/captures/1
Authorization: Bearer <TOKEN>
```

### Response sukses (204)
Kosong (tanpa body).

### Capture tidak ada / milik user lain (404)
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Capture tidak ditemukan", "details": [] } }
```

---

## 5. POST /api/captures/:id/convert — Konversi capture

### Request (umum)
```http
POST /api/captures/1/convert
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "type": "note",
  "data": {}
}
```

### 5a. Konversi ke Note
```json
{
  "type": "note",
  "data": { "title": "Catatan belanja" }
}
```
`content` diisi dari `rawText`. `title` opsional.

### 5b. Konversi ke Task
```json
{
  "type": "task",
  "data": { "title": "Selesaikan laporan", "priority": "high", "deadline": "2026-12-01T17:00:00" }
}
```
`title` default = rawText (potong 255 char). `priority` default = `medium`.

### 5c. Konversi ke Schedule
```json
{
  "type": "schedule",
  "data": { "startTime": "2026-11-10T09:00:00", "endTime": "2026-11-10T10:00:00" }
}
```
`startTime` WAJIB. `title` default = rawText.

### 5d. Konversi ke Finance
```json
{
  "type": "finance",
  "data": { "type": "expense", "amount": 75000, "description": "Belanja sembako", "transactionDate": "2026-11-09" }
}
```
`type` dan `amount` WAJIB. `description` default = rawText. `transactionDate` default = hari ini.

### Response sukses (200)
```json
{
  "success": true,
  "data": {
    "capture": {
      "id": 1,
      "status": "converted",
      "convertedType": "note",
      "convertedId": 10,
      "convertedAt": "2026-11-09T10:05:00.000Z"
    },
    "result": {
      "id": 10,
      "title": "Catatan belanja",
      "content": "Belanja bulanan ke pasar"
    }
  }
}
```

### Capture sudah converted (409)
```json
{ "success": false, "error": { "code": "CONFLICT", "message": "Capture sudah dikonversi sebelumnya", "details": [] } }
```

### Validasi gagal (400)
Contoh: schedule tanpa `startTime`:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "startTime wajib diisi untuk jadwal", "details": [] } }
```

Contoh: finance amount negatif:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "amount harus angka positif", "details": [] } }
```

---

## Contoh cURL lengkap

```bash
# Login dulu untuk dapatkan token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@mail.com","password":"password123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

# 1. Simpan capture
curl -s -X POST http://localhost:3001/api/captures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"rawText":"Belanja bulanan"}'

# 2. Lihat daftar capture
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/captures?status=pending&limit=20"

# 3. Detail capture (ganti <ID>)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/captures/<ID>

# 4. Konversi ke note (ganti <ID>)
curl -s -X POST http://localhost:3001/api/captures/<ID>/convert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"note","data":{"title":"Belanja"}}'

# 5. Hapus capture (ganti <ID>)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/captures/<ID> -w "\n%{http_code}"
```

---

## Rate limiting

- `/api/captures`: 120 request per menit per IP (longgar). Melebihi batas → 429.
- `/api/auth/register` dan `/api/auth/login`: ketat (tidak diubah dalam fitur ini).
