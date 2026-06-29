use crate::git;
use crate::types::*;

/// Detect whether yadm is available and whether a repository is initialized.
#[tauri::command]
pub fn detect_yadm() -> AppResult<serde_json::Value> {
    let version_out = crate::yadm::run_yadm(&["--version"])?;
    let initialized = git::is_repo().unwrap_or(false);
    Ok(serde_json::json!({
        "available": version_out.code == 0,
        "version": version_out.stdout.trim(),
        "initialized": initialized,
    }))
}

#[tauri::command]
pub fn get_status() -> AppResult<YadmStatus> {
    git::status()
}

#[tauri::command]
pub fn get_log(limit: Option<usize>) -> AppResult<Vec<LogEntry>> {
    git::log(limit.unwrap_or(50))
}

#[tauri::command]
pub fn get_branch() -> AppResult<String> {
    git::current_branch()
}

#[tauri::command]
pub fn get_remotes() -> AppResult<Vec<RemoteInfo>> {
    git::remotes()
}

#[tauri::command]
pub fn add_files(paths: Vec<String>) -> AppResult<()> {
    let refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    git::add(&refs)
}

#[tauri::command]
pub fn untrack_file(path: String) -> AppResult<()> {
    git::rm_cached(&path)
}

#[tauri::command]
pub fn stage_all() -> AppResult<()> {
    git::add(&["--all"])
}

#[tauri::command]
pub fn unstage_all() -> AppResult<()> {
    git::reset_mixed()
}

#[tauri::command]
pub fn commit(message: String, sign: Option<bool>) -> AppResult<String> {
    let args = if sign.unwrap_or(false) {
        vec!["commit", "-S", "-m", &message]
    } else {
        vec!["commit", "-m", &message]
    };
    let out = crate::yadm::run_yadm(&args)?;
    crate::yadm::check_rc(&out)?;
    Ok(out.stdout.trim().to_string())
}

#[tauri::command]
pub fn amend_commit(message: Option<String>) -> AppResult<String> {
    let mut args: Vec<String> = vec!["commit".into(), "--amend".into()];
    if let Some(m) = message {
        args.push("-m".into());
        args.push(m);
    }
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = crate::yadm::run_yadm(&refs)?;
    crate::yadm::check_rc(&out)?;
    Ok(out.stdout.trim().to_string())
}

#[tauri::command]
pub fn push(force: Option<bool>, set_upstream: Option<bool>) -> AppResult<String> {
    let mut args: Vec<String> = vec!["push".into()];
    if set_upstream.unwrap_or(false) {
        args.push("-u".into());
    }
    if force.unwrap_or(false) {
        args.push("--force-with-lease".into());
    }
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = crate::yadm::run_yadm(&refs)?;
    crate::yadm::check_rc(&out)?;
    Ok(format!("{}{}", out.stdout, out.stderr))
}

#[tauri::command]
pub fn pull(rebase: Option<bool>) -> AppResult<String> {
    let mut args: Vec<String> = vec!["pull".into()];
    if rebase.unwrap_or(false) {
        args.push("--rebase".into());
    }
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = crate::yadm::run_yadm(&refs)?;
    crate::yadm::check_rc(&out)?;
    Ok(format!("{}{}", out.stdout, out.stderr))
}

#[tauri::command]
pub fn fetch() -> AppResult<String> {
    let out = crate::yadm::run_yadm(&["fetch", "--all", "--prune"])?;
    crate::yadm::check_rc(&out)?;
    Ok(format!("{}{}", out.stdout, out.stderr))
}

#[tauri::command]
pub fn get_diff(staged: Option<bool>) -> AppResult<Vec<DiffResult>> {
    git::diff(staged.unwrap_or(false))
}

#[tauri::command]
pub fn get_file_diff(path: String, staged: Option<bool>) -> AppResult<DiffResult> {
    git::file_diff(&path, staged.unwrap_or(false))
}

#[tauri::command]
pub fn list_branches() -> AppResult<Vec<BranchInfo>> {
    git::branches()
}

#[tauri::command]
pub fn checkout_branch(branch: String) -> AppResult<()> {
    let out = crate::yadm::run_yadm(&["checkout", &branch])?;
    crate::yadm::check_rc(&out)
}

#[tauri::command]
pub fn create_branch(name: String, checkout: Option<bool>) -> AppResult<()> {
    let mut args: Vec<&str> = vec!["checkout", "-b", &name];
    if !checkout.unwrap_or(true) {
        args = vec!["branch", &name];
    }
    let out = crate::yadm::run_yadm(&args)?;
    crate::yadm::check_rc(&out)
}

#[tauri::command]
pub fn stash_list() -> AppResult<Vec<StashEntry>> {
    git::stash_list()
}

#[tauri::command]
pub fn stash_save(message: Option<String>, include_untracked: Option<bool>) -> AppResult<()> {
    let mut args: Vec<String> = vec!["stash".into(), "push".into()];
    if include_untracked.unwrap_or(false) {
        args.push("-u".into());
    }
    if let Some(m) = message {
        args.push("-m".into());
        args.push(m);
    }
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = crate::yadm::run_yadm(&refs)?;
    crate::yadm::check_rc(&out)
}

