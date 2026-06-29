use crate::types::{AppError, AppResult, *};
use crate::yadm;

pub fn is_repo() -> AppResult<bool> {
    let out = yadm::run_yadm(&["rev-parse", "--is-inside-work-tree"])?;
    Ok(out.code == 0 && out.stdout.trim() == "true")
}

pub fn current_branch() -> AppResult<String> {
    let out = yadm::run_yadm(&["rev-parse", "--abbrev-ref", "HEAD"])?;
    if out.code != 0 {
        return Err(AppError::NotARepo);
    }
    Ok(out.stdout.trim().to_string())
}

pub fn remotes() -> AppResult<Vec<RemoteInfo>> {
    let out = yadm::run_yadm(&["remote", "-v"])?;
    if out.code != 0 {
        return Ok(vec![]);
    }
    let mut result = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for line in out.stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // name<TAB>url (fetch|push)
        let mut parts = line.splitn(2, char::is_whitespace);
        let name = parts.next().unwrap_or("").to_string();
        let rest = parts.next().unwrap_or("").trim();
        let url = rest.split_whitespace().next().unwrap_or("").to_string();
        if !name.is_empty() && seen.insert(name.clone()) {
            result.push(RemoteInfo { name, url });
        }
    }
    Ok(result)
}

pub fn status() -> AppResult<YadmStatus> {
    if !is_repo()? {
        return Ok(YadmStatus {
            initialized: false,
            branch: None,
            upstream: None,
            clean: true,
            staged: vec![],
            unstaged: vec![],
            untracked: vec![],
            conflicted: vec![],
        });
    }
    let branch = current_branch().ok();
    let upstream = upstream().ok().flatten();

    let out = yadm::run_yadm(&["status", "--porcelain=v1", "-z", "--untracked-files=normal"])?;
    if out.code != 0 {
        return Err(AppError::Git(out.stderr));
    }

    let mut staged = vec![];
    let mut unstaged = vec![];
    let mut untracked = vec![];
    let mut conflicted = vec![];

    for entry in out.stdout.split('\0') {
        if entry.is_empty() {
            continue;
        }
        let bytes = entry.as_bytes();
        if bytes.len() < 3 {
            continue;
        }
        let index_status = bytes[0] as char;
        let work_status = bytes[1] as char;
        let path = String::from_utf8_lossy(&bytes[3..]).into_owned();

        let item = StatusEntry {
            path: path.clone(),
            index_status,
            work_status,
        };

        if index_status == 'U'
            || work_status == 'U'
            || (index_status == 'A' && work_status == 'A')
            || (index_status == 'D' && work_status == 'D')
        {
            conflicted.push(item);
            continue;
        }
        if index_status != ' ' && index_status != '?' {
            staged.push(item.clone());
        }
        if work_status != ' ' && work_status != '?' {
            unstaged.push(item);
        } else if index_status == '?' && work_status == '?' {
            untracked.push(item);
        }
    }

    let clean =
        staged.is_empty() && unstaged.is_empty() && untracked.is_empty() && conflicted.is_empty();

    Ok(YadmStatus {
        initialized: true,
        branch,
        upstream,
        clean,
        staged,
        unstaged,
        untracked,
        conflicted,
    })
}

