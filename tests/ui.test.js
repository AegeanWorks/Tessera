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
    "stage-transform",
    "stage-effects",
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
    "clear-gallery",
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

test("the motif picker previews every visual change", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("thumbKey(state)"), "the app should key motif previews to the visual state");
  assert.ok(app.includes("scheduleMotifThumbs()"), "visual changes should refresh the motif previews");
  assert.ok(app.includes("requestAnimationFrame"), "preview refreshes should coalesce into one frame");
});

test("the gallery marks the saved look currently on stage", () => {
  const app = read("src/ui/app.js");
  const styles = read("src/styles.css");
  assert.ok(app.includes("activeEntryId"));
  assert.ok(app.includes('aria-current'));
  assert.ok(app.includes("syncGallerySelection()"));
  assert.match(styles, /\.gallery-item\.is-active \.gallery-open/);
});

test("gallery save warns when the oldest look is evicted", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("evictionCandidate"));
  assert.ok(app.includes("Removed the oldest look"));
});

test("gallery persistence failures are reported", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("const persisted = saveGallery"));
  assert.ok(app.includes("for this session only"));
});

test("clipboard fallback restores keyboard focus", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("previousFocus"));
  assert.ok(app.includes("preventScroll: true"));
});

test("copy link names the state it shares", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("shareSummary"));
  assert.ok(app.includes("Share link copied:"));
});

test("deleting a saved look keeps keyboard focus in the gallery", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("neighborEntryId"));
  assert.match(app, /\(focusTarget \|\| saveLookButton\)\?\.focus\(\)/);
});

test("the gallery offers a confirmed clear-all action", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="clear-gallery"'));
  assert.ok(html.includes('data-ui="clear-gallery"'));
  assert.ok(app.includes("clearGallery(storage())"));
  assert.ok(app.includes("Confirm clear all"));
  assert.ok(app.includes("clearAllLooks"));
});

test("keyboard shortcuts are wired without hijacking form fields", () => {
  const app = read("src/ui/app.js");
  for (const key of ['key === "r"', 'key === "c"', 'key === "e"', 'key === "p"', 'key === "s"', 'key === "l"']) {
    assert.ok(app.includes(key));
  }
  assert.ok(app.includes("isContentEditable"));
  assert.ok(app.includes("isTextEntry"));
  assert.ok(app.includes('"TEXTAREA"'));
  assert.ok(app.includes('"SELECT"'));
  assert.ok(app.includes("target.type"));
  assert.ok(!app.includes('"BUTTON"'), "a focused button must not swallow studio shortcuts");
});

test("control cards size to their content in the two-column layout", () => {
  const styles = read("src/styles.css");
  assert.match(styles, /\.controls\s*\{[^}]*align-items:\s*start/, "stretched cards leave blank space");
});

test("muted microcopy meets AA contrast on the darkest panel", () => {
  const theme = read("src/theme.css");
  const token = (name) => {
    const match = theme.match(new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, "i"));
    assert.ok(match, `missing --${name}`);
    return [0, 2, 4].map((start) => parseInt(match[1].slice(start, start + 2), 16));
  };
  const linear = (value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (rgb) => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
  const contrast = (a, b) => {
    const one = luminance(a);
    const two = luminance(b);
    return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
  };
  assert.ok(contrast(token("muted-dim"), token("bg-control")) >= 4.5);
});

test("coarse pointers get 44px targets", () => {
  const styles = read("src/styles.css");
  const coarse = styles.slice(styles.indexOf("@media (pointer: coarse)"));
  assert.ok(coarse && coarse !== styles, "missing coarse-pointer block");
  assert.match(coarse, /\.btn-small\s*\{[^}]*min-height:\s*44px/);
  assert.match(coarse, /select\s*\{[^}]*min-height:\s*44px/);
  assert.match(coarse, /input\[type="range"\]\s*\{[^}]*height:\s*44px/);
  assert.match(coarse, /\.gallery-delete\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/);
});

test("preset buttons show a visual preview", () => {
  const app = read("src/ui/app.js");
  const styles = read("src/styles.css");
  assert.ok(app.includes("preset-thumb"));
  assert.ok(app.includes("presetState(preset.id)"));
  assert.match(styles, /\.preset-thumb\s*\{/);
});

test("the preset rail marks the active preset", () => {
  const app = read("src/ui/app.js");
  const styles = read("src/styles.css");
  assert.ok(app.includes("activePresetId"));
  assert.ok(app.includes('aria-current'));
  assert.match(styles, /\.preset-button\.is-active\s*\{/);
});

test("the stage badge shows the active transform", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="stage-transform"'));
  assert.ok(app.includes("transformLabel"));
  assert.ok(app.includes("stageTransform"));
});

test("the stage surfaces active tile guides and glow drift", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="stage-effects"'));
  assert.ok(html.includes('data-effect="guides"'));
  assert.ok(html.includes('data-effect="motion"'));
  assert.ok(app.includes("stageEffects"));
  assert.ok(app.includes('stage.dataset.guides'));
});

test("reset names the pattern and reports storage failures", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes(">Reset pattern</button>"));
  assert.ok(app.includes("const persisted = clearState(storage())"));
  assert.ok(app.includes("Reset the pattern to its defaults."));
});

test("the skip link lands keyboard focus in the studio", () => {
  const html = read("index.html");
  const styles = read("src/styles.css");
  assert.match(html, /<main class="studio" id="studio" tabindex="-1">/);
  assert.match(styles, /\.studio:focus-visible\s*\{/);
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
