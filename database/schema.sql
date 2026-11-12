-- ====================================================================
-- SKEMA DATABASE: BEL SEKOLAH OTOMATIS & FLEKSIBEL (MySQL / MariaDB)
-- Lokasi: /home/muse/.openclaw/workspace/bel-sekolah/database/schema.sql
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `bel_sekolah` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `bel_sekolah`;

-- 1. TABEL PROFIL JADWAL (Reguler, Ujian, Ramadhan, Khusus Jumat, dll)
CREATE TABLE IF NOT EXISTS `schedule_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Kode unik profil, misal: REGULER, UJIAN_PAS, RAMADHAN',
    `name` VARCHAR(100) NOT NULL COMMENT 'Nama profil yang tampil di UI',
    `description` VARCHAR(255) NULL COMMENT 'Keterangan peruntukan jadwal',
    `color` VARCHAR(20) DEFAULT '#2563EB' COMMENT 'Kode warna badge profil di dashboard',
    `is_active` TINYINT(1) DEFAULT 0 COMMENT '1 = Profil yang sedang aktif berbunyi hari ini',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB;

-- 2. TABEL PUSTAKA AUDIO (Daftar File Suara MP3/WAV)
CREATE TABLE IF NOT EXISTS `audio_library` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL COMMENT 'Judul nada, misal: Bel Masuk Kelas, Pengumuman Mulai Ujian',
    `filename` VARCHAR(255) NOT NULL COMMENT 'Nama file fisik di folder storage/audio',
    `file_path` VARCHAR(255) NOT NULL COMMENT 'Relatif path penyimpanan audio',
    `duration_seconds` INT DEFAULT 0 COMMENT 'Durasi audio dalam detik',
    `category` ENUM('BELL', 'ANNOUNCEMENT', 'NATIONAL_ANTHEM', 'PRAYER', 'EMERGENCY', 'CUSTOM') DEFAULT 'BELL',
    `is_system` TINYINT(1) DEFAULT 0 COMMENT '1 = Suara bawaan aplikasi, 0 = File upload user',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_category` (`category`)
) ENGINE=InnoDB;

-- 3. TABEL DETAIL JADWAL BEL (Item jam berbunyi pada tiap profil)
CREATE TABLE IF NOT EXISTS `schedule_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `profile_id` INT NOT NULL COMMENT 'Relasi ke tabel schedule_profiles',
    `day_of_week` ENUM('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'SEMUA_HARI') NOT NULL DEFAULT 'SEMUA_HARI',
    `bell_time` TIME NOT NULL COMMENT 'Waktu berbunyi (format HH:MM:SS atau HH:MM)',
    `event_name` VARCHAR(100) NOT NULL COMMENT 'Nama kegiatan, misal: Masuk Kelas, Istirahat 1, Ujian Mapel 1 Selesai',
    `audio_id` INT NOT NULL COMMENT 'Relasi ke tabel audio_library',
    `volume` TINYINT UNSIGNED DEFAULT 100 COMMENT 'Level volume khusus event ini (0-100%)',
    `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '1 = Aktif berbunyi, 0 = Dinonaktifkan sementara',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`profile_id`) REFERENCES `schedule_profiles` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`audio_id`) REFERENCES `audio_library` (`id`) ON DELETE RESTRICT,
    INDEX `idx_lookup_schedule` (`profile_id`, `day_of_week`, `bell_time`, `is_enabled`)
) ENGINE=InnoDB;

-- 4. TABEL SOUNDBOARD / MANUAL QUICK TRIGGER (Tombol bunyikan cepat di layar)
CREATE TABLE IF NOT EXISTS `soundboard_buttons` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `label` VARCHAR(100) NOT NULL COMMENT 'Label tombol, misal: Indonesia Raya, Bel Darurat, Istirahat',
    `audio_id` INT NOT NULL COMMENT 'Audio yang diputar saat tombol ditekan',
    `button_color` VARCHAR(30) DEFAULT 'blue' COMMENT 'Warna tema tombol di UI (red, green, blue, amber)',
    `sort_order` INT DEFAULT 0 COMMENT 'Urutan tata letak tombol di dashboard',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`audio_id`) REFERENCES `audio_library` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. TABEL PENGECUALIAN / OVERRIDE TANGGAL (Kalender Khusus Ujian Otomatis)
CREATE TABLE IF NOT EXISTS `calendar_overrides` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `override_date` DATE NOT NULL UNIQUE COMMENT 'Tanggal khusus di mana profil otomatis berganti',
    `target_profile_id` INT NOT NULL COMMENT 'Profil yang otomatis aktif pada tanggal tersebut',
    `notes` VARCHAR(255) NULL COMMENT 'Keterangan, misal: Penilaian Akhir Semester Hari ke-1',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`target_profile_id`) REFERENCES `schedule_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. TABEL PENGATURAN SISTEM (Master Setting)
CREATE TABLE IF NOT EXISTS `system_settings` (
    `setting_key` VARCHAR(50) PRIMARY KEY,
    `setting_value` TEXT NOT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. TABEL LOG AKTIVITAS / RIWAYAT BUNYI BEL
CREATE TABLE IF NOT EXISTS `bell_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `schedule_item_id` INT NULL COMMENT 'ID jadwal jika dipicu otomatis oleh scheduler',
    `audio_id` INT NOT NULL COMMENT 'ID audio yang berbunyi',
    `event_title` VARCHAR(150) NOT NULL COMMENT 'Nama peristiwa yang diputar',
    `trigger_source` ENUM('SCHEDULER_AUTO', 'DESKTOP_UI', 'WEB_REMOTE') NOT NULL DEFAULT 'SCHEDULER_AUTO',
    `played_at` DATETIME NOT NULL,
    `status` ENUM('PLAYED', 'STOPPED_MANUALLY', 'FILE_NOT_FOUND', 'AUDIO_ERROR') NOT NULL DEFAULT 'PLAYED',
    `client_ip` VARCHAR(45) NULL COMMENT 'IP perangkat yang menekan tombol jika via web remote',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_played_at` (`played_at`)
) ENGINE=InnoDB;

-- ====================================================================
-- DATA AWAL / SEEDER (Jadwal Reguler & Ujian Standar)
-- ====================================================================

-- Input Profil Bawaan
INSERT INTO `schedule_profiles` (`id`, `code`, `name`, `description`, `color`, `is_active`) VALUES
(1, 'REGULER', 'Jadwal Reguler (Senin - Kamis)', 'Jadwal Kegiatan Belajar Mengajar Normal', '#10B981', 1),
(2, 'JUMAT', 'Jadwal Reguler Jumat', 'Jadwal Khusus Hari Jumat (Jam Pendek & Sholat Jumat)', '#06B6D4', 0),
(3, 'UJIAN_PAS', 'Jadwal Ujian (PTS / PAS / PAT)', 'Jadwal Khusus Penilaian Tengah / Akhir Semester', '#F59E0B', 0),
(4, 'RAMADHAN', 'Jadwal Bulan Ramadhan', 'Jadwal Penyesuaian Jam Pembelajaran Ramadhan', '#8B5CF6', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Input Pengaturan Default
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('master_volume', '90', 'Volume suara master default (0-100)'),
('school_name', 'Mutiara Hati', 'Nama sekolah yang tampil di header aplikasi'),
('enable_remote_control', 'true', 'Izinkan akses pengaturan dari HP/laptop via jaringan Wi-Fi'),
('remote_port', '8080', 'Port web server lokal remote kontrol')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
