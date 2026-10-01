/**
 * Poker — Texas Hold'em where the fold is a privacy wall.
 *
 * At a real table you shield your hole cards with a hand and lift a corner to
 * look. Set the Duo down in table pose and the standing half does the
 * shielding: your two cards lie on the flat bottom half, hidden from anyone
 * across the table by the half standing in front of them, and stay face down
 * until you press and hold to lift them. Everything public stands on the top
 * half, facing the table — the board, the pot, the three opponents and the
 * dealer button.
 *
 * You play three simple CPU players. Each one estimates its chance of winning
 * by dealing out the rest of the hand a hundred-odd times, compares that to
 * the price of calling, and folds, calls or raises according to its
 * temperament. Hand evaluation (best five of seven) lives in poker-hands.ts,
 * with tests. Cards and table are original designs.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, note, now, ready, running } from "../lib/audio.ts";
import { best, deck, describe, equity, shuffle, type Card } from "./poker-hands.ts";

const SB = 10;
const BB = 20;
const START = 1000;

type Street = "pre" | "flop" | "turn" | "river" | "done";
const STREET_NAME: Record<Street, string> = { pre: "Pre-flop", flop: "Flop", turn: "Turn", river: "River", done: "Hand over" };

interface Seat {
  name: string;
  cpu: boolean;
  /** 0 tight … 1 loose: how readily it calls. */
  loose: number;
  /** 0 passive … 1 aggressive: how readily it bets and raises. */
  aggro: number;
  stack: number;
  bet: number; // this street
  put: number; // this hand
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  out: boolean;
  shown: boolean;
  last: string;
  won: number;
}

const seat = (name: string, cpu: boolean, loose: number, aggro: number): Seat => ({
  name, cpu, loose, aggro, stack: START, bet: 0, put: 0, hole: [], folded: false, allIn: false, acted: false, out: false, shown: false, last: "", won: 0,
});

// ---------------------------------------------------------------- cards

const SUIT_PATH = [
  // spade
  "M10 1C3 7 0 10 0 13.4 0 16.4 2.4 18 5 18c2 0 3.5-1 4.3-2.5L8 19.5h4l-1.3-4C11.5 17 13 18 15 18c2.6 0 5-1.6 5-4.6C20 10 17 7 10 1z",
  // heart
  "M10 18.5C3 12.6 0 9.4 0 5.8 0 2.8 2.4.6 5.1.6c2 0 3.8 1.2 4.9 3 1.1-1.8 2.9-3 4.9-3C17.6.6 20 2.8 20 5.8c0 3.6-3 6.8-10 12.7z",
  // diamond
  "M10 .5 18 10l-8 9.5L2 10z",
  // club
  "M10 1a4.6 4.6 0 0 0-3.6 7.5A4.6 4.6 0 1 0 8.8 15L8 19.5h4l-.8-4.5a4.6 4.6 0 1 0 2.4-6.5A4.6 4.6 0 0 0 10 1z",
];
const RANK_LABEL = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUIT_NAME = ["spades", "hearts", "diamonds", "clubs"];
const RANK_WORD = ["", "", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];

const suit = (s: number) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${SUIT_PATH[s]}"/></svg>`;

function cardHTML(c: Card | undefined, faceUp: boolean, extra = ""): string {
  if (!c) return `<div class="pk-card empty ${extra}"></div>`;
  if (!faceUp) return `<div class="pk-card back ${extra}" aria-label="face-down card"></div>`;
  const red = c.s === 1 || c.s === 2 ? "red" : "";
  return `<div class="pk-card ${red} ${extra}" aria-label="${RANK_WORD[c.r]} of ${SUIT_NAME[c.s]}">
    <span class="ix"><b>${RANK_LABEL[c.r]}</b>${suit(c.s)}</span><span class="pip">${suit(c.s)}</span></div>`;
}

// ---------------------------------------------------------------- styles

