import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStaticContract } from "../scripts/verify-static.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function read(relative) {
  return readFileSync(join(ROOT, relative), "utf8");
}

test("the shipped studio satisfies the static embed contract", () => {
  assert.deepEqual(validateStaticContract(ROOT), []);
});

test("index.html is a semantic, single-screen studio", () => {
  const html = read("index.html");
  assert.match(html, /<title>Tessera — a seamless pattern studio<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{40,}">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<link rel="icon" href="\.\/src\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(html, /<script type="module" src="\.\/src\/ui\/app\.js"><\/script>/);
  assert.ok(html.includes('href="./src/theme.css"'));
  assert.ok(html.includes('href="./src/styles.css"'));
  assert.ok(html.includes('<a class="skip-link" href="#studio">'));
  assert.ok(html.includes("<noscript>"));
  assert.ok(html.includes('id="stage"'));
  assert.ok(html.includes('data-panel="stage"'));
  assert.ok(html.includes('data-cue="pattern-updated"'));
  assert.ok(html.includes('data-panel="controls"'));
  assert.ok(html.includes('role="img"') === false, "the stage is built at runtime");
});

test("every control in the markup is addressable and labelled", () => {
  const html = read("index.html");
  for (const id of [
    "randomize",
    "copy",
    "export",
    "motif-grid",
    "palette-grid",
    "repeat",
    "weight",
    "warp",
    "rotate",
    "flip",
    "repeat-value",
    "weight-value",
    "warp-value",
    "seed-value",
    "new-seed",
    "motion",
    "guides",
    "preset-list",
    "reset",
    "png-size",
    "export-png",
    "save-look",
    "copy-link",
    "gallery-list",
    "toast",
  ]) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
  for (const id of ["repeat", "weight", "warp"]) {
    assert.match(html, new RegExp(`<label class="range-row" for="${id}"`));
  }
  assert.match(html, /<label class="select-label" for="png-size">/);
  assert.match(html, /<label class="select-label" for="rotate">/);
  assert.match(html, /<label class="select-label" for="flip">/);
  assert.match(html, /<option value="90">90°<\/option>/);
  assert.match(html, /<option value="y">Vertical<\/option>/);
  assert.ok(html.includes("<output id=\"repeat-value\" for=\"repeat\">"));
  assert.ok(html.includes("<output id=\"weight-value\" for=\"weight\">"));
  assert.ok(html.includes("<output id=\"warp-value\" for=\"warp\">"));
  assert.ok(html.includes('aria-label="Motif"'));
  assert.ok(html.includes('aria-label="Palette"'));
});

test("data-ui, data-panel and data-cue identifiers stay unique", () => {
  const html = read("index.html");
  const seen = new Set();
  for (const match of html.matchAll(/data-(ui|panel|cue)="([^"]+)"/g)) {
    const key = `${match[1]}:${match[2]}`;
    assert.ok(!seen.has(key), `duplicate ${key}`);
    seen.add(key);
  }
  assert.ok(seen.size >= 14, `only ${seen.size} inventory identifiers`);
});

test("the displayed version matches package.json", () => {
  const version = JSON.parse(read("package.json")).version;
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.ok(read("index.html").includes(`<span id="version">${version}</span>`));
});

test("the app imports only local studio modules", () => {
  const app = read("src/ui/app.js");
  for (const specifier of app.matchAll(/from "([^"]+)"/g)) {
    assert.match(specifier[1], /^\.\.\/studio\/[a-z]+\.js$/, `unexpected import ${specifier[1]}`);
  }
  assert.ok(app.includes("renderSvg(state"));
  assert.ok(app.includes("randomizeState"));
  assert.ok(app.includes("requestFullscreen") === false);
  assert.ok(app.includes('setAttribute("aria-pressed"'));
  assert.ok(app.includes("navigator.clipboard"));
  assert.ok(app.includes("URL.createObjectURL"));
  assert.ok(app.includes("localStorage"));
  assert.ok(app.includes("svgToPng("));
  assert.ok(app.includes("createImageBitmap"));
  assert.ok(app.includes("renderExportSvg("));
  assert.ok(app.includes("saveLook("));
  assert.ok(app.includes("copyLink("));
  assert.ok(app.includes("renderGallery("));
  assert.ok(app.includes("loadGallery("));
  assert.ok(app.includes("rotateInput"));
  assert.ok(app.includes("flipInput"));
  assert.ok(app.includes("bindSelect("));
});

test("keyboard shortcuts are wired without hijacking form fields", () => {
  const app = read("src/ui/app.js");
  for (const key of ['key === "r"', 'key === "c"', 'key === "e"', 'key === "p"', 'key === "s"', 'key === "l"']) {
    assert.ok(app.includes(key));
  }
  assert.ok(app.includes("isContentEditable"));
  assert.ok(app.includes('["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes'));
});

test("theme.css is the only stylesheet with raw color values", () => {
  const styles = read("src/styles.css");
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(styles), "styles.css should use theme tokens");
  const theme = read("src/theme.css");
  assert.ok(theme.includes("--bg:"));
  assert.ok(theme.includes("--focus:"));
  assert.ok(theme.includes("color-scheme: dark"));
});

test("the studio honours reduced motion and coarse pointers", () => {
  const styles = read("src/styles.css");
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(styles.includes("animation: none"));
  assert.ok(styles.includes("min-height: 44px"));
});

test("the favicon is a local, self-contained SVG", () => {
  const icon = read("src/favicon.svg");
  assert.ok(icon.startsWith("<svg"));
  const urls = [...icon.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((match) => match[0]);
  for (const url of urls) {
    assert.ok(url.includes("www.w3.org"), `unexpected external URL ${url}`);
  }
});
