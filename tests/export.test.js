import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_EXPORT_SIZE,
  EXPORT_SIZES,
  exportSize,
  pngName,
  renderExportSvg,
} from "../src/studio/export.js";
import { RASTER_LIMITS } from "../src/studio/raster.js";

test("export sizes are unique, frozen and inside the raster limits", () => {
  assert.ok(EXPORT_SIZES.length >= 5, `only ${EXPORT_SIZES.length} export sizes`);
  const ids = new Set();
  for (const size of EXPORT_SIZES) {
    assert.ok(Object.isFrozen(size), `${size.id} is not frozen`);
    assert.ok(!ids.has(size.id), `duplicate size ${size.id}`);
    ids.add(size.id);
    assert.match(size.label, /[A-Za-z]/);
    assert.ok(Number.isInteger(size.width), `${size.id} width is not an integer`);
    assert.ok(Number.isInteger(size.height), `${size.id} height is not an integer`);
    assert.ok(size.width >= RASTER_LIMITS.min && size.width <= RASTER_LIMITS.max, `${size.id} width`);
    assert.ok(size.height >= RASTER_LIMITS.min && size.height <= RASTER_LIMITS.max, `${size.id} height`);
    assert.ok(
      size.width * size.height <= RASTER_LIMITS.maxPixels,
      `${size.id} exceeds the pixel ceiling`,
    );
  }
  assert.ok(ids.has(DEFAULT_EXPORT_SIZE), "the default size is not in the table");
});

test("exportSize returns a known size and falls back to the default", () => {
  assert.equal(exportSize("phone").id, "phone");
  assert.equal(exportSize("missing").id, DEFAULT_EXPORT_SIZE);
  assert.equal(exportSize().id, DEFAULT_EXPORT_SIZE);
  assert.equal(exportSize(null).id, DEFAULT_EXPORT_SIZE);
});

test("pngName carries the look, the seed and the pixel size", () => {
  assert.equal(
    pngName({ motif: "wave", palette: "aegean", seed: 7 }, "wallpaper"),
    "tessera-wave-aegean-7-2560x1440.png",
  );
  const name = pngName({ motif: "unknown", palette: "unknown", seed: 99999 }, "phone");
  assert.equal(name, "tessera-wave-aegean-9999-1170x2532.png");
});

test("renderExportSvg uses the selected size and the current repeat", () => {
  const svg = renderExportSvg(
    { motif: "mosaic", palette: "sage", repeat: 4, weight: 2, warp: 50, seed: 13 },
    "phone",
  );
  assert.ok(svg.includes('width="1170" height="2532"'));
  assert.ok(svg.includes('viewBox="0 0 1170 2532"'));
  assert.ok(svg.includes('patternUnits="userSpaceOnUse" width="292.5"'));
  assert.ok(svg.includes('role="img"'));
});
