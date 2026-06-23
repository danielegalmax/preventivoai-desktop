use chrono::Utc;
use serde::Deserialize;
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

const MENU_OPEN: &str = "tray-open";
const MENU_QUIT: &str = "tray-quit";
const NOTIFICATION_POLL_INTERVAL_SECS: u64 = 35;
const TARGET_WINDOW_WIDTH: f64 = 1800.0;
const TARGET_WINDOW_HEIGHT: f64 = 1020.0;

#[cfg(target_os = "windows")]
fn enable_windows_dpi_awareness() {
    use std::sync::Once;

    static INIT: Once = Once::new();
    INIT.call_once(|| {
        #[link(name = "shcore")]
        extern "system" {
            fn SetProcessDpiAwareness(value: i32) -> i32;
        }

        #[link(name = "user32")]
        extern "system" {
            fn SetProcessDPIAware() -> i32;
        }

        unsafe {
            // PROCESS_PER_MONITOR_DPI_AWARE = 2
            if SetProcessDpiAwareness(2) == 0 {
                return;
            }
            let _ = SetProcessDPIAware();
        }
    });
}

fn configure_window_display(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "windows")]
    enable_windows_dpi_awareness();

    let Ok(Some(monitor)) = window.current_monitor() else {
        let _ = window.set_zoom(1.0);
        return;
    };

    let monitor_size = monitor.size();
    let scale_factor = monitor.scale_factor();
    let logical_width = monitor_size.width as f64 / scale_factor;
    let logical_height = monitor_size.height as f64 / scale_factor;

    if logical_width <= 1920.0 && logical_height <= 1080.0 {
        let width_ratio = (logical_width * 0.96) / TARGET_WINDOW_WIDTH;
        let height_ratio = (logical_height * 0.92) / TARGET_WINDOW_HEIGHT;
        let zoom = width_ratio.min(height_ratio).min(1.0).max(0.75);
        let _ = window.set_zoom(zoom);
    } else {
        let _ = window.set_zoom(1.0);
    }
}

#[derive(Clone)]
struct SessionInfo {
    supabase_url: String,
    supabase_anon_key: String,
    access_token: String,
    user_id: String,
    last_check: String,
}

#[derive(Default)]
struct NotificationSessionState {
    session: Mutex<Option<SessionInfo>>,
    delivered_notification_ids: Mutex<HashSet<String>>,
}

#[derive(Deserialize)]
struct NotificationRow {
    id: String,
    titolo: Option<String>,
    messaggio: Option<String>,
    created_at: String,
    letta: Option<bool>,
    snooze_until: Option<String>,
}

fn notifica_in_rimando(snooze_until: &Option<String>, now_ms: i64) -> bool {
    let Some(until) = snooze_until else {
        return false;
    };
    chrono::DateTime::parse_from_rfc3339(until)
        .map(|dt| dt.timestamp_millis() > now_ms)
        .unwrap_or(false)
}

fn notifica_idonea_os(row: &NotificationRow, now_ms: i64) -> bool {
    if row.letta.unwrap_or(false) {
        return false;
    }
    !notifica_in_rimando(&row.snooze_until, now_ms)
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn set_notification_session(
    state: tauri::State<'_, Arc<NotificationSessionState>>,
    supabase_url: String,
    supabase_anon_key: String,
    access_token: String,
    user_id: String,
) -> Result<(), String> {
    let mut session = state.session.lock().map_err(|e| e.to_string())?;
    let last_check = session
        .as_ref()
        .filter(|current| current.user_id == user_id)
        .map(|current| current.last_check.clone())
        .unwrap_or_else(|| Utc::now().to_rfc3339());

    if session
        .as_ref()
        .map(|current| current.user_id != user_id)
        .unwrap_or(false)
    {
        state
            .delivered_notification_ids
            .lock()
            .map_err(|e| e.to_string())?
            .clear();
    }

    *session = Some(SessionInfo {
        supabase_url,
        supabase_anon_key,
        access_token,
        user_id,
        last_check,
    });
    Ok(())
}

#[tauri::command]
fn clear_notification_session(
    state: tauri::State<'_, Arc<NotificationSessionState>>,
) -> Result<(), String> {
    let mut session = state.session.lock().map_err(|e| e.to_string())?;
    *session = None;
    state
        .delivered_notification_ids
        .lock()
        .map_err(|e| e.to_string())?
        .clear();
    Ok(())
}

fn is_main_window_foreground(app: &tauri::AppHandle) -> bool {
    app.get_webview_window("main")
        .map(|window| {
            let visible = window.is_visible().unwrap_or(false);
            let focused = window.is_focused().unwrap_or(false);
            let minimized = window.is_minimized().unwrap_or(false);
            visible && focused && !minimized
        })
        .unwrap_or(false)
}

async fn fetch_new_notifications(
    client: &reqwest::Client,
    session: &SessionInfo,
) -> Result<Vec<NotificationRow>, String> {
    let url = format!(
        "{}/rest/v1/notifiche",
        session.supabase_url.trim_end_matches('/')
    );
    let now_iso = Utc::now().to_rfc3339();
    let query = vec![
        ("select", "id,titolo,messaggio,created_at,letta,snooze_until".to_string()),
        ("user_id", format!("eq.{}", session.user_id)),
        ("archiviata", "eq.false".to_string()),
        ("letta", "eq.false".to_string()),
        (
            "or",
            format!("(snooze_until.is.null,snooze_until.lte.{now_iso})"),
        ),
        ("created_at", format!("gt.{}", session.last_check)),
        ("order", "created_at.asc".to_string()),
        ("limit", "20".to_string()),
    ];

    let response = client
        .get(url)
        .header("apikey", &session.supabase_anon_key)
        .bearer_auth(&session.access_token)
        .header("Accept", "application/json")
        .query(&query)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let body = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("Supabase notifiche HTTP {}", status.as_u16()));
    }

    serde_json::from_str::<Vec<NotificationRow>>(&body).map_err(|e| e.to_string())
}

