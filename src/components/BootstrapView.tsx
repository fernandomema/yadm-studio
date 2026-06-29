import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { BootstrapInfo } from "../types/yadm";
import { useToast } from "./Toast";

type Props = {
  initialized: boolean;
  onChange: () => void;
};

const STARTER = `#!/usr/bin/env bash
# yadm bootstrap — runs after \`yadm clone\`.
# Add any setup commands you want executed when bootstrapping a new machine.

set -euo pipefail

echo "Bootstrapping dotfiles..."

# Example: ensure submodules are initialised
# yadm submodule update --init --recursive

# Example: install brew packages from a Brewfile
# if command -v brew >/dev/null 2>&1; then
#   brew bundle --file="$HOME/Brewfile"
# fi

echo "Bootstrap complete."
`;

export default function BootstrapView({ initialized, onChange }: Props) {
  const { show } = useToast();
  const [tab, setTab] = useState<"edit" | "init">("edit");
  const [info, setInfo] = useState<BootstrapInfo | null>(null);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [branch, setBranch] = useState("main");

  function load() {
    if (!initialized) return;
    yadm
      .getBootstrap()
      .then((b) => {
        setInfo(b);
        setContent(b.content);
        setOriginal(b.content);
      })
      .catch((e) => show(String(e), "error"));
  }

  useEffect(load, [initialized, show]);

  async function save() {
    setBusy(true);
    try {
      await yadm.setBootstrap(content);
      setOriginal(content);
      show("Bootstrap saved", "success");
      load();
    } catch (e) {
      show(String(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    setBusy(true);
    setOutput(null);
    try {
      const out = await yadm.runBootstrap();
      setOutput(out || "(no output)");
      show("Bootstrap finished", "success");
      onChange();
    } catch (e) {
      setOutput(String(e));
      show(String(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function init() {
    try {
      const r = await yadm.bootstrapInit(url.trim() || undefined);
      if (r.success) {
        show("yadm initialized", "success");
        onChange();
      } else {
        show(r.message || "init failed", "error");
      }
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function clone() {
    if (!cloneUrl.trim()) return;
    try {
      const r = await yadm.bootstrapClone(cloneUrl.trim(), branch.trim() || undefined);
      if (r.success) {
        show("Repository cloned", "success");
        onChange();
      } else {
        show(r.message || "clone failed", "error");
      }
    } catch (e) {
      show(String(e), "error");
    }
  }

  if (!initialized) {
    return (
      <div>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Initialize yadm</div>
          </div>
          <div className="panel-body">
            <div className="dim text-sm mb-3">
              A yadm repository has not been initialized yet. Initialize or clone below to begin.
            </div>
            <div className="form-row">
              <label>Remote URL (optional)</label>
              <input
                placeholder="git@github.com:you/dotfiles.git"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span />
              <button className="primary" onClick={init}>
                Initialize
              </button>
            </div>
          </div>
        </div>
        <div className="section-title">Clone existing repo</div>
        <div className="panel">
          <div className="panel-body">
            <div className="form-grid">
              <div className="form-row">
                <label>Repository URL</label>
                <input
                  placeholder="https://github.com/you/dotfiles.git"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Branch (optional)</label>
                <input
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span />
              <button className="primary" onClick={clone} disabled={!cloneUrl.trim()}>
                Clone
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dirty = content !== original;
  const editable = !info?.exists;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          className={tab === "edit" ? "primary" : ""}
          onClick={() => setTab("edit")}
        >
          Script
        </button>
        <button
          className={tab === "init" ? "primary" : ""}
          onClick={() => setTab("init")}
        >
          Repository
        </button>
        <div style={{ flex: 1 }} />
        {tab === "edit" && info?.exists && (
          <button onClick={run} disabled={busy}>
            ▶ Run bootstrap
          </button>
        )}
        {tab === "edit" && (
          <button
            className="primary"
            onClick={save}
            disabled={busy || !dirty}
          >
            Save
          </button>
        )}
      </div>

      {tab === "edit" && (
        <>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">
                {info?.exists ? "Bootstrap script" : "Bootstrap script (not created)"}
              </div>
              {info && (
                <span className="dim text-xs mono">{info.path}</span>
              )}
            </div>
            <div style={{ padding: 12 }}>
              {!info?.exists && (
                <div className="dim text-xs mb-3">
                  No bootstrap file yet. Edit and save to create it at{" "}
                  <span className="mono">{info?.path}</span>.
                </div>
              )}
              <textarea
                value={content || STARTER}
                onChange={(e) => setContent(e.target.value)}
                rows={28}
                spellCheck={false}
                style={{ minHeight: 480, fontFamily: "var(--mono)" }}
              />
              <div className="flex items-center gap-2 mt-3">
                {dirty && <span className="s-mod text-xs">● unsaved changes</span>}
                {!dirty && info?.exists && <span className="dim text-xs">saved</span>}
              </div>
            </div>
          </div>

          {output !== null && (
            <div className="panel mt-3">
              <div className="panel-head">
                <div className="panel-title">Output</div>
                <button className="ghost" onClick={() => setOutput(null)}>×</button>
              </div>
              <pre className="code" style={{ margin: 0, maxHeight: 300, overflow: "auto" }}>
                {output}
              </pre>
            </div>
          )}
        </>
      )}

      {tab === "init" && (
        <>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Re-initialize yadm</div>
            </div>
            <div className="panel-body">
              <div className="dim text-sm mb-3">
                Reinitialize the local repository. Existing tracked files are preserved.
              </div>
              <div className="form-row">
                <label>Remote URL (optional)</label>
                <input
                  placeholder="git@github.com:you/dotfiles.git"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center mt-3">
                <span />
                <button onClick={init}>Re-initialize</button>
              </div>
            </div>
          </div>

          <div className="section-title">Clone a different repo</div>
          <div className="panel">
            <div className="panel-body">
              <div className="form-grid">
                <div className="form-row">
                  <label>Repository URL</label>
                  <input
                    placeholder="https://github.com/you/dotfiles.git"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label>Branch (optional)</label>
                  <input
                    placeholder="main"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span />
                <button className="primary" onClick={clone} disabled={!cloneUrl.trim()}>
                  Clone
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
