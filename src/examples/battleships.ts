/**
 * Battleships — the folding travel case of the board game, on a folding phone.
 *
 * The physical game already is a Duo in table pose: the lid stands up with
 * your targeting grid (the pegs you've fired), the base lies flat with your
 * own fleet and the pegs your opponent has landed on it. This keeps that
 * split. Things you watch — where you've fired, what's sunk — stand on top;
 * things you touch — your ocean and the fire control — lie flat below.
 *
 * You play a simple CPU: it fires on a checkerboard until it hits, then works
 * the neighbours, preferring to extend a line of hits, until the ship sinks.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, ready, tone } from "../lib/audio.ts";

const N = 8;
const COLS = "ABCDEFGH";
const FLEET = [
  { name: "Battleship", len: 4 },
  { name: "Cruiser", len: 3 },
  { name: "Submarine", len: 3 },
  { name: "Destroyer", len: 2 },
] as const;
const TOTAL = FLEET.reduce((n, s) => n + s.len, 0);

type Shot = 0 | 1 | 2; // none, miss, hit
interface Ship {
  name: string;
  len: number;
  cells: number[];
  horizontal: boolean;
}
/** One ocean: the ships on it and the shots that have landed on it. */
interface Ocean {
  ships: Ship[];
  shots: Shot[];
}
type Turn = "you" | "cpu" | "won" | "lost";

const cellName = (i: number) => `${COLS[i % N]}${Math.floor(i / N) + 1}`;

function placeFleet(): Ship[] {
  const taken = new Set<number>();
  const ships: Ship[] = [];
  for (const { name, len } of FLEET) {
    for (;;) {
      const horizontal = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horizontal ? N : N - len + 1));
      const c = Math.floor(Math.random() * (horizontal ? N - len + 1 : N));
      const cells = Array.from({ length: len }, (_, k) => (horizontal ? r * N + c + k : (r + k) * N + c));
      if (cells.some((x) => taken.has(x))) continue;
      cells.forEach((x) => taken.add(x));
      ships.push({ name, len, cells, horizontal });
      break;
    }
  }
  return ships;
}

const newOcean = (): Ocean => ({ ships: placeFleet(), shots: Array<Shot>(N * N).fill(0) });
const shipAt = (o: Ocean, i: number) => o.ships.find((s) => s.cells.includes(i));
const isSunk = (o: Ocean, s: Ship) => s.cells.every((c) => o.shots[c] === 2);
const hitsOn = (o: Ocean) => o.shots.filter((s) => s === 2).length;
const afloat = (o: Ocean) => o.ships.filter((s) => !isSunk(o, s)).length;

