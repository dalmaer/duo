import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { frontMatter, isPhaseFile, metaOf, problems } from "./roadmap.ts";

test("front matter: quoted, bare and numeric values", () => {
  const raw = `---\nstatus: built\nsince: 2026-09-30\nissue: 4\nnote: "a: colon, and \\"quotes\\""\n---\n# X`;
  assert.deepEqual(frontMatter(raw), { status: "built", since: "2026-09-30", issue: 4, note: 'a: colon, and "quotes"' });
});

test("a phase with no verdict says what is missing", () => {
  const p = problems(metaOf("---\nstatus: nope\n---\n# X"), "# X");
  assert.equal(p.length, 4);
  assert.match(p[0]!, /no status/);
});

test("every phase on disk has a verdict and a Done when", async () => {
  const dir = join(import.meta.dirname, "..", "docs", "phases");
  for (const f of (await readdir(dir)).filter(isPhaseFile)) {
    const raw = await readFile(join(dir, f), "utf8");
    assert.deepEqual(problems(metaOf(raw), raw), [], f);
  }
});

test("phase files are numbered, and numbers are unique", async () => {
  const dir = join(import.meta.dirname, "..", "docs", "phases");
  const nums = (await readdir(dir)).filter(isPhaseFile).map((f) => f.split("-")[0]);
  for (const n of nums) assert.match(n!, /^\d+$/);
  assert.equal(new Set(nums).size, nums.length);
});
