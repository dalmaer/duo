import { test } from "node:test";
import assert from "node:assert/strict";
import { EXAMPLES } from "./index.ts";
import { CATEGORIES } from "../core/example.ts";
import { POSE_IDS, isPoseId } from "../core/poses.ts";

test("example ids are unique URL slugs", () => {
  const ids = EXAMPLES.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

test("every example names a real category and best pose, and says what it does there", () => {
  for (const e of EXAMPLES) {
    assert.ok((CATEGORIES as readonly string[]).includes(e.category), e.id);
    assert.ok(isPoseId(e.bestPose), e.id);
    assert.ok(e.poses[e.bestPose], `${e.id} must describe its best pose`);
    for (const k of Object.keys(e.poses)) assert.ok((POSE_IDS as readonly string[]).includes(k), `${e.id}: ${k}`);
  }
});

test("credits link somewhere", () => {
  for (const e of EXAMPLES) for (const c of e.credits ?? []) assert.match(c.url, /^https:\/\//, `${e.id}: ${c.who}`);
});