const CSS = `
.pk { position:absolute; inset:0; box-sizing:border-box; overflow:hidden; display:flex; flex-direction:column; gap:8px; padding:10px 12px; color:#eef5ee;
  font:12px/1.3 system-ui,-apple-system,sans-serif; user-select:none; -webkit-user-select:none;
  background: radial-gradient(120% 90% at 50% 40%, #1b6b47, #0d3d29 70%, #082619); }
.pk.fold-top { padding-top:20px; }
.pk.fold-left { padding-left:22px; }
.pk.flat { background: radial-gradient(140% 100% at 50% 0%, #165c3d, #0a3121 75%); box-shadow: inset 0 6px 14px rgb(0 0 0 / .35); }
.pk-card { --cw:40px; position:relative; flex:none; box-sizing:border-box; width:var(--cw); height:calc(var(--cw) * 1.4); border-radius:calc(var(--cw) * .12);
  background:#fbf8f1; color:#1d2433; box-shadow: 0 1px 0 rgb(0 0 0 / .25), 0 3px 8px rgb(0 0 0 / .35); }
.pk-card.red { color:#c3303a; }
.pk-card svg { fill:currentColor; display:block; }
.pk-card .ix { position:absolute; left:9%; top:6%; display:flex; flex-direction:column; align-items:center; gap:1px; font:800 calc(var(--cw) * .32)/1 system-ui; letter-spacing:-.04em; }
.pk-card .ix svg { width:calc(var(--cw) * .24); height:calc(var(--cw) * .24); }
.pk-card .pip { position:absolute; right:10%; bottom:8%; width:52%; }
.pk-card .pip svg { width:100%; height:auto; }
.pk-card.back { background:
  radial-gradient(circle at 50% 50%, transparent 0 27%, rgb(0 0 0 / 0) 28%),
  repeating-linear-gradient(45deg, #8d2b3a 0 3px, #7a2232 3px 6px); border:3px solid #fbf8f1; }
.pk-card.back::after { content:""; position:absolute; left:50%; top:50%; width:44%; height:30%; transform:translate(-50%,-50%); border-radius:3px;
  background: linear-gradient(90deg, #e9c46a 0 46%, transparent 46% 54%, #e9c46a 54%); box-shadow:0 0 0 2px #7a2232, 0 0 0 3px #e9c46a; }
.pk-card.empty { background:transparent; box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / .16); }
.pk-card.dim { filter: brightness(.55) saturate(.5); }
.pk-card.win { box-shadow: 0 0 0 2px #ffd166, 0 0 14px rgb(255 209 102 / .7); }
.pk-row { display:flex; gap:6px; align-items:center; }
.pk-board { display:flex; gap:5px; justify-content:center; }
.pk-seats { display:flex; gap:6px; }
.pk-seat { position:relative; flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; gap:3px; padding:6px 4px 5px; border-radius:12px; background:rgb(0 0 0 / .22); }
.pk-seat.turn { box-shadow: inset 0 0 0 2px #ffd166; background:rgb(255 209 102 / .12); }
.pk-seat.folded { opacity:.45; }
.pk-seat.out { opacity:.25; }
.pk-seat .nm { font:700 11px/1 system-ui; white-space:nowrap; }
.pk-seat .st { font:600 10px/1 ui-monospace,Menlo,monospace; color:#bfe3c9; }
.pk-seat .ls { font:700 9px/1 system-ui; min-height:11px; color:#ffd166; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.pk-seat .cards { display:flex; gap:2px; }
.pk-seat .cards .pk-card { --cw:22px; }
.pk-seat .bet { position:absolute; bottom:-7px; right:6px; }
.pk-chip { display:inline-flex; align-items:center; gap:3px; padding:2px 6px 2px 3px; border-radius:999px; background:#0b2a1c; font:700 10px/1 ui-monospace,Menlo,monospace; color:#fff; box-shadow:0 1px 2px rgb(0 0 0 / .5); }
.pk-chip::before { content:""; width:10px; height:10px; border-radius:50%; background: repeating-conic-gradient(#e85d5d 0 30deg, #fff 30deg 45deg); box-shadow: inset 0 0 0 2px #e85d5d; }
.pk-dealer { position:absolute; top:-5px; left:-3px; width:16px; height:16px; border-radius:50%; background:#fff; color:#111; font:900 9px/16px system-ui; text-align:center; box-shadow:0 1px 3px rgb(0 0 0 / .5); }
.pk-pot { text-align:center; font:800 13px/1 system-ui; letter-spacing:.04em; }
.pk-pot small { display:block; font:700 9px/1.4 system-ui; letter-spacing:.14em; text-transform:uppercase; color:#9fd0ae; }
.pk-msg { text-align:center; font:600 11px/1.3 system-ui; color:#e9f3ea; min-height:15px; }
.pk-msg b { color:#ffd166; }
.pk-center { flex:1; min-height:0; display:flex; flex-direction:column; justify-content:center; gap:8px; }
.pk-hole { position:relative; display:flex; gap:8px; justify-content:center; touch-action:none; cursor:pointer; -webkit-tap-highlight-color:transparent; padding:6px; }
.pk-slot { position:relative; }
.pk-slot .pk-card { --cw: var(--hole, 64px); }
.pk-slot .pk-cover { position:absolute; inset:0; transition: transform .16s ease-out, opacity .16s; transform-origin: 90% 100%; }
.pk-slot:nth-child(2) .pk-cover { transform-origin: 10% 100%; }
.pk-hole.peek .pk-slot .pk-cover { transform: translateY(-46%) rotate(-10deg); opacity:.2; }
.pk-hole.peek .pk-slot:nth-child(2) .pk-cover { transform: translateY(-46%) rotate(10deg); }
.pk-hole.open .pk-cover { display:none; }
.pk-hole.mucked { opacity:.4; }
.pk-what { text-align:center; font:700 11px/1.2 system-ui; color:#ffd166; min-height:14px; }
.pk-what.hidden { color:#9fd0ae; font-weight:600; }
.pk-me { display:flex; align-items:center; gap:8px; justify-content:center; font:700 11px/1 system-ui; }
.pk-me .d { position:static; }
.pk-act { display:flex; flex-direction:column; gap:6px; }
.pk-btns { display:flex; gap:6px; }
.pk-btn { all:unset; box-sizing:border-box; flex:1; text-align:center; cursor:pointer; padding:10px 6px; border-radius:10px; font:800 12px/1 system-ui; white-space:nowrap;
  background:#eef5ee; color:#0b2a1c; box-shadow:0 2px 0 rgb(0 0 0 / .35); }
.pk-btn:active { transform: translateY(1px); box-shadow:0 1px 0 rgb(0 0 0 / .35); }
.pk-btn.fold { background:#2c4a3b; color:#e6efe8; }
.pk-btn.raise { background:#ffd166; color:#2b1d00; }
.pk-btn.go { background:#ffd166; color:#2b1d00; }
.pk-btn[disabled] { opacity:.35; pointer-events:none; }
.pk-slide { display:flex; gap:6px; align-items:center; }
.pk-slide input { flex:1; min-width:0; accent-color:#ffd166; }
.pk-pre { all:unset; cursor:pointer; padding:4px 7px; border-radius:999px; font:700 10px/1 system-ui; background:rgb(0 0 0 / .3); color:#cfe8d6; }
.pk-hint { text-align:center; font-size:10px; color:#9fd0ae; }
.pk-wait { text-align:center; font:600 11px/1.3 system-ui; color:#cfe8d6; padding:8px 0; }
.pk-split { display:grid; grid-template-columns: 1fr 1.15fr; gap:10px; flex:1; min-height:0; align-items:center; }
.pk-cl { display:grid; grid-template-columns: 1fr 1fr; gap:10px; flex:1; min-height:0; }
.pk-cl .pk-btns { flex-wrap:wrap; }
.pk-cl .pk-btn { padding:8px 4px; font-size:11px; }
.pk-cl .pk-btn.raise { flex-basis:100%; }
.pk-col { display:flex; flex-direction:column; gap:6px; min-width:0; justify-content:center; }
.pk-glance { display:flex; justify-content:space-between; align-items:center; font:700 11px/1 system-ui; }
.pk-glance .who { padding:4px 8px; border-radius:999px; background:rgb(0 0 0 / .3); }
.pk-glance .who.you { background:#ffd166; color:#2b1d00; }
.pk-mini { display:flex; gap:4px; justify-content:space-between; font:600 9px/1.2 system-ui; color:#cfe8d6; }
.pk-mini span { flex:1; text-align:center; padding:3px 2px; border-radius:6px; background:rgb(0 0 0 / .22); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pk-mini span.turn { box-shadow: inset 0 0 0 1.5px #ffd166; }
.pk-mini span.folded { opacity:.45; }
`;

