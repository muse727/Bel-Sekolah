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
- [ ] Pairing desktop ke server pusat (sinkronisasi jadwal/audio MySQL ↔ SQLite) — belum dimulai
- [ ] Auto-update (Tauri updater + endpoint rilis) — belum dimulai
- [ ] Ikon final branding sekolah (sekarang placeholder)

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
