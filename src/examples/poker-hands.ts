/**
 * Texas Hold'em hand evaluation: the best five cards of seven, compared.
 *
 * Pure and dependency-free so it can be tested under `node --test`. Cards are
 * `{ r, s }`: rank 2–14 (14 is the ace) and suit 0–3 (♠ ♥ ♦ ♣).
 */

export interface Card {
  r: number;
  s: number;
}

export const CATEGORY = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
] as const;

export interface Hand {
  /** Comparable: higher is better, equal is a split. */
  score: number;
  /** Index into CATEGORY. */
  cat: number;
  /** Ranks that decide ties, most significant first. */
  ranks: number[];
  /** The five cards that make it. */
  cards: Card[];
}

const RANK_CHARS = "23456789TJQKA";
const SUIT_CHARS = "shdc";

/** "As" → ace of spades, "Td" → ten of diamonds. */
export function parse(code: string): Card {
  const r = RANK_CHARS.indexOf(code[0]?.toUpperCase() ?? "") + 2;
  const s = SUIT_CHARS.indexOf(code[1]?.toLowerCase() ?? "");
  if (r < 2 || s < 0 || code.length !== 2) throw new Error(`bad card: ${code}`);
  return { r, s };
}

export const cards = (codes: string): Card[] => codes.trim().split(/\s+/).map(parse);

export const code = (c: Card): string => `${RANK_CHARS[c.r - 2]}${SUIT_CHARS[c.s]}`;

const RANK_NAME = ["", "", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];
const plural = (r: number) => (r === 6 ? "Sixes" : `${RANK_NAME[r]}s`);

export function deck(): Card[] {
  const d: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return d;
}

export function shuffle<T>(a: T[], rnd: () => number = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Score exactly five cards. */
export function evaluate5(five: Card[]): Hand {
  const rs = five.map((c) => c.r).sort((a, b) => b - a);
  const flush = five.every((c) => c.s === five[0]!.s);
  const uniq = [...new Set(rs)];
  let straightTop = 0;
  if (uniq.length === 5) {
    if (rs[0]! - rs[4]! === 4) straightTop = rs[0]!;
    else if (rs[0] === 14 && rs[1] === 5) straightTop = 5; // the wheel, A-2-3-4-5
  }
  // Group by count, then rank: [[count, rank], …] most significant first.
  const counts = new Map<number, number>();
  for (const r of rs) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const byGroup = groups.map((g) => g[0]);
  let cat: number;
  let ranks: number[];
  if (straightTop && flush) [cat, ranks] = [8, [straightTop]];
  else if (groups[0]![1] === 4) [cat, ranks] = [7, byGroup];
  else if (groups[0]![1] === 3 && groups[1]![1] === 2) [cat, ranks] = [6, byGroup];
  else if (flush) [cat, ranks] = [5, rs];
  else if (straightTop) [cat, ranks] = [4, [straightTop]];
  else if (groups[0]![1] === 3) [cat, ranks] = [3, byGroup];
  else if (groups[0]![1] === 2 && groups[1]![1] === 2) [cat, ranks] = [2, byGroup];
  else if (groups[0]![1] === 2) [cat, ranks] = [1, byGroup];
  else [cat, ranks] = [0, rs];
  let score = cat;
  for (let i = 0; i < 5; i++) score = score * 15 + (ranks[i] ?? 0);
  return { score, cat, ranks, cards: five };
}

/** The best five-card hand from five to seven cards. */
export function best(all: Card[]): Hand {
  if (all.length < 5) throw new Error("need at least five cards");
  let top: Hand | null = null;
  const n = all.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const h = evaluate5([all[a]!, all[b]!, all[c]!, all[d]!, all[e]!]);
            if (!top || h.score > top.score) top = h;
          }
  return top!;
}

/** −1, 0 or 1, as `a` loses, splits or beats `b`. */
export function compare(a: Hand, b: Hand): number {
  return Math.sign(a.score - b.score);
}

/** "Two pair, Kings and Fives", "Straight, Ace high", "Royal flush". */
export function describe(h: Hand): string {
  const [a = 0, b = 0] = h.ranks;
  switch (h.cat) {
    case 8:
      return a === 14 ? "Royal flush" : `Straight flush, ${RANK_NAME[a]} high`;
    case 7:
      return `Four ${plural(a)}`;
    case 6:
      return `Full house, ${plural(a)} over ${plural(b)}`;
    case 5:
      return `Flush, ${RANK_NAME[a]} high`;
    case 4:
      return `Straight, ${RANK_NAME[a]} high`;
    case 3:
      return `Three ${plural(a)}`;
    case 2:
      return `Two pair, ${plural(a)} and ${plural(b)}`;
    case 1:
      return `Pair of ${plural(a)}`;
    default:
      return `${RANK_NAME[a]} high`;
  }
}

/**
 * Indices of the winners among `hands` (more than one is a split pot).
 */
export function winners(hands: Hand[]): number[] {
  const top = Math.max(...hands.map((h) => h.score));
  return hands.flatMap((h, i) => (h.score === top ? [i] : []));
}

/**
 * Monte Carlo equity: the share of pots `hole` wins (ties split) against
 * `opponents` random hands, with the board completed at random.
 */
export function equity(hole: Card[], board: Card[], opponents: number, trials = 200, rnd: () => number = Math.random): number {
  const known = new Set([...hole, ...board].map(code));
  const rest = deck().filter((c) => !known.has(code(c)));
  let won = 0;
  for (let t = 0; t < trials; t++) {
    // Partial shuffle: only as many cards as this trial needs.
    const need = 5 - board.length + opponents * 2;
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rnd() * (rest.length - i));
      [rest[i], rest[j]] = [rest[j]!, rest[i]!];
    }
    const full = [...board, ...rest.slice(0, 5 - board.length)];
    const mine = best([...hole, ...full]).score;
    let beat = false;
    let ties = 0;
    for (let o = 0; o < opponents; o++) {
      const at = 5 - board.length + o * 2;
      const theirs = best([rest[at]!, rest[at + 1]!, ...full]).score;
      if (theirs > mine) {
        beat = true;
        break;
      }
      if (theirs === mine) ties++;
    }
    if (!beat) won += 1 / (ties + 1);
  }
  return won / trials;
}
