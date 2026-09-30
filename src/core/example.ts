/**
 * **What an example is.**
 *
 * An example is one idea for the iPhone Duo — a cajón you play on the bottom
 * half, a Battleship case, a Walkman — written so the explorer can run it in
 * every pose and explain what it does in each.
 *
 * The contract is deliberately small. The emulator owns three screen elements
 * (the outer display and the two halves of the inner one) and never replaces
 * them; the example owns what is drawn inside. When the pose or hinge changes,
 * the example is told and redraws from its own state. That is Apple's
 * continuity rule made structural: state lives in the example, not in the
 * screens, so opening and closing cannot lose it (HIG, "Displays, poses, and
 * continuity").
 */

import type { Pose, PoseId } from "./poses.ts";

export const CATEGORIES = ["music", "games", "retro", "productivity", "learning", "patterns"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  music: "Music",
  games: "Games",
  retro: "Retro",
  productivity: "Productivity",
  learning: "Learning",
  patterns: "Patterns",
};

/** One sentence per category, shown above its examples. */
export const CATEGORY_BLURB: Record<Category, string> = {
  music: "Instruments and players that use the fold as a stand: play below, see it above.",
  games: "Games where folding is a move, the hinge is a controller, or each half has a job.",
  retro: "Old folding and clamshell objects, redrawn: Walkmans, handhelds, field guides.",
  productivity: "Reading, drawing and working, where two facing pages are the point.",
  learning: "Folding to hide, unfolding to reveal.",
  patterns: "Apple's own adaptations — list/detail, controls-below — shown plainly.",
};

/** The three displays an example can draw into. They persist for the example's life. */
export interface Screens {
  /** The outer display, lit only when closed. */
  outer: HTMLElement;
  /** The first half of the inner display: left in book/open, top in table/open-portrait. */
  start: HTMLElement;
  /** The second half: right in book/open, bottom in table/open-portrait. */
  end: HTMLElement;
}

export interface DuoState {
  pose: Pose;
  /** Current hinge angle in degrees: 0 shut, 180 flat. */
  hinge: number;
}

export interface Instance {
  /** The pose changed. Redraw from your own state; keep that state. */
  render(state: DuoState): void;
  /** The hinge moved within a partially folded pose. Optional: most examples only care about the pose. */
  hinge?(state: DuoState): void;
  /** Stop timers, audio and listeners. The screens are emptied by the emulator. */
  destroy(): void;
}

export interface Credit {
  /** Who, as they call themselves, e.g. "@viditb". */
  who: string;
  url: string;
  /** What of theirs this draws on, in a few words. */
  what: string;
}

export interface Example {
  /** URL slug. */
  id: string;
  title: string;
  category: Category;
  /** One or two sentences: the idea. */
  summary: string;
  /** The pose it is at its best in; the explorer opens it there. */
  bestPose: PoseId;
  /** What happens in each pose, in a sentence. Poses left out do the obvious thing, and the panel says so. */
  poses: Partial<Record<PoseId, string>>;
  /** Where the idea came from. Every example drawn from someone's post or repo credits it. */
  credits?: Credit[];
  /** The HIG principle this example shows off, in a sentence, for the side panel. */
  principle?: string;
  create(screens: Screens, state: DuoState): Instance;
}
