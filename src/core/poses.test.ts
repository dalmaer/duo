import { test } from "node:test";
import assert from "node:assert/strict";
import { POSES, POSE_IDS, activeRegions, clampHinge, halfNames, isPoseId, pose, LEAF } from "./poses.ts";

test("every pose id has a pose, and the record has no strays", () => {
  assert.deepEqual(Object.keys(POSES).sort(), [...POSE_IDS].sort());
  for (const id of POSE_IDS) assert.equal(POSES[id].id, id);
});

test("size classes follow the HIG checklist: outer portrait C/R, outer landscape C/C, inner R/R", () => {
  assert.deepEqual(pose("closed").size, { width: "compact", height: "regular" });
  assert.deepEqual(pose("closed-landscape").size, { width: "compact", height: "compact" });
  for (const id of ["open", "open-portrait", "book", "table", "stand"] as const) {
    assert.deepEqual(pose(id).size, { width: "regular", height: "regular" }, id);
  }
});

test("the inner display is two leaves, the outer one leaf", () => {
  assert.equal(pose("open").points.width, LEAF.width * 2);
  assert.equal(pose("table").points.height, LEAF.width * 2);
  assert.equal(pose("closed").points.width, LEAF.width);
});

test("only partly folded poses are adjustable, and only they have the fold active", () => {
  for (const p of Object.values(POSES)) {
    assert.equal(p.adjustable, p.hinge > 0 && p.hinge < 180, p.id);
    assert.equal(activeRegions(p).includes("fold"), p.adjustable, p.id);
  }
});

test("the outer camera is always reserved when closed", () => {
  assert.deepEqual(activeRegions(pose("closed")), ["outer-camera"]);
});

test("halves are named for how they sit", () => {
  assert.deepEqual(halfNames(pose("book")), { start: "left", end: "right" });
  assert.deepEqual(halfNames(pose("table")), { start: "top", end: "bottom" });
  assert.equal(halfNames(pose("closed")), null);
});

test("hinge clamps to the slider range and survives junk", () => {
  assert.equal(clampHinge(5), 30);
  assert.equal(clampHinge(400), 175);
  assert.equal(clampHinge(Number.NaN), 175);
  assert.equal(clampHinge(99.6), 100);
});

test("isPoseId", () => {
  assert.ok(isPoseId("table"));
  assert.ok(!isPoseId("tent"));
  assert.ok(!isPoseId(3));
});

test("standing is Apple's edge-standing pose: inner display, fold vertical, adjustable", () => {
  const p = pose("stand");
  assert.equal(p.display, "inner");
  assert.equal(p.split, "side-by-side");
  assert.ok(p.adjustable);
});
