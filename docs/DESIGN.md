# DESIGN.md — Panduan Tampilan catatDisini

Arah visual: **putih, minimalis, tenang, elegan.** Tidak neko-neko. Aplikasi ini dipakai berkali-kali sehari untuk mencatat, jadi tampilannya harus menyingkir dan membiarkan isi catatan yang menonjol.

Baca juga `docs/PRD.md` (perilaku produk) dan `AGENTS.md` (aturan kode).

---

## 1. Prinsip

1. **Putih dan lega.** Whitespace dan hierarki yang kuat menggantikan banyak kotak, garis, dan badge.
2. **Capture selalu terjangkau.** Area menulis cepat adalah elemen paling jelas di Glance mode.
3. **Satu layar, satu tujuan.** Tidak ada layar yang mencoba melakukan semuanya.
4. **Informasi muncul saat dibutuhkan.** Opsi lanjutan (priority, deadline, kategori) tersembunyi sampai dibutuhkan.
5. **Tenang, tidak menghakimi.** Teks kosong dan pengingat bernada membantu, bukan menegur.
6. **Satu hal yang berkesan.** Kekuatan visual ada di tipografi dan ritme jarak. Sisanya sengaja dibuat diam. Tidak ada dekorasi yang tidak berfungsi.

---

## 2. Warna

Dasar putih dengan abu netral. Hampir semua UI hanya memakai empat warna pertama. Warna lain hanya muncul untuk makna (status).

| Token | Hex | Pemakaian |
|---|---|---|
| `--bg` | `#FFFFFF` | Latar utama |
| `--surface` | `#FAFAFA` | Latar area sekunder (input, panel, hover) |
| `--border` | `#EAEAEA` | Garis pemisah dan border tipis |
| `--text` | `#1A1A1A` | Teks utama dan tombol utama |
| `--text-muted` | `#6F6F6F` | Teks sekunder, placeholder, metadata |
| `--text-faint` | `#9A9A9A` | Teks tersier, status nonaktif |
| `--danger` | `#B3261E` | Error, hapus, pengeluaran |
| `--success` | `#2E7D4F` | Berhasil, pemasukan |
| `--warning` | `#9A6700` | Deadline dekat, peringatan |

Aturan:
- Tombol utama: latar `--text`, teks putih. Tombol sekunder: transparan dengan border `--border`.
- **Tidak ada gradient.** Tidak ada warna aksen dekoratif. Hitam-putih sudah cukup sebagai identitas.
- Warna status (`danger`, `success`, `warning`) dipakai hemat, hanya untuk makna, dan selalu disertai teks atau ikon (jangan hanya warna).
- Dark mode (Should Have) dibuat belakangan dengan membalik token di atas lewat CSS variables; jangan menulis warna langsung di komponen.

---

## 3. Tipografi

**Satu keluarga: Geist Sans.** Modern, bersih, dan elegan tanpa terasa norak. Hierarki dibuat lewat ukuran, bobot, dan jarak, bukan lewat banyak font.

Cara pakai (self-host, jangan memuat dari CDN karena app dibungkus Tauri):
```bash
npm install @fontsource-variable/geist
```
```css
@import '@fontsource-variable/geist';

:root {
  --font-sans: 'Geist Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
body { font-family: var(--font-sans); }
```

### Skala tipografi

| Peran | Ukuran / line-height | Bobot | Letter-spacing |
|---|---|---|---|
| Judul halaman | 24 / 32 | 600 | -0.02em |
| Judul bagian | 16 / 24 | 600 | -0.01em |
| Teks isi | 14 / 22 | 400 | 0 |
| Teks catatan (area menulis) | 15 / 24 | 400 | 0 |
| Teks kecil / metadata | 12 / 18 | 400 | 0 |
| Label tombol | 13 / 20 | 500 | 0 |

Aturan:
- Gunakan **sentence case** di semua teks. Tidak ada label huruf kapital semua.
- Panjang baris di area membaca/menulis maksimal ±70 karakter.
- Angka keuangan memakai `font-variant-numeric: tabular-nums` agar rapi sejajar.
- Teks catatan panjang rata kiri. (Justify hanya dipakai kalau ada alasan khusus; default rata kiri supaya tidak ada spasi renggang di window sempit.)
- Hindari menekankan satu kata di tengah judul dengan warna atau italic.

