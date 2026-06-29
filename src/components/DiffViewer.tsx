import { useMemo } from "react";
import { diffLines, Change } from "diff";

type Props = {
  oldText: string;
  newText: string;
};

type Row = { left: string; leftKind: "del" | "ctx" | "empty"; right: string; rightKind: "add" | "ctx" | "empty" };

export default function DiffViewer({ oldText, newText }: Props) {
  const rows: Row[] = useMemo(() => {
    const changes: Change[] = diffLines(oldText, newText);
    const out: Row[] = [];
    let i = 0;
    while (i < changes.length) {
      const c = changes[i];
      if (!c.added && !c.removed) {
        const lines = c.value.split("\n");
        if (lines[lines.length - 1] === "") lines.pop();
        for (const line of lines) {
          out.push({ left: line, leftKind: "ctx", right: line, rightKind: "ctx" });
        }
        i++;
      } else if (c.removed && i + 1 < changes.length && changes[i + 1].added) {
        const removed = c.value.split("\n");
        const added = changes[i + 1].value.split("\n");
        if (removed[removed.length - 1] === "") removed.pop();
        if (added[added.length - 1] === "") added.pop();
        const max = Math.max(removed.length, added.length);
        for (let k = 0; k < max; k++) {
          out.push({
            left: removed[k] ?? "",
            leftKind: removed[k] !== undefined ? "del" : "empty",
            right: added[k] ?? "",
            rightKind: added[k] !== undefined ? "add" : "empty",
          });
        }
        i += 2;
      } else if (c.removed) {
        const lines = c.value.split("\n");
        if (lines[lines.length - 1] === "") lines.pop();
        for (const line of lines) {
          out.push({ left: line, leftKind: "del", right: "", rightKind: "empty" });
        }
        i++;
      } else if (c.added) {
        const lines = c.value.split("\n");
        if (lines[lines.length - 1] === "") lines.pop();
        for (const line of lines) {
          out.push({ left: "", leftKind: "empty", right: line, rightKind: "add" });
        }
        i++;
      }
    }
    return out;
  }, [oldText, newText]);

  return (
    <div className="diff-side">
      <div className="col">
        <div className="col-head">Original</div>
        {rows.map((r, i) => (
          <div
            key={i}
            className={`diff-line ${r.leftKind === "del" ? "del" : "ctx"}`}
            style={{ background: r.leftKind === "empty" ? "transparent" : undefined }}
          >
            <span className="ln">{i + 1}</span>
            <span className="sign">{r.leftKind === "del" ? "−" : " "}</span>
            <span>{r.left}</span>
          </div>
        ))}
      </div>
      <div className="col">
        <div className="col-head">Modified</div>
        {rows.map((r, i) => (
          <div
            key={i}
            className={`diff-line ${r.rightKind === "add" ? "add" : "ctx"}`}
            style={{ background: r.rightKind === "empty" ? "transparent" : undefined }}
          >
            <span className="ln">{i + 1}</span>
            <span className="sign">{r.rightKind === "add" ? "+" : " "}</span>
            <span>{r.right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
