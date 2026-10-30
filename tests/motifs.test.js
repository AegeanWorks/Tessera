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

test("loom and drift are part of the catalogue", () => {
  assert.ok(MOTIF_IDS.includes("loom"));
  assert.ok(MOTIF_IDS.includes("drift"));
  assert.equal(getMotif("loom").tile.width, 100);
  assert.equal(getMotif("drift").tile.width, 100);
});

test("motifList mirrors the ids in order", () => {
  assert.deepEqual(
    motifList().map((motif) => motif.id),
    MOTIF_IDS,
  );
});
