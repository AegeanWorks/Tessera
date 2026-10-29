import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  clearState,
  loadState,
  saveState,
} from "../src/studio/storage.js";
import { normalizeState } from "../src/studio/state.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

const BROKEN = {
  getItem() {
    throw new Error("denied");
  },
  setItem() {
    throw new Error("denied");
  },
  removeItem() {
    throw new Error("denied");
  },
};

test("a saved state loads back normalized", () => {
  const storage = memoryStorage();
  const state = normalizeState({ motif: "mosaic", palette: "sage", repeat: 8, seed: 44, guides: true });
  assert.equal(saveState(storage, state), true);
  assert.deepEqual(loadState(storage), state);
  const raw = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(raw.version, STORAGE_VERSION);
  assert.ok(raw.saved_at);
});

test("saving normalizes what it stores", () => {
  const storage = memoryStorage();
  saveState(storage, { motif: "nope", palette: "nope", repeat: 999, seed: -4 });
  const loaded = loadState(storage);
  assert.equal(loaded.motif, "wave");
  assert.equal(loaded.palette, "aegean");
  assert.equal(loaded.repeat, 10);
  assert.equal(loaded.seed, 1);
});

test("a missing, corrupt or older record is ignored", () => {
  const storage = memoryStorage();
  assert.equal(loadState(storage), null);
  storage.setItem(STORAGE_KEY, "{oops");
  assert.equal(loadState(storage), null);
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, state: { motif: "wave" } }));
  assert.equal(loadState(storage), null);
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION }));
  assert.equal(loadState(storage), null);
});

test("clearState removes the record and tolerates a hostile store", () => {
  const storage = memoryStorage();
  saveState(storage, normalizeState({}));
  assert.equal(clearState(storage), true);
  assert.equal(loadState(storage), null);
  assert.equal(loadState(null), null);
  assert.equal(saveState(null, normalizeState({})), false);
  assert.equal(clearState(null), false);
});

test("a storage that throws never crashes the studio", () => {
  assert.equal(loadState(BROKEN), null);
  assert.equal(saveState(BROKEN, normalizeState({})), false);
  assert.equal(clearState(BROKEN), false);
});
