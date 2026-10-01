/**
 * **The poses an iPhone Duo can be in, and what each one means for an app.**
 *
 * This is the one place the explorer knows about the device. The emulator
 * draws from it, the examples read it, and the pose table in the side panel
 * is generated from it — so a pose cannot mean one thing to the picture and
 * another to the example running inside it.
 *
 * Facts here come from Apple's HIG page "Designing for iPhone Duo" (captured
 * 2026-09-12) and the checklist distilled from Apple's tech talks, both in
 * the apple-hig skill (.agents/skills/apple-hig/references/). Where the
 * explorer has to invent a number Apple has not published — the size of a
 * display in points — it says so beside the number.
 */

/** Which physical display is lit. The Duo has one outer and one inner. */
export type Display = "outer" | "inner";

/**
 * How the inner display is divided by the fold, as the viewer sees it.
 * `side-by-side`: the fold runs top to bottom (book). `stacked`: the fold runs
 * left to right (table / laptop). `none`: only the outer display is lit.
 */
export type Split = "side-by-side" | "stacked" | "none";

export type SizeClass = "compact" | "regular";

export const POSE_IDS = ["closed", "closed-landscape", "open", "open-portrait", "book", "table", "stand"] as const;
export type PoseId = (typeof POSE_IDS)[number];

export interface Pose {
  id: PoseId;
  /** What people call it. */
  label: string;
  /** One sentence on how the device is being held or rested. */
  holding: string;
  display: Display;
  split: Split;
  /**
   * Hinge angle in degrees: 0 is shut, 180 is flat. For partially folded
   * poses this is the default; the explorer lets you move it.
   */
  hinge: number;
  /** Whether the hinge slider applies. Only partially folded poses have a range. */
  adjustable: boolean;
  /** Size classes, from the HIG checklist §1: they drive layout, not the pose. */
  size: { width: SizeClass; height: SizeClass };
  /** Screen shape in the explorer's points. Apple has not published these; they are proportions. */
  points: { width: number; height: number };
}

/**
 * One leaf of the device, in explorer points. The outer display covers one
 * leaf; the inner display covers both. Apple publishes proportions in words
 * ("wider and shorter than other iPhone displays") rather than numbers, so
 * these are chosen to match the renders and press images, not measured.
 */
export const LEAF = { width: 300, height: 380 } as const;

export const POSES: Record<PoseId, Pose> = {
  closed: {
    id: "closed",
    label: "Closed",
    holding: "Shut, held in one hand like any iPhone. Only the outer display is on.",
    display: "outer",
    split: "none",
    hinge: 0,
    adjustable: false,
    size: { width: "compact", height: "regular" },
    points: { width: LEAF.width, height: LEAF.height },
  },
  "closed-landscape": {
    id: "closed-landscape",
    label: "Closed · landscape",
    holding: "Shut and turned on its side. Bars move to the trailing edge; overflow happens most here.",
    display: "outer",
    split: "none",
    hinge: 0,
    adjustable: false,
    size: { width: "compact", height: "compact" },
    points: { width: LEAF.height, height: LEAF.width },
  },
  open: {
    id: "open",
    label: "Open",
    holding: "Unfolded flat, held in two hands. One big display, the fold running top to bottom.",
    display: "inner",
    split: "side-by-side",
    hinge: 180,
    adjustable: false,
    size: { width: "regular", height: "regular" },
    points: { width: LEAF.width * 2, height: LEAF.height },
  },
  "open-portrait": {
    id: "open-portrait",
    label: "Open · portrait",
    holding: "Unfolded flat and turned tall. The fold runs across the middle; bars stay horizontal.",
    display: "inner",
    split: "stacked",
    hinge: 180,
    adjustable: false,
    size: { width: "regular", height: "regular" },
    points: { width: LEAF.height, height: LEAF.width * 2 },
  },
  book: {
    id: "book",
    label: "Book",
    holding: "Partly folded and held like a paperback, or stood on its edge. Two pages facing you.",
    display: "inner",
    split: "side-by-side",
    hinge: 120,
    adjustable: true,
    size: { width: "regular", height: "regular" },
    points: { width: LEAF.width * 2, height: LEAF.height },
  },
  table: {
    id: "table",
    label: "Table",
    holding: "Partly folded and set down like a tiny laptop: the bottom half flat on the table, the top half standing.",
    display: "inner",
    split: "stacked",
    hinge: 105,
    adjustable: true,
    size: { width: "regular", height: "regular" },
    points: { width: LEAF.height, height: LEAF.width * 2 },
  },
  stand: {
    id: "stand",
    label: "Standing",
    holding: "Partly open and stood on its edge on a table, like a greeting card: hands free, and the outer display faces whoever is across from you.",
    display: "inner",
    split: "side-by-side",
    hinge: 95,
    adjustable: true,
    size: { width: "regular", height: "regular" },
    points: { width: LEAF.width * 2, height: LEAF.height },
  },
};

export function pose(id: PoseId): Pose {
  return POSES[id];
}

export function isPoseId(value: unknown): value is PoseId {
  return typeof value === "string" && (POSE_IDS as readonly string[]).includes(value);
}

/** The hinge range the slider allows for a partially folded pose. */
export const HINGE_RANGE = { min: 30, max: 175 } as const;

export function clampHinge(angle: number): number {
  if (!Number.isFinite(angle)) return HINGE_RANGE.max;
  return Math.min(HINGE_RANGE.max, Math.max(HINGE_RANGE.min, Math.round(angle)));
}

/**
 * The reserved regions active in a pose (HIG, "Dynamic layouts and reserved
 * regions"). The fold is a *division*: active only while partly folded. The
 * outer camera is always there. The inner camera is an *occlusion*, active only
 * while it runs, so it is not listed here — an example that uses the camera
 * says so itself.
 */
export type RegionKind = "fold" | "outer-camera";

export function activeRegions(p: Pose, hinge = p.hinge): RegionKind[] {
  if (p.display === "outer") return ["outer-camera"];
  return hinge < 180 ? ["fold"] : [];
}

/**
 * The halves of the inner display, named for where they sit as seen:
 * `start`/`end` are left/right when the fold is vertical, top/bottom when it
 * is horizontal. Examples get one element per half and decide what goes in
 * each — which is the whole point of the device.
 */
export function halfNames(p: Pose): { start: string; end: string } | null {
  if (p.split === "side-by-side") return { start: "left", end: "right" };
  if (p.split === "stacked") return { start: "top", end: "bottom" };
  return null;
}
