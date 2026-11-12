# ARSITEKTUR & DESAIN: SISTEM BEL SEKOLAH OTOMATIS (MySQL + Rust/Web)

## 1. Ikhtisar Sistem
Aplikasi bel sekolah modern dengan dukungan:
- **Tampilan Desktop (PC Ruang Piket):** Antarmuka visual mandiri untuk operator.
- **Akses Web Remote (Wi-Fi Lokal):** Dapat dikontrol dari HP/laptop kurikulum tanpa instal aplikasi.
- **Audio Native Engine:** Memutar audio langsung ke soundcard PC tanpa tergantung browser.
- **Database Terpusat:** Menggunakan **MySQL** untuk kemudahan manajemen relasional data profil dan jadwal.

## 2. Struktur Folder Proyek
Lokasi terisolasi: `/home/muse/.openclaw/workspace/bel-sekolah/`
- `database/`: Skema DDL MySQL (`schema.sql`) dan seeder default.
- `backend/`: Core service scheduler, audio player native, dan API server lokal.
- `frontend/`: UI modern dashboard bel sekolah (Kiosk display + Mobile responsive).
- `audio-assets/`: Folder penyimpanan file MP3/WAV (bel standar, sirine, lagu nasional).
- `docs/`: Dokumentasi arsitektur dan panduan operasional.

## 3. Fitur Utama Database (MySQL)
1. **Multi-Profile Switching (`schedule_profiles`):**
   - Mendukung profil berganti-ganti (Reguler, Ujian PTS/PAS, Ramadhan, Jumat).
   - Penggantian profil cukup 1 klik (mengubah `is_active = 1`).
2. **Fleksibilitas Jadwal (`schedule_items`):**
   - Mendukung pengaturan hari (Senin-Sabtu atau Semua Hari).
   - Jam berbunyi presisi per detik/menit.
   - Pilihan audio kustom dan pengaturan volume per-event.
3. **Pustaka Audio Kustom (`audio_library`):**
   - Menyimpan metadata file suara MP3/WAV.
4. **Kalender Otomatis (`calendar_overrides`):**
   - Jadwal ujian dapat diset otomatis aktif pada rentang tanggal tertentu.
5. **Soundboard Darurat & Manual (`soundboard_buttons`):**
   - Tombol instan untuk lagu Indonesia Raya, bel manual, atau sirine darurat.
6. **Log Riwayat Bunyi (`bell_logs`):**
   - Mencatat waktu dan status setiap kali bel berbunyi.
