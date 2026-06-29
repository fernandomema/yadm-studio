import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { AlternateInfo } from "../types/yadm";
import { useToast } from "./Toast";

type Props = {
  onChange: () => void;
};

export default function AlternatesView({ onChange }: Props) {
  const [items, setItems] = useState<AlternateInfo[]>([]);
  const [newSource, setNewSource] = useState("");
  const [newLink, setNewLink] = useState("");
  const { show } = useToast();

  function load() {
    yadm.alternates().then(setItems).catch((e) => show(String(e), "error"));
  }

  useEffect(load, [show]);

  async function add() {
    if (!newSource.trim() || !newLink.trim()) return;
    try {
      await yadm.addAlternate(newSource.trim(), newLink.trim());
      setNewSource("");
      setNewLink("");
      show("Alternate added", "success");
      load();
      onChange();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function remove(source: string) {
    if (!confirm(`Remove alternate ${source}?`)) return;
    try {
      await yadm.removeAlternate(source);
      show("Alternate removed", "success");
      load();
      onChange();
    } catch (e) {
      show(String(e), "error");
    }
  }

  return (
    <div>
      <div className="section-title">Add alternate</div>
      <div className="panel">
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-row">
              <label>Source path (in repo)</label>
              <input
                placeholder="e.g. .config/alacritty/alacritty.yml##class.linux"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label>Link path (in $HOME)</label>
              <input
                placeholder="e.g. .config/alacritty/alacritty.yml"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
              />
            </div>
          </div>
          <div className="dim text-xs mt-2">
            Alternates are per-host/per-class variants. Use the <span className="mono">##class.&lt;name&gt;</span> suffix to make the
            alternate active only on systems with <span className="mono">yadm config local.class</span> set to that class.
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span />
            <button className="primary" onClick={add} disabled={!newSource.trim() || !newLink.trim()}>
              Add alternate
            </button>
          </div>
        </div>
      </div>

      <div className="section-title">Existing alternates · {items.length}</div>
      <div className="panel">
        {items.length === 0 ? (
          <div className="empty">No alternates configured</div>
        ) : (
          items.map((a, i) => (
            <div key={i} className="row">
              <span className={`status ${a.valid ? "s-add" : "s-del"}`}>{a.valid ? "✓" : "✕"}</span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="path">{a.source}</span>
                <span className="dim text-xs mono">→ {a.link}</span>
              </div>
              {a.class && <span className="tag warn">class: {a.class}</span>}
              <button className="danger" onClick={() => remove(a.source)}>Remove</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
