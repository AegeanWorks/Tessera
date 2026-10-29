import { test } from "node:test";
import assert from "node:assert/strict";
import { between, createRandom, integerBetween, pick, seedToInt } from "../src/studio/random.js";

test("a seed replays the same sequence", () => {
  const first = createRandom(42);
  const second = createRandom(42);
  const left = [first(), first(), first(), first(), first()];
  const right = [second(), second(), second(), second(), second()];
  assert.deepEqual(left, right);
});

test("different seeds diverge", () => {
  const first = createRandom(7);
  const second = createRandom(8);
  const left = [first(), first(), first()];
  const right = [second(), second(), second()];
  assert.notDeepEqual(left, right);
});

test("random values stay in the unit interval", () => {
  const random = createRandom(2026);
  for (let index = 0; index < 200; index += 1) {
    const value = random();
    assert.ok(value >= 0 && value < 1, `value ${value} left the unit interval`);
  }
});

test("seedToInt folds every input into a positive integer", () => {
  assert.equal(seedToInt(1), 1);
  assert.equal(seedToInt(0), 1000003);
  assert.equal(seedToInt(-4), 999999);
  assert.equal(seedToInt("12"), 12);
  assert.equal(seedToInt("nope"), 1);
  assert.equal(seedToInt(Number.NaN), 1);
  assert.equal(seedToInt(Infinity), 1);
});

test("pick always returns a member or undefined", () => {
  const list = ["a", "b", "c"];
  const random = createRandom(5);
  for (let index = 0; index < 50; index += 1) {
    assert.ok(list.includes(pick(list, random)));
  }
  assert.equal(pick([], random), undefined);
  assert.equal(pick(null, random), undefined);
});

test("integerBetween and between stay inside their bounds", () => {
  const random = createRandom(11);
  for (let index = 0; index < 100; index += 1) {
    const value = integerBetween(3, 10, random);
    assert.ok(Number.isInteger(value) && value >= 3 && value <= 10);
    const fraction = between(0, 1, random);
    assert.ok(fraction >= 0 && fraction <= 1);
  }
  assert.equal(integerBetween(4, 4, random), 4);
});
