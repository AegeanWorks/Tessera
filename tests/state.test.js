import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  FLIPS,
  LIMITS,
  PRESETS,
  ROTATIONS,
  activePresetId,
  applyPreset,
  decodeSearch,
  describeState,
  encodeState,
  exportName,
  hasStateParams,
  normalizeState,
  presetState,
  randomizeState,
  reseedState,
  shareSummary,
  thumbKey,
  transformLabel,
} from "../src/studio/state.js";
import { createRandom } from "../src/studio/random.js";
import { MOTIF_IDS } from "../src/studio/motifs.js";
import { PALETTE_IDS } from "../src/studio/palettes.js";

test("normalizeState fills defaults for an empty record", () => {
  assert.deepEqual(normalizeState(), DEFAULTS);
  assert.deepEqual(normalizeState({}), DEFAULTS);
  assert.deepEqual(normalizeState(null), DEFAULTS);
});

test("normalizeState clamps every numeric field", () => {
  const low = normalizeState({ repeat: -20, weight: 0, warp: -4, seed: -9 });
  assert.equal(low.repeat, LIMITS.repeat.min);
  assert.equal(low.weight, LIMITS.weight.min);
  assert.equal(low.warp, LIMITS.warp.min);
  assert.equal(low.seed, LIMITS.seed.min);

  const high = normalizeState({ repeat: 90, weight: 40, warp: 300, seed: 99999 });
  assert.equal(high.repeat, LIMITS.repeat.max);
  assert.equal(high.weight, LIMITS.weight.max);
  assert.equal(high.warp, LIMITS.warp.max);
  assert.equal(high.seed, LIMITS.seed.max);

  const text = normalizeState({ repeat: "7.6", weight: "nope", warp: "33", seed: "12" });
  assert.equal(text.repeat, 8);
  assert.equal(text.weight, DEFAULTS.weight);
  assert.equal(text.warp, 33);
  assert.equal(text.seed, 12);
});

test("normalizeState refuses unknown motifs and palettes", () => {
  const state = normalizeState({ motif: "nope", palette: "nope" });
  assert.equal(state.motif, DEFAULTS.motif);
  assert.equal(state.palette, DEFAULTS.palette);
});

test("normalizeState accepts boolean spellings", () => {
  assert.equal(normalizeState({ guides: "1" }).guides, true);
  assert.equal(normalizeState({ guides: "true" }).guides, true);
  assert.equal(normalizeState({ guides: "on" }).guides, true);
  assert.equal(normalizeState({ guides: "0" }).guides, false);
  assert.equal(normalizeState({ guides: "false" }).guides, false);
  assert.equal(normalizeState({ guides: "off" }).guides, false);
  assert.equal(normalizeState({ guides: "maybe" }).guides, DEFAULTS.guides);
});

test("normalizeState accepts only known rotations and flips", () => {
  assert.equal(normalizeState({ rotate: "90" }).rotate, 90);
  assert.equal(normalizeState({ rotate: 270 }).rotate, 270);
  assert.equal(normalizeState({ rotate: 45 }).rotate, DEFAULTS.rotate);
  assert.equal(normalizeState({ rotate: "nope" }).rotate, DEFAULTS.rotate);
  assert.equal(normalizeState({ flip: "x" }).flip, "x");
  assert.equal(normalizeState({ flip: "y" }).flip, "y");
  assert.equal(normalizeState({ flip: "diagonal" }).flip, DEFAULTS.flip);
  assert.deepEqual(ROTATIONS, [0, 90, 180, 270]);
  assert.deepEqual(FLIPS, ["none", "x", "y"]);
});

test("sound is a normalized, shared preference", () => {
  assert.equal(normalizeState({}).sound, false);
  assert.equal(normalizeState({ sound: "1" }).sound, true);
  const preset = applyPreset("iris-drift", normalizeState({ sound: true }));
  assert.equal(preset.sound, true);
  assert.equal(decodeSearch(encodeState({ ...DEFAULTS, sound: true })).state.sound, true);
});

