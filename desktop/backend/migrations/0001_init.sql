-- Skema SQLite: Bel Sekolah Desktop (turunan dari database/schema.sql MySQL)
CREATE TABLE IF NOT EXISTS schedule_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#2563EB',
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audio_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    category TEXT DEFAULT 'BELL' CHECK (category IN ('BELL','ANNOUNCEMENT','NATIONAL_ANTHEM','PRAYER','EMERGENCY','CUSTOM')),
    is_system INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES schedule_profiles(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL DEFAULT 'SEMUA_HARI' CHECK (day_of_week IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU','MINGGU','SEMUA_HARI')),
    bell_time TEXT NOT NULL,
    event_name TEXT NOT NULL,
    audio_id INTEGER NOT NULL REFERENCES audio_library(id) ON DELETE RESTRICT,
    volume INTEGER DEFAULT 100,
    is_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lookup_schedule ON schedule_items (profile_id, day_of_week, bell_time, is_enabled);

CREATE TABLE IF NOT EXISTS soundboard_buttons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    audio_id INTEGER NOT NULL REFERENCES audio_library(id) ON DELETE CASCADE,
    button_color TEXT DEFAULT 'blue',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calendar_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    override_date TEXT NOT NULL UNIQUE,
    target_profile_id INTEGER NOT NULL REFERENCES schedule_profiles(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bell_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_item_id INTEGER,
    audio_id INTEGER NOT NULL,
    event_title TEXT NOT NULL,
    trigger_source TEXT NOT NULL DEFAULT 'SCHEDULER_AUTO' CHECK (trigger_source IN ('SCHEDULER_AUTO','DESKTOP_UI','WEB_REMOTE')),
    played_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PLAYED' CHECK (status IN ('PLAYED','STOPPED_MANUALLY','FILE_NOT_FOUND','AUDIO_ERROR')),
    client_ip TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_played_at ON bell_logs (played_at);
CREATE INDEX IF NOT EXISTS idx_is_active ON schedule_profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_category ON audio_library (category);

CREATE TABLE IF NOT EXISTS pairing_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    central_server_url TEXT NOT NULL DEFAULT '',
    pairing_code TEXT NOT NULL DEFAULT '',
    pairing_enabled INTEGER NOT NULL DEFAULT 0,
    last_sync_at TEXT,
    last_sync_ok INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);
INSERT OR IGNORE INTO pairing_status (id, central_server_url, pairing_code, pairing_enabled) VALUES (1, '', '', 0);

-- Seeder
INSERT OR IGNORE INTO schedule_profiles (id, code, name, description, color, is_active) VALUES
(1, 'REGULER', 'Jadwal Reguler (Senin - Kamis)', 'Jadwal Kegiatan Belajar Mengajar Normal', '#10B981', 1),
(2, 'JUMAT', 'Jadwal Reguler Jumat', 'Jadwal Khusus Hari Jumat (Jam Pendek & Sholat Jumat)', '#06B6D4', 0),
(3, 'UJIAN_PAS', 'Jadwal Ujian (PTS / PAS / PAT)', 'Jadwal Khusus Penilaian Tengah / Akhir Semester', '#F59E0B', 0),
(4, 'RAMADHAN', 'Jadwal Bulan Ramadhan', 'Jadwal Penyesuaian Jam Pembelajaran Ramadhan', '#8B5CF6', 0);

INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('master_volume', '90', 'Volume suara master default (0-100)'),
('school_name', 'Mutiara Hati', 'Nama sekolah yang tampil di header aplikasi'),
('enable_remote_control', 'true', 'Izinkan akses pengaturan dari HP/laptop via jaringan Wi-Fi'),
('remote_port', '8080', 'Port web server lokal remote kontrol');