// ---------------------------------------------------------------- the game

function create(screens: Screens, state: DuoState): Instance {
  // --- state, which outlives every render ---
  const seats: Seat[] = [seat("You", false, 0, 0), seat("Mags", true, 0.1, 0.35), seat("Otto", true, 0.65, 0.1), seat("Vee", true, 0.35, 0.85)];
  let cards: Card[] = [];
  let board: Card[] = [];
  let dealer = 3;
  let toAct = -1;
  let currentBet = 0;
  let minRaise = BB;
  let raises = 0;
  let street: Street = "done";
  let handNo = 0;
  let result = "";
  let winCards = new Set<Card>();
  let raiseTo = 0;
  let peeking = false;
  let timer = 0;
  let current = state;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  // --- sound ---
  function unlock(): void {
    if (!running()) ready().catch(() => {});
  }
  const sfx = {
    chips: () => {
      if (!running()) return;
      burst(0.03, 0.25, 3400, 2.5);
      burst(0.03, 0.2, 2800, 2.5, now() + 0.05);
    },
    deal: () => running() && burst(0.04, 0.18, 5200, 0.8, undefined, "highpass"),
    win: () => running() && [67, 71, 74, 79].forEach((m, i) => note(m, 0.16, 0.14, "triangle", now() + i * 0.08)),
    turn: () => running() && note(84, 0.08, 0.08, "sine"),
  };

  // --- rules ---
  const me = () => seats[0]!;
  const alive = (i: number) => !seats[i]!.out;
  const inHand = (i: number) => alive(i) && !seats[i]!.folded;
  const canAct = (i: number) => inHand(i) && !seats[i]!.allIn;
  const count = (p: (i: number) => boolean) => seats.filter((_, i) => p(i)).length;
  const pot = () => seats.reduce((n, s) => n + s.put, 0);
  function nextFrom(i: number, p: (i: number) => boolean): number {
    for (let k = 1; k <= seats.length; k++) {
      const j = (i + k) % seats.length;
      if (p(j)) return j;
    }
    return -1;
  }
  function pay(i: number, amount: number): number {
    const s = seats[i]!;
    const a = Math.max(0, Math.min(amount, s.stack));
    s.stack -= a;
    s.bet += a;
    s.put += a;
    if (s.stack === 0) s.allIn = true;
    return a;
  }
  const draw = () => cards.pop()!;

  function newHand(): void {
    clearTimeout(timer);
    for (const s of seats) {
      s.out = s.stack <= 0;
      Object.assign(s, { bet: 0, put: 0, hole: [], folded: s.out, allIn: false, acted: false, shown: false, last: s.out ? "Out" : "", won: 0 });
    }
    board = [];
    winCards = new Set();
    peeking = false;
    if (me().out || count(alive) < 2) {
      street = "done";
      result = me().out ? "You're out of chips." : "You cleared the table!";
      redraw();
      return;
    }
    handNo++;
    cards = shuffle(deck());
    dealer = nextFrom(dealer, alive);
    const sb = count(alive) === 2 ? dealer : nextFrom(dealer, alive);
    const bb = nextFrom(sb, alive);
    seats[sb]!.last = `Small blind ${pay(sb, SB)}`;
    seats[bb]!.last = `Big blind ${pay(bb, BB)}`;
    for (let r = 0; r < 2; r++) for (let k = 1; k <= seats.length; k++) {
      const i = (dealer + k) % seats.length;
      if (alive(i)) seats[i]!.hole.push(draw());
    }
    sfx.deal();
    currentBet = BB;
    minRaise = BB;
    raises = 0;
    street = "pre";
    result = "";
    toAct = nextFrom(bb, canAct);
    advance();
  }

  function roundDone(): boolean {
    const actors = seats.map((_, i) => i).filter(canAct);
    if (actors.length === 0) return true;
    if (actors.every((i) => seats[i]!.acted && seats[i]!.bet === currentBet)) return true;
    // One player left to act and nobody can bet against them.
    if (actors.length === 1 && seats[actors[0]!]!.bet >= currentBet) {
      const others = seats.filter((s, i) => inHand(i) && i !== actors[0]);
      return others.every((s) => s.allIn);
    }
    return false;
  }

  function advance(): void {
    clearTimeout(timer);
    if (count(inHand) === 1) return winByFold();
    if (toAct < 0 || roundDone()) return nextStreet();
    const s = seats[toAct]!;
    if (s.cpu) {
      timer = window.setTimeout(() => cpuMove(toAct), 650 + Math.random() * 500);
    } else {
      const lo = Math.min(currentBet + minRaise, s.bet + s.stack);
      raiseTo = Math.max(lo, Math.min(raiseTo, s.bet + s.stack));
      if (raiseTo <= currentBet || raiseTo < lo) raiseTo = lo;
      sfx.turn();
    }
    redraw();
  }

  function nextStreet(): void {
    clearTimeout(timer);
    for (const s of seats) {
      s.bet = 0;
      s.acted = false;
    }
    currentBet = 0;
    minRaise = BB;
    raises = 0;
    if (street === "pre") {
      draw();
      board.push(draw(), draw(), draw());
      street = "flop";
    } else if (street === "flop" || street === "turn") {
      draw();
      board.push(draw());
      street = street === "flop" ? "turn" : "river";
    } else {
      return showdown();
    }
    sfx.deal();
    for (const s of seats) if (!s.folded && !s.out && !s.allIn) s.last = "";
    toAct = nextFrom(dealer, canAct);
    if (count(canAct) < 2) {
      // Everyone but one is all in: run the board out, no more betting.
      toAct = -1;
      for (let i = 0; i < seats.length; i++) if (inHand(i)) seats[i]!.shown = true;
      redraw();
      timer = window.setTimeout(nextStreet, 1100);
      return;
    }
    advance();
  }

  function act(i: number, kind: "fold" | "call" | "raise", to = 0): void {
    if (i !== toAct || street === "done") return;
    const s = seats[i]!;
    const toCall = currentBet - s.bet;
    if (kind === "fold") {
      s.folded = true;
      s.last = "Fold";
    } else if (kind === "call" || s.stack <= toCall || raises >= 4) {
      if (toCall <= 0) s.last = "Check";
      else {
        const a = pay(i, toCall);
        s.last = s.allIn ? `All in ${s.bet}` : `Call ${a}`;
        sfx.chips();
      }
    } else {
      const top = s.bet + s.stack;
      const target = Math.min(top, Math.max(to, currentBet + minRaise));
      const opened = currentBet === 0;
      pay(i, target - s.bet);
      if (target - currentBet >= minRaise) minRaise = target - currentBet;
      if (target > currentBet) {
        currentBet = target;
        raises++;
        for (const o of seats) if (o !== s) o.acted = false;
      }
      s.last = s.allIn ? `All in ${s.bet}` : opened ? `Bet ${target}` : `Raise to ${target}`;
      sfx.chips();
    }
    s.acted = true;
    toAct = nextFrom(i, canAct);
    advance();
  }

  function cpuMove(i: number): void {
    if (i !== toAct || street === "done") return;
    const s = seats[i]!;
    const toCall = currentBet - s.bet;
    const p = pot();
    const opp = Math.max(1, count(inHand) - 1);
    const eq = equity(s.hole, board, opp, 140) + (Math.random() - 0.5) * 0.12 + s.aggro * 0.04;
    const fair = 1 / (opp + 1);
    const odds = toCall / (p + toCall);
    const round10 = (n: number) => Math.max(BB, Math.round(n / 10) * 10);
    if (toCall <= 0) {
      if (eq > fair * 1.45 + 0.08 - s.aggro * 0.08 && Math.random() < 0.55 + s.aggro * 0.4) return act(i, "raise", round10(p * (0.45 + Math.random() * 0.4)));
      if (Math.random() < 0.07 * s.aggro) return act(i, "raise", round10(p * 0.5)); // a bluff
      return act(i, "call");
    }
    if (eq > fair * 1.7 + 0.1 && Math.random() < 0.35 + s.aggro * 0.5) return act(i, "raise", currentBet + round10(Math.max(minRaise, p * 0.7)));
    if (eq + s.loose * 0.1 >= odds * 1.05 || (toCall <= BB && eq > 0.18 + (1 - s.loose) * 0.1)) return act(i, "call");
    return act(i, "fold");
  }

  function winByFold(): void {
    const w = seats.findIndex((_, i) => inHand(i));
    const amount = pot();
    const s = seats[w]!;
    s.stack += amount;
    s.won = amount;
    for (const o of seats) o.put = o.bet = 0;
    result = `${s.cpu ? `${s.name} wins` : "You win"} <b>${amount}</b> — everyone else folded.`;
    if (!s.cpu) sfx.win();
    finish();
  }

  function showdown(): void {
    const live = seats.map((_, i) => i).filter(inHand);
    const hands = new Map(live.map((i) => [i, best([...seats[i]!.hole, ...board])]));
    for (const i of live) seats[i]!.shown = true;
    const levels = [...new Set(live.map((i) => seats[i]!.put))].sort((a, b) => a - b);
    const lines: string[] = [];
    let prev = 0;
    for (const level of levels) {
      const amount = seats.reduce((n, s) => n + Math.max(0, Math.min(s.put, level) - prev), 0);
      const eligible = live.filter((i) => seats[i]!.put >= level);
      const top = Math.max(...eligible.map((i) => hands.get(i)!.score));
      const ws = eligible.filter((i) => hands.get(i)!.score === top);
      // Split evenly; odd chips go to the first winner after the button.
      const share = Math.floor(amount / ws.length / 10) * 10;
      let odd = amount - share * ws.length;
      const order = [...ws].sort((a, b) => ((a - dealer + 3) % 4) - ((b - dealer + 3) % 4));
      for (const w of order) {
        const extra = odd > 0 ? Math.min(odd, 10) : 0;
        odd -= extra;
        seats[w]!.stack += share + extra;
        seats[w]!.won += share + extra;
      }
      if (amount > 0) {
        const h = hands.get(ws[0]!)!;
        for (const c of h.cards) winCards.add(c);
        const who = ws.map((w) => (seats[w]!.cpu ? seats[w]!.name : "You")).join(" & ");
        const verb = ws.length > 1 ? "split" : who === "You" ? "win" : "wins";
        if (eligible.length === 1 && levels.length > 1) lines.push(`${who} ${ws[0] === 0 ? "get" : "gets"} <b>${amount}</b> back.`);
        else lines.push(`${who} ${verb} <b>${amount}</b> — ${describe(h)}.`);
      }
      prev = level;
    }
    for (const s of seats) s.put = s.bet = 0;
    result = lines.join("<br>");
    if (me().won > 0) sfx.win();
    finish();
  }

  function finish(): void {
    street = "done";
    toAct = -1;
    peeking = false;
    redraw();
  }

  function newTable(): void {
    seats.forEach((s) => (s.stack = START));
    handNo = 0;
    newHand();
  }

  // --- input ---
  function setPeek(on: boolean): void {
    if (peeking === on) return;
    peeking = on;
    for (const scr of [screens.outer, screens.start, screens.end]) {
      scr.querySelectorAll(".pk-hole").forEach((h) => h.classList.toggle("peek", on));
      scr.querySelectorAll<HTMLElement>(".pk-what").forEach((w) => paintWhat(w));
    }
  }
  const stopPeek = () => setPeek(false);
  window.addEventListener("pointerup", stopPeek);
  window.addEventListener("pointercancel", stopPeek);
  function onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (e.code !== "KeyP" || e.repeat || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"))) return;
    if (!screens.outer.querySelector(".pk-hole") && !screens.end.querySelector(".pk-hole")) return;
    setPeek(e.type === "keydown");
  }
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);

  // --- pieces ---
  function el(tag: string, cls = "", html = ""): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  const showMine = () => street === "done" && me().shown;

  function whatText(): { text: string; hidden: boolean } {
    const s = me();
    if (!s.hole.length) return { text: "", hidden: true };
    if (!peeking && !showMine()) return { text: s.folded ? "Folded" : "Hold to peek", hidden: true };
    if (board.length >= 3) return { text: describe(best([...s.hole, ...board])), hidden: false };
    const [a, b] = s.hole as [Card, Card];
    if (a.r === b.r) return { text: `Pocket ${RANK_WORD[a.r]}s`, hidden: false };
    const [hi, lo] = a.r > b.r ? [a, b] : [b, a];
    return { text: `${RANK_WORD[hi.r]}–${RANK_WORD[lo.r]}${a.s === b.s ? " suited" : ""}`, hidden: false };
  }
  function paintWhat(w: HTMLElement): void {
    const { text, hidden } = whatText();
    w.textContent = text;
    w.classList.toggle("hidden", hidden);
  }

  /** Your two hole cards, face down until you press and hold. */
  function hole(size: number): HTMLElement {
    const s = me();
    const wrap = el("div", "pk-col");
    wrap.style.alignItems = "center";
    wrap.style.gap = "2px";
    const h = el("div", `pk-hole${peeking ? " peek" : ""}${showMine() ? " open" : ""}${s.folded && s.hole.length ? " mucked" : ""}`);
    h.style.setProperty("--hole", `${size}px`);
    h.setAttribute("role", "button");
    h.setAttribute("aria-label", "Your hole cards — press and hold to peek");
    for (let k = 0; k < 2; k++) {
      const c = s.hole[k];
      const slot = el("div", "pk-slot", cardHTML(c, true, c && winCards.has(c) ? "win" : ""));
      if (c) slot.insertAdjacentHTML("beforeend", `<div class="pk-cover">${cardHTML(c, false)}</div>`);
      h.append(slot);
    }
    h.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      unlock();
      setPeek(true);
    });
    h.addEventListener("contextmenu", (e) => e.preventDefault());
    const w = el("div", "pk-what");
    paintWhat(w);
    wrap.append(h, w);
    return wrap;
  }

  function seatEl(i: number): HTMLElement {
    const s = seats[i]!;
    const cls = ["pk-seat", toAct === i ? "turn" : "", s.folded && !s.out ? "folded" : "", s.out ? "out" : ""].join(" ");
    const e = el("div", cls);
    const cardsHTML = s.hole.length && !s.folded ? s.hole.map((c) => cardHTML(c, s.shown, winCards.has(c) ? "win" : "")).join("") : cardHTML(undefined, false) + cardHTML(undefined, false);
    e.innerHTML = `${dealer === i ? `<span class="pk-dealer">D</span>` : ""}<span class="nm">${s.name}</span>
      <span class="cards">${cardsHTML}</span><span class="st">${s.stack}</span>
      <span class="ls">${s.won ? `+${s.won}` : toAct === i ? "thinking…" : s.last}</span>
      ${s.bet ? `<span class="bet pk-chip">${s.bet}</span>` : ""}`;
    return e;
  }

  function seatsEl(): HTMLElement {
    const row = el("div", "pk-seats");
    for (let i = 1; i < seats.length; i++) row.append(seatEl(i));
    return row;
  }

  function boardEl(size: number): HTMLElement {
    const b = el("div", "pk-board");
    b.style.setProperty("--b", `${size}px`);
    b.innerHTML = Array.from({ length: 5 }, (_, k) => cardHTML(board[k], true, board[k] && winCards.has(board[k]!) ? "win" : "")).join("");
    b.querySelectorAll<HTMLElement>(".pk-card").forEach((c) => c.style.setProperty("--cw", `${size}px`));
    return b;
  }

  function potEl(): HTMLElement {
    const shown = street === "done" ? seats.reduce((n, s) => n + s.won, 0) : pot();
    return el("div", "pk-pot", `${street === "done" && !handNo ? "—" : shown}<small>${street === "done" ? (handNo ? "Last pot" : "Pot") : `Pot · ${STREET_NAME[street]}`}</small>`);
  }

  function message(): string {
    if (street === "done") return result || "Texas Hold'em · blinds 10/20 · you and three at the table.";
    if (toAct === 0) {
      const toCall = currentBet - me().bet;
      return toCall > 0 ? `<b>Your turn</b> — ${Math.min(toCall, me().stack)} to call.` : "<b>Your turn</b> — check or bet.";
    }
    if (toAct > 0) return `${seats[toAct]!.name} is thinking…`;
    return "Dealing…";
  }

  function meEl(): HTMLElement {
    const s = me();
    return el("div", "pk-me", `${dealer === 0 ? `<span class="pk-dealer d">D</span>` : ""}<span>Your stack <b>${s.stack}</b></span>${s.bet ? `<span class="pk-chip">${s.bet}</span>` : ""}`);
  }

  /** Fold / check-call / raise, or "deal" between hands. */
  function actions(compact: boolean): HTMLElement {
    const box = el("div", "pk-act");
    const s = me();
    if (street === "done") {
      const over = s.out || count(alive) < 2;
      const go = el("button", "pk-btn go", over ? "New table" : handNo ? "Deal next hand" : "Deal");
      go.onclick = () => {
        unlock();
        if (over) newTable();
        else newHand();
      };
      box.append(go);
      return box;
    }
    if (toAct !== 0) {
      box.append(el("div", "pk-wait", s.folded ? "You folded — watching this hand out." : toAct > 0 ? `Waiting for ${seats[toAct]!.name}…` : "Dealing…"));
      return box;
    }
    const toCall = Math.min(currentBet - s.bet, s.stack);
    const top = s.bet + s.stack;
    const lo = Math.min(currentBet + minRaise, top);
    const canRaise = top > currentBet && raises < 4;
    const btns = el("div", "pk-btns");
    const fold = el("button", "pk-btn fold", "Fold");
    fold.onclick = () => {
      unlock();
      act(0, "fold");
    };
    const call = el("button", "pk-btn", toCall <= 0 ? "Check" : toCall >= s.stack ? `All in ${toCall}` : `Call ${toCall}`);
    call.onclick = () => {
      unlock();
      act(0, "call");
    };
    const label = () => (raiseTo >= top ? `All in ${top}` : currentBet === 0 ? `Bet ${raiseTo}` : `Raise to ${raiseTo}`);
    const raise = el("button", "pk-btn raise", label());
    raise.toggleAttribute("disabled", !canRaise);
    raise.onclick = () => {
      unlock();
      act(0, "raise", raiseTo);
    };
    if (toCall > 0) btns.append(fold);
    btns.append(call, raise);
    box.append(btns);
    if (canRaise && top > lo) {
      const row = el("div", "pk-slide");
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(lo);
      input.max = String(top);
      input.step = "10";
      input.value = String(raiseTo);
      input.setAttribute("aria-label", "Raise amount");
      input.oninput = () => {
        raiseTo = Math.max(lo, Math.min(top, Number(input.value)));
        raise.textContent = label();
      };
      row.append(input);
      const preset = (name: string, amount: number) => {
        const b = el("button", "pk-pre", name);
        b.onclick = () => {
          raiseTo = Math.max(lo, Math.min(top, Math.round(amount / 10) * 10));
          input.value = String(raiseTo);
          raise.textContent = label();
        };
        return b;
      };
      if (!compact) row.append(preset("½ pot", currentBet + pot() / 2));
      row.append(preset("Pot", currentBet + pot() + toCall), preset("Max", top));
      box.append(row);
    }
    return box;
  }

  // --- layouts ---
  function redraw(): void {
    render(current);
  }

  function render(st: DuoState): void {
    current = st;
    const { pose } = st;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();

    if (pose.id === "closed") {
      // The glance: your hand, whose turn, the pot — and quick actions.
      const root = el("div", "pk");
      const who = street === "done" ? "Between hands" : toAct === 0 ? "Your turn" : toAct > 0 ? `${seats[toAct]!.name}'s turn` : "Dealing";
      root.append(
        el("div", "pk-glance", `<span class="who ${toAct === 0 ? "you" : ""}">${who}</span><span>Pot <b>${street === "done" ? seats.reduce((n, s) => n + s.won, 0) : pot()}</b></span>`),
        miniSeats(),
        boardEl(40),
      );
      const mid = el("div", "pk-center");
      mid.append(hole(58), el("div", "pk-msg", message()));
      root.append(mid, meEl(), actions(true));
      screens.outer.append(root);
    } else if (pose.id === "closed-landscape") {
      const root = el("div", "pk");
      const grid = el("div", "pk-cl");
      const left = el("div", "pk-col");
      left.append(miniSeats(), boardEl(30), potEl(), el("div", "pk-msg", message()));
      const right = el("div", "pk-col");
      right.append(hole(46), meEl(), actions(true));
      grid.append(left, right);
      root.append(grid);
      screens.outer.append(root);
    } else if (pose.split === "stacked") {
      // Top: the public table, facing everyone. Bottom: your cards, shielded.
      const top = el("div", "pk");
      const mid = el("div", "pk-center");
      mid.append(boardEl(46), potEl(), el("div", "pk-msg", message()));
      top.append(seatsEl(), mid);
      screens.start.append(top);
      const bottom = el("div", "pk flat fold-top");
      const split = el("div", "pk-split");
      const l = el("div", "pk-col");
      l.append(hole(66));
      const r = el("div", "pk-col");
      r.append(meEl(), actions(false));
      split.append(l, r);
      bottom.append(split, el("div", "pk-hint", pose.id === "table" ? "The standing half hides your cards from the table — hold them to lift the corners." : "Fold it into table pose and the top half becomes a privacy wall."));
      screens.end.append(bottom);
    } else {
      // Book, open, standing: the board on the left page, your hand on the right.
      const left = el("div", "pk");
      const mid = el("div", "pk-center");
      mid.append(boardEl(46), potEl(), el("div", "pk-msg", message()));
      left.append(seatsEl(), mid);
      screens.start.append(left);
      const right = el("div", "pk flat fold-left");
      const c = el("div", "pk-center");
      c.append(hole(76), meEl());
      right.append(c, actions(false), el("div", "pk-hint", "Hold your cards to peek. Set it down in table pose to hide them."));
      screens.end.append(right);
    }
  }

  function miniSeats(): HTMLElement {
    const row = el("div", "pk-mini");
    for (let i = 1; i < seats.length; i++) {
      const s = seats[i]!;
      const cls = [toAct === i ? "turn" : "", s.folded ? "folded" : ""].join(" ");
      row.insertAdjacentHTML("beforeend", `<span class="${cls}">${dealer === i ? "Ⓓ " : ""}${s.name} ${s.stack}${s.bet ? ` · ${s.bet}` : ""}</span>`);
    }
    return row;
  }

  // Sit down to a hand already dealt.
  newHand();

  return {
    render,
    destroy() {
      clearTimeout(timer);
      window.removeEventListener("pointerup", stopPeek);
      window.removeEventListener("pointercancel", stopPeek);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      style.remove();
    },
  };
}

