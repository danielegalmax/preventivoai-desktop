use std::path::PathBuf;

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_pdf_file(cartella: String, nome_file: String, bytes: Vec<u8>) -> Result<String, String> {
    std::fs::create_dir_all(&cartella).map_err(|e| e.to_string())?;
    let mut path = PathBuf::from(cartella);
    path.push(nome_file);
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    path.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Percorso non valido.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![read_file_bytes, write_pdf_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
