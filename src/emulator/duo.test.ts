import { test } from "node:test";
import assert from "node:assert/strict";
import { transformsFor } from "./duo.ts";
import { POSES } from "../core/poses.ts";

const deg = (s: string) => Number(s.match(/(-?[\d.]+)deg/)?.[1]);

test("flat poses do not rotate either leaf", () => {
  for (const id of ["open", "open-portrait"] as const) {
    const t = transformsFor(POSES[id], 180);
    assert.equal(deg(t.start), 0, id);
    assert.equal(deg(t.end), 0, id);
  }
});

test("closed folds the first leaf fully over the second, so its back (the outer display) faces you", () => {
  assert.equal(Math.abs(deg(transformsFor(POSES.closed, 0).start)), 180);
  assert.equal(Math.abs(deg(transformsFor(POSES["closed-landscape"], 0).start)), 180);
});

test("the angle between the leaves is 180 minus the hinge, in book and table alike", () => {
  for (const id of ["book", "table"] as const) {
    for (const hinge of [30, 90, 120, 175]) {
      const t = transformsFor(POSES[id], hinge);
      const between = Math.abs(deg(t.start) - deg(t.end));
      assert.ok(Math.abs(between - (180 - hinge)) < 1e-9, `${id} at ${hinge}: ${between}`);
    }
  }
});

test("in table pose the base leans toward the viewer, so the bottom half stays usable", () => {
  const t = transformsFor(POSES.table, 105);
  assert.ok(deg(t.end) > 0 && deg(t.end) < 70, t.end);
});
