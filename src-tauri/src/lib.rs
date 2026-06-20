use std::path::PathBuf;
use tauri_plugin_opener::OpenerExt;

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

fn valida_percorso_pdf(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    let ext = p
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false);
    if !ext {
        return Err("Il file deve essere un PDF.".to_string());
    }
    if !p.is_file() {
        return Err(format!("File non trovato: {path}"));
    }
    Ok(p)
}

/// Apre un PDF locale via Rust (bypass scope frontend per path scelti con dialog).
#[tauri::command]
fn open_pdf_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    valida_percorso_pdf(&path)?;
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

/// Mostra un PDF in Esplora file via Rust (stesso motivo di open_pdf_path).
#[tauri::command]
fn reveal_pdf_in_folder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("Percorso non trovato: {path}"));
    }
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|e| e.to_string())
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
        .invoke_handler(tauri::generate_handler![
            read_file_bytes,
            write_pdf_file,
            open_pdf_path,
            reveal_pdf_in_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