const CSS = `
.bs { position:absolute; inset:0; box-sizing:border-box; display:flex; flex-direction:column; gap:7px; padding:10px 12px;
  background: radial-gradient(130% 90% at 50% 0%, #13385a, #07131f 72%); color:#dbe9f5; font:12px/1.3 system-ui,-apple-system,sans-serif; }
.bs.lid { background: radial-gradient(130% 90% at 50% 0%, #173e63, #081523 72%); }
.bs.base { background: linear-gradient(180deg, #0b1d2e, #06111b); }
.bs-head { display:flex; align-items:center; gap:8px; min-height:22px; }
.bs-kicker { font:800 9px/1 system-ui; letter-spacing:.18em; text-transform:uppercase; color:#79a9d1; }
.bs-status { margin-left:auto; font-weight:700; font-size:11px; padding:4px 10px; border-radius:999px; background:#16324b; color:#cfe2f2; white-space:nowrap; }
.bs-status.you { background:#1d7f55; color:#fff; }
.bs-status.cpu { background:#a4442a; color:#fff; animation: bs-pulse 0.8s ease-in-out infinite alternate; }
.bs-status.won { background:#e0b43a; color:#231800; }
.bs-status.lost { background:#5d6b78; color:#fff; }
@keyframes bs-pulse { to { filter:brightness(1.3); } }
.bs-row { display:flex; gap:12px; align-items:flex-start; }
.bs-col { display:flex; flex-direction:column; gap:6px; min-width:0; }
.bs-grid { display:grid; grid-template-columns: 12px repeat(8, var(--c)); grid-template-rows: 12px repeat(8, var(--c)); gap:1px; flex:none; }
.bs-grid .lab { display:grid; place-items:center; font:600 8px/1 ui-monospace,monospace; color:#6690b3; }
.bs-cell { all:unset; box-sizing:border-box; position:relative; border-radius:2px; cursor:default;
  background: radial-gradient(circle at 30% 25%, #1a4a70, #0f3150 70%); }
.bs-grid.foe .bs-cell { background: radial-gradient(circle at 30% 25%, #183c5c, #0c2740 70%); }
.bs-grid.tap .bs-cell.open { cursor:crosshair; }
.bs-grid.tap .bs-cell.open:hover { background:#24608f; }
.bs-cell.ship::before { content:""; position:absolute; background:linear-gradient(180deg,#c3ced8,#71818f); box-shadow: inset 0 -1px 0 rgb(0 0 0 / .3); }
.bs-cell.ship.h::before { left:-1px; right:-1px; top:24%; bottom:24%; }
.bs-cell.ship.v::before { top:-1px; bottom:-1px; left:24%; right:24%; background:linear-gradient(90deg,#c3ced8,#71818f); }
.bs-cell.ship.h.s::before { left:12%; border-radius:50% 2px 2px 50%; }
.bs-cell.ship.h.e::before { right:12%; border-radius:2px 45% 45% 2px; }
.bs-cell.ship.v.s::before { top:12%; border-radius:50% 50% 2px 2px; }
.bs-cell.ship.v.e::before { bottom:12%; border-radius:2px 2px 45% 45%; }
.bs-cell.ghost::before { opacity:.35; }
.bs-cell.sunk { background: radial-gradient(circle, #5a1f14, #2b0f0a) !important; }
.bs-cell.miss::after, .bs-cell.hit::after { content:""; position:absolute; left:50%; top:50%; border-radius:50%; transform:translate(-50%,-50%); }
.bs-cell.miss::after { width:26%; height:26%; background:#d6e7f5; opacity:.75; }
.bs-cell.hit::after { width:54%; height:54%; background: radial-gradient(circle at 40% 35%, #ffe08a, #ff5a26 55%, #a4200b); box-shadow:0 0 7px #ff6a2a; }
.bs-cell.aim { outline:2px solid #ffd84d; outline-offset:-1px; z-index:1; box-shadow: 0 0 10px rgb(255 216 77 / .6); }
.bs-cell.new { animation: bs-splash .7s ease-out; z-index:2; }
@keyframes bs-splash { 0% { transform:scale(1.5); filter:brightness(2.4); } 100% { transform:scale(1); filter:none; } }
.bs-fleet { display:flex; flex-direction:column; gap:6px; }
.bs-fleet .sh { display:flex; flex-direction:column; gap:2px; font-size:10px; color:#9fbdd6; }
.bs-fleet .sh.down span { text-decoration:line-through; opacity:.55; }
.bs-pips { display:flex; gap:2px; }
.bs-pips i { width:9px; height:6px; border-radius:2px; background:#5f7d97; }
.bs-pips i.h { background:#ff6a2a; }
.bs-fleet .sh.down .bs-pips i { background:#5a2a22; }
.bs-log { font-size:11px; color:#b9d0e3; min-height:15px; }
.bs-log b { color:#fff; }
.bs-log .old { opacity:.5; display:block; font-size:10px; }
.bs-btn { all:unset; box-sizing:border-box; text-align:center; white-space:nowrap; cursor:pointer; padding:6px 11px; border-radius:999px; background:#dbe9f5; color:#0a1d2e; font:700 11px/1 system-ui; }
.bs-btn.ghost { background:transparent; color:#bcd5ea; box-shadow: inset 0 0 0 1px #3c6282; }
.bs-btn:disabled, .bs-btn[aria-disabled=true] { opacity:.35; cursor:default; }
.bs-fc { display:flex; flex-direction:column; gap:5px; flex:1; min-width:0; }
.bs-keys { display:grid; grid-template-columns: repeat(4, 1fr); gap:4px; }
.bs-key { all:unset; box-sizing:border-box; text-align:center; cursor:pointer; height:26px; line-height:26px; border-radius:6px; background:#17334d; color:#cfe2f2; font:700 12px/26px ui-monospace,monospace; box-shadow: inset 0 -2px 0 rgb(0 0 0 / .35); }
.bs-key.on { background:#ffd84d; color:#241a00; }
.bs-fire { all:unset; box-sizing:border-box; cursor:pointer; margin-top:3px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:8px;
  background: linear-gradient(180deg,#ff6a3d,#c83a17); color:#fff; font:800 13px/1 system-ui; letter-spacing:.12em; box-shadow: 0 3px 0 #7a1f08, 0 6px 14px rgb(0 0 0 / .4); }
.bs-fire:active { transform: translateY(2px); box-shadow: 0 1px 0 #7a1f08; }
.bs-fire[aria-disabled=true] { filter: grayscale(.8) brightness(.6); cursor:default; }
.bs-fire em { font-style:normal; font-family:ui-monospace,monospace; background:rgb(0 0 0 / .25); padding:3px 6px; border-radius:5px; }
.bs-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.bs-stat { background:rgb(255 255 255 / .06); border-radius:12px; padding:10px; }
.bs-stat b { display:block; font-size:24px; line-height:1.1; color:#fff; }
.bs-stat span { font-size:10px; color:#8fb0cb; text-transform:uppercase; letter-spacing:.08em; }
.bs-big { font:800 22px/1.15 system-ui; color:#fff; }
.bs-foot { margin-top:auto; display:flex; gap:6px; align-items:center; }
.bs-foot .x-hint { margin-left:auto; text-align:right; }
.bs-center { flex:1; display:flex; flex-direction:column; justify-content:center; gap:10px; }
`;

