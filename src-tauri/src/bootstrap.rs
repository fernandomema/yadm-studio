use crate::commands::BootstrapInfo;
use crate::types::{AppError, AppResult, BootstrapResult};
use crate::yadm;
use std::path::PathBuf;

const DEFAULT_BOOTSTRAP: &str = ".config/yadm/bootstrap";

fn bootstrap_path() -> AppResult<PathBuf> {
    // yadm stores the configured bootstrap path under yadm.bootstrap. If not
    // set, the default lives in $HOME.
    let out = yadm::run_yadm(&["config", "--get", "yadm.bootstrap"])?;
    let configured = if out.code == 0 {
        out.stdout.trim().to_string()
    } else {
        DEFAULT_BOOTSTRAP.to_string()
    };
    let home = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let p = if PathBuf::from(&configured).is_absolute() {
        PathBuf::from(&configured)
    } else {
        home.join(&configured)
    };
    Ok(p)
}

pub fn init(repo_url: Option<&str>) -> AppResult<BootstrapResult> {
    let mut args: Vec<String> = vec!["init".into()];
    if let Some(url) = repo_url {
        args.push("-w".into());
        args.push(url.into());
    }
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = yadm::run_yadm(&refs)?;
    if out.code != 0 {
        return Ok(BootstrapResult {
            success: false,
            message: format!("{}{}", out.stdout, out.stderr),
            remote_url: None,
        });
    }
    let branch_out = yadm::run_yadm(&["config", "init.defaultBranch", "main"]);
    let _ = branch_out;
    let remote_url = if repo_url.is_some() {
        yadm::run_yadm(&["config", "--get", "remote.origin.url"])
            .ok()
            .map(|o| o.stdout.trim().to_string())
            .filter(|s| !s.is_empty())
    } else {
        None
    };
    Ok(BootstrapResult {
        success: true,
        message: format!("{}{}", out.stdout, out.stderr),
        remote_url,
    })
}

pub fn clone(url: &str, branch: Option<&str>) -> AppResult<BootstrapResult> {
    let mut args: Vec<String> = vec!["clone".into(), "-w".into(), url.into()];
    if let Some(b) = branch {
        args.push("-b".into());
        args.push(b.into());
    }
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let out = yadm::run_yadm(&refs)?;
    if out.code != 0 {
        return Err(AppError::Other(format!("{}{}", out.stdout, out.stderr)));
    }
    Ok(BootstrapResult {
        success: true,
        message: format!("{}{}", out.stdout, out.stderr),
        remote_url: Some(url.to_string()),
    })
}

pub fn read_script() -> AppResult<BootstrapInfo> {
    let path = bootstrap_path()?;
    let exists = path.exists();
    let content = if exists {
        std::fs::read_to_string(&path).unwrap_or_default()
    } else {
        String::new()
    };
    Ok(BootstrapInfo {
        path: path.to_string_lossy().into_owned(),
        exists,
        content,
    })
}

pub fn write_script(content: &str) -> AppResult<()> {
    let path = bootstrap_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&path, content)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perm = std::fs::metadata(&path)?.permissions();
        perm.set_mode(0o755);
        std::fs::set_permissions(&path, perm)?;
    }
    Ok(())
}

pub fn run() -> AppResult<String> {
    let path = bootstrap_path()?;
    if !path.exists() {
        return Err(AppError::Other(format!(
            "No bootstrap file at {}",
            path.display()
        )));
    }
    let out = std::process::Command::new(&path)
        .stdin(std::process::Stdio::null())
        .output()
        .map_err(AppError::Io)?;
    let mut text = String::from_utf8_lossy(&out.stdout).into_owned();
    if !out.stderr.is_empty() {
        text.push_str("\n--- stderr ---\n");
        text.push_str(&String::from_utf8_lossy(&out.stderr));
    }
    if !out.status.success() {
        return Err(AppError::Other(format!(
            "Bootstrap exited with code {}\n{}",
            out.status.code().unwrap_or(-1),
            text
        )));
    }
    Ok(text)
}

