import test from "node:test";
import assert from "node:assert/strict";

import { HISTORY_LIMIT, pushHistory, stepBack, stepForward } from "../src/studio/history.js";

test("history keeps the newest snapshots up to the limit", () => {
  let past = [];
  for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) past = pushHistory(past, { seed: i });
  assert.equal(past.length, HISTORY_LIMIT);
  assert.deepEqual(past.at(-1), { seed: HISTORY_LIMIT + 4 });
  assert.deepEqual(past[0], { seed: 5 });
});

test("stepBack returns the previous state and moves the current one to redo", () => {
  const past = [{ seed: 1 }, { seed: 2 }];
  const step = stepBack(past, [], { seed: 3 });
  assert.ok(Object.isFrozen(step));
  assert.deepEqual(step.state, { seed: 2 });
  assert.deepEqual(step.past, [{ seed: 1 }]);
  assert.deepEqual(step.future, [{ seed: 3 }]);
  assert.deepEqual(past, [{ seed: 1 }, { seed: 2 }], "the input stack must stay untouched");
});

test("stepBack refuses an empty history", () => {
  assert.equal(stepBack([], [{ seed: 1 }], { seed: 2 }), null);
});

test("stepForward returns the redone state and moves the current one to undo", () => {
  const future = [{ seed: 3 }, { seed: 4 }];
  const step = stepForward([{ seed: 1 }], future, { seed: 2 });
  assert.ok(Object.isFrozen(step));
  assert.deepEqual(step.state, { seed: 3 });
  assert.deepEqual(step.past, [{ seed: 1 }, { seed: 2 }]);
  assert.deepEqual(step.future, [{ seed: 4 }]);
  assert.deepEqual(future, [{ seed: 3 }, { seed: 4 }], "the redo stack must stay untouched");
});

test("stepForward refuses an empty redo stack", () => {
  assert.equal(stepForward([{ seed: 1 }], [], { seed: 2 }), null);
});

test("undo and redo round-trip and keep both stacks capped", () => {
  let past = [];
  for (let i = 0; i < HISTORY_LIMIT; i += 1) past = pushHistory(past, { seed: i });
  const current = { seed: HISTORY_LIMIT };
  const back = stepBack(past, [], current);
  const forward = stepForward(back.past, back.future, back.state);
  assert.deepEqual(forward.state, current);
  assert.equal(forward.past.length, HISTORY_LIMIT);
  assert.equal(forward.future.length, 0);
});