test("thumbKey changes with every field a motif picker previews", () => {
  const base = normalizeState(DEFAULTS);
  const key = thumbKey(base);
  for (const patch of [
    { palette: "kilim" },
    { seed: 99 },
    { weight: 6 },
    { warp: 90 },
    { rotate: 90 },
    { flip: "x" },
  ]) {
    assert.notEqual(thumbKey(normalizeState({ ...base, ...patch })), key, JSON.stringify(patch));
  }
  for (const patch of [
    { motif: "mosaic" },
    { repeat: 10 },
    { guides: true },
    { motion: true },
  ]) {
    assert.equal(thumbKey(normalizeState({ ...base, ...patch })), key, JSON.stringify(patch));
  }
  assert.equal(thumbKey({ ...base, seed: 99999 }), thumbKey({ ...base, seed: LIMITS.seed.max }));
});

test("encodeState round-trips through decodeSearch", () => {
  const state = normalizeState({
    motif: "mosaic",
    palette: "ember",
    repeat: 9,
    weight: 2,
    warp: 17,
    seed: 321,
    rotate: 270,
    flip: "y",
    guides: true,
    motion: true,
  });
  const query = encodeState(state);
  const decoded = decodeSearch(`?${query}`);
  assert.equal(decoded.hasState, true);
  assert.deepEqual(decoded.state, state);
  assert.equal(decodeSearch("?preset=kilim-ridge").preset, "kilim-ridge");
  assert.equal(hasStateParams("?preset=kilim-ridge"), false);
  assert.equal(hasStateParams("?motif=wave"), true);
});

test("decodeSearch reports the raw patch so callers can layer it", () => {
  const decoded = decodeSearch("?preset=sage-mosaic&guides=1&seed=42");
  assert.equal(decoded.preset, "sage-mosaic");
  assert.equal(decoded.hasState, true);
  assert.deepEqual(decoded.patch, { guides: "1", seed: "42" });
  assert.equal(decoded.state.motif, DEFAULTS.motif);
  assert.equal(decoded.state.seed, 42);
});

test("every preset resolves to a valid state", () => {
  assert.ok(PRESETS.length >= 4);
  for (const preset of PRESETS) {
    const state = presetState(preset.id);
    assert.ok(state, preset.id);
    assert.ok(MOTIF_IDS.includes(state.motif));
    assert.ok(PALETTE_IDS.includes(state.palette));
    assert.equal(presetState("missing"), null);
  }
});

test("every motif has a curated preset", () => {
  const covered = new Set(PRESETS.map((preset) => preset.state.motif));
  assert.deepEqual(MOTIF_IDS.filter((id) => !covered.has(id)), []);
});

test("bloom has a curated lagoon preset", () => {
  const preset = PRESETS.find((item) => item.id === "lagoon-bloom");
  assert.ok(preset);
  assert.equal(preset.state.motif, "bloom");
  assert.equal(preset.state.palette, "lagoon");
  assert.equal(presetState("lagoon-bloom").motif, "bloom");
  assert.equal(presetState("lagoon-bloom").palette, "lagoon");
});

test("activePresetId names the preset matching the visual state", () => {
  const preset = presetState("iris-drift");
  assert.equal(activePresetId(preset), "iris-drift");
  assert.equal(activePresetId({ ...preset, rotate: 90, flip: "x", guides: true, motion: true }), "iris-drift");
  assert.equal(activePresetId({ ...preset, seed: 1 }), null);
  assert.equal(activePresetId(normalizeState(DEFAULTS)), null);
});

test("applyPreset keeps personal toggles and transforms", () => {
  const current = normalizeState({ guides: true, motion: true, motif: "wave", rotate: 90, flip: "x" });
  const state = applyPreset("riso-comb", current);
  assert.equal(state.motif, "comb");
  assert.equal(state.palette, "riso");
  assert.equal(state.guides, true);
  assert.equal(state.motion, true);
  assert.equal(state.rotate, 90);
  assert.equal(state.flip, "x");
  assert.deepEqual(applyPreset("missing", current), current);
});

test("randomizeState stays in bounds and changes the motif", () => {
  const random = createRandom(3);
  let state = normalizeState(DEFAULTS);
  for (let index = 0; index < 20; index += 1) {
    const next = randomizeState(state, random);
    assert.ok(MOTIF_IDS.includes(next.motif));
    assert.ok(PALETTE_IDS.includes(next.palette));
    assert.ok(next.repeat >= LIMITS.repeat.min && next.repeat <= LIMITS.repeat.max);
    assert.ok(next.weight >= LIMITS.weight.min && next.weight <= LIMITS.weight.max);
    assert.ok(next.warp >= LIMITS.warp.min && next.warp <= LIMITS.warp.max);
    assert.ok(next.seed >= LIMITS.seed.min && next.seed <= LIMITS.seed.max);
    assert.ok(ROTATIONS.includes(next.rotate));
    assert.ok(FLIPS.includes(next.flip));
    state = next;
  }
});

