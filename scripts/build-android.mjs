import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";
const gradle = resolve("android", isWindows ? "gradlew.bat" : "gradlew");
const apk = resolve("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const javaExecutable = isWindows ? "java.exe" : "java";

function javaMajorVersion(home) {
  const result = spawnSync(join(home, "bin", javaExecutable), ["-version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return null;

  const version = `${result.stdout}${result.stderr}`.match(/version "(?:1\.)?(\d+)/);
  return version ? Number(version[1]) : null;
}

const javaHomes = [
  process.env.ANDROID_STUDIO_JBR,
  process.env.JAVA_HOME,
  isWindows
    ? join(process.env.ProgramFiles ?? "C:\\Program Files", "Android", "Android Studio", "jbr")
    : "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
  "/opt/android-studio/jbr",
].filter(Boolean);
const javaHome = javaHomes.find((home) => javaMajorVersion(home) >= 21);
if (!javaHome) {
  throw new Error(
    "Capacitor Android builds require JDK 21. Set JAVA_HOME to a JDK 21 installation.",
  );
}

function run(command, args, { cwd = process.cwd(), shell = false, env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(npm, ["run", "build"], { shell: isWindows });
run(process.execPath, [resolve("scripts", "prepare-capacitor.mjs")]);
run(npm, ["exec", "--", "cap", "sync", "android"], { shell: isWindows });
run(gradle, ["assembleDebug"], {
  cwd: resolve("android"),
  env: { ...process.env, JAVA_HOME: javaHome },
  shell: isWindows,
});

try {
  await access(apk);
} catch (error) {
  throw new Error(`Android build finished without producing ${apk}.`, {
    cause: error,
  });
}

console.log(`Debug APK ready: ${apk}`);
