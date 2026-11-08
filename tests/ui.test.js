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
    "export-status",
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
  assert.ok(app.includes("readGallery("));
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

test("deleting a saved look asks for a second press", () => {
  const app = read("src/ui/app.js");
  const styles = read("src/styles.css");
  const arm = app.slice(app.indexOf("function armDelete"), app.indexOf("function deleteLook"));
  assert.ok(arm.includes("deleteArmedId === id"));
  assert.ok(arm.includes("deleteLook(id)"));
  assert.ok(arm.includes("Press delete again to remove"));
  assert.ok(app.includes('remove.addEventListener("click", () => armDelete(entry.id))'));
  assert.ok(styles.includes(".gallery-delete.is-armed"));
});

test("range drags persist once", () => {
  const app = read("src/ui/app.js");
  const bindRange = app.slice(app.indexOf("function bindRange"), app.indexOf("function bindSwitch"));
  assert.match(bindRange, /addEventListener\("input"[\s\S]*?update\(\{ persist: false, url: false \}\)/);
  assert.match(bindRange, /addEventListener\("change"[\s\S]*?commitHistory\(\);\s*update\(\)/);
});

test("saved looks can be renamed", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("startRename"));
  assert.ok(app.includes("galleryRename"));
  assert.ok(app.includes("renameEntry"));
  assert.ok(app.includes("mergeEntry"));
});

test("renaming a saved look returns focus to its row", () => {
  const app = read("src/ui/app.js");
  const css = read("src/styles.css");
  const rename = app.slice(app.indexOf("function startRename"), app.indexOf("function deleteLook"));
  assert.ok(rename.includes("function focusGalleryRename"));
  assert.equal(rename.match(/focusGalleryRename\(id\)/g)?.length, 3);
  assert.ok(css.includes(".gallery-rename:focus-visible"));
});

test("an empty saved-look name is refused with a message", () => {
  const app = read("src/ui/app.js");
  const styles = read("src/styles.css");
  const rename = app.slice(app.indexOf("function startRename"), app.indexOf("function focusGalleryRename"));
  assert.ok(rename.includes("gallery-rename-error"));
  assert.ok(rename.includes("error.hidden = true"));
  assert.ok(rename.includes("error.hidden = false"));
  assert.ok(rename.includes('aria-invalid'));
  assert.ok(rename.includes("Enter a name for this look."));
  assert.ok(styles.includes(".gallery-rename-error"));
});

test("the gallery can be backed up and restored", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="backup-gallery"'));
  assert.ok(html.includes('id="restore-gallery"'));
  assert.ok(html.includes('id="restore-file"'));
  assert.ok(app.includes("backupGallery"));
  assert.ok(app.includes("restoreGallery"));
  assert.ok(app.includes("tessera-looks.json"));
  assert.ok(app.includes("normalizeGalleryRecord"));
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

test("the keyboard reference meets the coarse pointer target", () => {
  const styles = read("src/styles.css");
  const coarse = styles.slice(styles.indexOf("@media (pointer: coarse)"));
  assert.ok(coarse && coarse !== styles, "missing coarse-pointer block");
  assert.match(coarse, /\.shortcuts summary\s*\{[^}]*min-height:\s*44px/);
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

test("reduced motion skips the settle", () => {
  const app = read("src/ui/app.js");
  assert.match(app, /function settleStage\(\)\s*\{[^}]*prefersReducedMotion\(\)/);
});

test("discrete look changes settle the stage", () => {
  const app = read("src/ui/app.js");
  const styles = read("src/styles.css");
  assert.ok(app.includes("settleStage"));
  assert.ok(app.includes('classList.add("is-settling")'));
  assert.match(styles, /@keyframes tessera-settle/);
  assert.match(styles, /\.stage\.is-settling svg\s*\{[^}]*animation:\s*tessera-settle/);
});

test("the stage badge shows the active transform", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="stage-transform"'));
  assert.ok(app.includes("transformLabel"));
  assert.ok(app.includes("stageTransform"));
});

test("the stage badge labels repeat and seed", () => {
  const html = read("index.html");
  assert.match(html, /class="stage-badge-prefix">r</);
  assert.match(html, /class="stage-badge-prefix">s</);
  assert.ok(html.includes('id="stage-repeat"'));
  assert.ok(html.includes('id="stage-seed"'));
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

test("sound cues are optional and synthesized", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="sound"'));
  assert.ok(html.includes("Sound cues"));
  assert.ok(app.includes("function cue("));
  assert.ok(app.includes("AudioContext"));
  assert.ok(app.includes('cue("select")'));
  assert.ok(app.includes('cue("save")'));
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

test("PNG export keeps a last-export status", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="export-status"'));
  assert.ok(app.includes("exportStatus"));
  assert.ok(app.includes("Last export:"));
});

test("picker grids support roving arrow navigation", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="motif-grid" role="group" aria-label="Motif" data-columns="3"'));
  assert.ok(html.includes('id="palette-grid" role="group" aria-label="Palette" data-columns="2"'));
  assert.ok(app.includes("bindGridNavigation"));
  assert.ok(app.includes("gridTargetIndex"));
  assert.ok(app.includes(".tabIndex"));
});

test("the preset rail supports vertical arrow navigation", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="preset-list" role="group" aria-label="Presets" data-columns="1"'));
  assert.ok(app.includes("bindGridNavigation(presetList)"));
  assert.ok(app.includes("rovingIndex"));
});

test("gallery rows support roving arrow navigation", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("bindGalleryNavigation"));
  assert.ok(app.includes("galleryRovingId"));
  assert.ok(app.includes(".gallery-open"));
  assert.ok(app.includes(".gallery-delete"));
});