function create(screens: Screens, state: DuoState): Instance {
  // --- state, which outlives every render ---
  let me = newOcean(); // my ships, CPU's shots
  let foe = newOcean(); // CPU's ships, my shots
  let turn: Turn = "you";
  let aim: number | null = null;
  let pickCol: number | null = null;
  let pickRow: number | null = null;
  let lastFoe = -1;
  let lastMe = -1;
  let log: string[] = ["Fleet deployed. Pick a target."];
  let closedView: "status" | "grid" = "status";
  let current = state;
  let cpuTimer = 0;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const say = (html: string) => {
    log = [html, ...log].slice(0, 3);
  };

  function sfx(kind: "miss" | "hit" | "sunk"): void {
    ready()
      .then(() => {
        if (kind === "miss") {
          burst(0.25, 0.25, 900, 0.7, undefined, "lowpass");
          tone(520, 240, 0.18, 0.08, "sine");
        } else {
          burst(0.35, 0.7, 380, 0.6, undefined, "lowpass");
          tone(110, 40, 0.4, 0.5, "sine");
          if (kind === "sunk") tone(70, 30, 0.7, 0.4, "triangle");
        }
      })
      .catch(() => {});
  }

  function newGame(): void {
    clearTimeout(cpuTimer);
    me = newOcean();
    foe = newOcean();
    turn = "you";
    aim = pickCol = pickRow = null;
    lastFoe = lastMe = -1;
    log = ["New game. Fleet deployed — pick a target."];
    redraw();
  }

  const started = () => foe.shots.some((s) => s) || me.shots.some((s) => s);

  function fire(i: number): void {
    if (turn !== "you" || foe.shots[i]) return;
    const ship = shipAt(foe, i);
    foe.shots[i] = ship ? 2 : 1;
    lastFoe = i;
    lastMe = -1;
    aim = pickCol = pickRow = null;
    if (ship && isSunk(foe, ship)) {
      say(`<b>${cellName(i)}</b> — you sank their ${ship.name}!`);
      sfx("sunk");
    } else {
      say(ship ? `<b>${cellName(i)}</b> — hit!` : `<b>${cellName(i)}</b> — splash, a miss.`);
      sfx(ship ? "hit" : "miss");
    }
    if (afloat(foe) === 0) {
      turn = "won";
      say("<b>Victory.</b> Their fleet is on the bottom.");
    } else {
      turn = "cpu";
      cpuTimer = window.setTimeout(cpuFire, 950);
    }
    redraw();
  }

  /** Checkerboard hunt until a hit, then work the neighbours, extending lines. */
  function cpuPick(): number {
    const open = (i: number) => me.shots[i] === 0;
    const live = me.shots.flatMap((s, i) => (s === 2 && !isSunk(me, shipAt(me, i)!) ? [i] : []));
    const cands: { i: number; w: number }[] = [];
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const;
    for (const h of live) {
      const r = Math.floor(h / N);
      const c = h % N;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
        const n = nr * N + nc;
        if (!open(n)) continue;
        const br = r - dr;
        const bc = c - dc;
        const inLine = br >= 0 && br < N && bc >= 0 && bc < N && live.includes(br * N + bc);
        cands.push({ i: n, w: inLine ? 3 : 1 });
      }
    }
    if (cands.length) {
      const best = Math.max(...cands.map((c) => c.w));
      const top = cands.filter((c) => c.w === best);
      return top[Math.floor(Math.random() * top.length)]!.i;
    }
    const all = me.shots.flatMap((s, i) => (s === 0 ? [i] : []));
    const parity = all.filter((i) => (Math.floor(i / N) + (i % N)) % 2 === 0);
    const pool = parity.length ? parity : all;
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  function cpuFire(): void {
    if (turn !== "cpu") return;
    const i = cpuPick();
    const ship = shipAt(me, i);
    me.shots[i] = ship ? 2 : 1;
    lastMe = i;
    lastFoe = -1;
    if (ship && isSunk(me, ship)) {
      say(`Enemy fires <b>${cellName(i)}</b> — your ${ship.name} is sunk.`);
      sfx("sunk");
    } else {
      say(ship ? `Enemy fires <b>${cellName(i)}</b> — they hit your ${ship.name}.` : `Enemy fires <b>${cellName(i)}</b> — miss.`);
      if (ship) sfx("hit");
    }
    if (afloat(me) === 0) {
      turn = "lost";
      say("<b>Defeat.</b> Your fleet is gone — their ships are shown.");
    } else turn = "you";
    redraw();
  }

  // --- drawing ---
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  /** `foe`: the target grid, my shots on their ocean. `me`: my fleet, their shots. */
  function grid(which: "foe" | "me", cell: number, onTap?: (i: number) => void): HTMLElement {
    const ocean = which === "foe" ? foe : me;
    const g = el("div", `bs-grid ${which}${onTap && turn === "you" ? " tap" : ""}`);
    g.style.setProperty("--c", `${cell}px`);
    g.append(el("i", "lab"));
    for (let c = 0; c < N; c++) g.append(el("i", "lab", COLS[c]!));
    for (let r = 0; r < N; r++) {
      g.append(el("i", "lab", String(r + 1)));
      for (let c = 0; c < N; c++) {
        const i = r * N + c;
        const b = el("button", "bs-cell");
        const shot = ocean.shots[i]!;
        const ship = shipAt(ocean, i);
        const cls: string[] = [];
        const reveal = which === "me" || turn === "lost";
        if (ship && (reveal || isSunk(ocean, ship))) {
          const k = ship.cells.indexOf(i);
          cls.push("ship", ship.horizontal ? "h" : "v");
          if (k === 0) cls.push("s");
          if (k === ship.len - 1) cls.push("e");
          if (which === "foe" && !isSunk(ocean, ship)) cls.push("ghost");
        }
        if (which === "foe" && ship && isSunk(ocean, ship)) cls.push("sunk");
        if (shot === 1) cls.push("miss");
        else if (shot === 2) cls.push("hit");
        else cls.push("open");
        if (which === "foe" && i === aim) cls.push("aim");
        if ((which === "foe" && i === lastFoe) || (which === "me" && i === lastMe)) cls.push("new");
        b.classList.add(...cls);
        b.setAttribute("aria-label", `${cellName(i)}${shot === 2 ? " hit" : shot === 1 ? " miss" : ""}`);
        if (onTap) b.onclick = () => onTap(i);
        else b.tabIndex = -1;
        g.append(b);
      }
    }
    return g;
  }

  function status(): HTMLElement {
    const text = { you: "Your turn", cpu: "Enemy firing…", won: "Victory", lost: "Defeat" }[turn];
    return el("span", `bs-status ${turn}`, text);
  }

  function head(kicker: string): HTMLElement {
    const h = el("div", "bs-head");
    h.append(el("span", "bs-kicker", kicker), status());
    return h;
  }

  function fleet(ocean: Ocean, label: string): HTMLElement {
    const f = el("div", "bs-fleet");
    f.append(el("span", "bs-kicker", label));
    for (const s of ocean.ships) {
      const down = isSunk(ocean, s);
      // On the enemy's side you only learn a ship's damage when it sinks.
      const known = ocean === me || down;
      const pips = s.cells.map((c) => `<i class="${known && ocean.shots[c] === 2 ? "h" : ""}"></i>`).join("");
      f.append(el("div", `sh${down ? " down" : ""}`, `<span>${s.name}</span><div class="bs-pips">${pips}</div>`));
    }
    return f;
  }

  function logView(lines = 2): HTMLElement {
    return el("div", "bs-log", log.slice(0, lines).map((l, k) => (k ? `<span class="old">${l}</span>` : l)).join(""));
  }

  function footer(hint: string): HTMLElement {
    const f = el("div", "bs-foot");
    if (turn === "won" || turn === "lost") {
      const b = el("button", "bs-btn", "New game");
      b.onclick = newGame;
      f.append(b);
    } else if (!started()) {
      const b = el("button", "bs-btn ghost", "Shuffle fleet");
      b.onclick = () => {
        me = newOcean();
        redraw();
      };
      f.append(b);
    } else {
      const b = el("button", "bs-btn ghost", "Restart");
      b.onclick = newGame;
      f.append(b);
    }
    if (hint) f.append(el("span", "x-hint", hint));
    return f;
  }

  function setAim(): void {
    aim = pickCol !== null && pickRow !== null ? pickRow * N + pickCol : null;
    redraw();
  }

  /** Letters and numbers, big enough for thumbs, and a Fire key. */
  function fireControl(): HTMLElement {
    const fc = el("div", "bs-fc");
    fc.append(el("span", "bs-kicker", "Fire control"));
    const cols = el("div", "bs-keys");
    for (let c = 0; c < N; c++) {
      const k = el("button", `bs-key${pickCol === c ? " on" : ""}`, COLS[c]!);
      k.onclick = () => {
        pickCol = c;
        setAim();
      };
      cols.append(k);
    }
    const rows = el("div", "bs-keys");
    for (let r = 0; r < N; r++) {
      const k = el("button", `bs-key${pickRow === r ? " on" : ""}`, String(r + 1));
      k.onclick = () => {
        pickRow = r;
        setAim();
      };
      rows.append(k);
    }
    const can = turn === "you" && aim !== null && foe.shots[aim] === 0;
    const fb = el("button", "bs-fire", `FIRE <em>${aim !== null ? cellName(aim) : "--"}</em>`);
    fb.setAttribute("aria-disabled", String(!can));
    fb.onclick = () => {
      if (can && aim !== null) fire(aim);
    };
    fc.append(cols, rows, fb);
    return fc;
  }

  function render(s: DuoState): void {
    current = s;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();

    if (pose.id === "closed") {
      const root = el("div", "bs");
      if (closedView === "grid") {
        root.append(head("Target"));
        const wrap = el("div", "bs-row");
        wrap.style.justifyContent = "center";
        wrap.append(grid("foe", 29, fire));
        root.append(wrap, logView(1));
        const f = footer("");
        const back = el("button", "bs-btn ghost", "Status");
        back.onclick = () => {
          closedView = "status";
          redraw();
        };
        f.append(back);
        root.append(f);
      } else {
        root.append(head("Battleships"));
        const c = el("div", "bs-center");
        const big = { you: "Your shot.", cpu: "Incoming…", won: "You won.", lost: "You lost." }[turn];
        c.append(el("div", "bs-big", big));
        const st = el("div", "bs-stats");
        st.innerHTML = `
          <div class="bs-stat"><b>${hitsOn(foe)}/${TOTAL}</b><span>Your hits</span></div>
          <div class="bs-stat"><b>${hitsOn(me)}/${TOTAL}</b><span>Enemy hits</span></div>
          <div class="bs-stat"><b>${afloat(foe)}</b><span>Enemy ships left</span></div>
          <div class="bs-stat"><b>${afloat(me)}</b><span>Your ships left</span></div>`;
        c.append(st, logView(2));
        root.append(c);
        const f = el("div", "bs-foot");
        const play = el("button", "bs-btn", "Play here");
        play.onclick = () => {
          closedView = "grid";
          redraw();
        };
        f.append(play, el("span", "x-hint", "Open into table pose<br>for the full board"));
        root.append(f);
      }
      screens.outer.append(root);
    } else if (pose.id === "closed-landscape") {
      const root = el("div", "bs");
      root.style.padding = "8px 10px";
      root.style.gap = "5px";
      root.append(head("Battleships"));
      const row = el("div", "bs-row");
      row.style.justifyContent = "space-between";
      const a = el("div", "bs-col");
      a.append(el("span", "bs-kicker", "Target · tap to fire"), grid("foe", 18, fire));
      const b = el("div", "bs-col");
      b.append(el("span", "bs-kicker", "Your fleet"), grid("me", 18));
      row.append(a, b);
      root.append(row, logView(1));
      screens.outer.append(root);
    } else if (pose.split === "side-by-side") {
      // Book / open: two pages, target on the left, your ocean on the right.
      const left = el("div", "bs lid");
      left.append(head("Target grid"));
      const lw = el("div", "bs-row");
      lw.style.justifyContent = "center";
      lw.append(grid("foe", 30, fire));
      left.append(lw);
      const ef = fleet(foe, "Enemy fleet");
      ef.style.flexDirection = "row";
      ef.style.flexWrap = "wrap";
      ef.style.columnGap = "12px";
      left.append(ef);
      const right = el("div", "bs base");
      const rh = el("div", "bs-head");
      rh.append(el("span", "bs-kicker", "Your fleet"));
      right.append(rh);
      const rw = el("div", "bs-row");
      rw.style.justifyContent = "center";
      rw.append(grid("me", 30));
      right.append(rw, logView(3), footer(pose.id === "open" ? "Fold into table pose to play it like the case" : "Tap the target grid to fire"));
      screens.start.append(left);
      screens.end.append(right);
    } else {
      // Table / open-portrait: watch on top, touch below.
      const top = el("div", "bs lid");
      top.append(head("Target grid"));
      const tr = el("div", "bs-row");
      // Tapping the lid aims; firing happens on the flat half.
      tr.append(
        grid("foe", 27, (i) => {
          if (turn !== "you" || foe.shots[i]) return;
          pickCol = i % N;
          pickRow = Math.floor(i / N);
          setAim();
        }),
      );
      const side = el("div", "bs-col");
      side.style.flex = "1";
      side.append(fleet(foe, "Enemy fleet"));
      const tally = el("div", "bs-log", `<b>${hitsOn(foe)}</b> hits · <b>${foe.shots.filter((x) => x === 1).length}</b> misses`);
      side.append(tally, logView(1));
      tr.append(side);
      top.append(tr);

      const bottom = el("div", "bs base");
      bottom.style.padding = "8px 12px";
      const br = el("div", "bs-row");
      const mine = el("div", "bs-col");
      mine.append(el("span", "bs-kicker", `Your fleet · ${afloat(me)} afloat`), grid("me", 23));
      br.append(mine, fireControl());
      bottom.append(br, footer(""));
      screens.start.append(top);
      screens.end.append(bottom);
    }
    lastFoe = lastMe = -1; // the splash plays once
  }

  function redraw(): void {
    render(current);
  }

  return {
    render,
    destroy() {
      clearTimeout(cpuTimer);
      style.remove();
    },
  };
}

export const battleshipsExample: Example = {
  id: "battleships",
  title: "Battleships",
  category: "games",
  summary:
    "The board game's folding case, digitized: the standing half is your targeting grid, the flat half is your own ocean and a fire control. Sink the CPU's four ships before it finds yours.",
  bestPose: "table",
  poses: {
    closed: "A status card — whose turn, hits on each side, ships left — with a single target grid you can play one-handed.",
    "closed-landscape": "Both grids side by side in miniature: tap the target grid to fire, watch your fleet on the right.",
    open: "Two pages: the target grid on the left (tap to fire), your fleet and the battle log on the right.",
    "open-portrait": "The case laid flat: target grid on top, your fleet and fire control below.",
    book: "Target left, fleet right, like reading the battle as a spread; tap the left page to fire.",
    table:
      "Like the real case: the standing half is the target grid you glance at, the flat half holds your fleet taking fire and a letter/number fire control with a big Fire key.",
    stand: "Stood up between two people like the real game's lid: your target board left, your fleet right.",
  },
  principle:
    "Table pose's destinations mirror the physical game: at-a-distance status on the standing half, touch targets on the stable flat half, and the whole battle carries through every fold (HIG checklist §6, 'Destination follows purpose').",
  create,
};