---

## 4. Jarak, Bentuk, dan Elevasi

**Jarak** memakai kelipatan 4px: `4, 8, 12, 16, 24, 32, 48`.
- Padding window Glance: 16
- Jarak antar bagian: 24
- Jarak antar item dalam daftar: 8–12

**Radius:** kecil dan konsisten.
| Elemen | Radius |
|---|---|
| Input, tombol, kartu kecil | 8px |
| Panel besar / modal | 12px |
| Chip/pill kecil | 999px (hanya untuk elemen sangat kecil) |

**Elevasi:** hampir tidak ada.
- Pemisah memakai border 1px `--border`, bukan bayangan.
- Bayangan hanya untuk elemen yang benar-benar melayang (menu dropdown, modal): `0 8px 24px rgba(0,0,0,0.08)`.
- Jangan memecah isi menjadi deretan kartu identik. Daftar dibuat sebagai baris dengan pemisah tipis.

---

## 5. Komponen

### Tombol
- **Utama:** latar `--text`, teks putih, tinggi 36px, radius 8. Satu tombol utama per layar.
- **Sekunder:** border `--border`, teks `--text`, latar transparan.
- **Teks/tertier:** tanpa border, teks `--text-muted`, berubah ke `--text` saat hover.
- Nama tombol memakai kata kerja yang spesifik: "Simpan catatan", "Tandai selesai". Bukan "Submit" atau "OK".
- Tidak menambahkan panah atau ikon dekoratif di teks tombol.

### Input
- Latar `--surface`, border 1px `--border`, radius 8, tinggi 36px.
- Fokus: border `--text` dan ring tipis; **fokus keyboard harus selalu terlihat**.
- Label di atas input, ukuran 12, `--text-muted`. Pesan error di bawah input, `--danger`, menjelaskan apa yang salah dan cara memperbaikinya.

### Quick Capture
Elemen paling penting di aplikasi.
- Area teks lebar penuh, tanpa border tebal, placeholder lembut: "Apa yang ingin kamu catat?"
- Tombol "Simpan" langsung dan pilihan tipe (Note, Task, Schedule, Finance) **opsional**, muncul sebagai teks kecil di bawah area menulis, bukan kewajiban.
- Menyimpan tanpa memilih tipe harus terasa normal dan sah, bukan "belum selesai".
- Shortcut: `Enter` menyimpan, `Shift+Enter` baris baru (bisa disesuaikan).

### Daftar (Task, Inbox, Transaksi)
- Baris dengan pemisah `--border`, bukan kartu terpisah.
- Hover: latar `--surface`.
- Task: checkbox bulat kecil di kiri, judul, deadline di kanan (`--text-muted`; `--warning` jika dekat; `--danger` jika lewat).
- Task selesai: teks `--text-faint` dan dicoret ringan.

### Navigasi
- Lima area: **Home, Tasks, Calendar, Journal, Finance**, plus tombol Quick Capture.
- Item aktif: teks `--text` bobot 600; nonaktif `--text-muted`. Tanpa latar berwarna tebal.

### Empty state
Selalu mengajak bertindak, tidak generik, tidak menyalahkan.
- Notes: "Belum ada catatan. Punya sesuatu yang ingin kamu simpan?" + tombol "Catat sekarang".
- Inbox: "Inbox kosong. Semua capture sudah punya tempat."
- Tasks: "Belum ada tugas untuk hari ini."

### Pesan error dan status
- Menjelaskan apa yang terjadi dan apa yang bisa dilakukan, tanpa meminta maaf berlebihan. Contoh: "Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi." + tombol "Coba lagi".
- Konsisten antara aksi dan konfirmasi: tombol "Simpan catatan" menghasilkan pesan "Catatan tersimpan".
- Karena app **wajib online**, status offline harus jelas dan tenang, tidak panik.

---

## 6. Layout per Mode Window

Semua mode memakai latar putih. Mode Glance menempel di desktop sehingga perlu border tipis dan radius supaya terbaca di atas wallpaper apa pun.

### Glance (±320×420) — mode utama sehari-hari

