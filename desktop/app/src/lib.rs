use tauri::Manager;

/// Path ke binary sidecar backend (bel-sekolah-backend) di samping executable.
#[cfg(windows)]
const SIDECAR_NAME: &str = "bel-sekolah-backend.exe";
#[cfg(not(windows))]
const SIDECAR_NAME: &str = "bel-sekolah-backend";

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let resource_dir = app.path().resource_dir()?;
            let sidecar = resource_dir.join(SIDECAR_NAME);

            if sidecar.exists() {
                // Backend sidecar mewarisi cwd aplikasi; DATABASE_URL default
                // sqlite://data/bel-sekolah.db relatif terhadap cwd tersebut.
                let _ = std::process::Command::new(&sidecar)
                    .env("SERVER_PORT", "8080")
                    .spawn();
            } else {
                eprintln!(
                    "Sidecar backend tidak ditemukan di {} (mode dev: jalankan backend manual)",
                    sidecar.display()
                );
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
