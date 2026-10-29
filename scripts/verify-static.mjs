import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const FORBIDDEN = [
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "navigator.serviceWorker",
  "window.top",
  "window.parent",
  "top.location",
];
const RUNTIME_EXTENSIONS = new Set([".js", ".mjs", ".css"]);

function listFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listFiles(path));
    } else {
      found.push(path);
    }
  }
  return found.sort();
}

function isLocalReference(reference) {
  if (reference.startsWith("data:") || reference.startsWith("#") || reference.startsWith("mailto:")) {
    return true;
  }
  if (reference.startsWith("http://") || reference.startsWith("https://")) return false;
  if (reference.startsWith("/") || reference.split("/").includes("..")) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(reference);
}

export function validateStaticContract(root = ROOT) {
  const problems = [];
  const index = join(root, "index.html");
  let indexText = "";
  try {
    indexText = readFileSync(index, "utf8");
  } catch {
    return ["index.html is missing"];
  }
  if (!indexText.includes("<title>Tessera")) {
    problems.push("index.html needs a Tessera title");
  }
  let version = "";
  try {
    version = String(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version || "");
  } catch {
    problems.push("package.json is missing or unreadable");
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    problems.push("package.json needs a semver version");
  }
  try {
    const header = readFileSync(join(root, "LICENSE"), "utf8").split(/\r?\n/, 1)[0];
    if (!header.startsWith("# Aegean License 1.1")) {
      problems.push("LICENSE is not the AL-1.1 text");
    }
  } catch {
    problems.push("LICENSE is missing");
  }

  for (const reference of indexText.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)) {
    const value = reference[1];
    if (value.startsWith("data:") || value.startsWith("#") || value.startsWith("mailto:")) continue;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      if (!value.includes("www.w3.org")) {
        problems.push(`index.html loads an external resource: ${value}`);
      }
      continue;
    }
    if (!isLocalReference(value)) {
      problems.push(`index.html uses a non-portable path: ${value}`);
      continue;
    }
    let target;
    try {
      target = join(root, decodeURIComponent(value.split(/[?#]/, 1)[0]));
    } catch {
      problems.push(`index.html has a malformed path: ${value}`);
      continue;
    }
    try {
      if (!statSync(target).isFile()) throw new Error("not a file");
    } catch {
      problems.push(`index.html references a missing file: ${value}`);
    }
  }

  const src = join(root, "src");
  if (!statSync(src, { throwIfNoEntry: false })?.isDirectory()) {
    return [...problems, "src/ is missing"];
  }
  for (const path of listFiles(src)) {
    if (!RUNTIME_EXTENSIONS.has(path.slice(path.lastIndexOf(".")))) continue;
    const text = readFileSync(path, "utf8");
    const relativePath = relative(root, path).replaceAll("\\", "/");
    for (const token of FORBIDDEN) {
      if (text.includes(token)) {
        problems.push(`${relativePath} uses ${token}; the website build must stay static`);
      }
    }
    for (const url of text.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
      if (!url[0].includes("www.w3.org")) {
        problems.push(`${relativePath} loads an external URL: ${url[0]}`);
      }
    }
    if (path.endsWith(".css") && /@import|url\(\s*['"]?https?:\/\//.test(text)) {
      problems.push(`${relativePath} imports an external stylesheet`);
    }
  }
  return problems;
}

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const problems = validateStaticContract(ROOT);
  if (problems.length) {
    console.error(`[FAIL] ${problems.length} static-contract problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  } else {
    console.log("[OK] Tessera satisfies the static embed contract.");
  }
}