fn start_notification_poller(app: tauri::AppHandle, state: Arc<NotificationSessionState>) {
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::new();

        loop {
            tokio::time::sleep(Duration::from_secs(NOTIFICATION_POLL_INTERVAL_SECS)).await;

            let session_snapshot = match state.session.lock() {
                Ok(guard) => guard.clone(),
                Err(error) => {
                    eprintln!("Errore stato notifiche native: {error}");
                    None
                }
            };

            let Some(session) = session_snapshot else {
                continue;
            };

            match fetch_new_notifications(&client, &session).await {
                Ok(rows) => {
                    if rows.is_empty() {
                        continue;
                    }

                    let should_skip_native = is_main_window_foreground(&app);
                    let mut newest_created_at = session.last_check.clone();
                    let now_ms = Utc::now().timestamp_millis();

                    for row in rows {
                        newest_created_at = row.created_at.clone();
                        if !notifica_idonea_os(&row, now_ms) {
                            continue;
                        }
                        let already_delivered = state
                            .delivered_notification_ids
                            .lock()
                            .map(|ids| ids.contains(&row.id))
                            .unwrap_or(false);
                        if already_delivered {
                            continue;
                        }

                        if let Ok(mut ids) = state.delivered_notification_ids.lock() {
                            ids.insert(row.id.clone());
                        }

                        if should_skip_native {
                            continue;
                        }

                        let title = row.titolo.unwrap_or_else(|| "PreventivoAI".to_string());
                        let body = row.messaggio.unwrap_or_default();
                        if let Err(error) =
                            app.notification().builder().title(title).body(body).show()
                        {
                            eprintln!("Errore notifica OS nativa: {error}");
                        }
                    }

                    if let Ok(mut guard) = state.session.lock() {
                        if let Some(current) = guard.as_mut() {
                            if current.user_id == session.user_id {
                                current.last_check = newest_created_at;
                            }
                        }
                    }
                }
                Err(error) => eprintln!("Errore polling notifiche native: {error}"),
            }
        }
    });
}

#[tauri::command]
fn mark_notification_delivered(
    state: tauri::State<'_, Arc<NotificationSessionState>>,
    notification_id: String,
) -> Result<(), String> {
    state
        .delivered_notification_ids
        .lock()
        .map_err(|e| e.to_string())?
        .insert(notification_id);
    Ok(())
}

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
    #[cfg(target_os = "windows")]
    enable_windows_dpi_awareness();

    let notification_state = Arc::new(NotificationSessionState::default());
    let poller_state = notification_state.clone();

    tauri::Builder::default()
        .manage(notification_state)
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(move |app| {
            start_notification_poller(app.handle().clone(), poller_state.clone());

            let open_item =
                MenuItem::with_id(app, MENU_OPEN, "Apri PreventivoAI", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, MENU_QUIT, "Esci", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

            let icon = app
                .default_window_icon()
                .cloned()
                .expect("missing default window icon");

            TrayIconBuilder::new()
                .icon(icon)
                .tooltip("PreventivoAI")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    MENU_OPEN => show_main_window(app),
                    MENU_QUIT => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                configure_window_display(&window);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_file_bytes,
            write_pdf_file,
            open_pdf_path,
            reveal_pdf_in_folder,
            set_notification_session,
            clear_notification_session,
            mark_notification_delivered
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
                // code=None: chiusura involontaria (es. ultima finestra); code=Some: app.exit() dal menu
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
