use crate::types::{AppError, AppResult, ConfigEntry, AlternateInfo};
use crate::yadm;

pub fn list_config(scope: &str) -> AppResult<Vec<ConfigEntry>> {
    let mut result = Vec::new();
    for s in scopes_for(scope) {
        let out = yadm::run_yadm(&["config", s, "--list", "-z"])?;
        if out.code != 0 {
            continue;
        }
        for chunk in out.stdout.split('\0') {
            if chunk.is_empty() {
                continue;
            }
            let mut parts = chunk.splitn(2, '\n');
            let key = parts.next().unwrap_or("").to_string();
            let value = parts.next().unwrap_or("").to_string();
            if !key.is_empty() {
                result.push(ConfigEntry {
                    key,
                    value,
                    scope: s.replace("--", ""),
                });
            }
        }
    }
    Ok(result)
}

fn scopes_for(scope: &str) -> Vec<&'static str> {
    match scope {
        "local" => vec!["--local"],
        "global" => vec!["--global"],
        "system" => vec!["--system"],
        _ => vec!["--local", "--global", "--system"],
    }
}

pub fn set(key: &str, value: &str, scope: &str) -> AppResult<()> {
    let s = format!("--{}", scope);
    let out = yadm::run_yadm(&["config", s.as_str(), key, value])?;
    yadm::check_rc(&out)
}

pub fn unset(key: &str, scope: &str) -> AppResult<()> {
    let s = format!("--{}", scope);
    let out = yadm::run_yadm(&["config", s.as_str(), "--unset", key])?;
    if out.code != 0 {
        // Try unset-all
        yadm::run_yadm(&["config", s.as_str(), "--unset-all", key])?;
    }
    Ok(())
}

pub fn list_alternates() -> AppResult<Vec<AlternateInfo>> {
    let out = yadm::run_yadm(&["list", "-d"])?;
    let mut result = Vec::new();
    for line in out.stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // yadm list -d format: "class:source -> link" or "source -> link"
        let (class, rest) = if let Some(colon) = line.find(':') {
            let cls = line[..colon].to_string();
            (Some(cls), &line[colon + 1..])
        } else {
            (None, line)
        };
        if let Some(arrow_pos) = rest.find("->") {
            let source = rest[..arrow_pos].trim().to_string();
            let link = rest[arrow_pos + 2..].trim().to_string();
            let home = yadm::yadm_dir();
            let valid = if let Some(h) = &home {
                let target = if std::path::Path::new(&link).is_absolute() {
                    std::path::PathBuf::from(&link)
                } else {
                    h.join(&link)
                };
                let saved = if std::path::Path::new(&source).is_absolute() {
                    std::path::PathBuf::from(&source)
                } else {
                    h.join(&source)
                };
                target.exists() || saved.exists()
            } else {
                false
            };
            result.push(AlternateInfo {
                source,
                link,
                valid,
                class,
            });
        }
    }
    Ok(result)
}

pub fn add_alternate(source: &str, link: &str) -> AppResult<()> {
    let out = yadm::run_yadm(&["add", "--alternate", "-f", source, link])?;
    yadm::check_rc(&out)
}

pub fn remove_alternate(source: &str) -> AppResult<()> {
    // yadm does not have a direct "remove alternate" command. We untrack
    // the source path from git. The symlink is left in place.
    let out = yadm::run_yadm(&["rm", "--cached", source])?;
    yadm::check_rc(&out)
}

// Keep AppError in scope for downstream helpers.
#[allow(dead_code)]
fn _force_link(_: AppError) {}
