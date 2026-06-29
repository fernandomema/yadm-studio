# yadm studio

A modern, cross-platform desktop GUI for [yadm](https://yadm.io/) — the dotfile manager that wraps Git.

> Status, diff, commit, push, alternates, encryption, hooks and bootstrap — all from a single keyboard-friendly interface.

![tech](https://img.shields.io/badge/Tauri-2-24C8DB?style=flat-square) ![tech](https://img.shields.io/badge/React-18-61DAFB?style=flat-square) ![tech](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square) ![tech](https://img.shields.io/badge/Rust-2021-DE5833?style=flat-square)

## CI/CD

- **`.github/workflows/ci.yml`** — runs on every PR and push: typecheck (`tsc --noEmit`), `cargo fmt`, `cargo clippy -D warnings`, `vite build`, then a full Tauri build on all three OSes (no release).
- **`.github/workflows/release.yml`** — runs on push to `master`/`main`: builds for `macos-latest` (universal), `ubuntu-22.04`, `windows-latest` and creates a **draft GitHub release** with all installers (`.dmg`, `.deb`/`.AppImage`/`.rpm`, `.msi`/`.exe`).

To cut a release, bump the `version` in `src-tauri/tauri.conf.json` (and `Cargo.toml`), push to `master`, then review and publish the draft from the Actions run.

## Features

- **Workspace** — status, history, diff (unified and side-by-side), branches, stash, conflicts
- **Files** — alternates per class/host, encryption (GPG / openssl)
- **Advanced** — hooks editor (16 lifecycle hooks), git config view & editor, bootstrap & clone
- **Cross-platform** — macOS, Linux, Windows
- **Lightweight** — Tauri binary is ~10 MB, not 150 MB

## Requirements

| Tool   | Version | Notes |
| ------ | ------- | ----- |
| yadm   | ≥ 3.0   | The actual dotfile manager — must be in `$PATH` |
| Node   | ≥ 18    | For building the React frontend |
| Rust   | ≥ 1.77  | For building the Tauri backend |
| pnpm / npm | latest | For installing JS deps |

On **macOS**:

```bash
brew install yadm node rust
```

On **Debian/Ubuntu**:

```bash
sudo apt install yadm nodejs cargo rustc
```

On **Windows** (PowerShell + Scoop):

```bash
scoop install yadm nodejs rust
```

## Quick start

```bash
# 1. Install JS deps
npm install

# 2. Run in development mode (hot reload)
npm run tauri dev

# 3. Build a release binary for your current platform
npm run tauri build
```

The release binary lands in `src-tauri/target/release/bundle/`.

## Build for all platforms

```bash
# macOS universal (Intel + Apple Silicon)
npm run tauri build -- --target universal-apple-darwin

# Windows installer (must run on Windows or use CI)
npm run tauri build -- --target x86_64-pc-windows-msvc

# Linux AppImage / deb
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

For multi-platform CI, see [Tauri's cross-platform guide](https://v2.tauri.app/distribute/).

## Architecture

```
yadm-studio/
├── src/                    # React + TS frontend
│   ├── App.tsx
│   ├── components/         # Sidebar, StatusView, DiffView, ...
│   ├── lib/                # tauri bindings, diff parser
│   ├── styles/globals.css
│   └── types/yadm.ts
└── src-tauri/              # Rust backend (talks to the yadm binary)
    ├── src/
    │   ├── main.rs
    │   ├── lib.rs          # Tauri command registry
    │   ├── commands.rs     # All `#[tauri::command]` handlers
    │   ├── yadm.rs         # yadm binary detection + low-level runner
    │   ├── git.rs          # Status, log, diff, branches, stash, conflicts
    │   ├── encryption.rs   # GPG / openssl
    │   ├── config.rs       # yadm config + alternates
    │   ├── hooks.rs        # Hooks editor
    │   ├── bootstrap.rs    # init / clone
    │   ├── types.rs        # Shared error and DTO types
    │   └── diff.rs
    ├── tauri.conf.json
    ├── capabilities/default.json
    └── Cargo.toml
```

### How it talks to yadm

The Rust backend **shells out to the `yadm` binary** — it does not reimplement git. Every Tauri command maps 1-to-1 to a `yadm` invocation. The frontend never calls git directly.

This means:
- Whatever yadm supports, this app supports.
- The same code works on every platform that yadm supports.
- We benefit from yadm's own bug fixes.

## Configuration

`yadm-studio` reads no config of its own. It uses whatever `yadm config` is currently set (local / global / system). Set a custom yadm binary path with the `YADM_BIN` env var.

## Keyboard

| Shortcut | Action |
| -------- | ------ |
| `⌘/Ctrl + Enter` | Commit |
| `Esc` (modal) | Close modal |

## License

MIT
