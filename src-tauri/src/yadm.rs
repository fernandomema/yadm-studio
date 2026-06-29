use crate::types::{AppError, AppResult, CommandOutput};
use std::path::Path;
use std::process::{Command, Stdio};

/// Locate the yadm binary. Tries a few common locations as a fallback so
/// the app works even when the binary is not in the GUI process PATH.
pub fn yadm_binary() -> String {
    if let Ok(p) = std::env::var("YADM_BIN") {
        return p;
    }
    for candidate in [
        "/opt/homebrew/bin/yadm",
        "/usr/local/bin/yadm",
        "/usr/bin/yadm",
        "/opt/local/bin/yadm",
    ] {
        if Path::new(candidate).exists() {
            return candidate.to_string();
        }
    }
    "yadm".to_string()
}

pub fn run_yadm(args: &[&str]) -> AppResult<CommandOutput> {
    let bin = yadm_binary();
    // yadm uses $HOME as its work tree, but git resolves relative
    // pathspecs against the process CWD. When the Tauri app is launched
    // from a project directory (e.g. via `npm run tauri dev`), git ends
    // up looking for files under that directory instead of $HOME. Force
    // CWD to $HOME so pathspecs like `.config/raycast/config.json`
    // resolve correctly.
    let cwd = std::env::var_os("HOME").map(std::path::PathBuf::from);
    let mut cmd = Command::new(&bin);
    cmd.args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    let output = cmd.output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            AppError::YadmNotFound
        } else {
            AppError::Io(e)
        }
    })?;
    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        code: output.status.code().unwrap_or(-1),
    })
}

#[allow(dead_code)]
pub fn run_yadm_in(_dir: &Path, args: &[&str]) -> AppResult<CommandOutput> {
    run_yadm(args)
}
pub fn run_cmd(program: &str, args: &[&str]) -> AppResult<CommandOutput> {
    let output = Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(AppError::Io)?;
    Ok(CommandOutput {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        code: output.status.code().unwrap_or(-1),
    })
}

pub fn check_rc(out: &CommandOutput) -> AppResult<()> {
    if out.code != 0 {
        Err(AppError::Yadm {
            code: out.code,
            stderr: out.stderr.trim().to_string(),
        })
    } else {
        Ok(())
    }
}

pub fn yadm_dir() -> Option<std::path::PathBuf> {
    // yadm manages files in $HOME directly. Trying to use `yadm enter` is
    // unreliable in a non-interactive context because it spawns an
    // interactive subshell that prints "Entering/Leaving yadm repo" but
    // never writes the actual path to stdout.
    std::env::var_os("HOME").map(std::path::PathBuf::from)
}