test("randomizeState tries to leave the current motif and palette", () => {
  const fixed = createRandom(1);
  const alwaysZero = () => 0;
  const state = normalizeState({ motif: "wave", palette: "aegean" });
  const next = randomizeState(state, alwaysZero);
  assert.notEqual(next.motif, "wave");
  assert.notEqual(next.palette, "aegean");
  const seeded = randomizeState(state, fixed);
  assert.ok(MOTIF_IDS.includes(seeded.motif));
});

test("reseedState changes the seed and clamps it", () => {
  const base = normalizeState({ seed: 7 });
  const next = reseedState(base, () => 0);
  assert.notEqual(next.seed, 7);
  assert.equal(next.seed, LIMITS.seed.min);
  const unchanged = reseedState(base, () => 0.5);
  assert.ok(unchanged.seed >= LIMITS.seed.min && unchanged.seed <= LIMITS.seed.max);
});

test("exportName stays distinct across geometry that changes the render", () => {
  const base = normalizeState({ motif: "mosaic", palette: "sage", repeat: 5, weight: 2, warp: 72, seed: 13 });
  assert.notEqual(exportName(base), exportName({ ...base, weight: 6 }));
  assert.notEqual(exportName(base), exportName({ ...base, warp: 5 }));
  assert.notEqual(exportName(base), exportName({ ...base, repeat: 9 }));
  assert.notEqual(
    describeState(base),
    describeState({ ...base, weight: 6 }),
    "weight changes the render and must change the description",
  );
});
test("transformLabel names only the active rotation and flip", () => {
  assert.equal(transformLabel(DEFAULTS), "");
  assert.equal(transformLabel({ ...DEFAULTS, rotate: 90 }), "90°");
  assert.equal(transformLabel({ ...DEFAULTS, flip: "x" }), "Flip X");
  assert.equal(transformLabel({ ...DEFAULTS, flip: "y" }), "Flip Y");
  assert.equal(transformLabel({ ...DEFAULTS, rotate: 270, flip: "x" }), "270° · Flip X");
  assert.equal(transformLabel({ ...DEFAULTS, rotate: 45, flip: "diagonal" }), "");
});

test("shareSummary names the look a copied link restores", () => {
  assert.equal(shareSummary(DEFAULTS), "Aegean Wave · seed 7 · 6 repeats");
  assert.equal(
    shareSummary({ ...DEFAULTS, palette: "kilim", motif: "comb", seed: 42, repeat: 9, rotate: 90, flip: "y" }),
    "Kilim Comb · seed 42 · 9 repeats · 90° · Flip Y",
  );
});

test("describeState and exportName read from the normalized record", () => {
  const state = normalizeState({ palette: "kilim", motif: "ridge", repeat: 5, seed: 11 });
  assert.equal(describeState(state), "Kilim ridge, 5 repeats across, weight 3, warp 42%, seed 11");
  assert.equal(
    describeState(normalizeState({ ...state, rotate: 90, flip: "x" })),
    "Kilim ridge, 5 repeats across, weight 3, warp 42%, seed 11, rotated 90°, flipped horizontally",
  );
  assert.equal(
    describeState(normalizeState({ ...state, flip: "y" })),
    "Kilim ridge, 5 repeats across, weight 3, warp 42%, seed 11, flipped vertically",
  );
  assert.equal(exportName(state), "tessera-ridge-kilim-11-r5w3v42.svg");
  assert.equal(
    exportName(normalizeState({ ...state, rotate: 90, flip: "x" })),
    "tessera-ridge-kilim-11-r5w3v42-r90-fx.svg",
  );
  assert.equal(
    exportName(normalizeState({ ...state, flip: "y" })),
    "tessera-ridge-kilim-11-r5w3v42-fy.svg",
  );
  assert.equal(exportName({ motif: "nope", palette: "nope", seed: "bad" }), `tessera-${DEFAULTS.motif}-${DEFAULTS.palette}-${DEFAULTS.seed}-r6w3v42.svg`);
});
