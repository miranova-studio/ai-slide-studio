import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { readFileSync, statSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const port = Number(process.env.AI_SLIDE_STUDIO_PORT || 4173);
const url = `http://127.0.0.1:${port}/`;
const marker = "Frame — AI Slide Studio";
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ttf": "font/ttf", ".woff2": "font/woff2" };

async function runningApp() {
  try {
    const health = await fetch(`${url}__ai_slide_studio_health`, { signal: AbortSignal.timeout(1500) });
    if (health.ok && health.headers.get("content-type")?.includes("application/json")) {
      const data = await health.json();
      if (data.app === marker && data.root === root) return true;
      throw new Error(`ポート ${port} は別のアプリが使用中です。`);
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    const html = await response.text();
    if (response.ok && html.includes(marker)) return true;
    throw new Error(`ポート ${port} は別のアプリが使用中です。`);
  } catch (error) {
    if (error.message.includes("別のアプリ")) throw error;
    const occupied = await new Promise((done) => {
      const socket = createConnection({ host: "127.0.0.1", port });
      socket.setTimeout(1000);
      socket.once("connect", () => { socket.destroy(); done(true); });
      socket.once("error", () => done(false));
      socket.once("timeout", () => { socket.destroy(); done(false); });
    });
    if (occupied) throw new Error(`ポート ${port} は別のアプリが使用中です。`);
    return false;
  }
}

function newestFile(path) {
  if (!existsSync(path)) return 0;
  const stat = statSync(path);
  if (!stat.isDirectory()) return stat.mtimeMs;
  return Math.max(stat.mtimeMs, ...readdirSync(path).map((name) => newestFile(join(path, name))));
}

function needsBuild() {
  const built = join(dist, "index.html");
  if (!existsSync(built)) return true;
  const builtAt = statSync(built).mtimeMs;
  return ["src", "themes", "index.html", "package.json", "package-lock.json", "vite.config.ts", "tsconfig.json"].some((path) => newestFile(join(root, path)) > builtAt);
}

function serve() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || "/", url).pathname);
    if (pathname === "/__ai_slide_studio_health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ app: marker, root }));
      return;
    }
    const requested = resolve(dist, `.${pathname}`);
    const path = requested.startsWith(dist + sep) && existsSync(requested) && statSync(requested).isFile() ? requested : join(dist, "index.html");
    try {
      response.writeHead(200, { "content-type": mime[extname(path)] || "application/octet-stream" });
      response.end(readFileSync(path));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  server.listen(port, "127.0.0.1", () => console.log(`AI Slide Studio: ${url}`));
  server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
}

async function launch() {
  if (await runningApp()) {
    console.log(`起動済みの AI Slide Studio を開きます: ${url}`);
    spawnSync("open", [url]);
    return;
  }
  if (needsBuild()) {
    console.log("ビルドを更新しています…");
    const result = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
    if (result.status !== 0) throw new Error("ビルドに失敗しました。");
  }
  mkdirSync(join(root, ".local"), { recursive: true });
  const log = join(root, ".local", "launcher.log");
  const { openSync, closeSync } = await import("node:fs");
  const output = openSync(log, "a");
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--serve"], {
    cwd: root, env: process.env, detached: true, stdio: ["ignore", output, output],
  });
  child.unref();
  closeSync(output);
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((done) => setTimeout(done, 100));
    if (await runningApp()) {
      console.log(`AI Slide Studio を開きます: ${url}`);
      spawnSync("open", [url]);
      return;
    }
  }
  throw new Error(`起動を確認できませんでした。${log} を確認してください。`);
}

if (process.argv.includes("--serve")) serve();
else launch().catch((error) => { console.error(error.message); process.exitCode = 1; });
