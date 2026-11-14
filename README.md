# TaskHub — Turso + Vercel

TaskHub menggunakan HTML, CSS, Vanilla JavaScript, API Node.js, dan database Turso bersama untuk tiga anggota.

## Alur masuk

Pilih foto/nama salah satu anggota → **Buka Dashboard**. Tidak ada password, email, atau pendaftaran. Anggota tetap: Joshua Timothy (`member-1`), Kaesie Silvila Fitri (`member-2`), dan Naura afifah (`member-3`).

**Pemilihan profil bukan verifikasi identitas. Siapa pun yang membuka situs bisa memilih anggota mana pun, membaca, mengubah, dan menghapus data bersama.**

Server menerbitkan sesi 8 jam setelah profil dipilih. Refresh mempertahankan sesi; **Keluar** mencabut sesi dan kembali ke pilihan anggota. Untuk ganti anggota, keluar lalu pilih profil lain. Tab pada browser/origin yang sama berbagi sesi; gunakan profil browser berbeda untuk menguji beberapa anggota.

## Menjalankan lokal

Gunakan Node.js 24. Pada PowerShell, gunakan `npm.cmd` jika `npm.ps1` diblokir.

1. Jalankan `npm.cmd install`.
2. Salin `.env.example` menjadi `.env` jika belum ada.
3. Isi URL dan token Turso.
4. Jalankan `npm.cmd run auth:setup` untuk membuat session secret jika belum tersedia, tanpa prompt password.
5. Jalankan `npm.cmd run db:check` lalu `npm.cmd run db:init`.
6. Jalankan `npm.cmd start`, lalu buka http://127.0.0.1:4173/#login.

| Variabel | Keterangan |
| --- | --- |
| `TURSO_DATABASE_URL` | URL database Turso |
| `TURSO_AUTH_TOKEN` | Token baca/tulis, hanya pada server |
| `SESSION_SECRET` | Rahasia acak minimal 32 karakter; dibuat lewat `npm.cmd run auth:setup` |
| `APP_ORIGIN` | Origin tepat tanpa slash penutup; lokal `http://127.0.0.1:4173`, produksi domain HTTPS final |
| `TURSO_DRIVER` | Opsional: `libsql` atau `serverless` untuk URL HTTPS |
| `PORT` | Opsional, default 4173 |

Hash password anggota tidak diperlukan dan tidak digunakan. Token database dan session secret tidak dikirim ke frontend. Jangan unggah `.env` ke GitHub.

URL `libsql://` memakai `@libsql/client`; `turso://` memakai `@tursodatabase/serverless/compat`. Development juga mendukung `file:.data/taskhub.db` setelah folder `.data` dibuat. Database file ditolak pada production.

Preview offline: `npm.cmd run preview`, buka http://127.0.0.1:4173/#login. Cukup pilih anggota; pekerjaan tersimpan di LocalStorage dan pilihan profil di sessionStorage tab tersebut. Mode lokal ditolak pada production dan tidak diaktifkan otomatis saat API gagal.

Workspace baru, termasuk preview, dimulai tanpa tugas, proyek, catatan, link, atau aktivitas contoh. Preview lama dibersihkan sekali pada pemuatan pertama revisi ini; profil, foto, dan tema dipertahankan. Data yang ditambahkan setelah pembersihan tidak dihapus lagi saat refresh. Pembersihan preview tidak berjalan pada mode Turso.

## Deploy Vercel

Lihat `UPLOAD-GUIDE.md`. Konfigurasi: Framework Other, Node.js 24, build `npm run build`, output `dist`. Isi empat variabel utama di Vercel, lalu redeploy. Tanpa `APP_ORIGIN`, server memakai `VERCEL_URL`; alias/custom domain sebaiknya ditetapkan eksplisit.

Entry point API: `api/[...path].js`. `server.cjs` untuk lokal. Build hanya menyalin HTML, CSS, JavaScript frontend, dan foto ke `dist`. Source server, SQL, arsip desain, dan kredensial tidak menjadi file publik.

## Fitur dan penyimpanan

Dashboard dinamis, CRUD tugas/proyek/catatan/link, empat status, prioritas, checklist, submission URL, komentar, My Tasks, Kanban, filter, pencarian, kalender, tiga profil, dan Light/Dark Mode. Tidak ada upload file. Foto asli berada di `foto profil/`; avatar digunakan di login dan halaman pekerjaan, dengan inisial sebagai fallback. Tema menjadi preferensi perangkat.

Setelah deploy ke Vercel, isi pekerjaan melalui tombol tambah pada halaman tugas, proyek, catatan, dan link. Data disimpan langsung ke Turso melalui API; tidak perlu mengubah file source untuk menambahkan pekerjaan.

Browser → API pada origin yang sama → Turso. Polling berjalan setiap 15 detik ketika halaman aktif, tidak ada modal, dan pengguna tidak mengisi input. Tombol muat ulang data tersedia; ini bukan WebSocket.

Empat tabel: `workspaces`, `sessions`, `login_attempts`, dan `schema_migrations`. Pekerjaan disimpan sebagai satu dokumen JSON maksimal 512 KB untuk tim kecil, bukan tabel terpisah per entitas. Workspace baru dimulai dengan tiga anggota dan pekerjaan kosong.

Simpan memakai pemeriksaan revision atomik. Dua penulis pada revision yang sama menghasilkan satu sukses dan satu 409 Conflict; frontend memuat data baru sambil mempertahankan isian modal untuk ditinjau ulang. Tidak ada penggabungan otomatis atau retry write diam-diam.

Server memvalidasi perintah dan mengambil penulis komentar/catatan dari profil sesi yang dipilih. Semua anggota memiliki hak yang sama; peran bersifat deskriptif. ID di luar ketiga anggota ditolak.

Cookie sesi HttpOnly, SameSite=Strict, dan Secure pada production. Token sesi disimpan sebagai hash. Logout atau ganti profil mencabut sesi sebelumnya; mengganti `SESSION_SECRET` membatalkan sesi lama. Mutasi dan pemilihan profil memeriksa origin serta header klien. Pemilihan profil dibatasi delapan percobaan per IP/anggota dalam 15 menit. Sesi menjaga pilihan anggota, bukan membuktikan identitas orang.

## Migrasi data lama

LocalStorage `taskhub.workspace.v1` tidak dikirim atau dihapus otomatis. Simpan JSON lama ke `.data/local-workspace.json`, lalu jalankan:

```powershell
node scripts/import-local.cjs .data/local-workspace.json
```

Import hanya ke database kosong pada revision 0. Tema dan profil aktif browser lama tidak menjadi preferensi seluruh tim. Migrasi foto mempertahankan ID, peran, dan pekerjaan; edit profil setelah migrasi pertama tidak ditimpa.

## Verifikasi

Jalankan `npm.cmd test` dan `npm.cmd run build`. Lihat `TESTING.md` serta `SECURITY-REVIEW.md`. Koneksi Turso cloud libSQL dan inisialisasi workspace sebelumnya berhasil diverifikasi. Deployment Vercel dan interaksi visual browser belum diverifikasi. Arsip HTML asli, screenshot, dan panduan desain tetap dipertahankan.
