use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("yadm is not installed or not found in PATH")]
    YadmNotFound,
    #[error("yadm repository not initialized")]
    NotARepo,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("yadm exited with code {code}: {stderr}")]
    Yadm { code: i32, stderr: String },
    #[error("git error: {0}")]
    Git(String),
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("{0}")]
    Other(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YadmStatus {
    pub initialized: bool,
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub clean: bool,
    pub staged: Vec<StatusEntry>,
    pub unstaged: Vec<StatusEntry>,
    pub untracked: Vec<StatusEntry>,
    pub conflicted: Vec<StatusEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StatusEntry {
    pub path: String,
    pub index_status: char,
    pub work_status: char,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogEntry {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub email: String,
    pub date: String,
    pub subject: String,
    pub body: String,
    pub refs: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BranchInfo {
    pub name: String,
    pub current: bool,
    pub remote: bool,
    pub upstream: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffResult {
    pub path: String,
    pub old_content: String,
    pub new_content: String,
    pub patch: String,
    pub is_binary: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StashEntry {
    pub index: usize,
    pub branch: String,
    pub hash: String,
    pub subject: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AlternateInfo {
    pub source: String,
    pub link: String,
    pub valid: bool,
    pub class: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConfigEntry {
    pub key: String,
    pub value: String,
    pub scope: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedFile {
    pub path: String,
    pub encrypted_path: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptionConfig {
    pub program: String,
    pub recipients: Vec<String>,
    pub openssl_subcommand: String,
    pub openssl_cipher: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HookInfo {
    pub name: String,
    pub path: String,
    pub exists: bool,
    pub executable: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConflictInfo {
    pub path: String,
    pub ours: String,
    pub theirs: String,
    pub base: String,
    pub merged: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BootstrapResult {
    pub success: bool,
    pub message: String,
    pub remote_url: Option<String>,
}
