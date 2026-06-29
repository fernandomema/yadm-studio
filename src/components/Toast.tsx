import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastKind = "info" | "error" | "warn" | "success";
type Toast = { id: number; kind: ToastKind; text: string };

const ToastCtx = createContext<{
  show: (text: string, kind?: ToastKind) => void;
}>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {items.map((t, i) => (
        <div
          key={t.id}
          className={`toast ${t.kind}`}
          style={{ bottom: 24 + i * 56 }}
        >
          {t.text}
        </div>
      ))}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
