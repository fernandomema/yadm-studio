import type { DetectInfo, YadmStatus } from "../types/yadm";
import { yadm } from "../lib/tauri";
import { useToast } from "./Toast";

type Props = {
  detect: DetectInfo;
  status: YadmStatus | null;
  onRefresh: () => void;
};

export default function Topbar({ status, onRefresh }: Props) {
  const { show } = useToast();

  async function doPull() {
    try {
      const out = await yadm.pull(false);
      show(out || "Pulled successfully", "success");
      onRefresh();
    } catch (e) {
      show(String(e), "error");
    }
  }
  async function doPush() {
    try {
      const out = await yadm.push(false, !status?.upstream);
      show(out || "Pushed successfully", "success");
      onRefresh();
    } catch (e) {
      show(String(e), "error");
    }
  }
  async function doFetch() {
    try {
      const out = await yadm.fetch();
      show(out || "Fetched", "success");
      onRefresh();
    } catch (e) {
      show(String(e), "error");
    }
  }

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">
          yadm <span className="dim">/</span> <strong>{status?.branch ?? "—"}</strong>
        </span>
        {status?.upstream && (
          <span className="topbar-title dim" style={{ marginLeft: 8 }}>
            ↔ {status.upstream}
          </span>
        )}
      </div>
      <div className="topbar-right">
        <button className="ghost" onClick={onRefresh} title="Refresh">↻</button>
        <button onClick={doFetch}>Fetch</button>
        <button onClick={doPull}>Pull</button>
        <button className="primary" onClick={doPush}>Push</button>
      </div>
    </div>
  );
}