export const pokerExample: Example = {
  id: "poker",
  title: "Poker",
  category: "games",
  summary:
    "Texas Hold'em against three CPU players, where table pose is a privacy wall: your hole cards lie on the flat half, shielded by the standing half, and stay face down until you press and hold to lift them. The board, pot and opponents stand up facing the table.",
  bestPose: "table",
  poses: {
    closed: "A glance: whose turn it is, the pot, the board in a strip, your two cards (hold to peek) and quick fold / call / raise.",
    "closed-landscape": "Board, opponents and pot on the left; your hand, stack and actions on the trailing side.",
    open: "The table on the left page — opponents, board, pot — and your hand and actions on the right.",
    "open-portrait": "The table-pose layout lying flat: public table on top, your hand and actions below — but nothing shields your cards.",
    book: "Board on the left page, your hand on the right, like holding your cards close.",
    table: "The privacy wall: your hole cards lie on the flat half behind the standing one, face down until you hold them; the board, pot, opponents and dealer button stand up for everyone.",
    stand: "Stood on its edge with the board left and your hand right — playable, though the open edge faces the table; fold it to table pose to hide your cards.",
  },
  principle:
    "In table pose Apple puts at-a-distance content on the standing half and touch controls on the flat half (HIG checklist §6, 'Destination follows purpose') — here the flat half is also the private one, and the game is the same in every pose, only arranged differently (HIG checklist §8, 'Never tie functionality to a pose').",
  create,
};
