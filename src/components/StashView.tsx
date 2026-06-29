import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { StashEntry } from "../types/yadm";
import { useToast } from "./Toast";

type Props = {
  onChange: () => void;
};

export default function StashView({ onChange }: Props) {
  const [items, setItems] = useState<StashEntry[]>([]);
  const [message, setMessage] = useState("");
  const [untracked, setUntracked] = useState(false);
  const { show } = useToast();

  function load() {
    yadm.stashList().then(setItems).catch((e) => show(String(e), "error"));
  }

  useEffect(load, [show]);

  async function save() {
    try {
      await yadm.stashSave(message.trim() || undefined, untracked);
      setMessage("");
      show("Stashed", "success");
      onChange();
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function pop(idx: number) {
    try {
      await yadm.stashPop(idx);
      show("Stash popped", "success");
      onChange();
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function apply(idx: number) {
    try {
      await yadm.stashApply(idx);
      show("Stash applied", "success");
      onChange();
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function drop(idx: number) {
    if (!confirm(`Drop stash@{${idx}}?`)) return;
    try {
      await yadm.stashDrop(idx);
      show("Stash dropped", "success");
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  return (
    <div>
      <div className="commit-box">
        <input
          placeholder="Stash message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="actions">
          <label className="flex items-center gap-2 text-xs muted">
            <input
              type="checkbox"
              checked={untracked}
              onChange={(e) => setUntracked(e.target.checked)}
            />
            Include untracked
          </label>
          <button className="primary" onClick={save}>Stash</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Stash · {items.length} entry(ies)</div>
        </div>
        {items.length === 0 ? (
          <div className="empty">No stash entries</div>
        ) : (
          items.map((s) => (
            <div key={s.index} className="row">
              <span className="status s-mod">S</span>
              <span className="path">
                <span className="dim text-xs mono">stash@&#123;{s.index}&#125;:</span> {s.subject || "(no message)"}
              </span>
              <span className="dim text-xs">{new Date(s.date).toLocaleString()}</span>
              <button onClick={() => apply(s.index)}>Apply</button>
              <button onClick={() => pop(s.index)}>Pop</button>
              <button className="danger" onClick={() => drop(s.index)}>Drop</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
