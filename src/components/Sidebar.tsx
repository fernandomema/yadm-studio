import type { View, YadmStatus, DetectInfo } from "../types/yadm";

type Props = {
  view: View;
  setView: (v: View) => void;
  status: YadmStatus | null;
  detect: DetectInfo;
};

type Item = {
  key: View;
  label: string;
  icon: string;
  badge?: () => string | number | null;
  badgeClass?: string;
  group: "main" | "files" | "advanced";
  requiresInit?: boolean;
};

export default function Sidebar({ view, setView, status, detect }: Props) {
  const initialized = status?.initialized ?? false;
  const changeCount = (status?.staged.length ?? 0) + (status?.unstaged.length ?? 0);
  const conflictCount = status?.conflicted.length ?? 0;

  const items: Item[] = [
    { key: "status", label: "Status", icon: "·", group: "main", requiresInit: true, badge: () => changeCount > 0 ? changeCount : null, badgeClass: "warn" },
    { key: "conflicts", label: "Conflicts", icon: "!", group: "main", requiresInit: true, badge: () => conflictCount > 0 ? conflictCount : null, badgeClass: "danger" },
    { key: "log", label: "History", icon: "≡", group: "main", requiresInit: true },
    { key: "diff", label: "Diff", icon: "±", group: "main", requiresInit: true },
    { key: "branches", label: "Branches", icon: "⎇", group: "main", requiresInit: true },
    { key: "stash", label: "Stash", icon: "⤓", group: "main", requiresInit: true },
    { key: "alternates", label: "Alternates", icon: "◇", group: "files", requiresInit: true },
    { key: "encryption", label: "Encryption", icon: "⚿", group: "files", requiresInit: true },
    { key: "hooks", label: "Hooks", icon: "↪", group: "advanced", requiresInit: true },
    { key: "config", label: "Config", icon: "≡", group: "advanced", requiresInit: true },
    { key: "readme", label: "README", icon: "¶", group: "files", requiresInit: true },
    { key: "bootstrap", label: initialized ? "Bootstrap" : "Repository", icon: "◉", group: "advanced" },
  ];

  const groups: { key: "main" | "files" | "advanced"; label: string }[] = [
    { key: "main", label: "Workspace" },
    { key: "files", label: "Files" },
    { key: "advanced", label: "Advanced" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <span className="brand-dot" />
          yadm studio
        </div>
        <div className="brand-sub">dotfiles manager</div>
        {initialized && status?.branch && (
          <div className="branch-tag">
            <span className="dot" />
            {status.branch}
            {status.upstream && (
              <span className="dim text-xs">↔ {status.upstream.replace("origin/", "")}</span>
            )}
          </div>
        )}
      </div>

      <div className="nav">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="nav-section">{g.label}</div>
            {items
              .filter((i) => i.group === g.key)
              .filter((i) => !i.requiresInit || initialized)
              .map((i) => {
                const badge = i.badge?.();
                return (
                  <div
                    key={i.key}
                    className={`nav-item ${view === i.key ? "active" : ""} ${i.badgeClass ?? ""}`}
                    onClick={() => setView(i.key)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="icon">{i.icon}</span>
                      {i.label}
                    </span>
                    {badge != null && <span className="badge">{badge}</span>}
                  </div>
                );
              })}
          </div>
        ))}

        <div className="section-title" style={{ marginTop: 24 }}>Info</div>
        <div className="dim text-xs mono" style={{ padding: "0 10px" }}>
          yadm {detect.version}
        </div>
        <div className="dim text-xs mono mt-1" style={{ padding: "0 10px" }}>
          {initialized ? "repository ready" : "not initialized"}
        </div>
      </div>
    </aside>
  );
}
