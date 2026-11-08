import { test } from "node:test";
import assert from "node:assert/strict";
import { gridTargetIndex } from "../src/studio/navigation.js";

test("gridTargetIndex moves within the motif and palette rows", () => {
  assert.equal(gridTargetIndex(0, 3, 8, "ArrowRight"), 1);
  assert.equal(gridTargetIndex(1, 3, 8, "ArrowLeft"), 0);
  assert.equal(gridTargetIndex(2, 3, 8, "ArrowRight"), null);
  assert.equal(gridTargetIndex(3, 3, 8, "ArrowLeft"), null);
  assert.equal(gridTargetIndex(1, 3, 8, "ArrowDown"), 4);
  assert.equal(gridTargetIndex(4, 3, 8, "ArrowUp"), 1);
  assert.equal(gridTargetIndex(7, 3, 8, "ArrowDown"), null);
  assert.equal(gridTargetIndex(6, 3, 8, "ArrowRight"), 7);
});

test("gridTargetIndex supports a one-column preset rail", () => {
  assert.equal(gridTargetIndex(2, 1, 8, "ArrowDown"), 3);
  assert.equal(gridTargetIndex(2, 1, 8, "ArrowUp"), 1);
  assert.equal(gridTargetIndex(2, 1, 8, "ArrowRight"), null);
  assert.equal(gridTargetIndex(2, 1, 8, "ArrowLeft"), null);
  assert.equal(gridTargetIndex(7, 1, 8, "ArrowDown"), null);
});

test("gridTargetIndex supports Home and End", () => {
  assert.equal(gridTargetIndex(5, 2, 8, "Home"), 0);
  assert.equal(gridTargetIndex(0, 2, 8, "End"), 7);
  assert.equal(gridTargetIndex(3, 2, 8, "ArrowLeft"), 2);
  assert.equal(gridTargetIndex(2, 2, 8, "ArrowRight"), 3);
});

test("gridTargetIndex refuses invalid geometry and unrelated keys", () => {
  assert.equal(gridTargetIndex(-1, 3, 8, "ArrowRight"), null);
  assert.equal(gridTargetIndex(8, 3, 8, "ArrowRight"), null);
  assert.equal(gridTargetIndex(0, 0, 8, "ArrowRight"), null);
  assert.equal(gridTargetIndex(0, 3, 0, "ArrowRight"), null);
  assert.equal(gridTargetIndex(0, 3, 8, "Enter"), null);
  assert.equal(gridTargetIndex(0, 3, 8, "Tab"), null);
});
