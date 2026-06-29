<div align="center">

# yadm studio

### A modern desktop GUI for [yadm](https://yadm.io/) — manage your dotfiles without touching the terminal.

[![release](https://img.shields.io/github/v/release/fernandomema/yadm-studio?style=flat-square)](https://github.com/fernandomema/yadm-studio/releases)
[![downloads](https://img.shields.io/github/downloads/fernandomema/yadm-studio/total?style=flat-square)](https://github.com/fernandomema/yadm-studio/releases)
[![platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square)](#-installation)
[![license](https://img.shields.io/github/license/fernandomema/yadm-studio?style=flat-square)](LICENSE)
[![built with](https://img.shields.io/badge/built%20with-Tauri%202%20%2B%20React%2018%20%2B%20Rust-orange?style=flat-square)](#-for-developers)

[yadm](https://yadm.io/) is the best tool to manage your dotfiles with Git. But its CLI is verbose, the flags are obscure, and switching between machines means remembering which command does what. **yadm studio** gives you a fast, native interface for everything yadm can do — without giving up the Git power under the hood.

</div>

---

## ✨ Features

### Workspace
- **Status** — staged, unstaged, untracked and conflicted files in one view
- **Tree mode** — multi-select with checkboxes, drill into folders on demand, separate panels for tracked vs untracked changes
- **History** — full commit log with authors, dates, refs and tags
- **Diff viewer** — unified and side-by-side rendering, with a file-tree to jump between files
- **Branches** — local and remote, create / checkout / delete
- **Stash** — save, apply, pop, drop

### Files
- **Alternates** — per-host and per-class dotfile variants (`##class.work`, `##class.linux`, etc.)
- **Encryption** — both GPG (with multiple recipients) and openssl, configurable cipher
- **README editor** — view and edit any tracked `README*` file with a markdown preview

### Advanced
- **Hooks** — edit all 16 yadm lifecycle hooks (`pre-commit`, `post-clone`, `pre-encrypt`, etc.) with syntax highlighting
- **Config** — view and edit `yadm config` entries across local / global / system scopes
- **Conflicts** — visual three-way merge resolver (ours / theirs / base / manual)
- **Bootstrap** — editor for `~/.config/yadm/bootstrap` with one-click "Run" to test it locally

---

## 📦 Installation

### Download a pre-built binary

Grab the latest installer for your platform from the [**Releases**](https://github.com/fernandomema/yadm-studio/releases) page.

| Platform | File | Notes |
|---|---|---|
| **macOS** (Intel + Apple Silicon) | `yadm studio_*.universal.dmg` | Open the DMG, drag to Applications |
| **Linux** (Ubuntu / Debian) | `yadm studio_*_amd64.deb` | `sudo dpkg -i yadm-studio_*.deb` |
| **Linux** (Fedora / RHEL) | `yadm studio-*.x86_64.rpm` | `sudo dnf install ./yadm-studio-*.rpm` |
| **Linux** (any distro) | `yadm studio_*_amd64.AppImage` | `chmod +x *.AppImage && ./yadm-studio.AppImage` |
| **Windows** (installer) | `yadm studio_*_x64-setup.exe` | NSIS installer, no admin needed |
| **Windows** (MSI) | `yadm studio_*_x64_en-US.msi` | For corporate / SCCM deployment |

> **Note**: macOS builds are signed and notarized. Linux and Windows builds are not signed — you'll get a SmartScreen warning on Windows the first time, click "More info" → "Run anyway".

### Homebrew (macOS / Linux)

```bash
brew install --cask yadm-studio
```

_(once the cask is published to homebrew-cask)_

---

## ⚙️ Requirements

**yadm** must be installed and on your `$PATH` — yadm studio wraps it.

```bash
# macOS
brew install yadm

# Debian / Ubuntu
sudo apt install yadm

# Fedora
sudo dnf install yadm

# Windows (via scoop)
scoop install yadm
```

A yadm repository must already exist (or be initialized from the in-app **Bootstrap** view).

---

## 🖼 Screenshots

> _Coming soon — build yadm studio locally and grab them from `src-tauri/icons/`._

```
┌─ TRACKED CHANGES · 3 FILE(S) ──────────────────┐
│ ▣ ~/                  2 root file(s)            │
│   · .gitconfig  M   Untrack   Stage           │
│   · .zshrc     M   Untrack   Stage           │
│ ▣ .config             1 file(s)                │
│   ▸ opencode          1 file(s)                │
│     · opencode.jsonc  M   Untrack   Stage     │
└────────────────────────────────────────────────┘
```

---

## 🆚 Why yadm studio?

| | yadm CLI | Other Git GUIs | yadm studio |
|---|---|---|---|
| Understands yadm alternates | ✅ | ❌ | ✅ |
| Hooks editor with syntax highlighting | ❌ | ❌ | ✅ |
| Bootstrap script editor with run | ❌ | ❌ | ✅ |
| Encryption (GPG + openssl) | ✅ via CLI | ❌ | ✅ one-click |
| Native binary, no Electron | n/a | ❌ ~150MB | ✅ ~10MB |
| Works on macOS, Linux, Windows | ✅ | varies | ✅ |

---

## 🔧 For developers

### Build from source

**Prerequisites**: Node 18+, Rust stable, platform deps.

```bash
git clone https://github.com/fernandomema/yadm-studio.git
cd yadm-studio
npm install
npm run tauri dev          # dev mode with hot reload
npm run tauri build        # release binary in src-tauri/target/release/bundle/
```

**Linux** additionally needs:

```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
```

### Project structure

```
yadm-studio/
├── src/                    # React + TypeScript frontend
│   ├── components/         # Sidebar, StatusView, DiffView, EncryptionView, ...
│   ├── lib/                # tauri bindings, diff parser
│   └── styles/globals.css
└── src-tauri/              # Rust backend (talks to the yadm binary)
    ├── src/
    │   ├── commands.rs     # Tauri command handlers (the invoke API)
    │   ├── yadm.rs         # yadm binary detection + child-process runner
    │   ├── git.rs          # Status, log, diff, branches, stash, conflicts
    │   ├── encryption.rs   # GPG / openssl
    │   ├── config.rs       # yadm config + alternates
    │   ├── hooks.rs        # Hooks editor
    │   ├── bootstrap.rs    # init / clone / script editor
    │   ├── readme.rs       # README discovery
    │   └── types.rs        # Shared error and DTO types
    └── tauri.conf.json
```

The Rust backend **shells out to the `yadm` binary** — it does not reimplement git. Every Tauri command maps 1:1 to a `yadm` invocation. This means whatever yadm supports, this app supports.

### Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-thing`)
3. Make your change. The CI will run on PRs:
   - `tsc --noEmit` for type safety
   - `cargo fmt --check` for formatting
   - `cargo clippy -D warnings` for lints
   - `vite build` for the frontend bundle
   - Full Tauri build on macOS, Linux and Windows
4. Open a PR against `main`

### CI/CD

- **`.github/workflows/ci.yml`** — runs on every PR: typecheck, lint, then a full Tauri build on all three OSes.
- **`.github/workflows/release.yml`** — runs on push to `main`: builds for `macos-latest` (universal), `ubuntu-22.04`, `windows-latest` and creates a **draft GitHub release** with all installers.

To cut a release, bump the `version` in `src-tauri/tauri.conf.json` (and `Cargo.toml`), push to `main`, then review and publish the draft from the Actions run.

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Made with ☕ and a lot of `cargo fmt`

</div>
