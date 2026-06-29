mod bootstrap;
mod commands;
mod config;
mod diff;
mod encryption;
mod git;
mod hooks;
mod readme;
mod types;
mod yadm;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Detection
            detect_yadm,
            // Status & log
            get_status,
            get_log,
            get_branch,
            get_remotes,
            // File operations
            add_files,
            untrack_file,
            stage_all,
            unstage_all,
            // Commits
            commit,
            amend_commit,
            // Sync
            push,
            pull,
            fetch,
            // Diff
            get_diff,
            get_file_diff,
            // Branches
            list_branches,
            checkout_branch,
            create_branch,
            // Stash
            stash_list,
            stash_save,
            stash_pop,
            stash_apply,
            stash_drop,
            // Alternates
            list_tracked,
            list_alternates,
            add_alternate,
            remove_alternate,
            // Config
            get_config,
            set_config,
            unset_config,
            // Encryption
            list_encrypted,
            encrypt_file,
            decrypt_file,
            get_encryption_config,
            set_encryption_config,
            // Hooks
            list_hooks,
            read_hook,
            write_hook,
            delete_hook,
            // Bootstrap
            bootstrap_init,
            bootstrap_clone,
            get_bootstrap,
            set_bootstrap,
            run_bootstrap,
            // README
            list_readmes,
            read_readme,
            write_readme,
            // Conflict helpers
            get_conflicts,
            resolve_conflict,
            // Drill-in
            list_directory,
            path_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
