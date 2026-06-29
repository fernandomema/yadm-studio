import { useState, useEffect, useMemo, Fragment } from "react";
import type { YadmStatus, StatusEntry } from "../types/yadm";
import { yadm } from "../lib/tauri";
import { useToast } from "./Toast";

type Props = {
  status: YadmStatus;
  onChange: () => void;
  onOpenFile: (path: string) => void;
  onConflict: () => void;
};

type ViewMode = "flat" | "tree";
type TabMode = "all" | "staged";

function statusCode(entry: StatusEntry): string {
  return `${entry.index_status}${entry.work_status}`;
}

function statusSymbol(entry: StatusEntry): { sym: string; cls: string; tag: string; rowCls: string } {
  const code = statusCode(entry);
  if (code === "??") return { sym: "U", cls: "s-untracked", tag: "untracked", rowCls: "row-untracked" };
  if (code === "!!") return { sym: "—", cls: "s-del", tag: "ignored", rowCls: "row-deleted" };
  if (code.includes("U") || (code[0] === "A" && code[1] === "A") || (code[0] === "D" && code[1] === "D"))
    return { sym: "!", cls: "s-conflict", tag: "conflict", rowCls: "row-conflict" };
  if (code === "A " || code === "AM" || code === "A") return { sym: "A", cls: "s-add", tag: "added", rowCls: "row-added" };
  if (code === "M " || code === "M") return { sym: "M", cls: "s-mod", tag: "modified", rowCls: "row-modified" };
  if (code === " D" || code === "D" || code === "D ") return { sym: "D", cls: "s-del", tag: "deleted", rowCls: "row-deleted" };
  if (code === "R ") return { sym: "R", cls: "s-mod", tag: "renamed", rowCls: "row-modified" };
  if (code === "C ") return { sym: "C", cls: "s-mod", tag: "copied", rowCls: "row-modified" };
  if (code === "MM") return { sym: "M", cls: "s-mod", tag: "staged + modified", rowCls: "row-modified" };
  if (code === "MD") return { sym: "M", cls: "s-mod", tag: "staged + deleted", rowCls: "row-modified" };
  return { sym: "·", cls: "s-mod", tag: code, rowCls: "row-modified" };
}

type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  files: StatusEntry[];
};

