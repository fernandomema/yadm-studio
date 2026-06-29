import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { HookInfo } from "../types/yadm";
import { useToast } from "./Toast";

export default function HooksView() {
  const [hooks, setHooks] = useState<HookInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [executable, setExecutable] = useState(true);
  const { show } = useToast();

  function load() {
    yadm.hooks().then(setHooks).catch((e) => show(String(e), "error"));
  }

  useEffect(load, [show]);

  useEffect(() => {
    if (!selected) return;
    yadm.readHook(selected).then(setContent).catch((e) => show(String(e), "error"));
    const h = hooks.find((x) => x.name === selected);
    if (h) setExecutable(h.executable);
  }, [selected, hooks, show]);

  async function save() {
    if (!selected) return;
    try {
      await yadm.writeHook(selected, content, executable);
      show(`Saved ${selected}`, "success");
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function remove() {
    if (!selected) return;
    if (!confirm(`Delete hook ${selected}?`)) return;
    try {
      await yadm.deleteHook(selected);
      show(`Deleted ${selected}`, "success");
      setSelected(null);
      setContent("");
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Hooks</div>
        </div>
        {hooks.map((h) => (
          <div
            key={h.name}
            className={`row ${selected === h.name ? "active" : ""}`}
            onClick={() => setSelected(h.name)}
            style={selected === h.name ? { background: "var(--bg-2)" } : undefined}
          >
            <span className={`status ${h.exists ? "s-add" : "dim"}`}>{h.exists ? "●" : "○"}</span>
            <span className="path">{h.name}</span>
            {h.exists && !h.executable && <span className="tag warn">no exec</span>}
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">{selected ?? "Select a hook"}</div>
          {selected && (
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 text-xs muted">
                <input
                  type="checkbox"
                  checked={executable}
                  onChange={(e) => setExecutable(e.target.checked)}
                />
                executable
              </label>
              {hooks.find((h) => h.name === selected)?.exists && (
                <button className="danger" onClick={remove}>Delete</button>
              )}
              <button className="primary" onClick={save}>Save</button>
            </div>
          )}
        </div>
        <div style={{ padding: 16 }}>
          {!selected ? (
            <div className="empty">Select a hook from the list to edit it</div>
          ) : (
            <>
              <div className="dim text-xs mb-2">
                Hooks live in <span className="mono">~/.local/share/yadm/hooks/</span>. They run at the matching
                point in the yadm lifecycle (e.g. <span className="mono">pre-commit</span> before a commit).
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                placeholder="#!/bin/sh&#10;# hook body"
                style={{ minHeight: 360 }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
