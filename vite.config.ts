// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

const BUILD_ID = String(Date.now());

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Prerendered root-only shell: the offline fallback that boots any route client-side.
    spa: { enabled: true, prerender: { outputPath: "/_shell.html", crawlLinks: false } },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "prompt",
        injectRegister: null,
        manifest: false, // public/manifest.webmanifest is the single manifest
        // Nitro deploys this directory, so the worker and its precache must live here too.
        outDir: ".output/public",
        devOptions: { enabled: false },
        filename: "sw.js",
        workbox: {
          globDirectory: ".output/public",
          globPatterns: ["**/*.{js,css,woff2,png,svg,ico,webmanifest}"],
          globIgnores: ["**/server/**", "**/*.woff"],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          navigateFallback: null,
          // The prerendered shell is versioned per build so it always matches the precached bundles.
          additionalManifestEntries: [{ url: "/_shell", revision: BUILD_ID }],
          runtimeCaching: [
            {
              // Page navigations: always the live server page; offline, the app shell boots the
              // requested route client-side. No per-URL HTML is stored, so dates never pile up.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                url.origin === self.location.origin &&
                !url.pathname.startsWith("/~oauth"),
              handler: "NetworkOnly",
              options: {
                plugins: [
                  {
                    handlerDidError: async () => {
                      const keys = await caches.keys();
                      for (const name of keys.filter((k) => k.includes("precache"))) {
                        const cache = await caches.open(name);
                        const hit = (await cache.keys()).find(
                          (r) => new URL(r.url).pathname === "/_shell",
                        );
                        if (hit) return (await cache.match(hit)) ?? Response.error();
                      }
                      return Response.error();
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
    ],
  },
});