function buildTree(entries: StatusEntry[]): TreeNode {
  const root: TreeNode = { name: "~/", path: "", isDir: true, children: [], files: [] };
  for (const e of entries) {
    // yadm/git status --porcelain marks untracked directories with a
    // trailing slash (e.g. "?? .agents/"). Treat those as folder nodes
    // so the tree can offer drill-in on them.
    const raw = e.path;
    const isDirEntry = raw.endsWith("/");
    const clean = isDirEntry ? raw.slice(0, -1) : raw;
    const parts = clean
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;

    let node = root;
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      acc = acc ? `${acc}/${parts[i]}` : parts[i];

      if (isLast && !isDirEntry) {
        // Leaf file — never create a child folder for it.
        node.files.push(e);
        break;
      }

      // Intermediate component, or the last component of a directory
      // entry — must be a folder. Find or create it.
      let child = node.children.find((c) => c.name === parts[i]);
      if (!child) {
        child = { name: parts[i], path: acc, isDir: true, children: [], files: [] };
        node.children.push(child);
      }
      node = child;
    }
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    n.files.sort((a, b) => a.path.localeCompare(b.path));
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

function collectFilePaths(node: TreeNode): string[] {
  let out: string[] = node.files.map((f) => f.path);
  for (const c of node.children) out = out.concat(collectFilePaths(c));
  return out;
}

function countFiles(node: TreeNode): number {
  return node.files.length + node.children.reduce((acc, c) => acc + countFiles(c), 0);
}

type TreeRowProps = {
  node: TreeNode;
  depth: number;
  selected: Set<string>;
  toggleFile: (path: string) => void;
  toggleDir: (node: TreeNode) => void;
  collapsed: Set<string>;
  toggleCollapse: (path: string) => void;
  onOpenFile: (path: string) => void;
  onUntrack: (path: string) => void;
  onStage: (path: string) => void;
  busy: boolean;
  allowDrillIn?: boolean;
  onDrillIn?: (path: string) => void;
  drilled?: Set<string>;
  drilling?: string | null;
  drillContents?: Record<
    string,
    { name: string; path: string; is_dir: boolean }[]
  >;
  onDrillChild?: (path: string) => void;
};

function TreeRow({
  node,
  depth,
  selected,
  toggleFile,
  toggleDir,
  collapsed,
  toggleCollapse,
  onOpenFile,
  onUntrack,
  onStage,
  busy,
  allowDrillIn,
  onDrillIn,
  drilled,
  drilling,
  drillContents,
  onDrillChild,
}: TreeRowProps) {
  if (!node.isDir) return null;
  const allFiles = collectFilePaths(node);
  const allSelected = allFiles.length > 0 && allFiles.every((p) => selected.has(p));
  const someSelected = !allSelected && allFiles.some((p) => selected.has(p));
  const fileCount = countFiles(node);
  const isExpanded = !collapsed.has(node.path);
  const isTop = depth === 0;
  const isEmpty =
    node.files.length === 0 && node.children.length === 0;
  const wasDrilled = drilled ? drilled.has(node.path) : false;
  const canDrill = !!allowDrillIn && isEmpty && !wasDrilled;

  return (
    <Fragment>
      <div
        className={`row ${isTop ? "tree-root" : "tree-folder"} ${!isTop ? "tree-child" : ""}`}
        style={{
          paddingLeft: 12 + depth * 20,
          ...(!isTop ? { ["--tree-depth" as any]: depth.toString() } : {}),
        }}
      >
        {!isTop && (
          <button
            className="ghost"
            style={{ width: 16, padding: 0, border: "none" }}
            onClick={() => toggleCollapse(node.path)}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        )}
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={() => toggleDir(node)}
        />
        <span className="status">{isTop ? "▣" : "▸"}</span>
        <span className="path">{isTop ? node.name || "/" : node.name}</span>
        <span className="dim text-xs mono">
          {fileCount > 0 ? `${fileCount} file(s)` : canDrill ? "untracked folder" : "empty"}
        </span>
        {canDrill && (
          <button
            className="ghost"
            style={{ marginLeft: 8 }}
            onClick={(ev) => {
              ev.stopPropagation();
              onDrillIn?.(node.path);
            }}
            disabled={busy}
            title="List contents on disk"
          >
            ⌕ Browse
          </button>
        )}
        <div style={{ flex: 1 }} />
      </div>
      {isExpanded && (
        <>
          {canDrill && (
            <div
              className="row dim"
              style={{ paddingLeft: 12 + (depth + 1) * 20, fontStyle: "italic" }}
            >
              <span className="status">·</span>
              <span className="path" style={{ color: "var(--text-3)" }}>
                click ⌕ Browse above to list contents
              </span>
              <div style={{ flex: 1 }} />
            </div>
          )}
          {node.files.map((f) => {
            const s = statusSymbol(f);
            const basename = f.path.split("/").filter(Boolean).pop() || f.path || "(unnamed)";
            return (
              <div
                key={f.path}
                className={`row ${s.rowCls} tree-child`}
                style={{
                  paddingLeft: 12 + (depth + 1) * 20,
                  ["--tree-depth" as any]: (depth + 1).toString(),
                }}
                onClick={() => onOpenFile(f.path)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(f.path)}
                  onChange={(ev) => {
                    ev.stopPropagation();
                    toggleFile(f.path);
                  }}
                  onClick={(ev) => ev.stopPropagation()}
                />
                <span className={`status ${s.cls}`}>{s.sym}</span>
                <span className="path">{basename}</span>
                <span className="dim text-xs mono">{f.path}</span>
                <span className={`tag ${s.cls === "s-untracked" ? "info" : s.cls === "s-add" ? "add" : s.cls === "s-del" ? "del" : s.cls === "s-conflict" ? "del" : ""}`}>{s.tag}</span>
                <button
                  className="ghost"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onUntrack(f.path);
                  }}
                  disabled={busy}
                >
                  Untrack
                </button>
                <button
                  className="primary"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onStage(f.path);
                  }}
                  disabled={busy}
                >
                  Stage
                </button>
              </div>
            );
          })}
          {drilled?.has(node.path) &&
            drillContents?.[node.path]?.map((entry) => {
              const isDir = entry.is_dir;
              return (
                <div
                  key={`drill:${entry.path}`}
                  className="row tree-child"
                  style={{
                    paddingLeft: 12 + (depth + 1) * 20,
                    ["--tree-depth" as any]: (depth + 1).toString(),
                    background: "rgba(107, 213, 255, 0.03)",
                  }}
                >
                  <span
                    className="status"
                    style={{
                      color: isDir ? "var(--info)" : "var(--text-3)",
                      borderColor: isDir ? "var(--info)" : "var(--border)",
                    }}
                  >
                    {isDir ? "▸" : "·"}
                  </span>
                  <span className="path" style={{ fontStyle: isDir ? "normal" : "italic", color: isDir ? "var(--text-1)" : "var(--text-3)" }}>
                    {entry.name}
                  </span>
                  <span className="dim text-xs mono">{entry.path}</span>
                  <span className="tag muted">on disk</span>
                  {isDir ? (
                    <button
                      className="ghost"
                      onClick={() => onDrillChild?.(entry.path)}
                      disabled={drilling === entry.path}
                    >
                      {drilling === entry.path ? "…" : "⌕ Browse"}
                    </button>
                  ) : (
                    <button
                      className="primary"
                      onClick={() => onStage(entry.path)}
                      disabled={busy}
                    >
                      Stage
                    </button>
                  )}
                </div>
              );
            })}
          {node.children.map((c) => (
            <TreeRow
              key={c.path}
              node={c}
              depth={depth + 1}
              selected={selected}
              toggleFile={toggleFile}
              toggleDir={toggleDir}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              onOpenFile={onOpenFile}
              onUntrack={onUntrack}
              onStage={onStage}
              busy={busy}
              allowDrillIn={allowDrillIn}
              onDrillIn={onDrillIn}
              drilled={drilled}
              drilling={drilling}
              drillContents={drillContents}
              onDrillChild={onDrillChild}
            />
          ))}
        </>
      )}
    </Fragment>
  );
}