#[tauri::command]
pub fn stash_pop(index: Option<usize>) -> AppResult<()> {
    let arg = format!("stash@{{{}}}", index.unwrap_or(0));
    let out = crate::yadm::run_yadm(&["stash", "pop", &arg])?;
    crate::yadm::check_rc(&out)
}

#[tauri::command]
pub fn stash_apply(index: Option<usize>) -> AppResult<()> {
    let arg = format!("stash@{{{}}}", index.unwrap_or(0));
    let out = crate::yadm::run_yadm(&["stash", "apply", &arg])?;
    crate::yadm::check_rc(&out)
}

#[tauri::command]
pub fn stash_drop(index: Option<usize>) -> AppResult<()> {
    let arg = format!("stash@{{{}}}", index.unwrap_or(0));
    let out = crate::yadm::run_yadm(&["stash", "drop", &arg])?;
    crate::yadm::check_rc(&out)
}

#[tauri::command]
pub fn list_tracked() -> AppResult<Vec<String>> {
    git::tracked_files()
}

#[tauri::command]
pub fn list_alternates() -> AppResult<Vec<AlternateInfo>> {
    crate::config::list_alternates()
}

#[tauri::command]
pub fn add_alternate(source: String, link: String) -> AppResult<()> {
    crate::config::add_alternate(&source, &link)
}

#[tauri::command]
pub fn remove_alternate(source: String) -> AppResult<()> {
    crate::config::remove_alternate(&source)
}

#[tauri::command]
pub fn get_config(scope: Option<String>) -> AppResult<Vec<ConfigEntry>> {
    crate::config::list_config(scope.as_deref().unwrap_or("all"))
}

#[tauri::command]
pub fn set_config(key: String, value: String, scope: Option<String>) -> AppResult<()> {
    crate::config::set(&key, &value, scope.as_deref().unwrap_or("local"))
}

#[tauri::command]
pub fn unset_config(key: String, scope: Option<String>) -> AppResult<()> {
    crate::config::unset(&key, scope.as_deref().unwrap_or("local"))
}

#[tauri::command]
pub fn list_encrypted() -> AppResult<Vec<EncryptedFile>> {
    crate::encryption::list_encrypted()
}

#[tauri::command]
pub fn encrypt_file(path: String) -> AppResult<()> {
    crate::encryption::encrypt(&path)
}

#[tauri::command]
pub fn decrypt_file(path: String) -> AppResult<String> {
    crate::encryption::decrypt_to_memory(&path)
}

#[tauri::command]
pub fn get_encryption_config() -> AppResult<EncryptionConfig> {
    crate::encryption::read_config()
}

#[tauri::command]
pub fn set_encryption_config(config: EncryptionConfig) -> AppResult<()> {
    crate::encryption::write_config(&config)
}

#[tauri::command]
pub fn list_hooks() -> AppResult<Vec<HookInfo>> {
    crate::hooks::list()
}

#[tauri::command]
pub fn read_hook(name: String) -> AppResult<String> {
    crate::hooks::read(&name)
}

#[tauri::command]
pub fn write_hook(name: String, content: String, executable: Option<bool>) -> AppResult<()> {
    crate::hooks::write(&name, &content, executable.unwrap_or(true))
}

#[tauri::command]
pub fn delete_hook(name: String) -> AppResult<()> {
    crate::hooks::delete(&name)
}

#[tauri::command]
pub fn bootstrap_init(repo_url: Option<String>) -> AppResult<BootstrapResult> {
    crate::bootstrap::init(repo_url.as_deref())
}

#[tauri::command]
pub fn bootstrap_clone(url: String, branch: Option<String>) -> AppResult<BootstrapResult> {
    crate::bootstrap::clone(&url, branch.as_deref())
}

#[tauri::command]
pub fn get_conflicts() -> AppResult<Vec<ConflictInfo>> {
    git::conflicts()
}

#[tauri::command]
pub fn resolve_conflict(path: String, resolution: String, stage: Option<bool>) -> AppResult<()> {
    git::resolve_conflict(&path, &resolution, stage.unwrap_or(true))
}

// Directory listing for drill-in on untracked folders.

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
pub fn list_directory(path: String) -> AppResult<Vec<DirEntry>> {
    crate::git::list_dir(&path)
}

#[tauri::command]
pub fn path_exists(path: String) -> AppResult<bool> {
    Ok(crate::git::path_exists(&path))
}

// README

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct ReadmeInfo {
    pub path: String,
    pub content: String,
}

#[tauri::command]
pub fn list_readmes() -> AppResult<Vec<ReadmeInfo>> {
    crate::readme::list()
}

#[tauri::command]
pub fn read_readme(path: String) -> AppResult<String> {
    crate::readme::read(&path)
}

#[tauri::command]
pub fn write_readme(path: String, content: String) -> AppResult<()> {
    crate::readme::write(&path, &content)
}

// Bootstrap script

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct BootstrapInfo {
    pub path: String,
    pub exists: bool,
    pub content: String,
}

#[tauri::command]
pub fn get_bootstrap() -> AppResult<BootstrapInfo> {
    crate::bootstrap::read_script()
}

#[tauri::command]
pub fn set_bootstrap(content: String) -> AppResult<()> {
    crate::bootstrap::write_script(&content)
}

#[tauri::command]
pub fn run_bootstrap() -> AppResult<String> {
    crate::bootstrap::run()
}
