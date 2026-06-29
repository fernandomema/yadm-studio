import { useEffect, useState, useCallback } from "react";
import { yadm } from "./lib/tauri";
import type { DetectInfo, YadmStatus, View } from "./types/yadm";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatusView from "./components/StatusView";
import LogView from "./components/LogView";
import DiffView from "./components/DiffView";
import BranchesView from "./components/BranchesView";
import StashView from "./components/StashView";
import AlternatesView from "./components/AlternatesView";
import EncryptionView from "./components/EncryptionView";
import HooksView from "./components/HooksView";
import ConfigView from "./components/ConfigView";
import ConflictsView from "./components/ConflictsView";
import BootstrapView from "./components/BootstrapView";
import ReadmeView from "./components/ReadmeView";
import { ToastProvider, useToast } from "./components/Toast";

function Shell() {
  const [detect, setDetect] = useState<DetectInfo | null>(null);
  const [status, setStatus] = useState<YadmStatus | null>(null);
  const [view, setView] = useState<View>("status");
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { show } = useToast();

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    yadm
      .detect()
      .then(setDetect)
      .catch((e) => show(String(e), "error"));
  }, [show]);

  useEffect(() => {
    if (!detect?.available) return;
    yadm
      .status()
      .then((s) => setStatus(s))
      .catch((e) => show(String(e), "error"));
  }, [detect, refreshTick, show]);

  useEffect(() => {
    if (view === "status" && status && !status.initialized) {
      setView("bootstrap");
    }
  }, [view, status]);

  if (!detect) {
    return (
      <div className="app" style={{ gridTemplateColumns: "1fr" }}>
        <div className="content flex items-center justify-between" style={{ flexDirection: "column", justifyContent: "center" }}>
          <div className="spinner" />
          <div className="dim mono text-xs mt-2">detecting yadm…</div>
        </div>
      </div>
    );
  }

  if (!detect.available) {
    return (
      <div className="app" style={{ gridTemplateColumns: "1fr" }}>
        <div className="content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="panel" style={{ width: 480, padding: 32, textAlign: "center" }}>
            <div className="brand" style={{ justifyContent: "center", marginBottom: 12 }}>
              <span className="brand-dot" style={{ background: "var(--error)", boxShadow: "0 0 8px var(--error)" }} />
              yadm not found
            </div>
            <div className="dim text-sm" style={{ marginBottom: 16 }}>
              yadm is not installed or not in your PATH.
            </div>
            <div className="code" style={{ textAlign: "left" }}>
              {`# macOS
brew install yadm

# Debian/Ubuntu
sudo apt install yadm

# Arch
sudo pacman -S yadm

# Windows (scoop)
scoop install yadm`}
            </div>
            <button className="primary mt-3" onClick={() => yadm.detect().then(setDetect)}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={setView}
        status={status}
        detect={detect}
      />
      <div className="main">
        <Topbar detect={detect} status={status} onRefresh={refresh} />
        <div className="content">
          {view === "status" && status?.initialized && (
            <StatusView
              status={status}
              onChange={refresh}
              onOpenFile={(p) => {
                setSelectedFile(p);
                setView("diff");
              }}
              onConflict={() => setView("conflicts")}
            />
          )}
          {view === "log" && <LogView onCommitSelect={(h) => console.log("commit", h)} />}
          {view === "diff" && (
            <DiffView
              file={selectedFile}
              setFile={setSelectedFile}
            />
          )}
          {view === "branches" && <BranchesView onChange={refresh} />}
          {view === "stash" && <StashView onChange={refresh} />}
          {view === "alternates" && <AlternatesView onChange={refresh} />}
          {view === "encryption" && <EncryptionView onChange={refresh} />}
          {view === "hooks" && <HooksView />}
          {view === "config" && <ConfigView />}
          {view === "conflicts" && <ConflictsView onChange={refresh} />}
          {view === "readme" && <ReadmeView />}
          {view === "bootstrap" && (
            <BootstrapView
              initialized={status?.initialized ?? false}
              onChange={refresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