test("320px layout keeps preset names and topbar actions readable", () => {
  const styles = read("src/styles.css");
  const narrow = styles.slice(styles.indexOf("@media (max-width: 360px)"));
  assert.ok(narrow && narrow !== styles, "missing 360px layout block");
  assert.match(narrow, /\.topbar-actions \.btn\s*\{[^}]*font-size:\s*12px/);
  assert.match(narrow, /\.preset-button\s*\{[^}]*grid-template-columns:\s*44px/);
  assert.match(narrow, /\.preset-name\s*\{[^}]*white-space:\s*normal/);
  assert.match(narrow, /\.gallery-name\s*\{[^}]*white-space:\s*normal/);
});

test("external gallery sync keeps keyboard focus", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("focusId"));
  assert.ok(app.includes("galleryDelete"));
  assert.ok(app.includes("target.focus"));
  assert.ok(app.includes("saveLookButton?.focus"));
});

test("an external gallery update keeps an open rename draft", () => {
  const app = read("src/ui/app.js");
  const sync = app.slice(app.indexOf("function bindStorageSync"), app.indexOf("function bindReducedMotion"));
  assert.ok(sync.includes("gallery-rename-input"));
  assert.ok(sync.includes("renameDraft"));
  assert.ok(sync.includes("startRename(renameDraft.id)"));
  assert.ok(app.includes("dataset.galleryRenameId"));
});

test("other tabs update this one through storage events", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes('addEventListener("storage"'));
  assert.ok(app.includes("STORAGE_KEY"));
  assert.ok(app.includes("GALLERY_KEY"));
  assert.ok(app.includes("Settings updated from another tab"));
  assert.ok(app.includes("Saved looks updated from another tab"));
});

test("a refused settings record is surfaced", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("readState"));
  assert.ok(app.includes("stateIssue"));
  assert.ok(app.includes("stateReadFailed"));
  assert.ok(app.includes("Saved settings could not be read"));
});

test("a refused gallery record is surfaced in the gallery", () => {
  const app = read("src/ui/app.js");
  assert.ok(app.includes("readGallery"));
  assert.ok(app.includes("galleryIssue"));
  assert.ok(app.includes("Saved looks could not be read"));
});

test("the studio exposes a complete keyboard reference", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.ok(html.includes('id="shortcuts"'));
  assert.ok(html.includes("Keyboard shortcuts"));
  for (const label of [
    "Randomize",
    "Copy SVG",
    "Export SVG",
    "Download PNG",
    "Save look",
    "Copy link",
    "Undo",
    "Redo",
    "Move within",
    "Home",
    "Enter",
    "Close",
  ]) {
    assert.ok(html.includes(label), `missing ${label}`);
  }
  assert.ok(app.includes('key === "?"'));
  assert.ok(app.includes('key === "escape"'));
  assert.ok(app.includes("toggleShortcuts"));
});

test("reduced motion announces a paused glow", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  const styles = read("src/styles.css");
  assert.ok(html.includes('id="motion-note"'));
  assert.ok(html.includes("Glow drift is paused by your system's reduced-motion setting."));
  assert.ok(app.includes("prefers-reduced-motion: reduce"));
  assert.ok(app.includes("Glow paused"));
  assert.match(styles, /\.motion-note\s*\{[^}]*border-left/);
});

test("pattern changes can be undone and redone", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.match(html, /id="undo"[^>]*aria-keyshortcuts="Control\+Z Meta\+Z"[^>]*disabled/);
  assert.match(html, /id="redo"[^>]*aria-keyshortcuts="Control\+Shift\+Z Meta\+Shift\+Z"[^>]*disabled/);
  assert.ok(app.includes("commitHistory"));
  assert.ok(app.includes("stepBack"));
  assert.ok(app.includes("stepForward"));
});

test("pattern changes warn when the browser rejects storage writes", () => {
  const html = read("index.html");
  const app = read("src/ui/app.js");
  assert.match(
    html,
    /id="storage-note"[^>]*hidden[^>]*>Browser storage is unavailable, so pattern changes last for this session only\.</,
  );
  assert.ok(app.includes("storageNote"));
  assert.ok(app.includes("syncStorageNote"));
  assert.ok(app.includes("saveState(storage(), state)"));
  assert.ok(app.includes("Browser storage is unavailable, so pattern changes last for this session only."));
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

test("forced-colors mode keeps switch and selection cues", () => {
  const styles = read("src/styles.css");
  const forced = styles.slice(styles.indexOf("@media (forced-colors: active)"));
  assert.ok(forced.includes(".switch-track"));
  assert.ok(forced.includes("Highlight"));
  assert.ok(forced.includes(".preset-button.is-active"));
  assert.ok(forced.includes(".gallery-item.is-active .gallery-open"));
});

test("printing shows the pattern without the studio chrome", () => {
  const styles = read("src/styles.css");
  const theme = read("src/theme.css");
  const print = styles.slice(styles.indexOf("@media print"));
  assert.ok(print.includes(".controls"));
  assert.ok(print.includes("display: none"));
  assert.ok(print.includes("print-color-adjust: exact"));
  assert.ok(print.includes("aspect-ratio"));
  assert.ok(theme.includes("--print-bg"));
  assert.ok(theme.includes("--print-ink"));
});

test("the favicon is a local, self-contained SVG", () => {
  const icon = read("src/favicon.svg");
  assert.ok(icon.startsWith("<svg"));
  const urls = [...icon.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((match) => match[0]);
  for (const url of urls) {
    assert.ok(url.includes("www.w3.org"), `unexpected external URL ${url}`);
  }
});
