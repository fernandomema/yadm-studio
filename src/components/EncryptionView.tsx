import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { EncryptedFile, EncryptionConfig } from "../types/yadm";
import { useToast } from "./Toast";

type Props = {
  onChange: () => void;
};

export default function EncryptionView({ onChange }: Props) {
  const [files, setFiles] = useState<EncryptedFile[]>([]);
  const [cfg, setCfg] = useState<EncryptionConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [decrypted, setDecrypted] = useState<{ path: string; content: string } | null>(null);
  const { show } = useToast();

  function load() {
    yadm.encrypted().then(setFiles).catch((e) => show(String(e), "error"));
    yadm
      .encryptionConfig()
      .then(setCfg)
      .catch((e) => show(String(e), "error"));
  }

  useEffect(load, [show]);

  async function encrypt(path: string) {
    try {
      await yadm.encrypt(path);
      show(`Encrypted ${path}`, "success");
      load();
      onChange();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function decrypt(path: string) {
    try {
      const content = await yadm.decrypt(path);
      setDecrypted({ path, content });
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function saveConfig() {
    if (!cfg) return;
    try {
      await yadm.setEncryptionConfig(cfg);
      show("Configuration saved", "success");
      setShowConfig(false);
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  function setRecipient(idx: number, value: string) {
    if (!cfg) return;
    const recipients = [...cfg.recipients];
    recipients[idx] = value;
    setCfg({ ...cfg, recipients });
  }

  function addRecipient() {
    if (!cfg) return;
    setCfg({ ...cfg, recipients: [...cfg.recipients, ""] });
  }

  function removeRecipient(idx: number) {
    if (!cfg) return;
    setCfg({ ...cfg, recipients: cfg.recipients.filter((_, i) => i !== idx) });
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Encryption</div>
          <div className="flex gap-2">
            {cfg && (
              <span className="dim text-xs mono">
                {cfg.program} {cfg.program === "openssl" ? cfg.openssl_cipher : ""}
              </span>
            )}
            <button onClick={() => setShowConfig((v) => !v)}>
              {showConfig ? "Hide config" : "Configure"}
            </button>
          </div>
        </div>
        {showConfig && cfg && (
          <div className="panel-body" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="form-grid">
              <div className="form-row">
                <label>Cipher program</label>
                <select
                  value={cfg.program}
                  onChange={(e) => setCfg({ ...cfg, program: e.target.value })}
                >
                  <option value="openssl">openssl</option>
                  <option value="gpg">gpg</option>
                </select>
              </div>
              {cfg.program === "openssl" && (
                <>
                  <div className="form-row">
                    <label>openssl subcommand</label>
                    <input
                      value={cfg.openssl_subcommand}
                      onChange={(e) => setCfg({ ...cfg, openssl_subcommand: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <label>openssl cipher</label>
                    <input
                      value={cfg.openssl_cipher}
                      onChange={(e) => setCfg({ ...cfg, openssl_cipher: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            {cfg.program === "gpg" && (
              <div className="form-row mt-3">
                <label>GPG recipients</label>
                {cfg.recipients.map((r, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <input value={r} onChange={(e) => setRecipient(i, e.target.value)} />
                    <button className="danger" onClick={() => removeRecipient(i)}>−</button>
                  </div>
                ))}
                <button className="mt-2" onClick={addRecipient}>+ Add recipient</button>
              </div>
            )}

            <div className="flex justify-between items-center mt-3">
              <div className="dim text-xs">
                These values are stored in <span className="mono">yadm config</span> as <span className="mono">yadm.cipher</span> and
                {" "}<span className="mono">yadm.gpg-recipient</span>.
              </div>
              <button className="primary" onClick={saveConfig}>Save</button>
            </div>
          </div>
        )}
      </div>

      <div className="section-title">Encrypted files · {files.length}</div>
      <div className="panel">
        {files.length === 0 ? (
          <div className="empty">No encrypted files</div>
        ) : (
          files.map((f) => (
            <div key={f.encrypted_path} className="row">
              <span className="status s-mod">⚿</span>
              <span className="path">{f.encrypted_path}</span>
              <span className="dim text-xs mono">{(f.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => decrypt(f.encrypted_path)}>Decrypt</button>
            </div>
          ))
        )}
      </div>

      {decrypted && (
        <div className="modal-backdrop" onClick={() => setDecrypted(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="head">
              <span>{decrypted.path}</span>
              <button className="ghost" onClick={() => setDecrypted(null)}>×</button>
            </div>
            <div className="body">
              <div className="code">{decrypted.content}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