```
┌──────────────────────────────┐
│ Selasa, 10 November          │
│                              │
│ ┌──────────────────────────┐ │
│ │ Apa yang ingin kamu      │ │
│ │ catat?                   │ │
│ │                  Simpan  │ │
│ └──────────────────────────┘ │
│                              │
│ Hari ini                     │
│ ○ Kerjakan laporan    17.00  │
│ ○ Balas email dosen          │
│                              │
│ Berikutnya                   │
│ Rapat tim          Besok     │
│                              │
│ 3 capture di Inbox     Buka  │
└──────────────────────────────┘
```
- Perataan: **kiri**. Quick Capture di bagian atas, selalu terlihat.
- Tidak ada scroll untuk hal terpenting; sisanya boleh scroll.

### Focus (±400×600) — satu modul

```
┌────────────────────────────────┐
│ ‹  Catatan                     │
│────────────────────────────────│
│ Judul                          │
│                                │
│ Mulai menulis di sini...       │
│                                │
│                                │
│────────────────────────────────│
│                        Simpan  │
└────────────────────────────────┘
```
- Tombol kembali ke Glance di kiri atas. Fokus ke satu kegiatan: menulis, atau memeriksa task.

### Expanded (resizable) — semua modul

```
┌────────┬───────────────────────────────────┐
│ Home   │ Judul halaman                     │
│ Tasks  │                                   │
│ Calen- │  Konten modul aktif               │
│ dar    │                                   │
│ Journal│                                   │
│ Finance│                                   │
│        │                                   │
│ + Catat│                                   │
└────────┴───────────────────────────────────┘
```
- Sidebar kiri sempit, konten di tengah dengan lebar baca maksimal ±720px dan rata kiri.
- Window yang sangat lebar tidak melebarkan teks; konten tetap berada di kolom baca.

---

## 7. Gerak (Motion)

- Gerak **hanya** sebagai respons terhadap aksi pengguna: membuka panel, berpindah mode window, menyelesaikan task, konfirmasi simpan.
- Durasi 120–200ms, easing lembut (`ease-out`). Tidak ada animasi masuk otomatis di setiap bagian, tidak ada efek hover berlebihan pada setiap kartu.
- Hormati `prefers-reduced-motion`: matikan transisi non-esensial.
- Perpindahan Glance ↔ Focus ↔ Expanded boleh memakai transisi ukuran yang halus; ini satu-satunya momen "bergaya" yang diizinkan.

---

## 8. Aksesibilitas (batas minimum)

- Kontras teks terhadap latar minimal 4.5:1 (`--text-muted` pada putih sudah memenuhi; `--text-faint` hanya untuk teks nonesensial).
- Semua elemen interaktif bisa dijangkau dan dioperasikan dengan keyboard, dengan indikator fokus yang jelas.
- Target klik minimal 32×32px.
- Status tidak hanya dibedakan lewat warna.
- Semua input memiliki label.

---

## 9. Yang Dihindari

- Gradient, glassmorphism berlebihan, bayangan tebal, ikon dekoratif.
- Mengubah isi menjadi tumpukan kartu identik dengan radius dan bayangan yang sama.
- Label huruf kapital semua, nomor urut hiasan, eyebrow di atas setiap judul.
- Lebih dari satu keluarga font.
- Warna aksen baru tanpa alasan fungsi.
- Teks kosong generik seperti "No data".
- Notifikasi atau teks yang menghakimi ("Kamu belum menulis jurnal hari ini!").

---

## 10. Token CSS (acuan implementasi)

```css
:root {
  /* warna */
  --bg: #ffffff;
  --surface: #fafafa;
  --border: #eaeaea;
  --text: #1a1a1a;
  --text-muted: #6f6f6f;
  --text-faint: #9a9a9a;
  --danger: #b3261e;
  --success: #2e7d4f;
  --warning: #9a6700;

  /* tipografi */
  --font-sans: 'Geist Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;

  /* bentuk */
  --radius-sm: 8px;
  --radius-md: 12px;
  --shadow-float: 0 8px 24px rgba(0, 0, 0, 0.08);

  /* jarak */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px; --space-12: 48px;
}

@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

Semua komponen mengambil nilai dari token di atas. Tidak ada warna, ukuran, atau jarak yang ditulis langsung di komponen.
