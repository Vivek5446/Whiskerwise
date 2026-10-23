import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, TriangleAlert, X } from "lucide-react";
import { STORAGE_ISSUE_EVENT, type StorageIssue } from "@/game/storage";
import { UPDATE_EVENT, applyPendingUpdate, registerPurrzleWorker } from "@/lib/pwa";

const STORAGE_TEXT: Record<StorageIssue, string> = {
  write: "Progress couldn't be saved on this device. Free up space or leave private browsing, then keep playing.",
  read: "Saved progress couldn't be opened. You can keep playing; new progress may not save.",
  corrupt: "A save looked damaged, so a backup copy was kept and play continues.",
};

export function AppStatus() {
  const [online, setOnline] = useState(true);
  const [update, setUpdate] = useState(false);
  const [issue, setIssue] = useState<StorageIssue | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const upd = () => setUpdate(true);
    const store = (e: Event) => setIssue((e as CustomEvent<{ kind: StorageIssue }>).detail.kind);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener(UPDATE_EVENT, upd);
    window.addEventListener(STORAGE_ISSUE_EVENT, store);
    void registerPurrzleWorker();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener(UPDATE_EVENT, upd);
      window.removeEventListener(STORAGE_ISSUE_EVENT, store);
    };
  }, []);

  return (
    <>
      {!online && (
        <p role="status" title="Offline · progress saves on this device" className="pointer-events-none fixed bottom-[max(0.4rem,env(safe-area-inset-bottom))] left-2 z-[60] flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-bold text-muted-foreground shadow-pop">
          <CloudOff className="size-3.5" strokeWidth={2.6} /> Offline
        </p>
      )}
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] mx-auto flex w-full max-w-md flex-col items-center gap-2 px-4">
      {update && (
        <div role="status" className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-bold shadow-pop">
          New version ready
          <button type="button" onClick={applyPendingUpdate} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-primary-foreground">
            <RefreshCw className="size-3.5" strokeWidth={2.6} /> Refresh
          </button>
          <button type="button" aria-label="Later" onClick={() => setUpdate(false)} className="p-1 text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}
      {issue && (
        <div role="alert" className="pointer-events-auto flex items-start gap-2 rounded-2xl bg-card px-3 py-2 text-sm font-semibold shadow-pop">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="flex-1">{STORAGE_TEXT[issue]}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setIssue(null)} className="p-1 text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
    </>
  );
}
