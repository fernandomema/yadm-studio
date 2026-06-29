import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { ConfigEntry } from "../types/yadm";
import { useToast } from "./Toast";

export default function ConfigView() {
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [scope, setScope] = useState("local");
  const { show } = useToast();

  function load() {
    yadm.config("all").then(setEntries).catch((e) => show(String(e), "error"));
  }

  useEffect(load, [show]);

  async function setKey() {
    if (!newKey.trim()) return;
    try {
      await yadm.setConfig(newKey.trim(), newValue, scope);
      setNewKey("");
      setNewValue("");
      show("Config saved", "success");
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function unset(key: string, sc: string) {
    if (!confirm(`Unset ${key} (${sc})?`)) return;
    try {
      await yadm.unsetConfig(key, sc);
      show("Config removed", "success");
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  const filtered = entries.filter((e) => {
    const q = filter.toLowerCase();
    if (!q) return true;
    return e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="commit-box">
        <div className="form-grid">
          <div className="form-row">
            <label>Key</label>
            <input
              placeholder="e.g. user.name"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>Value</label>
            <input
              placeholder="value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setKey()}
            />
          </div>
        </div>
        <div className="actions">
          <div className="left">
            <span className="dim text-xs mono">scope</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)} style={{ width: 120 }}>
              <option value="local">local</option>
              <option value="global">global</option>
              <option value="system">system</option>
            </select>
          </div>
          <button className="primary" onClick={setKey} disabled={!newKey.trim()}>
            Set
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          placeholder="filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="dim text-xs mono">{filtered.length} / {entries.length}</span>
      </div>

      <div className="panel">
        <div className="kv-grid" style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--border)" }}>
          <div className="k" style={{ borderBottom: "none" }}>Key</div>
          <div className="v" style={{ borderBottom: "none" }}>Value</div>
          <div className="a" style={{ borderBottom: "none" }}></div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty">No matching config</div>
        ) : (
          filtered.map((e) => (
            <div key={`${e.scope}:${e.key}`} className="kv-grid">
              <div className="k">{e.key}</div>
              <div className="v">{e.value}</div>
              <div className="a">
                <span className="tag muted">{e.scope}</span>
                <button className="ghost" style={{ marginLeft: 8 }} onClick={() => unset(e.key, e.scope)}>×</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
