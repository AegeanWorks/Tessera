import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const portArg = process.argv.indexOf("--port");
const port = portArg > -1 ? Number(process.argv[portArg + 1]) : 4174;
const openBrowserOnStart = process.argv.includes("--open");

export function browserCommand(platform, url) {
  if (platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }
  if (platform === "darwin") {
    return { command: "open", args: [url] };
  }
  return { command: "xdg-open", args: [url] };
}

export function looksLikeTessera(body) {
  return typeof body === "string" && body.includes("<title>Tessera");
}

export function launchBrowser(url, platform = process.platform, spawnProcess = spawn) {
  const { command, args } = browserCommand(platform, url);
  try {
    const child = spawnProcess(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", () => {});
    child.unref();
    return child;
  } catch {
    // The server still runs; the user can open the printed URL manually.
    return null;
  }
}

async function tesseraIsRunning(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok && looksLikeTessera(await response.text());
  } catch {
    return false;
  }
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export function safePath(urlPath = "/", base = root) {
  let clean;
  try {
    clean = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const relative =
    clean === "/" || clean === "" ? "index.html" : clean.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const candidate = normalize(join(base, relative));
  return candidate === base || candidate.startsWith(`${base}${sep}`) ? candidate : null;
}

const server = createServer(async (request, response) => {
  const filePath = safePath(request.url ?? "/");
  if (!filePath) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(filePath);
    const target = info.isDirectory() ? join(filePath, "index.html") : filePath;
    const body = await readFile(target);
    response.writeHead(200, {
      "Content-Type": types[extname(target)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  server.on("error", async (error) => {
    const url = `http://127.0.0.1:${port}/`;
    if (error.code === "EADDRINUSE") {
      if (openBrowserOnStart && (await tesseraIsRunning(url))) {
        console.log(`Tessera is already running at ${url}`);
        launchBrowser(url);
        return;
      }
      console.error(`Port ${port} is already in use, so Tessera did not start.`);
      console.error(`If the studio is already open, use ${url}.`);
      process.exitCode = 1;
      return;
    }
    console.error(`Tessera could not start: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log(`Tessera running at ${url}`);
    if (openBrowserOnStart) {
      launchBrowser(url);
    }
  });
}
