import { useCallback, useEffect, useState } from "react";

export const TUTORIAL_KEY = "purrzle.tutorial.v1";

/** Device-local onboarding, separate from puzzle progress and settings. */
export function useTutorial() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setOpen(localStorage.getItem(TUTORIAL_KEY) !== "done"); }
    catch { setOpen(true); }
  }, []);
  const complete = useCallback(() => {
    try { localStorage.setItem(TUTORIAL_KEY, "done"); } catch { /* Play remains available without storage. */ }
    setOpen(false);
  }, []);
  return { open, complete, replay: () => setOpen(true) };
}