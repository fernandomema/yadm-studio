import { useEffect, useState, useMemo } from "react";
import { yadm } from "../lib/tauri";
import type { DiffResult } from "../types/yadm";
import { useToast } from "./Toast";
import { parsePatch } from "../lib/diff";
import DiffViewer from "./DiffViewer";

type Props = {
  file: string | null;
  setFile: (f: string | null) => void;
};

export default function DiffView({ file, setFile }: Props) {
  const [diff, setDiff] = useState<DiffResult[]>([]);
  const [staged, setStaged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [singleDiff, setSingleDiff] = useState<DiffResult | null>(null);
  const { show } = useToast();

  useEffect(() => {
    setLoading(true);
    yadm
      .diff(staged)
      .then(setDiff)
      .catch((e) => show(String(e), "error"))
      .finally(() => setLoading(false));
  }, [staged, show]);

  useEffect(() => {
    if (!file) {
      setSingleDiff(null);
      return;
    }
    yadm
      .fileDiff(file, staged)
      .then(setSingleDiff)
      .catch((e) => show(String(e), "error"));
  }, [file, staged, show]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const d of diff) {
      const hunks = parsePatch(d.patch);
      for (const h of hunks) {
        for (const line of h.lines) {
          if (line.startsWith("+") && !line.startsWith("+++")) added++;
          else if (line.startsWith("-") && !line.startsWith("---")) removed++;
        }
      }
    }
    return { added, removed };
  }, [diff]);

  if (file && singleDiff) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button className="ghost" onClick={() => setFile(null)}>← All changes</button>
          <span className="dim">/</span>
          <span className="mono text-sm">{file}</span>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">{file}</div>
          </div>
          {singleDiff.is_binary ? (
            <div className="empty">Binary file. Cannot display diff.</div>
          ) : (
            <DiffViewer oldText={singleDiff.old_content} newText={singleDiff.new_content} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="dim text-xs mono">show</span>
        <button
          className={staged ? "" : "primary"}
          onClick={() => setStaged(false)}
        >
          Unstaged
        </button>
        <button
          className={staged ? "primary" : ""}
          onClick={() => setStaged(true)}
        >
          Staged
        </button>
        <div style={{ flex: 1 }} />
        <span className="tag add">+{stats.added}</span>
        <span className="tag del">−{stats.removed}</span>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Diff · {diff.length} file(s)</div>
        </div>
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : diff.length === 0 ? (
          <div className="empty">No changes</div>
        ) : (
          diff.map((d) => {
            const hunks = parsePatch(d.patch);
            return (
              <div key={d.path} style={{ borderBottom: "1px solid var(--border)" }}>
                <div
                  className="diff-head"
                  style={{ cursor: "pointer" }}
                  onClick={() => setFile(d.path)}
                >
                  <span>{d.path}</span>
                  <span className="dim">
                    {hunks.length} hunk(s){d.is_binary ? " · binary" : ""}
                  </span>
                </div>
                {d.is_binary ? (
                  <div className="empty">Binary file</div>
                ) : (
                  <div className="diff-body">
                    {hunks.map((h, i) => (
                      <div key={i}>
                        <div className="diff-line hunk">
                          <span className="ln">·</span>
                          <span className="sign">@</span>
                          <span>{h.header}</span>
                        </div>
                        {h.lines.map((line, j) => {
                          const sign = line[0] ?? " ";
                          const text = line.slice(1);
                          const cls =
                            sign === "+" ? "add" : sign === "-" ? "del" : sign === "@" ? "hunk" : "ctx";
                          const ln = sign === "+" ? "→" : sign === "-" ? "←" : " ";
                          return (
                            <div key={j} className={`diff-line ${cls}`}>
                              <span className="ln">{ln}</span>
                              <span className="sign">{cls === "add" ? "+" : cls === "del" ? "−" : " "}</span>
                              <span>{text}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