type TreeGroupProps = {
  tree: TreeNode;
  selected: Set<string>;
  collapsed: Set<string>;
  toggleCollapse: (path: string) => void;
  toggleFile: (path: string) => void;
  toggleDir: (node: TreeNode) => void;
  onOpenFile: (path: string) => void;
  onUntrack: (path: string) => void;
  onStage: (path: string) => void;
  busy: boolean;
  untrackedStyle?: boolean;
  allowDrillIn?: boolean;
  onDrillIn?: (path: string) => void;
  onDrillChild?: (path: string) => void;
  drilled: Set<string>;
  drilling: string | null;
  drillContents: Record<string, { name: string; path: string; is_dir: boolean }[]>;
};

function TreeGroup({
  tree,
  selected,
  collapsed,
  toggleCollapse,
  toggleFile,
  toggleDir,
  onOpenFile,
  onUntrack,
  onStage,
  busy,
  untrackedStyle,
  allowDrillIn,
  onDrillIn,
  onDrillChild,
  drilled,
  drilling,
  drillContents,
}: TreeGroupProps) {
  // Render root-level files (no "/"), then sub-folders via TreeRow.
  return (
    <>
      {tree.files.length > 0 && (
        <div className="row tree-root" style={{ paddingLeft: 12 }}>
          <span className="status">{untrackedStyle ? "U" : "▣"}</span>
          <span className="path">~/</span>
          <span className="dim text-xs mono">{tree.files.length} root file(s)</span>
          <div style={{ flex: 1 }} />
        </div>
      )}
      {tree.files.map((f) => {
        const s = statusSymbol(f);
        const basename =
          f.path.split("/").filter(Boolean).pop() || f.path || "(unnamed)";
        return (
          <div
            key={f.path}
            className={`row ${s.rowCls} tree-child`}
            style={{ paddingLeft: 12 + 1 * 20, ["--tree-depth" as any]: "1" }}
            onClick={() => onOpenFile(f.path)}
          >
            <input
              type="checkbox"
              checked={selected.has(f.path)}
              onChange={(ev) => {
                ev.stopPropagation();
                toggleFile(f.path);
              }}
              onClick={(ev) => ev.stopPropagation()}
            />
            <span className={`status ${s.cls}`}>{s.sym}</span>
            <span className="path">{basename}</span>
            <span className="dim text-xs mono">{f.path}</span>
            <span
              className={`tag ${
                s.cls === "s-untracked"
                  ? "info"
                  : s.cls === "s-add"
                  ? "add"
                  : s.cls === "s-del" || s.cls === "s-conflict"
                  ? "del"
                  : ""
              }`}
            >
              {s.tag}
            </span>
            <button
              className="ghost"
              onClick={(ev) => {
                ev.stopPropagation();
                onUntrack(f.path);
              }}
              disabled={busy}
            >
              Untrack
            </button>
            <button
              className="primary"
              onClick={(ev) => {
                ev.stopPropagation();
                onStage(f.path);
              }}
              disabled={busy}
            >
              Stage
            </button>
          </div>
        );
      })}
      {tree.children.map((c) => (
        <TreeRow
          key={c.path}
          node={c}
          depth={0}
          selected={selected}
          toggleFile={toggleFile}
          toggleDir={toggleDir}
          collapsed={collapsed}
          toggleCollapse={toggleCollapse}
          onOpenFile={onOpenFile}
          onUntrack={onUntrack}
          onStage={onStage}
          busy={busy}
          allowDrillIn={allowDrillIn}
          onDrillIn={onDrillIn}
          onDrillChild={onDrillChild}
          drilled={drilled}
          drilling={drilling}
          drillContents={drillContents}
        />
      ))}
    </>
  );
}

