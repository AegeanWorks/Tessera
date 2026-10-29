import { test } from "node:test";
import assert from "node:assert/strict";
import { PALETTES, PALETTE_IDS, getPalette, paletteColor, paletteList } from "../src/studio/palettes.js";

const ROLES = ["bg", "ink", "accent", "highlight", "paper"];

test("every palette defines the full role set as hex colors", () => {
  assert.ok(PALETTE_IDS.length >= 4);
  for (const id of PALETTE_IDS) {
    const palette = PALETTES[id];
    assert.equal(palette.id, id);
    assert.ok(palette.name.length > 0);
    assert.ok(palette.note.length > 0);
    for (const role of ROLES) {
      assert.match(palette.colors[role], /^#[0-9a-f]{6}$/i, `${id}.${role}`);
    }
  }
});

test("getPalette falls back to Aegean for unknown ids", () => {
  assert.equal(getPalette("missing").id, "aegean");
  assert.equal(getPalette(undefined).id, "aegean");
  assert.equal(getPalette("riso").id, "riso");
});

test("paletteColor resolves roles and falls back to ink", () => {
  const palette = getPalette("nocturne");
  assert.equal(paletteColor(palette, "accent"), palette.colors.accent);
  assert.equal(paletteColor(palette, "missing"), palette.colors.ink);
  assert.equal(paletteColor(null, "ink"), PALETTES.aegean.colors.ink);
});

test("paletteList mirrors the ids", () => {
  const ids = paletteList().map((palette) => palette.id);
  assert.deepEqual(ids, PALETTE_IDS);
});
