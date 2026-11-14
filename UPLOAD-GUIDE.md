# Alur upload TaskHub ke GitHub dan deploy Vercel

Alur: source lokal → repository GitHub → build Vercel → konfigurasi domain → website memakai Turso.

Login cukup memilih salah satu dari tiga anggota tanpa password. Siapa pun yang membuka situs dapat memakai profil mana pun dan mengubah data bersama.

## 1. Siapkan paket source

Dari terminal folder proyek:

```powershell
npm.cmd run package:source
```

Paket berada di `release/taskhub-github/`. Unggah isi folder tersebut, bukan folder pembungkusnya dan bukan hanya `dist`.

Paket mengecualikan `.env`, `node_modules`, `dist`, database lokal, cache, dan private key. `.env.example` berisi template tanpa rahasia dan boleh ikut diunggah. Pemeriksaan source tidak menjamin semua jenis rahasia terdeteksi atau memindai histori Git.

Token Turso yang pernah dikirim melalui chat perlu dicabut dan diganti melalui akun Turso sebelum dipakai untuk production. Periksa cakupan pencabutan karena bisa memengaruhi token lain dalam group. Simpan token pengganti pada `.env` dan Vercel; pencabutan belum diverifikasi.

## 2. Buat repository GitHub

1. Masuk ke GitHub, buka https://github.com/new.
2. Isi nama repository, misalnya `taskhub`.
3. Pilih Private untuk menyimpan source secara privat; Vercel dapat mengimpor setelah diberi akses.
4. Buat repository. Tidak perlu menambahkan README, gitignore, atau license otomatis karena paket sudah memuat file proyek.
5. Pada repository kosong, pilih tautan untuk mengunggah file yang sudah ada; jika repository sudah berisi file, pilih **Add file → Upload files**.
6. Buka `release/taskhub-github/` melalui File Explorer. Seret seluruh file dan folder di dalamnya ke halaman upload, dengan struktur folder tetap utuh.
7. Tunggu selesai, isi pesan commit seperti `Initial TaskHub deployment`, lalu **Commit changes**.

Di root repository harus langsung terlihat `package.json`, `package-lock.json`, `index.html`, `vercel.json`, serta folder `api`, `server`, `database`, `scripts`, `js`, `css`, dan `foto profil`. Sertakan juga file bertitik seperti `.gitignore`, `.vercelignore`, dan `.env.example` dari paket. Jangan menambahkan `.env` dari folder proyek asli.

Panduan resmi: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## 3. Impor ke Vercel

1. Masuk ke https://vercel.com dengan akun GitHub.
2. Pilih **Add New → Project**.
3. Pilih repository `taskhub`, lalu **Import**.
4. Jika belum terlihat, beri integrasi Vercel akses ke repository tersebut.
5. Atur konfigurasi berikut:

| Pengaturan | Nilai |
| --- | --- |
| Framework Preset | Other |
| Root Directory | root repository, biarkan default |
| Node.js Version | 24.x |
| Install Command | `npm install` atau default |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Sebagian pengaturan sudah disediakan melalui `vercel.json`. Jangan mengatur root ke `dist` atau memakai `npm start` sebagai build command. Jika Node.js belum terlihat pada layar impor, periksa Settings → Build and Deployment setelah proyek dibuat.

Panduan resmi: https://vercel.com/docs/projects/managing-projects

## 4. Masukkan environment pertama

Pada bagian Environment Variables, tambahkan untuk Production:

| Key | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | Nilai URL dari `.env` lokal |
| `TURSO_AUTH_TOKEN` | Token Turso pengganti yang aktif |
| `SESSION_SECRET` | Nilai secret dari `.env` lokal |

Salin nilainya saja, tanpa nama variabel, tanpa tanda kutip pembungkus, dan tanpa spasi tambahan. Jangan kirim rahasia ke chat atau memasukkannya ke source frontend. Tidak diperlukan password anggota. Jangan menyalin `APP_ORIGIN=http://127.0.0.1:4173`, `PORT`, atau mode penyimpanan lokal ke Vercel.

Klik **Deploy**, tunggu build berstatus **Ready**, lalu lanjutkan pengaturan origin sebelum menguji login. Jika origin belum diatur, aplikasi mencoba memakai VERCEL_URL bawaan deployment.

## 5. Tetapkan domain dan redeploy

1. Buka proyek Vercel dan salin domain Production dari bagian Domains, misalnya `taskhub-contoh.vercel.app`.
2. Buka **Settings → Environment Variables**.
3. Tambahkan `APP_ORIGIN` untuk Production dengan nilai tepat `https://DOMAIN-PRODUKSI-ANDA`, tanpa slash penutup. Ganti contoh tersebut dengan domain yang benar; jangan menyalinnya sebagai teks placeholder.
4. Buka **Deployments**, pilih deployment terbaru, lalu **Redeploy**.
5. Tunggu **Ready**, kemudian buka domain Production yang sama dengan APP_ORIGIN.

Untuk custom domain, gunakan origin custom domain tersebut dan redeploy. Setiap perubahan environment berlaku pada deployment berikutnya. Environment Preview harus memakai origin preview yang sesuai; jangan otomatis menerapkan domain Production ke semua preview.

Panduan resmi: https://vercel.com/docs/environment-variables/managing-environment-variables

## 6. Uji website

- Pilih anggota dan buka dashboard; tiga profil serta foto harus tersedia.
- Workspace pekerjaan dimulai kosong.
- Tambahkan proyek, tugas, catatan, dan link melalui website.
- Refresh dan pastikan data tetap ada.
- Buka dari HP atau profil browser berbeda, pilih anggota lain, lalu muat data terbaru. Polling otomatis sekitar 15 detik saat halaman aktif.
- Keluar dan coba masuk dengan anggota lain.
- Periksa `https://DOMAIN-ANDA/.env`: harus tidak dapat dibaca.

Setelah semua berhasil, gunakan situs Vercel untuk mengisi pekerjaan; tidak perlu mengedit kode untuk menambahkan tugas. Data disimpan melalui API ke Turso.

## Jika ada masalah

| Gejala | Periksa |
| --- | --- |
| Repository tidak terlihat di Vercel | Izin integrasi GitHub untuk repository tersebut |
| Build tidak menemukan package.json | Struktur upload dan Root Directory |
| Workspace tidak bisa dibuka | URL/token Turso, SESSION_SECRET, log Function, lalu redeploy |
| Permintaan ditolak karena origin | APP_ORIGIN harus tepat sama dengan domain yang dibuka |
| Data berbeda antarperangkat | Gunakan domain deployment yang sama dan mode Turso, lalu muat data terbaru |
| Foto tidak muncul | Folder foto profil dan nama file harus terunggah utuh |

## Mengubah website nanti

Ubah source lokal, jalankan pengujian/build sesuai perubahan, buat ulang paket source, lalu commit file yang berubah ke repository yang terhubung. Perubahan yang di-push ke branch produksi memicu deployment Vercel berikutnya. Mengubah environment juga memerlukan deployment baru.

Folder lokal baru boleh dihapus setelah source lengkap di GitHub, konfigurasi rahasia dicadangkan secara privat, dan situs hasil deploy berhasil diuji. Menghapus folder lokal tidak menghapus database Turso. Jangan melakukan commit penghapusan source GitHub jika website masih ingin dikembangkan.
