import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { LogEntry } from "../types/yadm";
import { useToast } from "./Toast";

type Props = {
  onCommitSelect?: (hash: string) => void;
};

export default function LogView({ onCommitSelect }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  useEffect(() => {
    yadm
      .log(200)
      .then(setEntries)
      .catch((e) => show(String(e), "error"))
      .finally(() => setLoading(false));
  }, [show]);

  function refClass(ref: string) {
    if (ref.includes("/HEAD") || ref === "HEAD") return "head";
    if (ref.startsWith("tag:") || ref.includes("tags/")) return "tag";
    return "";
  }

  function formatRef(ref: string) {
    return ref.replace("tag: ", "").replace("refs/heads/", "").replace("refs/remotes/", "");
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">History · {entries.length} commits</div>
        </div>
        {loading ? (
          <div className="empty">
            <span className="spinner" />
          </div>
        ) : entries.length === 0 ? (
          <div className="empty">No commits yet</div>
        ) : (
          entries.map((e) => (
            <div
              key={e.hash}
              className="log-entry"
              onClick={() => onCommitSelect?.(e.hash)}
            >
              <div className="top">
                <span className="hash">{e.short_hash}</span>
                {e.refs.length > 0 && (
                  <span className="refs">
                    {e.refs.map((r, i) => (
                      <span key={i} className={`ref ${refClass(r)}`}>
                        {formatRef(r)}
                      </span>
                    ))}
                  </span>
                )}
                <span style={{ flex: 1 }} />
                <span className="meta">{new Date(e.date).toLocaleString()}</span>
              </div>
              <div className="subject">{e.subject}</div>
              {e.body && <div className="body">{e.body}</div>}
              <div className="meta">
                {e.author} · {e.email}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
