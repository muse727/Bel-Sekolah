use tauri::Manager;

/// Path ke binary sidecar backend (bel-sekolah-desktop-backend) di samping executable.
#[cfg(windows)]
const SIDECAR_NAME: &str = "bel-sekolah-desktop-backend.exe";
#[cfg(not(windows))]
const SIDECAR_NAME: &str = "bel-sekolah-desktop-backend";

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let resource_dir = app.path().resource_dir()?;

            // Tauri menaruh resources dengan struktur relatif terjaga (sidecar/xxx),
            // tapi sebagian target menaruhnya datar di resource_dir. Cek keduanya.
            let candidates = [
                resource_dir.join("sidecar").join(SIDECAR_NAME),
                resource_dir.join(SIDECAR_NAME),
            ];
            let sidecar = candidates
                .iter()
                .find(|p| p.exists())
                .cloned()
                .unwrap_or_else(|| candidates[0].clone());

            if sidecar.exists() {
                // Backend sidecar mewarisi cwd aplikasi; DATABASE_URL default
                // sqlite://data/bel-sekolah.db relatif terhadap cwd tersebut.
                let mut cmd = std::process::Command::new(&sidecar);
                cmd.env("SERVER_PORT", "8080");

                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    // CREATE_NO_WINDOW = 0x08000000 agar tidak memunculkan jendela console hitam (cmd)
                    cmd.creation_flags(0x08000000);
                }

                let _ = cmd.spawn();
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
