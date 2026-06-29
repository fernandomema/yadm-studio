import { useEffect, useState } from "react";
import { yadm } from "../lib/tauri";
import type { ReadmeInfo } from "../types/yadm";
import { useToast } from "./Toast";

export default function ReadmeView() {
  const [items, setItems] = useState<ReadmeInfo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  function load() {
    setLoading(true);
    yadm
      .listReadmes()
      .then((r) => {
        setItems(r);
        if (r.length > 0 && !active) {
          setActive(r[0].path);
          setContent(r[0].content);
          setOriginal(r[0].content);
        }
      })
      .catch((e) => show(String(e), "error"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [show]);

  function select(path: string) {
    if (path === active) return;
    if (mode === "edit" && content !== original) {
      if (!confirm("Discard unsaved changes?")) return;
    }
    const item = items.find((i) => i.path === path);
    if (item) {
      setActive(path);
      setContent(item.content);
      setOriginal(item.content);
      setMode("view");
    }
  }

  async function save() {
    if (!active) return;
    try {
      await yadm.writeReadme(active, content);
      setOriginal(content);
      show(`Saved ${active}`, "success");
      setMode("view");
      load();
    } catch (e) {
      show(String(e), "error");
    }
  }

  function renderPreview() {
    // Tiny markdown-ish preview: paragraphs, headings (#, ##), code blocks,
    // and bold (**x**). For richer rendering you'd swap in a proper library.
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let inCode = false;
    let codeBuf: string[] = [];
    let key = 0;

    const flushCode = () => {
      if (codeBuf.length > 0) {
        elements.push(
          <pre key={key++} className="code">
            {codeBuf.join("\n")}
          </pre>
        );
        codeBuf = [];
      }
    };

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (inCode) {
          elements.push(
            <pre key={key++} className="code">
              {codeBuf.join("\n")}
            </pre>
          );
          codeBuf = [];
          inCode = false;
        } else {
          flushCode();
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        continue;
      }
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={key++} style={{ margin: "12px 0 8px", fontSize: 22 }}>
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={key++} style={{ margin: "10px 0 6px", fontSize: 16 }}>
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={key++} style={{ margin: "8px 0 4px", fontSize: 14 }}>
            {line.slice(4)}
          </h3>
        );
      } else if (line.trim() === "") {
        elements.push(<div key={key++} style={{ height: 8 }} />);
      } else {
        elements.push(
          <p
            key={key++}
            style={{ margin: "0 0 4px 0", lineHeight: 1.6, color: "var(--text-1)" }}
          >
            {renderInline(line)}
          </p>
        );
      }
    }
    flushCode();
    return elements;
  }

  function renderInline(text: string) {
    const parts: React.ReactNode[] = [];
    let i = 0;
    let key = 0;
    while (i < text.length) {
      const boldStart = text.indexOf("**", i);
      const codeStart = text.indexOf("`", i);
      let next = -1;
      let type: "bold" | "code" | null = null;
      if (boldStart !== -1 && (codeStart === -1 || boldStart < codeStart)) {
        next = boldStart;
        type = "bold";
      } else if (codeStart !== -1) {
        next = codeStart;
        type = "code";
      }
      if (next === -1) {
        parts.push(text.slice(i));
        break;
      }
      if (next > i) parts.push(text.slice(i, next));
      if (type === "bold") {
        const end = text.indexOf("**", next + 2);
        if (end === -1) {
          parts.push(text.slice(next));
          break;
        }
        parts.push(<strong key={key++}>{text.slice(next + 2, end)}</strong>);
        i = end + 2;
      } else {
        const end = text.indexOf("`", next + 1);
        if (end === -1) {
          parts.push(text.slice(next));
          break;
        }
        parts.push(
          <code
            key={key++}
            style={{
              background: "var(--bg-2)",
              padding: "1px 4px",
              borderRadius: 3,
              fontFamily: "var(--mono)",
              fontSize: "0.9em",
            }}
          >
            {text.slice(next + 1, end)}
          </code>
        );
        i = end + 1;
      }
    }
    return parts;
  }

  const dirty = content !== original;
  const activeItem = items.find((i) => i.path === active);

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">README files · {items.length}</div>
          {active && (
            <div className="flex gap-2 items-center">
              <span className="dim text-xs mono">{active}</span>
              <button
                className={mode === "view" ? "" : "ghost"}
                onClick={() => setMode("view")}
              >
                View
              </button>
              <button
                className={mode === "edit" ? "" : "ghost"}
                onClick={() => setMode("edit")}
              >
                Edit
              </button>
              {mode === "edit" && (
                <button
                  className="primary"
                  onClick={save}
                  disabled={!dirty}
                >
                  Save
                </button>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty">
            <strong>No README files found</strong>
            Track a README with <span className="mono">yadm add ~/README.md</span>{" "}
            to see it here.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: 400 }}>
            <div style={{ borderRight: "1px solid var(--border)" }}>
              {items.map((i) => (
                <div
                  key={i.path}
                  className="row"
                  onClick={() => select(i.path)}
                  style={
                    active === i.path ? { background: "var(--bg-2)" } : undefined
                  }
                >
                  <span className="status">≡</span>
                  <span className="path">{i.path.split("/").pop()}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: 20, overflow: "auto", maxHeight: "70vh" }}>
              {activeItem && mode === "view" && (
                <div>{renderPreview()}</div>
              )}
              {activeItem && mode === "edit" && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ minHeight: 500, fontFamily: "var(--mono)" }}
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="dim text-xs mt-3">
          {dirty && mode === "edit" ? (
            <span className="s-mod">● unsaved changes</span>
          ) : (
            <span>Changes saved files are still uncommitted. Stage and commit from the Status tab.</span>
          )}
        </div>
      )}
    </div>
  );
}