export default function StatusView({ status, onChange, onOpenFile, onConflict }: Props) {
  const { show } = useToast();
  const [message, setMessage] = useState("");
  const [sign, setSign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tabMode, setTabMode] = useState<TabMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drilled, setDrilled] = useState<Set<string>>(new Set());
  const [drillContents, setDrillContents] = useState<
    Record<string, { name: string; path: string; is_dir: boolean }[]>
  >({});
  const [drilling, setDrilling] = useState<string | null>(null);

  useEffect(() => {
    setTabMode("all");
    setSelected(new Set());
  }, [status.clean]);

  const trackedEntries: StatusEntry[] = useMemo(
    () => [...status.unstaged, ...status.conflicted],
    [status.unstaged, status.conflicted]
  );
  const untrackedEntries: StatusEntry[] = useMemo(
    () => [...status.untracked],
    [status.untracked]
  );
  const allWorking: StatusEntry[] = useMemo(
    () => [...trackedEntries, ...untrackedEntries],
    [trackedEntries, untrackedEntries]
  );
  const allFilePaths = useMemo(() => allWorking.map((f) => f.path), [allWorking]);
  const trackedTree = useMemo(() => buildTree(trackedEntries), [trackedEntries]);
  const untrackedTree = useMemo(() => buildTree(untrackedEntries), [untrackedEntries]);

  function toggleFile(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleDir(node: TreeNode) {
    const files = collectFilePaths(node);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = files.every((p) => next.has(p));
      if (allSelected) files.forEach((p) => next.delete(p));
      else files.forEach((p) => next.add(p));
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (prev.size === allFilePaths.length) return new Set();
      return new Set(allFilePaths);
    });
  }

  function toggleCollapse(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleDrillIn(path: string) {
    setDrilling(path);
    try {
      const entries = await yadm.listDirectory(path);
      setDrillContents((prev) => ({ ...prev, [path]: entries }));
      setDrilled((prev) => new Set(prev).add(path));
      // Make sure the folder is shown expanded.
      setCollapsed((prev) => {
        if (prev.has(path)) {
          const next = new Set(prev);
          next.delete(path);
          return next;
        }
        return prev;
      });
      const dirs = entries.filter((e) => e.is_dir).length;
      const files = entries.length - dirs;
      show(
        `${path}: ${dirs} folder(s), ${files} file(s)`,
        "info"
      );
    } catch (e) {
      show(String(e), "error");
    } finally {
      setDrilling(null);
    }
  }

  async function doAdd(paths: string[]) {
    if (paths.length === 0) return;
    setBusy(true);
    try {
      await yadm.add(paths);
      show(`${paths.length} file(s) staged`, "success");
      setSelected(new Set());
      onChange();
    } catch (e) {
      show(String(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function doUntrack(path: string) {
    if (!confirm(`Untrack ${path}? The file will remain in the working tree.`)) return;
    setBusy(true);
    try {
      await yadm.untrack(path);
      show(`Untracked ${path}`, "success");
      onChange();
    } catch (e) {
      show(String(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function doCommit() {
    if (!message.trim()) {
      show("Commit message required", "warn");
      return;
    }
    setBusy(true);
    try {
      const out = await yadm.commit(message, sign);
      setMessage("");
      show(out || "Committed", "success");
      onChange();
    } catch (e) {
      show(String(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function doAmend() {
    setBusy(true);
    try {
      const out = await yadm.amend(message.trim() || undefined);
      setMessage("");
      show(out || "Amended", "success");
      onChange();
    } catch (e) {
      show(String(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const hasChanges =
    trackedEntries.length + untrackedEntries.length + status.staged.length > 0;
  const selectedCount = selected.size;

  return (
    <div>
      {status.conflicted.length > 0 && (
        <div
          className="panel"
          style={{ borderColor: "var(--error)", cursor: "pointer" }}
          onClick={onConflict}
        >
          <div className="panel-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong className="s-conflict">{status.conflicted.length} conflict(s) need resolution</strong>
              <div className="dim text-xs mt-1">Click to open the conflict resolver</div>
            </div>
            <span className="tag del">conflict</span>
          </div>
        </div>
      )}

      <div className="commit-box">
        <textarea
          placeholder="Commit message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") doCommit();
          }}
        />
        <div className="actions">
          <div className="left">
            <label className="flex items-center gap-2 text-xs muted">
              <input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} />
              Sign with GPG
            </label>
            <span className="kbd">⌘ ⏎</span>
            <span className="dim text-xs">to commit</span>
          </div>
          <div className="right">
            <button onClick={doAmend} disabled={busy || !message.trim()}>
              Amend
            </button>
            <button
              className="primary"
              onClick={doCommit}
              disabled={busy || status.staged.length === 0 || !message.trim()}
            >
              Commit · {status.staged.length} staged
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: "wrap" }}>
        <span className="dim text-xs mono">view</span>
        <button className={tabMode === "all" ? "primary" : ""} onClick={() => setTabMode("all")}>
          All changes ({allFilePaths.length})
        </button>
        <button className={tabMode === "staged" ? "primary" : ""} onClick={() => setTabMode("staged")}>
          Staged ({status.staged.length})
        </button>
        <span style={{ width: 12 }} />
        {tabMode === "all" && (
          <>
            <button className={viewMode === "tree" ? "primary" : ""} onClick={() => setViewMode("tree")}>
              ⌥ Tree
            </button>
            <button className={viewMode === "flat" ? "primary" : ""} onClick={() => setViewMode("flat")}>
              ≡ Flat
            </button>
          </>
        )}
        <div style={{ flex: 1 }} />
        {tabMode === "all" && viewMode === "tree" && (
          <>
            <span className="dim text-xs mono">
              {selectedCount > 0 ? `${selectedCount} selected` : "select files"}
            </span>
            <button
              onClick={() => setCollapsed(new Set())}
              disabled={collapsed.size === 0}
              title="Expand all folders"
            >
              ▾ Expand all
            </button>
            <button
              onClick={() => {
                const all = new Set<string>();
                const collect = (n: TreeNode) => {
                  all.add(n.path);
                  n.children.forEach(collect);
                };
                collect(trackedTree);
                collect(untrackedTree);
                setCollapsed(all);
              }}
              title="Collapse all folders"
            >
              ▸ Collapse all
            </button>
            <button onClick={toggleSelectAll} disabled={allFilePaths.length === 0}>
              {selectedCount === allFilePaths.length ? "Deselect all" : "Select all"}
            </button>
            <button
              className="primary"
              onClick={() => doAdd(Array.from(selected))}
              disabled={busy || selectedCount === 0}
            >
              Stage selected
            </button>
          </>
        )}
        {tabMode === "all" && viewMode === "flat" && (
          <>
            <button
              disabled={busy || status.staged.length === 0}
              onClick={() => yadm.unstageAll().then(onChange).catch((e) => show(String(e), "error"))}
            >
              Unstage all
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => yadm.addAll().then(onChange).catch((e) => show(String(e), "error"))}
            >
              Stage all
            </button>
          </>
        )}
      </div>

      {tabMode === "staged" && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Staged changes · {status.staged.length}</div>
          </div>
          {status.staged.length === 0 ? (
            <div className="empty">No staged changes</div>
          ) : (
            status.staged.map((e) => {
              const s = statusSymbol(e);
              return (
                <div key={e.path} className={`row ${s.rowCls}`} onClick={() => onOpenFile(e.path)}>
                  <span className={`status ${s.cls}`}>{s.sym}</span>
                  <span className="path">{e.path}</span>
                  <span className="tag">{s.tag}</span>
                  <button
                    className="ghost"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      doAdd([`-:${e.path}`]);
                    }}
                  >
                    Unstage
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tabMode === "all" && viewMode === "tree" && (
        <>
          <div className="section-title">
            Tracked changes · {trackedEntries.length} file(s)
          </div>
          <div className="panel">
            {trackedEntries.length === 0 ? (
              <div className="empty dim" style={{ padding: 16 }}>
                No changes to tracked files.
              </div>
            ) : (
              <TreeGroup
                tree={trackedTree}
                selected={selected}
                collapsed={collapsed}
                toggleCollapse={toggleCollapse}
                toggleFile={toggleFile}
                toggleDir={toggleDir}
                onOpenFile={onOpenFile}
                onUntrack={doUntrack}
                onStage={(p) => doAdd([p])}
                busy={busy}
                drilled={drilled}
                drilling={drilling}
                drillContents={drillContents}
              />
            )}
          </div>

          <div className="section-title">
            Untracked files · {untrackedEntries.length} file(s)
          </div>
          <div className="panel">
            {untrackedEntries.length === 0 ? (
              <div className="empty dim" style={{ padding: 16 }}>
                No untracked files.
              </div>
            ) : (
              <TreeGroup
                tree={untrackedTree}
                selected={selected}
                collapsed={collapsed}
                toggleCollapse={toggleCollapse}
                toggleFile={toggleFile}
                toggleDir={toggleDir}
                onOpenFile={onOpenFile}
                onUntrack={doUntrack}
                onStage={(p) => doAdd([p])}
                busy={busy}
                untrackedStyle
                allowDrillIn
                onDrillIn={handleDrillIn}
                onDrillChild={handleDrillIn}
                drilled={drilled}
                drilling={drilling}
                drillContents={drillContents}
              />
            )}
          </div>
        </>
      )}

      {tabMode === "all" && viewMode === "flat" && (
        <>
          <div className="section-title">Unstaged · {status.unstaged.length}</div>
          <div className="panel">
            {status.unstaged.length === 0 ? (
              <div className="empty">Working tree clean</div>
            ) : (
              status.unstaged.map((e) => {
                const s = statusSymbol(e);
                return (
                  <div key={e.path} className={`row ${s.rowCls}`} onClick={() => onOpenFile(e.path)}>
                    <span className={`status ${s.cls}`}>{s.sym}</span>
                    <span className="path">{e.path}</span>
                    <span className={`tag ${s.cls === "s-add" ? "add" : s.cls === "s-del" ? "del" : s.cls === "s-conflict" ? "del" : ""}`}>{s.tag}</span>
                    <button
                      className="ghost"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        doUntrack(e.path);
                      }}
                    >
                      Untrack
                    </button>
                    <button
                      className="primary"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        doAdd([e.path]);
                      }}
                    >
                      Stage
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="section-title">Untracked · {status.untracked.length}</div>
          <div className="panel">
            {status.untracked.length === 0 ? (
              <div className="empty">No untracked files</div>
            ) : (
              status.untracked.map((e) => (
                <div key={e.path} className="row row-untracked" onClick={() => onOpenFile(e.path)}>
                  <span className="status s-untracked">U</span>
                  <span className="path">{e.path}</span>
                  <span className="tag info">untracked</span>
                  <button
                    className="primary"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      doAdd([e.path]);
                    }}
                  >
                    Stage
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {!hasChanges && (
        <div className="panel">
          <div className="empty">
            <strong>Working tree clean</strong>
            Nothing to commit. Your dotfiles are up to date.
          </div>
        </div>
      )}
    </div>
  );
}
