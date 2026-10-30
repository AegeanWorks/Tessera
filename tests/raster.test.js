import { test } from "node:test";
import assert from "node:assert/strict";
import { RASTER_LIMITS, svgToPng } from "../src/studio/raster.js";

function fakeEnvironment(overrides = {}) {
  const calls = { draw: [], contexts: [], encodings: [], blob: null };
  const png = new Blob(["png"], { type: "image/png" });
  const context = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    drawImage(...args) {
      calls.draw.push(args);
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext(kind) {
      calls.contexts.push(kind);
      return context;
    },
    toBlob(callback, type) {
      calls.encodings.push({ type, width: this.width, height: this.height });
      callback(png);
    },
  };
  return {
    calls,
    context,
    png,
    environment: {
      createCanvas(width, height) {
        canvas.width = width;
        canvas.height = height;
        return canvas;
      },
      async loadImage(blob) {
        calls.blob = blob;
        return { source: true };
      },
      ...overrides,
    },
  };
}

test("svgToPng rasterizes the SVG at the requested size", async () => {
  const fake = fakeEnvironment();
  const result = await svgToPng("<svg/>", { width: 320, height: 200 }, fake.environment);

  assert.equal(result, fake.png);
  assert.equal(fake.calls.contexts[0], "2d");
  assert.deepEqual(fake.calls.encodings[0], {
    type: "image/png",
    width: 320,
    height: 200,
  });
  assert.deepEqual(fake.calls.draw[0], [{ source: true }, 0, 0, 320, 200]);
  assert.equal(fake.context.imageSmoothingEnabled, true);
  assert.equal(fake.context.imageSmoothingQuality, "high");
  assert.equal(fake.calls.blob.type, "image/svg+xml;charset=utf-8");
  assert.equal(await fake.calls.blob.text(), "<svg/>");
});

test("svgToPng rejects sizes outside the raster budget", async () => {
  const fake = fakeEnvironment();
  const invalid = [
    { width: 0, height: 200 },
    { width: 200, height: -1 },
    { width: 20.5, height: 200 },
    { width: RASTER_LIMITS.max + 1, height: 200 },
    { width: 4096, height: 8192 },
  ];
  for (const size of invalid) {
    await assert.rejects(
      () => svgToPng("<svg/>", size, fake.environment),
      RangeError,
      `${size.width}x${size.height} should be refused`,
    );
  }
});

test("svgToPng requires a canvas and an image loader", async () => {
  await assert.rejects(
    () => svgToPng("<svg/>", { width: 100, height: 100 }, {}),
    /canvas and an image loader/,
  );
});

test("svgToPng reports an unavailable 2D context", async () => {
  const environment = {
    createCanvas: () => ({ getContext: () => null, toBlob() {} }),
    loadImage: async () => ({}),
  };
  await assert.rejects(
    () => svgToPng("<svg/>", { width: 100, height: 100 }, environment),
    /2D canvas/,
  );
});

test("svgToPng reports a failed PNG encoding", async () => {
  const environment = {
    createCanvas: () => ({
      getContext: () => ({ drawImage() {}, imageSmoothingEnabled: false, imageSmoothingQuality: "low" }),
      toBlob(callback) {
        callback(null);
      },
    }),
    loadImage: async () => ({}),
  };
  await assert.rejects(
    () => svgToPng("<svg/>", { width: 100, height: 100 }, environment),
    /encode/,
  );
});

test("svgToPng propagates an image decode failure", async () => {
  const environment = {
    createCanvas: () => {
      throw new Error("should not create a canvas");
    },
    loadImage: async () => {
      throw new Error("The SVG could not be decoded.");
    },
  };
  await assert.rejects(
    () => svgToPng("<svg/>", { width: 100, height: 100 }, environment),
    /could not be decoded/,
  );
});
