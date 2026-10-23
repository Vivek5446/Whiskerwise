// The only place the app-shell service worker is registered.

const SW_URL = "/sw.js";
export const UPDATE_EVENT = "purrzle-update-ready";
let applyUpdate: (() => void) | null = null;

function refusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = location.hostname;
  const under = (d: string) => h === d || h.endsWith(`.${d}`);
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (under("lovableproject.com") || under("lovableproject-dev.com") || under("beta.lovable.dev")) return true;
  return new URLSearchParams(location.search).get("sw") === "off";
}

async function unregisterAppWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.filter((r) => [r.active, r.waiting, r.installing].some((w) => w?.scriptURL.endsWith(SW_URL))).map((r) => r.unregister()),
  );
}

/** Older builds stored one HTML copy per page; the shell replaces them. Progress lives elsewhere. */
async function dropLegacyPageCache() {
  if ("caches" in window) await caches.delete("purrzle-pages").catch(() => false);
}

export async function registerPurrzleWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (refusedContext()) {
    await unregisterAppWorkers().catch(() => {});
    return;
  }
  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox(SW_URL, { scope: "/" });
    wb.addEventListener("waiting", () => {
      applyUpdate = () => {
        wb.addEventListener("controlling", () => location.reload());
        wb.messageSkipWaiting();
      };
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    });
    await wb.register();
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
        setTimeout(resolve, 5000);
      });
    }
    void dropLegacyPageCache();
  } catch (error) {
    // Install failures leave the online game fully working.
    console.warn("Offline mode unavailable", error);
  }
}

export function applyPendingUpdate() {
  applyUpdate?.();
}
