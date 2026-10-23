import { copyFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const webDirectory = resolve(".output/public");
const shell = resolve(webDirectory, "_shell.html");
const requiredFiles = [
  shell,
  resolve(webDirectory, "sw.js"),
  resolve(webDirectory, "manifest.webmanifest"),
];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch (error) {
    throw new Error(`Missing ${file}. Run the production build before preparing the Android app.`, {
      cause: error,
    });
  }
}

await copyFile(shell, resolve(webDirectory, "index.html"));
await copyFile(shell, resolve(webDirectory, "_shell"));
console.log("Prepared Capacitor entry page and offline app-shell fallback.");
