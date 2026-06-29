import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { BranchInfo, RemoteInfo } from "../types/yadm";
import { useToast } from "./Toast";

type Props = {
  onChange: () => void;
};

export default function BranchesView({ onChange }: Props) {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [newName, setNewName] = useState("");
  const { show } = useToast();

  function load() {
    yadm.branches().then(setBranches).catch((e) => show(String(e), "error"));
    yadm.remotes().then(setRemotes).catch((e) => show(String(e), "error"));
  }

  useEffect(load, [show]);

  async function checkout(name: string) {
    try {
      await yadm.checkout(name);
      show(`Checked out ${name}`, "success");
      onChange();
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  async function create() {
    if (!newName.trim()) return;
    try {
      await yadm.createBranch(newName.trim(), true);
      setNewName("");
      show(`Created branch ${newName}`, "success");
      onChange();
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Local branches · {branches.filter((b) => !b.remote).length}</div>
        </div>
        {branches.filter((b) => !b.remote).length === 0 ? (
          <div className="empty">No local branches</div>
        ) : (
          branches
            .filter((b) => !b.remote)
            .map((b) => (
              <div key={b.name} className="row">
                <span className="status s-mod">⎇</span>
                <span className="path">{b.name}</span>
                {b.current && <span className="tag info">current</span>}
                {b.upstream && <span className="dim text-xs">↔ {b.upstream}</span>}
                <div style={{ flex: 1 }} />
                {!b.current && (
                  <button onClick={() => checkout(b.name)}>Checkout</button>
                )}
              </div>
            ))
        )}
        <div className="panel-body" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex gap-2 items-center">
            <input
              placeholder="new-branch-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <button className="primary" onClick={create} disabled={!newName.trim()}>
              Create & checkout
            </button>
          </div>
        </div>
      </div>

      <div className="section-title">Remotes</div>
      <div className="panel">
        {remotes.length === 0 ? (
          <div className="empty">No remotes configured</div>
        ) : (
          remotes.map((r) => (
            <div key={r.name} className="row">
              <span className="status s-add">●</span>
              <span className="path">{r.name}</span>
              <span className="dim text-xs mono" style={{ userSelect: "text" }}>{r.url}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
