# Pengujian TaskHub — pemilihan tiga anggota

## Hasil terbaru

- `npm.cmd test`: **53 pengujian lulus, 0 gagal**.
- Konfigurasi lokal berhasil divalidasi untuk mode Turso tanpa hash password anggota.
- `npm.cmd run build`: berhasil; hanya aset frontend yang dipublikasikan.
- Pengujian HTTP menjalankan server nyata dengan database SQLite lokal melalui SDK libSQL.
- Pengujian store remote memakai simulasi jaringan untuk kegagalan dan konflik.

## Cakupan

1. Pemilihan ketiga anggota cukup memakai memberId, tanpa password.
2. Anggota kosong, ID tidak dikenal, angka, dan array ditolak tanpa cookie atau sesi baru.
3. Cookie HttpOnly/SameSite, Secure pada production, dan penyimpanan hash token di SQL.
4. Refresh mempertahankan anggota; mengganti profil mencabut sesi sebelumnya.
5. Logout mencabut sesi; pergantian session secret membatalkan sesi lama.
6. Sesi kedaluwarsa, token rusak, versi sesi palsu, dan anggota di luar tiga ID ditolak.
7. API meminta sesi sebelum membaca/menyimpan; konfigurasi publik tidak membocorkan rahasia.
8. Origin asing dan header klien yang tidak lengkap ditolak, termasuk pada pemilihan profil.
9. CRUD proyek/tugas/catatan/link, checklist, komentar, status, progres, filter, dan validasi.
10. Penulis catatan/komentar berasal dari profil sesi yang dipilih.
11. Konflik revision memungkinkan satu penulis berhasil tanpa overwrite diam-diam.
12. Kegagalan simpan tidak menampilkan sukses palsu; koneksi putus tidak memicu retry write otomatis.
13. SQL tetap persisten setelah repository dibuka kembali; rate limit tersimpan di database.
14. Body JSON rusak/terlalu besar, metode salah, URL berbahaya, dan perintah tidak dikenal ditolak.
15. Build dan server tidak menyajikan environment, SQL, source server, atau arsip desain.
16. Foto disertakan utuh dalam build, dimuat sebagai JPEG, dan migrasinya mempertahankan pekerjaan.
17. Preview lokal meminta pilihan profil, bertahan setelah refresh per tab, serta logout tanpa menghapus pekerjaan.
18. Pembaruan environment mempertahankan konfigurasi database dan nilai yang mengandung tanda dolar.
19. Paket source mengecualikan file privat dan scanner tidak mencetak nilai rahasia dalam diagnostik.
20. Workspace baru kosong. Pembersihan preview lama hanya berjalan sekali, mempertahankan profil/tema, dan tidak menghapus pekerjaan baru setelah refresh.

Pengujian password lama dihapus karena login sekarang merupakan pemilihan profil terbuka. Sesi menentukan profil aktif, bukan membuktikan identitas orang.

Percobaan pertama setelah pembersihan preview meluluskan seluruh pemeriksaan fungsi, tetapi cleanup database temporer gagal dengan EBUSY pada Windows. Pengujian ulang di luar sandbox selesai dengan 53 lulus dan tanpa kegagalan. Preview lokal juga merespons HTTP 200 dan menyajikan kode pembersihan terbaru; interaksi visual browser belum diperiksa.

## Verifikasi cloud sebelumnya

Koneksi `SELECT 1`, inisialisasi skema Turso cloud libSQL, pembacaan tiga anggota, dan migrasi foto sebelumnya berhasil diverifikasi. Pembacaan terakhir pada tahap itu menunjukkan revision 1. Pengujian login pada revisi ini memakai database uji lokal; tidak ada klaim pengujian CRUD cloud baru.

Pemeriksaan cloud saat pembersihan data uji menunjukkan tugas, proyek, catatan, link, dan aktivitas masing-masing 0, dengan 3 profil tetap tersedia. Karena database sudah kosong, tidak ada record cloud yang dihapus atau revision yang diubah pada pemeriksaan tersebut. Koneksi dalam sandbox tidak merespons; pemeriksaan ulang dengan izin jaringan berhasil.

## Belum diverifikasi

- Deployment, routing Vercel, HTTPS/cookie Secure dan origin pada domain produksi.
- Interaksi visual browser: pemilihan kartu, seluruh form, drag and drop, kalender, polling, modal, serta tampilan HP.
- Engine Turso baru dengan URL turso://.
- Import data LocalStorage pengguna dan pencabutan token database lama.

Pemeriksaan npm audit pada tahap sebelumnya tidak menemukan kerentanan yang dilaporkan; audit dependency tidak dijalankan ulang untuk perubahan ini. Pengujian tidak membuktikan aplikasi bebas celah.

Setelah deploy, uji dua profil browser berbeda: pilih anggota, buat/ubah tugas, baca hasil pada profil lain, refresh, lalu keluar dan ganti anggota. Siapa pun yang membuka situs memang dapat menggunakan salah satu dari tiga profil.
