use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Secret {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AwsProfile {
    pub name: String,
}

/// Search common install locations for a binary and return its absolute path.
fn find_binary(name: &str) -> String {
    let candidates = [
        format!("/opt/homebrew/bin/{}", name),
        format!("/usr/local/bin/{}", name),
        format!("/opt/local/bin/{}", name),
        format!("/usr/bin/{}", name),
    ];
    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return path.clone();
        }
    }
    name.to_string() // fall back to bare name and let PATH handle it
}

fn aws_env(cmd: &mut Command, profile: &str, region: &str) {
    // AWS SDK (both Python CLI and Go SDK used by chamber) needs HOME to find ~/.aws/
    if let Ok(home) = std::env::var("HOME") {
        cmd.env("HOME", &home);
    }
    // Tell the Go AWS SDK to load ~/.aws/config (required for SSO profiles)
    cmd.env("AWS_SDK_LOAD_CONFIG", "1");
    if !profile.is_empty() {
        cmd.env("AWS_PROFILE", profile);
    }
    if !region.is_empty() {
        cmd.env("AWS_DEFAULT_REGION", region);
        cmd.env("AWS_REGION", region);
    }
}

fn run_cmd(binary: &str, args: &[&str], profile: &str, region: &str) -> Result<String, String> {
    let bin = find_binary(binary);
    let mut cmd = Command::new(&bin);
    cmd.args(args);
    aws_env(&mut cmd, profile, region);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run {}: {}", binary, e))?;

    if output.status.success() {
        Ok(strip_ansi(&String::from_utf8_lossy(&output.stdout)))
    } else {
        let stderr = strip_ansi(&String::from_utf8_lossy(&output.stderr));
        let stdout = strip_ansi(&String::from_utf8_lossy(&output.stdout));
        Err(if stderr.trim().is_empty() { stdout } else { stderr })
    }
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' && chars.peek() == Some(&'[') {
            chars.next();
            for ch in chars.by_ref() {
                if ch.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

#[tauri::command]
pub fn get_profile_region(profile: String) -> Option<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let config_path = format!("{}/.aws/config", home);
    let content = std::fs::read_to_string(&config_path).ok()?;

    let target_header1 = format!("[profile {}]", profile);
    let target_header2 = format!("[{}]", profile); // default profile uses [default]

    let mut in_section = false;
    for line in content.lines() {
        let line = line.trim();
        if line == target_header1 || line == target_header2 {
            in_section = true;
            continue;
        }
        if in_section {
            if line.starts_with('[') {
                break; // next section started
            }
            if let Some(val) = line.strip_prefix("region") {
                let val = val.trim_start_matches(|c: char| c == ' ' || c == '=').trim();
                if !val.is_empty() {
                    return Some(val.to_string());
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn list_aws_profiles() -> Result<Vec<AwsProfile>, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let config_path = format!("{}/.aws/config", home);
    let credentials_path = format!("{}/.aws/credentials", home);

    let mut profiles = std::collections::HashSet::new();

    for path in [&config_path, &credentials_path] {
        if let Ok(content) = std::fs::read_to_string(path) {
            for line in content.lines() {
                let line = line.trim();
                if line.starts_with('[') && line.ends_with(']') {
                    let name = line[1..line.len() - 1].to_string();
                    let name = name.strip_prefix("profile ").unwrap_or(&name).to_string();
                    profiles.insert(name);
                }
            }
        }
    }

    let mut result: Vec<AwsProfile> = profiles
        .into_iter()
        .map(|name| AwsProfile { name })
        .collect();
    result.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(result)
}

#[tauri::command]
pub async fn list_services(profile: String, region: String) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || {
        let output = run_cmd("chamber", &["list-services"], &profile, &region)?;
        let services: Vec<String> = output
            .lines()
            .map(|s| s.trim().to_string())
            // "Service" is the column header chamber prints on the first line
            .filter(|s| !s.is_empty() && s != "Service")
            .collect();
        Ok(services)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn read_secrets(service: String, profile: String, region: String) -> Result<Vec<Secret>, String> {
    tokio::task::spawn_blocking(move || {
        let output = run_cmd("chamber", &["export", "--format", "dotenv", &service], &profile, &region)?;
        let mut secrets = Vec::new();
        for line in output.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some(pos) = line.find('=') {
                let key = line[..pos].to_string();
                let raw_value = &line[pos + 1..];
                let value = if (raw_value.starts_with('"') && raw_value.ends_with('"'))
                    || (raw_value.starts_with('\'') && raw_value.ends_with('\''))
                {
                    raw_value[1..raw_value.len() - 1].to_string()
                } else {
                    raw_value.to_string()
                };
                secrets.push(Secret { key, value });
            }
        }
        secrets.sort_by(|a, b| a.key.cmp(&b.key));
        Ok(secrets)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn write_secret(
    service: String,
    key: String,
    value: String,
    profile: String,
    region: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        run_cmd("chamber", &["write", &service, &key, &value], &profile, &region)?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_secret(service: String, key: String, profile: String, region: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        run_cmd("chamber", &["delete", &service, &key], &profile, &region)?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn export_env(service: String, profile: String, region: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        run_cmd("chamber", &["export", "--format", "dotenv", &service], &profile, &region)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn check_aws_auth(profile: String, region: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let result = run_cmd(
            "aws",
            &["sts", "get-caller-identity", "--query", "Account", "--output", "text"],
            &profile,
            &region,
        )?;
        Ok(result.trim().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn aws_sso_login(profile: String, region: String) -> Result<String, String> {
    let bin = find_binary("aws");
    let mut cmd = Command::new(&bin);
    cmd.args(["sso", "login", "--profile", &profile]);
    aws_env(&mut cmd, &profile, &region);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run aws sso login: {}", e))?;

    let stdout = strip_ansi(&String::from_utf8_lossy(&output.stdout));
    let stderr = strip_ansi(&String::from_utf8_lossy(&output.stderr));
    let combined = format!("{}{}", stdout, stderr).trim().to_string();

    if output.status.success() {
        Ok(combined)
    } else {
        Err(if combined.is_empty() { "SSO login failed".to_string() } else { combined })
    }
}
