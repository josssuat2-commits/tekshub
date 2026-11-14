# Pemeriksaan akses TaskHub

## Model akses

Atas permintaan pengguna, login memakai pemilihan salah satu dari tiga anggota tanpa password. **Ini bukan verifikasi identitas. Siapa pun yang membuka situs dapat memilih anggota mana pun, membaca, mengubah, dan menghapus data bersama.** Cookie dan session secret tidak menjadikan profil akun privat.

Kode password dan perintah pembuatan hash sudah dihapus. Hash lama di environment tidak digunakan. Secret tetap diperlukan untuk sesi dan rate limit. Pergantian secret membatalkan sesi lama; sesi versi password lama ditolak versi pemilihan profil.

## Perlindungan yang tetap berlaku

- API pekerjaan memerlukan sesi server untuk salah satu dari tiga ID yang diizinkan.
- Cookie HttpOnly, SameSite=Strict, dan Secure pada production.
- Token sesi disimpan sebagai hash, berlaku 8 jam, dan dicabut saat logout atau ganti profil.
- Pemilihan anggota serta mutasi memeriksa origin, header klien, dan ukuran JSON.
- Rate limit pemilihan anggota tersimpan di SQL.
- Penulis komentar/catatan berasal dari profil sesi yang dipilih, bukan verifikasi identitas orang.
- SQL memakai parameter terikat; validasi server dan revision mencegah perintah tak diizinkan serta overwrite diam-diam.
- Server/build membatasi file publik; token database dan secret hanya di server.
- Konten pengguna tidak dirender lewat innerHTML/eval; URL dibatasi HTTP/HTTPS.

## Batas pemeriksaan

Token Turso pernah dibagikan melalui chat; pencabutan token lama belum diverifikasi. Simpan token pengganti hanya pada environment server.

Deployment Vercel, konfigurasi proxy/IP, HTTPS/cookie produksi, serta interaksi visual browser belum diperiksa. Pengujian HTTP otomatis memakai database lokal. Koneksi dan inisialisasi Turso cloud sebelumnya berhasil diverifikasi.

Ini pemeriksaan kode dan pengujian otomatis, bukan penetration test. Histori Git dan konfigurasi akun Turso/Vercel belum diaudit. Pemindaian source tidak menjamin semua jenis rahasia terdeteksi.
