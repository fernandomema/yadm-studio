use crate::types::{AppError, AppResult, EncryptedFile, EncryptionConfig};
use crate::yadm;
use std::path::PathBuf;

const DEFAULT_PROGRAM: &str = "openssl";
const DEFAULT_RECIPIENTS: &[&str] = &[];

pub fn list_encrypted() -> AppResult<Vec<EncryptedFile>> {
    let cfg = read_config().unwrap_or(EncryptionConfig {
        program: DEFAULT_PROGRAM.to_string(),
        recipients: DEFAULT_RECIPIENTS.iter().map(|s| s.to_string()).collect(),
        openssl_subcommand: "enc".to_string(),
        openssl_cipher: "aes-256-cbc".to_string(),
    });
    let out = yadm::run_yadm(&["encrypt", "-l"])?;
    if out.code != 0 {
        return Ok(vec![]);
    }
    let ext = archive_extension(&cfg);
    let mut result = Vec::new();
    for line in out.stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let home = yadm::yadm_dir().unwrap_or_else(|| PathBuf::from("."));
        let full = home.join(line);
        let size = std::fs::metadata(&full).map(|m| m.len()).unwrap_or(0);
        let decrypted = line.strip_suffix(&format!(".{}", ext)).unwrap_or(line).to_string();
        result.push(EncryptedFile {
            path: decrypted,
            encrypted_path: line.to_string(),
            size,
        });
    }
    Ok(result)
}

fn archive_extension(cfg: &EncryptionConfig) -> String {
    if cfg.program == "openssl" {
        format!("{}.{}", cfg.openssl_subcommand, cfg.openssl_cipher)
    } else {
        "asc".to_string()
    }
}

pub fn encrypt(path: &str) -> AppResult<()> {
    let cfg = read_config().unwrap_or(EncryptionConfig {
        program: DEFAULT_PROGRAM.to_string(),
        recipients: DEFAULT_RECIPIENTS.iter().map(|s| s.to_string()).collect(),
        openssl_subcommand: "enc".to_string(),
        openssl_cipher: "aes-256-cbc".to_string(),
    });
    if cfg.program == "gpg" {
        if cfg.recipients.is_empty() {
            return Err(AppError::Other(
                "No GPG recipients configured (yadm.gpg-recipient)".into(),
            ));
        }
        let mut args: Vec<String> = vec!["encrypt".into()];
        for r in &cfg.recipients {
            args.push("-r".into());
            args.push(r.clone());
        }
        args.push(path.into());
        let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        let out = yadm::run_yadm(&refs)?;
        yadm::check_rc(&out)?;
    } else {
        // openssl
        let mut args: Vec<String> = vec!["encrypt".into()];
        if !cfg.recipients.is_empty() {
            for r in &cfg.recipients {
                args.push("-r".into());
                args.push(r.clone());
            }
        }
        args.push(path.into());
        let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        let out = yadm::run_yadm(&refs)?;
        yadm::check_rc(&out)?;
    }
    Ok(())
}

pub fn decrypt_to_memory(path: &str) -> AppResult<String> {
    // First try the yadm decrypt path; if it returns no stdout, use openssl/gpg manually
    let cfg = read_config().unwrap_or(EncryptionConfig {
        program: DEFAULT_PROGRAM.to_string(),
        recipients: DEFAULT_RECIPIENTS.iter().map(|s| s.to_string()).collect(),
        openssl_subcommand: "enc".to_string(),
        openssl_cipher: "aes-256-cbc".to_string(),
    });
    let home = yadm::yadm_dir().ok_or(AppError::NotARepo)?;
    let ext = archive_extension(&cfg);
    let enc_path = if path.ends_with(&format!(".{}", ext)) {
        path.to_string()
    } else {
        format!("{}.{}", path, ext)
    };
    let full = home.join(&enc_path);
    if !full.exists() {
        return Err(AppError::Other(format!("Encrypted file not found: {}", enc_path)));
    }
    if cfg.program == "gpg" {
        let out = yadm::run_cmd("gpg", &["--decrypt", "--quiet", "--batch", full.to_string_lossy().as_ref()])?;
        if out.code != 0 {
            return Err(AppError::Other(out.stderr));
        }
        Ok(out.stdout)
    } else {
        let out = yadm::run_cmd(
            "openssl",
            &[
                &cfg.openssl_subcommand,
                "-d",
                "-aes-256-cbc",
                "-in",
                full.to_string_lossy().as_ref(),
            ],
        )?;
        if out.code != 0 {
            return Err(AppError::Other(out.stderr));
        }
        Ok(out.stdout)
    }
}

pub fn read_config() -> AppResult<EncryptionConfig> {
    let program_out = yadm::run_yadm(&["config", "--get", "yadm.cipher"])?;
    let program = if program_out.code == 0 {
        program_out.stdout.trim().to_string()
    } else {
        DEFAULT_PROGRAM.to_string()
    };
    let recipients_out = yadm::run_yadm(&["config", "--get-all", "yadm.gpg-recipient"])?;
    let recipients: Vec<String> = if recipients_out.code == 0 {
        recipients_out
            .stdout
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    } else {
        vec![]
    };
    let openssl_cipher_out = yadm::run_yadm(&["config", "--get", "yadm.openssl-cipher"])?;
    let openssl_cipher = if openssl_cipher_out.code == 0 {
        openssl_cipher_out.stdout.trim().to_string()
    } else {
        "aes-256-cbc".to_string()
    };
    let openssl_subcommand_out = yadm::run_yadm(&["config", "--get", "yadm.openssl-subcommand"])?;
    let openssl_subcommand = if openssl_subcommand_out.code == 0 {
        openssl_subcommand_out.stdout.trim().to_string()
    } else {
        "enc".to_string()
    };
    Ok(EncryptionConfig {
        program,
        recipients,
        openssl_subcommand,
        openssl_cipher,
    })
}

pub fn write_config(cfg: &EncryptionConfig) -> AppResult<()> {
    yadm::check_rc(&yadm::run_yadm(&["config", "yadm.cipher", &cfg.program])?)?;
    // Replace recipients list
    yadm::run_yadm(&["config", "--unset-all", "yadm.gpg-recipient"]).ok();
    for r in &cfg.recipients {
        let trimmed = r.trim();
        if trimmed.is_empty() {
            continue;
        }
        yadm::check_rc(&yadm::run_yadm(&["config", "--add", "yadm.gpg-recipient", trimmed])?)?;
    }
    yadm::check_rc(&yadm::run_yadm(&["config", "yadm.openssl-cipher", &cfg.openssl_cipher])?)?;
    yadm::check_rc(&yadm::run_yadm(&["config", "yadm.openssl-subcommand", &cfg.openssl_subcommand])?)?;
    Ok(())
}
