import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GALLERY_LIMIT,
  GALLERY_VERSION,
  addEntry,
  emptyGallery,
  entryName,
  isSaved,
  normalizeEntry,
  normalizeGalleryRecord,
  removeEntry,
  restoreEntry,
  stateSignature,
} from "../src/studio/gallery.js";
import { normalizeState } from "../src/studio/state.js";

const LOOK = normalizeState({
  motif: "mosaic",
  palette: "sage",
  repeat: 5,
  weight: 2,
  warp: 72,
  seed: 13,
});

test("a visual signature ignores guides and motion but keeps transforms", () => {
  const one = normalizeState({ ...LOOK, guides: true, motion: true });
  const two = normalizeState({ ...LOOK, guides: false, motion: false });
  assert.equal(stateSignature(one), stateSignature(two));
  assert.notEqual(stateSignature(one), stateSignature({ ...LOOK, seed: 14 }));
  assert.notEqual(stateSignature(one), stateSignature({ ...LOOK, weight: 3 }));
  assert.notEqual(stateSignature(one), stateSignature({ ...LOOK, rotate: 90 }));
  assert.notEqual(stateSignature(one), stateSignature({ ...LOOK, flip: "x" }));
});

test("entryName names the palette, the motif, the seed and any transform", () => {
  assert.equal(entryName(LOOK), "Sage Mosaic · seed 13");
  assert.equal(entryName({ ...LOOK, rotate: 90, flip: "x" }), "Sage Mosaic · seed 13 · 90° X");
  assert.equal(entryName({ motif: "nope", palette: "nope", seed: 99999 }), "Aegean Wave · seed 9999");
});

test("normalizeEntry keeps only visual state and freezes the record", () => {
  const entry = normalizeEntry({ state: { ...LOOK, guides: true, motion: true }, savedAt: "2026-10-30T00:00:00.000Z" });
  assert.equal(entry.id, stateSignature(LOOK));
  assert.equal(entry.name, "Sage Mosaic · seed 13");
  assert.equal(entry.savedAt, "2026-10-30T00:00:00.000Z");
  assert.deepEqual(Object.keys(entry.state).sort(), [
    "flip",
    "motif",
    "palette",
    "repeat",
    "rotate",
    "seed",
    "warp",
    "weight",
  ]);
  assert.ok(Object.isFrozen(entry));
  assert.ok(Object.isFrozen(entry.state));
  assert.equal(normalizeEntry(null), null);
  assert.equal(normalizeEntry({}), null);
  assert.equal(normalizeEntry({ state: "nope" }), null);
  assert.equal(normalizeEntry({ state: [] }), null);
});

test("addEntry puts the newest look first and collapses a duplicate", () => {
  const first = addEntry(emptyGallery(), LOOK, "2026-10-30T00:00:00.000Z");
  assert.equal(first.version, GALLERY_VERSION);
  assert.equal(first.entries.length, 1);
  assert.equal(first.entries[0].id, stateSignature(LOOK));
  assert.equal(isSaved(first, LOOK), true);

  const other = addEntry(first, { ...LOOK, motif: "wave", palette: "kilim" }, "2026-10-30T00:01:00.000Z");
  assert.equal(other.entries.length, 2);
  assert.equal(other.entries[0].name, "Kilim Wave · seed 13");

  const again = addEntry(other, LOOK, "2026-10-30T00:02:00.000Z");
  assert.equal(again.entries.length, 2);
  assert.equal(again.entries[0].id, stateSignature(LOOK));
  assert.equal(again.entries[0].savedAt, "2026-10-30T00:02:00.000Z");
  assert.equal(again.entries[1].name, "Kilim Wave · seed 13");
});

test("the gallery keeps at most twelve looks, newest first", () => {
  let gallery = emptyGallery();
  for (let seed = 1; seed <= GALLERY_LIMIT + 3; seed += 1) {
    gallery = addEntry(gallery, { ...LOOK, seed }, `2026-10-30T00:00:${String(seed).padStart(2, "0")}.000Z`);
  }
  assert.equal(gallery.entries.length, GALLERY_LIMIT);
  assert.equal(gallery.entries[0].state.seed, GALLERY_LIMIT + 3);
  assert.ok(!gallery.entries.some((entry) => entry.state.seed === 1));
});

test("normalizeGalleryRecord drops junk, duplicates and overflow", () => {
  const entries = [
    { state: LOOK },
    { state: LOOK },
    { state: { ...LOOK, seed: 99 } },
    null,
    { state: "nope" },
    { state: { motif: "wave" } },
  ];
  const record = normalizeGalleryRecord({ version: 999, entries });
  assert.equal(record.version, GALLERY_VERSION);
  assert.equal(record.entries.length, 3);
  assert.deepEqual(record.entries.map((entry) => entry.state.seed), [13, 99, 7]);
  assert.deepEqual(normalizeGalleryRecord(null).entries, []);
  assert.deepEqual(normalizeGalleryRecord({ entries: "nope" }).entries, []);
});

test("removeEntry drops one look and leaves the rest in order", () => {
  const one = addEntry(emptyGallery(), LOOK, "2026-10-30T00:00:00.000Z");
  const two = addEntry(one, { ...LOOK, motif: "wave" }, "2026-10-30T00:01:00.000Z");
  const removed = removeEntry(two, stateSignature(LOOK));
  assert.equal(removed.entries.length, 1);
  assert.equal(removed.entries[0].name, "Sage Wave · seed 13");
  assert.deepEqual(removeEntry(removed, "missing").entries, removed.entries);
});

test("restoreEntry brings back the look and keeps the current toggles", () => {
  const current = normalizeState({ ...LOOK, motif: "comb", guides: true, motion: true });
  const restored = restoreEntry(
    normalizeEntry({ state: { ...LOOK, seed: 42, rotate: 90, flip: "y" } }),
    current,
  );
  assert.equal(restored.motif, "mosaic");
  assert.equal(restored.seed, 42);
  assert.equal(restored.rotate, 90);
  assert.equal(restored.flip, "y");
  assert.equal(restored.guides, true);
  assert.equal(restored.motion, true);
  assert.deepEqual(restoreEntry(null, current), current);
});
