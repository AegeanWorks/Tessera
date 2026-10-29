import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPattern,
  elementMarkup,
  elementsMarkup,
  escapeXml,
  renderSvg,
} from "../src/studio/svg.js";
import { getPalette } from "../src/studio/palettes.js";
import { normalizeState } from "../src/studio/state.js";

const BASE = normalizeState({ motif: "wave", palette: "aegean", seed: 7 });

test("escapeXml escapes every markup-sensitive character", () => {
  assert.equal(escapeXml(`<a href="x">Tom & Jerry's</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;");
  assert.equal(escapeXml(42), "42");
});

test("elementMarkup resolves palette roles and formats numbers", () => {
  const palette = getPalette("kilim");
  const markup = elementMarkup(
    { tag: "rect", fill: "accent", stroke: "none", "stroke-width": 2.5, opacity: 0.5, hidden: false },
    palette,
  );
  assert.match(markup, /^<rect /);
  assert.ok(markup.includes(`fill="${palette.colors.accent}"`));
  assert.ok(markup.includes('stroke="none"'));
  assert.ok(markup.includes('stroke-width="2.5"'));
  assert.ok(!markup.includes("hidden"));
  assert.ok(markup.endsWith("/>"));
});

test("elementsMarkup joins every element without separators", () => {
  const palette = getPalette("riso");
  const markup = elementsMarkup(
    [
      { tag: "circle", cx: 1, cy: 2, r: 3, fill: "ink" },
      { tag: "path", d: "M0 0", stroke: "accent" },
    ],
    palette,
  );
  assert.equal((markup.match(/<circle/g) || []).length, 1);
  assert.equal((markup.match(/<path/g) || []).length, 1);
  assert.ok(markup.includes(palette.colors.ink));
  assert.ok(markup.includes(palette.colors.accent));
});

test("createPattern is deterministic for one state", () => {
  const first = createPattern(BASE);
  const second = createPattern(BASE);
  assert.deepEqual(first.elements, second.elements);
  assert.equal(first.state.seed, 7);
  assert.equal(first.motif.id, "wave");
  assert.equal(first.palette.id, "aegean");
});

test("renderSvg emits a self-contained, labelled SVG", () => {
  const svg = renderSvg(BASE);
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.endsWith("</svg>"));
  assert.ok(svg.includes('viewBox="0 0 1200 800"'));
  assert.ok(svg.includes('role="img"'));
  assert.ok(svg.includes("<title "));
  assert.ok(svg.includes("<desc "));
  assert.ok(svg.includes("<pattern "));
  assert.ok(svg.includes("</defs>"));
  assert.ok(!svg.includes("undefined"));
  assert.ok(!svg.includes("NaN"));
  assert.ok(!svg.includes("[object Object]"));
});

test("decorative renders omit their accessible names", () => {
  const svg = renderSvg(BASE, { decorative: true });
  assert.ok(svg.includes('role="presentation"'));
  assert.ok(svg.includes('aria-hidden="true"'));
  assert.ok(!svg.includes("<title"));
  assert.ok(!svg.includes("<desc"));
});

test("the same seed renders the same pattern; a new seed does not", () => {
  assert.equal(renderSvg(BASE), renderSvg(BASE));
  const reseeded = normalizeState({ ...BASE, seed: 8, motif: "mosaic" });
  assert.notEqual(renderSvg(normalizeState({ ...BASE, motif: "mosaic" })), renderSvg(reseeded));
});

test("tile guides are optional", () => {
  const without = renderSvg(BASE, { guides: false });
  const withGuides = renderSvg(BASE, { guides: true });
  assert.ok(!without.includes("stroke-dasharray"));
  assert.ok(withGuides.includes("stroke-dasharray"));
  assert.ok(withGuides.split("<line").length > without.split("<line").length);
});

test("the repeat option sets the pattern tile width", () => {
  const svg = renderSvg(BASE, { width: 1000, height: 500, repeat: 5 });
  assert.ok(svg.includes('width="1000" height="500"'));
  assert.ok(svg.includes('patternUnits="userSpaceOnUse" width="200"'));
});

test("custom ids keep two renders on one page apart", () => {
  const first = renderSvg(BASE, { idPrefix: "left" });
  const second = renderSvg(BASE, { idPrefix: "right" });
  assert.ok(first.includes('id="left-pattern"'));
  assert.ok(second.includes('id="right-pattern"'));
  assert.ok(!first.includes("right-pattern"));
});

test("user text is escaped inside the title and description", () => {
  const svg = renderSvg(BASE, {
    title: '<script>alert("x")</script>',
    description: "A & B < C",
  });
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"));
  assert.ok(svg.includes("A &amp; B &lt; C"));
});

test("palette roles never leak as raw paint values", () => {
  for (const motif of ["wave", "ridge", "comb", "pinwheel", "arcade", "mosaic"]) {
    for (const palette of ["aegean", "kilim", "riso", "nocturne", "sage", "ember"]) {
      const svg = renderSvg(normalizeState({ ...BASE, motif, palette }));
      for (const role of ["ink", "accent", "highlight", "paper", "bg"]) {
        assert.ok(!svg.includes(`fill="${role}"`), `${motif}/${palette} leaked fill ${role}`);
        assert.ok(!svg.includes(`stroke="${role}"`), `${motif}/${palette} leaked stroke ${role}`);
      }
    }
  }
});
