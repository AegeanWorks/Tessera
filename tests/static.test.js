import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateStaticContract } from "../scripts/verify-static.mjs";

const INDEX = '<!DOCTYPE html><html><head><title>Tessera — demo</title><link rel="stylesheet" href="./src/site.css"></head><body><div id="stage"></div><script type="module" src="./src/app.js"></script></body></html>';

function fixture(t, files = {}) {
  const root = mkdtempSync(join(tmpdir(), "tessera-static-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const defaults = {
    "index.html": INDEX,
    "package.json": JSON.stringify({ name: "fixture", version: "1.2.3" }),
    LICENSE: "# Aegean License 1.1 (AL-1.1)\n",
    "src/app.js": "export const ready = true;\n",
    "src/site.css": "body { color: inherit; }\n",
  };
  for (const [relative, text] of Object.entries({ ...defaults, ...files })) {
    const target = join(root, relative);
    if (text === null) continue;
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, text);
  }
  return root;
}

function problemsFor(t, files) {
  return validateStaticContract(fixture(t, files));
}

test("a complete static build passes", (t) => {
  assert.deepEqual(validateStaticContract(fixture(t)), []);
});

test("a missing index is reported", (t) => {
  const root = fixture(t);
  rmSync(join(root, "index.html"));
  assert.deepEqual(validateStaticContract(root), ["index.html is missing"]);
});

test("a missing Tessera title is reported", (t) => {
  assert.ok(
    problemsFor(t, { "index.html": "<html><head><title>Other</title></head></html>" }).some((p) =>
      p.includes("Tessera title"),
    ),
  );
});

test("a missing or non-semver version is reported", (t) => {
  assert.ok(problemsFor(t, { "package.json": null }).some((p) => p.includes("package.json")));
  assert.ok(
    problemsFor(t, { "package.json": JSON.stringify({ version: "one" }) }).some((p) =>
      p.includes("semver"),
    ),
  );
});

test("a LICENSE that is not AL-1.1 is reported", (t) => {
  assert.ok(
    problemsFor(t, { LICENSE: "MIT License\n" }).some((p) => p.includes("AL-1.1")),
  );
  assert.ok(problemsFor(t, { LICENSE: null }).some((p) => p.includes("LICENSE is missing")));
});

test("external and non-portable references are reported", (t) => {
  const external = `<html><head><title>Tessera</title><script src="https://cdn.example.com/app.js"></script></head></html>`; // hygiene: allow test fixture proving external loads are refused
  assert.ok(problemsFor(t, { "index.html": external }).some((p) => p.includes("external resource")));
  const absolute = `<html><head><title>Tessera</title><script src="/src/app.js"></script></head></html>`;
  assert.ok(problemsFor(t, { "index.html": absolute }).some((p) => p.includes("non-portable")));
  const traversal = `<html><head><title>Tessera</title><script src="../src/app.js"></script></head></html>`;
  assert.ok(problemsFor(t, { "index.html": traversal }).some((p) => p.includes("non-portable")));
});

test("references to missing files and malformed escapes are reported", (t) => {
  assert.ok(
    problemsFor(t, { "src/app.js": null }).some((p) => p.includes("missing file: ./src/app.js")),
  );
  const malformed = `<html><head><title>Tessera</title><script src="./src/%E0%A4%A.js"></script></head></html>`;
  assert.ok(problemsFor(t, { "index.html": malformed }).some((p) => p.includes("malformed path")));
});

test("runtime code may not call the network or escape its frame", (t) => {
  for (const token of ["fetch(", "XMLHttpRequest", "WebSocket", "navigator.serviceWorker", "window.top", "window.parent", "top.location"]) {
    const problems = problemsFor(t, { "src/app.js": `export const x = "${token}";\n` });
    assert.ok(problems.some((p) => p.includes(token)), token);
  }
});

test("runtime code may not load remote assets", (t) => {
  assert.ok(
    // hygiene: allow test fixture proving remote script loads are refused
    problemsFor(t, { "src/app.js": 'export const x = "https://example.com/x.js";\n' }).some((p) =>
      p.includes("external URL"),
    ),
  );
  assert.ok(
    // hygiene: allow test fixture proving remote stylesheet imports are refused
    problemsFor(t, { "src/site.css": '@import url("https://example.com/font.css");\n' }).some((p) =>
      p.includes("external stylesheet"),
    ),
  );
});

test("the SVG XML namespace is the only allowed absolute URL", (t) => {
  assert.deepEqual(
    problemsFor(t, {
      "src/app.js": 'export const ns = "http://www.w3.org/2000/svg";\n',
    }),
    [],
  );
});

test("a missing src directory is reported instead of throwing", (t) => {
  const root = fixture(t, { "src/app.js": null, "src/site.css": null });
  rmSync(join(root, "src"), { recursive: true, force: true });
  const problems = validateStaticContract(root);
  assert.ok(problems.some((p) => p.includes("src/ is missing")));
});
