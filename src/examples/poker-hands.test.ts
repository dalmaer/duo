import { test } from "node:test";
import assert from "node:assert/strict";
import { best, cards, compare, describe, equity, evaluate5, winners } from "./poker-hands.ts";

const hand = (codes: string) => best(cards(codes));

test("every category is recognised", () => {
  const cases: [string, string][] = [
    ["As Ks Qs Js Ts", "Royal flush"],
    ["9h 8h 7h 6h 5h", "Straight flush, Nine high"],
    ["7c 7d 7h 7s 2d", "Four Sevens"],
    ["Kc Kd Kh 4s 4d", "Full house, Kings over Fours"],
    ["Ad Jd 8d 4d 2d", "Flush, Ace high"],
    ["Tc 9d 8h 7s 6d", "Straight, Ten high"],
    ["6c 6d 6h Ks 2d", "Three Sixes"],
    ["Kc Kd 5h 5s 2d", "Two pair, Kings and Fives"],
    ["Qc Qd 9h 5s 2d", "Pair of Queens"],
    ["Ac Jd 9h 5s 2d", "Ace high"],
  ];
  let last = Infinity;
  for (const [codes, name] of cases) {
    const h = evaluate5(cards(codes));
    assert.equal(describe(h), name);
    assert.ok(h.score < last, `${name} ranks below the one before`);
    last = h.score;
  }
});

test("the wheel is a five-high straight, below six-high", () => {
  const wheel = hand("Ah 2c 3d 4s 5h");
  assert.equal(describe(wheel), "Straight, Five high");
  assert.equal(compare(wheel, hand("2c 3d 4s 5h 6c")), -1);
  // Straights do not wrap round: K-A-2-3-4 is not one.
  assert.equal(hand("Kh Ac 2d 3s 4h").cat, 0);
});

test("best five of seven", () => {
  // Flush beats the straight also on the board.
  assert.equal(describe(hand("Ah 9h 5h 6c 7h 8d 2h")), "Flush, Ace high");
  // Two trips make a full house with the higher set.
  assert.equal(describe(hand("8c 8d 8h 3s 3d 3c Kd")), "Full house, Eights over Threes");
  // Three pairs: the best two plus the best kicker.
  const h = hand("Ac Ad 9h 9s 4d 4c Kd");
  assert.equal(describe(h), "Two pair, Aces and Nines");
  assert.deepEqual(h.ranks, [14, 9, 13]);
  // A straight flush hiding in seven cards.
  assert.equal(describe(hand("2s 3s 4s 5s 6s Ah Ad")), "Straight flush, Six high");
  // Six-card straight takes the top end.
  assert.equal(describe(hand("5c 6d 7h 8s 9c Td 2h")), "Straight, Ten high");
});

test("kickers decide, and identical hands split", () => {
  const board = "Kc Kd 7h 4s 2d";
  const a = hand(`As Qd ${board}`);
  const b = hand(`Ah Jd ${board}`);
  assert.equal(compare(a, b), 1);
  // Board plays: both use the board's best five.
  const c = hand("3c 2c Ah Kh Qd Jc Ts");
  const d = hand("4d 5d Ah Kh Qd Jc Ts");
  assert.equal(compare(c, d), 0);
  assert.deepEqual(winners([c, d, hand("2h 2d Ah Kh Qd Jc Ts")]), [0, 1, 2]);
  // Two pair, same pairs, kicker decides.
  assert.equal(compare(hand("Qh 3c Kc Kd 5h 5s 2d"), hand("Jh 3d Kc Kd 5h 5s 2d")), 1);
});

test("equity is sane", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const aces = equity(cards("As Ah"), [], 1, 400, rnd);
  const junk = equity(cards("7c 2d"), [], 1, 400, rnd);
  assert.ok(aces > 0.75 && aces < 0.92, `AA vs one: ${aces}`);
  assert.ok(junk > 0.2 && junk < 0.45, `72o vs one: ${junk}`);
  // A made royal flush cannot lose.
  assert.equal(equity(cards("As Ks"), cards("Qs Js Ts 2d 3c"), 3, 50, rnd), 1);
});
