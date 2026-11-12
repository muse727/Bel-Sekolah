# Varian Desktop (Opsi B) — Status

Tanggal: 2026-11-12
Lingkungan build: Linux (srv984126). Target installer: Windows (.msi) via GitHub Actions.

## Struktur

```
desktop/
├── backend/          # Copy backend Rust, diubah dari MySQL → SQLite
│   ├── Cargo.toml    # sqlx features: runtime-tokio-rustls, sqlite, chrono
│   ├── src/main.rs   # Port default 8080, DATABASE_URL default sqlite://data/bel-sekolah.db?mode=rwc
│   └── migrations/0001_init.sql  # Skema SQLite (idempoten), di-include!() saat startup
├── app/              # Tauri 2 wrapper
│   ├── src/          # Spawn sidecar backend saat setup
│   ├── tauri.conf.json  # frontendDist: ../../frontend/dist; bundle target: msi
│   ├── icons/icon.png   # Ikon placeholder default
│   └── sidecar/      # Folder resource untuk binary backend + migrasi
```

## Perubahan MySQL → SQLite di desktop/backend/src/main.rs

- `MySqlPool` → `SqlitePool`, `MySqlPoolOptions` → `SqlitePoolOptions`
- `DATABASE_URL` default: `sqlite://data/bel-sekolah.db?mode=rwc` (folder `data/` lokal dibuat otomatis)
- `NOW()` → `datetime('now')` (2 INSERT bell_logs)
- `LAST_INSERT_ID()` → `last_insert_rowid()` (3 endpoint)
- `TIME_FORMAT(bell_time, ...)` → `substr(bell_time, ...)` (scheduler, status harian, list jadwal)
- `DATE_FORMAT(played_at, ...)` → `strftime(...)` (logs)
- `IF(a=1,0,1)` → `CASE WHEN a=1 THEN 0 ELSE 1 END` (toggle jadwal)
- `ON DUPLICATE KEY UPDATE ... VALUES(...)` → `ON CONFLICT(setting_key) DO UPDATE SET ... excluded....` (8 UPSERT settings)
- Direktori audio/branding/frontend-dist default relatif (`data/audio`, `data/branding`, `data/frontend-dist`)
- Migrasi dijalankan otomatis saat startup (split per statement, idempoten)

Backend live (MySQL) di `backend/` TIDAK diubah sama sekali.

## Checklist

- [x] Copy backend Rust ke `desktop/backend` + konversi sqlx MySQL → SQLite
- [x] Migrasi skema SQLite di `desktop/backend/migrations/0001_init.sql` (turunan `database/schema.sql`, termasuk seeder profil & settings)
- [x] Tauri 2 setup di `desktop/app` (frontendDist `../../frontend/dist`, sidecar backend, ikon placeholder)
- [x] Workflow GitHub Actions `.github/workflows/desktop-build.yml` — build .msi saat push tag `desktop-v*`
- [ ] Build Windows .msi nyata via CI (butuh push tag ke GitHub; workflow siap)
- [x] Pairing desktop ke server pusat (sinkronisasi jadwal/audio MySQL ↔ SQLite)
- [ ] Auto-update (Tauri updater + endpoint rilis) — belum dimulai
- [ ] Ikon final branding sekolah (sekarang placeholder)

## Pairing Desktop ↔ Server Pusat (2026-11-12)

### Sisi server pusat (`backend/src/main.rs`, MySQL)
- Tabel baru `pairing_devices` (id, device_id unique, device_name, pairing_code 6 digit unique,
  status pending|paired|revoked, last_seen_at, created_at) — migrasi idempoten `CREATE TABLE IF NOT EXISTS`
  dijalankan saat startup, aman untuk DB live.
- Endpoint admin: `POST /api/pairing/devices` (buat device + kode), `GET /api/pairing/devices` (list),
  `DELETE /api/pairing/devices/{id}` (revoke → status `revoked`).
- Endpoint desktop (auth via header `X-Pairing-Code`): `GET /api/pairing/sync` (profiles + schedules
  semua item + audios metadata + settings dalam satu JSON), `POST /api/pairing/heartbeat`
  (update `last_seen_at`, catat versi app/jam lokal).
- Kode pairing tidak valid → 401, revoked → 403. Endpoint lama tidak diubah.
- Dependency baru: `rand` (generate kode 6 digit).