fn upstream() -> AppResult<Option<String>> {
    let out = yadm::run_yadm(&["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])?;
    if out.code == 0 {
        Ok(Some(out.stdout.trim().to_string()))
    } else {
        Ok(None)
    }
}

pub fn add(paths: &[&str]) -> AppResult<()> {
    let mut args: Vec<&str> = vec!["add"];
    for p in paths {
        args.push(p);
    }
    let out = yadm::run_yadm(&args)?;
    yadm::check_rc(&out)
}

pub fn rm_cached(path: &str) -> AppResult<()> {
    let out = yadm::run_yadm(&["rm", "--cached", path])?;
    yadm::check_rc(&out)
}

pub fn reset_mixed() -> AppResult<()> {
    let out = yadm::run_yadm(&["reset"])?;
    yadm::check_rc(&out)
}

pub fn log(limit: usize) -> AppResult<Vec<LogEntry>> {
    // Use ASCII control chars as separators so they never collide with
    // commit data. US (\x1f) between fields, RS (\x1e) between commits.
    // The --pretty=format: prefix is REQUIRED or git will treat the format
    // string as a revision.
    let fsep = '\u{1f}';
    let rsep = '\u{1e}';
    let format = format!(
        "--pretty=format:%H{f}%h{f}%an{f}%ae{f}%ad{f}%s{f}%b{f}%D{r}",
        f = fsep,
        r = rsep
    );
    let limit_str = limit.to_string();
    let out = yadm::run_yadm(&["log", &format, "--date=iso-strict", "-n", &limit_str])?;
    if out.code != 0 {
        if out.stderr.contains("does not have any commits")
            || out.stderr.contains("unknown revision")
        {
            return Ok(vec![]);
        }
        return Err(AppError::Git(out.stderr));
    }
    let mut entries = Vec::new();
    for chunk in out.stdout.split(rsep) {
        let chunk = chunk.trim();
        if chunk.is_empty() {
            continue;
        }
        let fields: Vec<&str> = chunk.split(fsep).collect();
        if fields.is_empty() || fields[0].is_empty() {
            continue;
        }
        let refs_line = fields.get(7).copied().unwrap_or("");
        let refs: Vec<String> = if refs_line.is_empty() {
            vec![]
        } else {
            refs_line
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        };
        entries.push(LogEntry {
            hash: fields[0].to_string(),
            short_hash: fields.get(1).copied().unwrap_or("").to_string(),
            author: fields.get(2).copied().unwrap_or("").to_string(),
            email: fields.get(3).copied().unwrap_or("").to_string(),
            date: fields.get(4).copied().unwrap_or("").to_string(),
            subject: fields.get(5).copied().unwrap_or("").to_string(),
            body: fields.get(6).copied().unwrap_or("").to_string(),
            refs,
        });
    }
    Ok(entries)
}

pub fn diff(staged: bool) -> AppResult<Vec<DiffResult>> {
    let mut args: Vec<&str> = vec!["diff", "--name-only", "--diff-filter=ACMRTUXB"];
    if staged {
        args.push("--cached");
    }
    let name_only = yadm::run_yadm(&args)?;
    if name_only.code != 0 {
        return Err(AppError::Git(name_only.stderr));
    }
    let mut out = Vec::new();
    for path in name_only.stdout.lines() {
        let path = path.trim();
        if path.is_empty() {
            continue;
        }
        out.push(file_diff(path, staged)?);
    }
    Ok(out)
}

pub fn file_diff(path: &str, staged: bool) -> AppResult<DiffResult> {
    // Patch
    let patch_args: Vec<&str> = if staged {
        vec!["diff", "--patch", "--cached", "--", path]
    } else {
        vec!["diff", "--patch", "--", path]
    };
    let patch_out = yadm::run_yadm(&patch_args)?;
    if patch_out.code != 0 {
        return Err(AppError::Git(patch_out.stderr));
    }

    let is_binary = patch_out.stdout.contains("Binary files") || is_binary_path(path);

    // Old content
    let old_content = if staged {
        yadm::run_yadm(&["show", &format!("HEAD:{}", path)])
            .map(|o| o.stdout)
            .unwrap_or_default()
    } else {
        yadm::run_yadm(&["show", &format!("HEAD:{}", path)])
            .map(|o| o.stdout)
            .unwrap_or_default()
    };

    // New content (working tree)
    let new_content = read_working_file(path).unwrap_or_default();

    Ok(DiffResult {
        path: path.to_string(),
        old_content,
        new_content,
        patch: patch_out.stdout,
        is_binary,
    })
}

fn is_binary_path(path: &str) -> bool {
    let exts = [
        "png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "tiff", "heic", "pdf", "zip", "tar",
        "gz", "bz2", "xz", "7z", "rar", "mp3", "mp4", "mov", "wav", "ogg", "woff", "woff2", "ttf",
        "otf", "eot",
    ];
    let lower = path.to_lowercase();
    exts.iter().any(|e| lower.ends_with(&format!(".{}", e)))
}

fn read_working_file(path: &str) -> AppResult<String> {
    let home = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let full = home.join(path);
    if !full.exists() {
        return Ok(String::new());
    }
    if let Ok(meta) = std::fs::metadata(&full) {
        if meta.len() > 5 * 1024 * 1024 {
            return Ok(String::new());
        }
    }
    let bytes = std::fs::read(&full)?;
    if bytes.contains(&0) {
        return Ok(String::new());
    }
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

pub fn branches() -> AppResult<Vec<BranchInfo>> {
    let out = yadm::run_yadm(&[
        "for-each-ref",
        "--format=%(refname:short)%00%(HEAD)%00%(upstream:short)",
        "refs/heads",
    ])?;
    if out.code != 0 {
        return Ok(vec![]);
    }
    let mut result = Vec::new();
    for line in out.stdout.lines() {
        let parts: Vec<&str> = line.split('\0').collect();
        if parts.is_empty() {
            continue;
        }
        let name = parts[0].to_string();
        let current = parts.get(1).copied().unwrap_or("") == "*";
        let upstream = parts
            .get(2)
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty());
        result.push(BranchInfo {
            name,
            current,
            remote: false,
            upstream,
        });
    }
    // remotes
    let out2 = yadm::run_yadm(&[
        "for-each-ref",
        "--format=%(refname:short)%00%(HEAD)%00%(upstream:short)",
        "refs/remotes",
    ])?;
    if out2.code == 0 {
        for line in out2.stdout.lines() {
            let parts: Vec<&str> = line.split('\0').collect();
            if parts.is_empty() {
                continue;
            }
            let name = parts[0].to_string();
            result.push(BranchInfo {
                name,
                current: false,
                remote: true,
                upstream: None,
            });
        }
    }
    Ok(result)
}

pub fn stash_list() -> AppResult<Vec<StashEntry>> {
    let out = yadm::run_yadm(&["stash", "list", "--format=%gd|%s|%cI|%C(short)"])?;
    if out.code != 0 {
        return Ok(vec![]);
    }
    let mut result = Vec::new();
    for (i, line) in out.stdout.lines().enumerate() {
        if line.is_empty() {
            continue;
        }
        let mut parts = line.splitn(4, '|');
        let ref_name = parts.next().unwrap_or("").to_string();
        let subject = parts.next().unwrap_or("").to_string();
        let date = parts.next().unwrap_or("").to_string();
        let hash = parts.next().unwrap_or("").to_string();
        let index = ref_name
            .strip_prefix("stash@{")
            .and_then(|s| s.strip_suffix('}'))
            .and_then(|s| s.parse::<usize>().ok())
            .unwrap_or(i);
        result.push(StashEntry {
            index,
            branch: "".into(),
            hash,
            subject,
            date,
        });
    }
    Ok(result)
}

pub fn tracked_files() -> AppResult<Vec<String>> {
    let out = yadm::run_yadm(&["ls-files"])?;
    if out.code != 0 {
        return Err(AppError::NotARepo);
    }
    Ok(out
        .stdout
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect())
}

pub fn conflicts() -> AppResult<Vec<ConflictInfo>> {
    let status = status()?;
    let mut result = Vec::new();
    for c in &status.conflicted {
        let ours = read_working_file(&c.path).unwrap_or_default();
        let theirs = yadm::run_yadm(&["show", &format!("MERGE_HEAD:{}", c.path)])
            .map(|o| o.stdout)
            .unwrap_or_default();
        let base = yadm::run_yadm(&["show", &format!(":1:{}", c.path)])
            .map(|o| o.stdout)
            .unwrap_or_default();
        result.push(ConflictInfo {
            path: c.path.clone(),
            ours: ours.clone(),
            theirs,
            base,
            merged: ours,
        });
    }
    Ok(result)
}

pub fn resolve_conflict(path: &str, resolution: &str, stage: bool) -> AppResult<()> {
    let home = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let full = home.join(path);
    std::fs::write(&full, resolution.as_bytes())?;
    if stage {
        let out = yadm::run_yadm(&["add", path])?;
        yadm::check_rc(&out)?;
    }
    Ok(())
}

/// Non-recursive listing of a directory under the yadm work tree. Used by
/// the UI to drill into untracked folders on demand instead of recursing
/// the whole home directory via `git status --untracked-files=all`.
pub fn list_dir(path: &str) -> AppResult<Vec<crate::commands::DirEntry>> {
    let home = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let full = if std::path::Path::new(path).is_absolute() {
        std::path::PathBuf::from(path)
    } else {
        home.join(path)
    };
    if !full.is_dir() {
        return Err(AppError::Other(format!("Not a directory: {}", path)));
    }
    let mut entries = Vec::new();
    let read = std::fs::read_dir(&full)?;
    for entry in read.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue; // skip dotfiles at this level to keep the list short
        }
        let meta = entry.metadata().ok();
        let is_dir = meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
        let entry_path = if path.is_empty() || path == "." {
            name.clone()
        } else {
            format!("{}/{}", path.trim_end_matches('/'), name)
        };
        entries.push(crate::commands::DirEntry {
            name,
            path: entry_path,
            is_dir,
            size,
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

pub fn path_exists(path: &str) -> bool {
    let home = match yadm::yadm_dir() {
        Some(h) => h,
        None => return false,
    };
    let full = if std::path::Path::new(path).is_absolute() {
        std::path::PathBuf::from(path)
    } else {
        home.join(path)
    };
    full.exists()
}
