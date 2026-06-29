use crate::commands::ReadmeInfo;
use crate::types::AppResult;
use crate::yadm;

/// Find tracked files whose basename matches README* (case-insensitive)
/// anywhere under the yadm work tree.
pub fn list() -> AppResult<Vec<ReadmeInfo>> {
    let out = yadm::run_yadm(&["ls-files"])?;
    if out.code != 0 {
        return Ok(vec![]);
    }
    let mut results = Vec::new();
    for line in out.stdout.lines() {
        let path = line.trim();
        if path.is_empty() {
            continue;
        }
        let basename = path.rsplit('/').next().unwrap_or(path);
        if !basename.to_lowercase().starts_with("readme") {
            continue;
        }
        let home = match yadm::yadm_dir() {
            Some(h) => h,
            None => continue,
        };
        let full = home.join(path);
        if !full.exists() {
            continue;
        }
        let content = std::fs::read_to_string(&full).unwrap_or_default();
        // Skip very large files (likely not meant to be edited inline).
        if content.len() > 512 * 1024 {
            continue;
        }
        results.push(ReadmeInfo {
            path: path.to_string(),
            content,
        });
    }
    Ok(results)
}

pub fn read(path: &str) -> AppResult<String> {
    let home = yadm::yadm_dir().ok_or(crate::types::AppError::NotARepo)?;
    let full = home.join(path);
    Ok(std::fs::read_to_string(&full)?)
}

pub fn write(path: &str, content: &str) -> AppResult<()> {
    let home = yadm::yadm_dir().ok_or(crate::types::AppError::NotARepo)?;
    let full = home.join(path);
    if let Some(parent) = full.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&full, content)?;
    Ok(())
}