### Sisi desktop (`desktop/backend/src/main.rs`, SQLite)
- Tabel baru `pairing_status` (baris tunggal id=1): central_server_url, pairing_code,
  pairing_enabled (default 0), last_sync_at, last_sync_ok, last_error — di `migrations/0001_init.sql`.
- Background task sinkronisasi interval 60 detik (hanya jika enabled): GET sync pakai
  `X-Pairing-Code` → upsert profiles/audios, mirror penuh schedule_items, upsert settings
  (master_volume, mute_mode, school_name, timezone, time_format) — setting pairing sendiri
  tersimpan terpisah di `pairing_status`, tidak akan tertimpa. POST heartbeat tiap siklus.
- Endpoint baru: `GET /api/pairing/status` → {enabled, last_sync_at, last_sync_ok, error};
  `POST /api/pairing/config` {central_server_url, pairing_code, enabled}.
- Dependency baru: `reqwest` (rustls), `rand`.

### Frontend
- Section **"Pairing Server Pusat"** ditambahkan di tab Pengaturan: input URL + kode 6 digit,
  toggle aktif/nonaktif, badge status (NONAKTIF / TERSINKRON / GAGAL SYNC) + waktu sync terakhir.
  Build frontend lulus.

### Verifikasi Nyata (lokal, port & DB terpisah, tidak menyentuh produksi)
- `cargo check` backend pusat: **LULUS** — `Finished dev profile ... 0.52s`, 0 error 0 warning.
- `cargo check` desktop backend: **LULUS** — `Finished dev profile ... 17.05s`, 0 error 0 warning.
- Runtime desktop di port uji 8095 (SQLite `/tmp/bel-test-pairing.db`):
  - `GET /api/pairing/status` awal: `{"enabled":false,"last_sync_at":null,"last_sync_ok":false,"error":null}`
  - `POST /api/pairing/config` `{"central_server_url":"...","pairing_code":"123456","enabled":true}`
    → `{"enabled":true,...}`; nilai tersimpan di SQLite terverifikasi.
  - Saat pusat tak terjangkau: `last_sync_ok:false` dengan error `"Sync gagal: error sending request for url (http://127.0.0.1:9099/api/pairing/sync)"`.
  - Dengan mock server pusat (port 9099): sync sukses — `last_sync_ok:true`, jadwal `Bel Masuk (pusat)`
    dan audio `Bell Pusat` dari pusat tampil di `/api/schedules` & `/api/audios` lokal, settings
    `school_name: "SIT Al-Mubarak (pusat)"` & `master_volume: 75` terpakai; heartbeat diterima mock:
    `{"app_version":"0.1.0","local_time":"2026-11-12 11:42:53","last_bell":null}`.
- Migrasi pusat tidak dijalankan terhadap DB produksi (instruksi tugas); statement `CREATE TABLE IF NOT EXISTS` idempoten.

### Catatan
- File audio tidak diunduh oleh sinkronisasi (hanya metadata); pemutaran di desktop tetap
  memakai pustaka audio lokal. Pengunduhan file audio bisa jadi pengembangan berikutnya.

## Verifikasi Nyata

- `cargo check` di `desktop/backend`: **LULUS** — `Finished dev profile [unoptimized + debuginfo] target(s) in 2m 13s`, 0 error, 0 warning.
- `npm run build` di `frontend/`: **LULUS** — `tsc -b && vite build` sukses, `dist/` dihasilkan (16 modules, built in 502ms).
- `cargo check` Tauri app di `desktop/app`: **BELUM dijalankan** di Linux ini (butuh dependency WebKitGTK; build utama memakai CI Windows). Struktur mengikuti template standar Tauri 2.
- Runtime SQLite end-to-end: **BELUM diuji** (butuh menjalankan binary + browser; disarankan uji manual saat `cargo run` pertama).

## Langkah Berikutnya

1. Uji runtime lokal: `cd desktop/backend && cargo run` lalu buka `http://127.0.0.1:8080` — cek migrasi & API `/api/status`. Frontend dev server Vite bisa dipakai dengan proxy yang sudah ada.
2. Push tag `desktop-v0.1.0` untuk memicu build .msi di GitHub Actions; unduh artifact `bel-sekolah-windows-msi`.
3. Implementasi pairing ke server pusat: endpoint sinkronisasi (pull jadwal & audio dari MySQL pusat ke SQLite desktop) — desain API & token pairing.
4. Tauri updater: siapkan signing key + endpoint rilis, tambahkan plugin `tauri-plugin-updater`.
5. Ganti ikon placeholder dengan branding final (bel + logo sekolah).
