use crate::types::{AppError, AppResult, HookInfo};
use crate::yadm;

const HOOK_NAMES: &[&str] = &[
    "pre-init",
    "post-init",
    "pre-clone",
    "post-clone",
    "pre-commit",
    "post-commit",
    "pre-status",
    "post-status",
    "pre-encrypt",
    "post-encrypt",
    "pre-decrypt",
    "post-decrypt",
    "pre-alt",
    "post-alt",
    "pre-bootstrap",
    "post-bootstrap",
];

pub fn list() -> AppResult<Vec<HookInfo>> {
    let dir = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let hooks = dir.join("hooks");
    let mut result = Vec::new();
    for name in HOOK_NAMES {
        let path = hooks.join(name);
        let exists = path.exists();
        let executable = if exists {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                path.metadata()
                    .map(|m| m.permissions().mode() & 0o111 != 0)
                    .unwrap_or(false)
            }
            #[cfg(not(unix))]
            {
                true
            }
        } else {
            false
        };
        result.push(HookInfo {
            name: name.to_string(),
            path: path.to_string_lossy().into_owned(),
            exists,
            executable,
        });
    }
    Ok(result)
}

pub fn read(name: &str) -> AppResult<String> {
    if !HOOK_NAMES.contains(&name) {
        return Err(AppError::Other(format!("Unknown hook: {}", name)));
    }
    let dir = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let path = dir.join("hooks").join(name);
    if !path.exists() {
        return Ok(String::new());
    }
    Ok(std::fs::read_to_string(&path)?)
}

pub fn write(name: &str, content: &str, executable: bool) -> AppResult<()> {
    // `executable` is only consumed on unix where we chmod +x the file.
    // Silence the unused-variable warning on Windows builds.
    let _ = &executable;
    if !HOOK_NAMES.contains(&name) {
        return Err(AppError::Other(format!("Unknown hook: {}", name)));
    }
    let dir = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let hooks = dir.join("hooks");
    std::fs::create_dir_all(&hooks)?;
    let path = hooks.join(name);
    std::fs::write(&path, content)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if executable {
            let mut perm = std::fs::metadata(&path)?.permissions();
            perm.set_mode(0o755);
            std::fs::set_permissions(&path, perm)?;
        }
    }
    Ok(())
}

pub fn delete(name: &str) -> AppResult<()> {
    if !HOOK_NAMES.contains(&name) {
        return Err(AppError::Other(format!("Unknown hook: {}", name)));
    }
    let dir = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let path = dir.join("hooks").join(name);
    if path.exists() {
        std::fs::remove_file(&path)?;
    }
    Ok(())
}
