import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { ConflictInfo } from "../types/yadm";
import { useToast } from "./Toast";
import { diffLines } from "diff";

type Props = {
  onChange: () => void;
};

type Resolution = "ours" | "theirs" | "base" | "manual";

export default function ConflictsView({ onChange }: Props) {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [active, setActive] = useState<ConflictInfo | null>(null);
  const [resolution, setResolution] = useState<Resolution>("manual");
  const [merged, setMerged] = useState("");
  const { show } = useToast();

  function load() {
    yadm.conflicts().then((c) => {
      setConflicts(c);
      if (c.length > 0 && (!active || !c.find((x) => x.path === active.path))) {
        setActive(c[0]);
        setMerged(c[0].merged);
      } else if (c.length === 0) {
        setActive(null);
      }
    }).catch((e) => show(String(e), "error"));
  }

  useEffect(load, [show]);

  useEffect(() => {
    if (!active) return;
    if (resolution === "ours") setMerged(active.ours);
    else if (resolution === "theirs") setMerged(active.theirs);
    else if (resolution === "base") setMerged(active.base);
  }, [resolution, active]);

  async function apply() {
    if (!active) return;
    try {
      await yadm.resolveConflict(active.path, merged, true);
      show(`Resolved ${active.path}`, "success");
      onChange();
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function abort() {
    if (!active) return;
    try {
      await yadm.resolveConflict(active.path, active.ours, false);
      await yadm.resolveConflict(active.path, "", false);
    } catch (e) {
      // ignore
    }
  }

  if (conflicts.length === 0) {
    return (
      <div className="panel">
        <div className="empty">
          <strong>No conflicts</strong>
          Everything is merged cleanly.
        </div>
      </div>
    );
  }

  const oursTheirs = active ? diffLines(active.ours, active.theirs) : [];

  return (
    <div>
      <div className="panel mb-3">
        <div className="panel-head">
          <div className="panel-title">Conflicts · {conflicts.length}</div>
        </div>
        {conflicts.map((c) => (
          <div
            key={c.path}
            className="row"
            onClick={() => {
              setActive(c);
              setResolution("manual");
              setMerged(c.merged);
            }}
            style={active?.path === c.path ? { background: "var(--bg-2)" } : undefined}
          >
            <span className="status s-conflict">!</span>
            <span className="path">{c.path}</span>
            {active?.path === c.path && <span className="tag info">active</span>}
          </div>
        ))}
      </div>

      {active && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">{active.path}</div>
            <div className="flex gap-2 items-center">
              <span className="dim text-xs">resolve using</span>
              <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)}>
                <option value="manual">manual</option>
                <option value="ours">ours</option>
                <option value="theirs">theirs</option>
                <option value="base">base</option>
              </select>
              <button className="primary" onClick={apply}>Mark resolved</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)" }}>
            <div style={{ background: "var(--code-bg)" }}>
              <div className="col-head" style={{ background: "var(--bg-2)", padding: "8px 12px", fontSize: 10, textTransform: "uppercase", color: "var(--text-2)" }}>
                Ours
              </div>
              <pre className="code" style={{ margin: 0, maxHeight: 300, overflow: "auto" }}>{active.ours}</pre>
            </div>
            <div style={{ background: "var(--code-bg)" }}>
              <div className="col-head" style={{ background: "var(--bg-2)", padding: "8px 12px", fontSize: 10, textTransform: "uppercase", color: "var(--text-2)" }}>
                Theirs
              </div>
              <pre className="code" style={{ margin: 0, maxHeight: 300, overflow: "auto" }}>{active.theirs}</pre>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <div className="form-row">
              <label>Merged result</label>
              <textarea
                value={merged}
                onChange={(e) => setMerged(e.target.value)}
                rows={12}
                style={{ minHeight: 240 }}
              />
            </div>
            {oursTheirs.length > 0 && (
              <div className="dim text-xs mt-2">
                {oursTheirs.filter((c) => c.added).length} additions · {oursTheirs.filter((c) => c.removed).length} removals
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
