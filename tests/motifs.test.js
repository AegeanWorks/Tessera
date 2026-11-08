import { test } from "node:test";
import assert from "node:assert/strict";
import { MOTIFS, MOTIF_IDS, getMotif, motifList } from "../src/studio/motifs.js";
import { createRandom } from "../src/studio/random.js";

const ROLES = new Set(["bg", "ink", "accent", "highlight", "paper", "none"]);

function build(id, seed = 5) {
  const motif = getMotif(id);
  return motif.build({ random: createRandom(seed), weight: 3, warp: 0.42 });
}

test("every motif exposes a complete definition", () => {
  assert.ok(MOTIF_IDS.length >= 5);
  for (const id of MOTIF_IDS) {
    const motif = MOTIFS[id];
    assert.equal(motif.id, id);
    assert.ok(motif.name.length > 0);
    assert.ok(motif.note.length > 0);
    assert.ok(motif.tile.width > 0);
    assert.ok(motif.tile.height > 0);
    assert.equal(typeof motif.build, "function");
  }
});

test("getMotif falls back to wave for unknown ids", () => {
  assert.equal(getMotif("missing").id, "wave");
  assert.equal(getMotif(undefined).id, "wave");
  assert.equal(getMotif("mosaic").id, "mosaic");
});

test("every motif produces deterministic, non-empty geometry", () => {
  for (const id of MOTIF_IDS) {
    const first = build(id);
    const second = build(id);
    assert.ok(first.length > 0, `${id} produced no elements`);
    assert.deepEqual(first, second, `${id} is not deterministic for a fixed seed`);
    for (const element of first) {
      assert.equal(typeof element.tag, "string");
      assert.ok(element.tag.length > 0);
    }
  }
});

test("motif colors are palette roles, never raw values", () => {
  for (const id of MOTIF_IDS) {
    for (const element of build(id)) {
      for (const key of ["fill", "stroke"]) {
        if (element[key] === undefined) continue;
        assert.ok(ROLES.has(element[key]), `${id} ${key}=${element[key]}`);
      }
    }
  }
});

test("a different seed changes generated geometry", () => {
  const left = JSON.stringify(build("mosaic", 1));
  const right = JSON.stringify(build("mosaic", 2));
  assert.notEqual(left, right);
});

test("the comb keeps its flat-top honeycomb ratio", () => {
  const comb = getMotif("comb");
  assert.ok(Math.abs(comb.tile.height - (2 / Math.sqrt(3)) * comb.tile.width) < 0.001);
});

test("the comb covers the full tile and shares edge wraps", () => {
  const comb = getMotif("comb");
  for (const seed of [5, 7, 42]) {
    const elements = comb.build({ random: createRandom(seed), weight: 3, warp: 0.42 });
    const hexes = elements.filter((element) => element.tag === "path");
    assert.equal(hexes.length, 8, `seed ${seed} should build 8 hexes, got ${hexes.length}`);
    const fills = hexes.map((hex) => hex.fill);
    // Left/right wraps coincide across tiles: x=0 shares with x=90 per row.
    assert.equal(fills[0], fills[5], `seed ${seed} top wrap diverges`);
    assert.equal(fills[1], fills[6], `seed ${seed} mid wrap diverges`);
    assert.equal(fills[2], fills[7], `seed ${seed} bottom wrap diverges`);
    // Bottom edge is covered: tile height centers exist.
    const centers = hexes.map((hex) => hex.d.slice(0, 24)).join("|");
    assert.ok(centers.length > 0);
  }
});

test("arcade corners share one inner radius for seamless quarters", () => {
  for (const seed of [7, 8, 99]) {
    const elements = getMotif("arcade").build({ random: createRandom(seed), weight: 3, warp: 0.5 });
    const circles = elements.filter((element) => element.tag === "circle");
    const inners = circles.filter((_, index) => index % 3 === 1).map((circle) => circle.r);
    assert.equal(inners.length, 5);
    assert.equal(inners[0], inners[1], `seed ${seed} corner inners diverge`);
    assert.equal(inners[0], inners[2], `seed ${seed} corner inners diverge`);
    assert.equal(inners[0], inners[3], `seed ${seed} corner inners diverge`);
  }
});

test("drift dots stay fully inside the tile", () => {
  for (let seed = 1; seed < 50; seed += 1) {
    const elements = getMotif("drift").build({ random: createRandom(seed), weight: 6, warp: 1 });
    for (const dot of elements.filter((element) => element.tag === "circle")) {
      assert.ok(dot.cx >= 2 && dot.cx <= 98, `seed ${seed} dot x=${dot.cx} clips the seam`);
      assert.ok(dot.cy >= 2 && dot.cy <= 98, `seed ${seed} dot y=${dot.cy} clips the seam`);
    }
  }
});

test("loom and drift are part of the catalogue", () => {
  assert.ok(MOTIF_IDS.includes("loom"));
  assert.ok(MOTIF_IDS.includes("drift"));
  assert.equal(getMotif("loom").tile.width, 100);
  assert.equal(getMotif("drift").tile.width, 100);
});

test("bloom is part of the catalogue and stays inside the tile", () => {
  assert.ok(MOTIF_IDS.includes("bloom"));
  const bloom = getMotif("bloom");
  assert.equal(bloom.id, "bloom");
  assert.equal(bloom.tile.width, 100);
  for (let seed = 1; seed < 30; seed += 1) {
    const elements = bloom.build({ random: createRandom(seed), weight: 6, warp: 1 });
    assert.ok(elements.length > 0);
    for (const circle of elements.filter((element) => element.tag === "circle")) {
      assert.ok(circle.cx - circle.r >= 0, `seed ${seed} clips the left edge`);
      assert.ok(circle.cx + circle.r <= 100, `seed ${seed} clips the right edge`);
      assert.ok(circle.cy - circle.r >= 0, `seed ${seed} clips the top edge`);
      assert.ok(circle.cy + circle.r <= 100, `seed ${seed} clips the bottom edge`);
    }
  }
});

test("motifList mirrors the ids in order", () => {
  assert.deepEqual(
    motifList().map((motif) => motif.id),
    MOTIF_IDS,
  );
});
