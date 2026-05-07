mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_profile_region,
            commands::list_aws_profiles,
            commands::list_services,
            commands::read_secrets,
            commands::write_secret,
            commands::delete_secret,
            commands::export_env,
            commands::check_aws_auth,
            commands::aws_sso_login,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
