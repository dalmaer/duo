/**
 * Pinball — the Duo in table pose already is a pinball machine.
 *
 * A real machine has two parts: the playfield, lying nearly flat under your
 * hands, and the backglass, standing up at the far end with the art and the
 * score. Table pose is that shape. The flat bottom half is the playfield —
 * gravity runs toward you, the flippers sit by your thumbs, and the left and
 * right halves of the glass are the flipper buttons. The standing top half is
 * the backglass: original art, a dot-matrix score, the ball count, and a
 * flashing TILT when you nudge the table once too often.
 *
 * Physics run at a fixed 480 Hz step (so the ball cannot tunnel through a
 * flipper), freeze while the page is hidden, and hold for a moment after a
 * pose change so folding the phone never drains a ball. The table, its art and
 * its rules are original to this file.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, note, now as audioNow, ready, running, tone } from "../lib/audio.ts";

// ---------------------------------------------------------------- the table

/** The playfield in world units; y runs down, toward the player. */
const W = 360;
const H = 400;
const R = 7; // ball radius
const GRAV = 640;
const STEP = 1 / 480;
const VMAX = 1500;
const BALLS = 3;
const SAVE_SECONDS = 5;

type Kind = "wall" | "sling" | "target";
interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  kind: Kind;
  id: number;
}
interface Bumper {
  x: number;
  y: number;
  r: number;
}
interface Flipper {
  px: number;
  py: number;
  /** +1 left (points right), −1 right (points left). */
  s: 1 | -1;
  a: number;
  w: number;
  on: boolean;
}

const LEN = 52;
const REST = 0.5;
const UP = -0.5;
const mirror = (x: number) => 332 - x; // the playfield's centre line is x = 166

const SEGS: Seg[] = [];
function seg(ax: number, ay: number, bx: number, by: number, kind: Kind = "wall", id = 0): void {
  SEGS.push({ ax, ay, bx, by, kind, id });
}
// The cabinet: a domed top, straight sides, the shooter lane on the right.
{
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a0 = Math.PI + (i / steps) * Math.PI;
    const a1 = Math.PI + ((i + 1) / steps) * Math.PI;
    seg(180 + 176 * Math.cos(a0), 180 + 176 * Math.sin(a0), 180 + 176 * Math.cos(a1), 180 + 176 * Math.sin(a1));
  }
  seg(4, 180, 4, 420);
  seg(356, 180, 356, 400);
  seg(328, 122, 328, 392); // shooter lane wall
  seg(328, 392, 356, 392); // plunger floor
  // Outlane separators and inlane guides, both sides.
  for (const m of [(x: number) => x, mirror]) {
    seg(m(28), 268, m(28), 318);
    seg(m(28), 318, m(98), 352);
    // Slingshots: a wall triangle whose inner face kicks.
    seg(m(52), 246, m(52), 300);
    seg(m(52), 300, m(86), 324);
    seg(m(52), 246, m(86), 324, "sling", m === mirror ? 1 : 0);
  }
  // Top rollover lane guides.
  for (const x of [112, 148, 184, 220]) seg(x, 42, x, 68);
  // Stand-up targets along the left wall.
  [150, 178, 206].forEach((y, i) => seg(12, y - 11, 12, y + 11, "target", i));
}
const BUMPERS: Bumper[] = [
  { x: 128, y: 126, r: 17 },
  { x: 204, y: 126, r: 17 },
  { x: 166, y: 180, r: 17 },
];
const LANES = [130, 166, 202];
const PLUNGE = { x: 342, y: 384 };

/** A fixed scatter of stars for the playfield art. */
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: 10 + r(1) * 316, y: 10 + r(2) * 380, s: 0.4 + r(3) * 1.2 };
});

const fmt = (n: number) => n.toLocaleString("en-US");

// ---------------------------------------------------------------- styles

const CSS = `
.pb { position:absolute; inset:0; box-sizing:border-box; overflow:hidden; color:#ffe9c7; font:12px/1.25 system-ui,-apple-system,sans-serif; background:#07040f; user-select:none; -webkit-user-select:none; }
.pb-col { display:flex; flex-direction:column; }
.pb-glass { gap:6px; padding:8px; background:
  radial-gradient(120% 80% at 50% 0%, #2a0f45, #0b0418 70%); }
.pb-art { position:relative; flex:1; min-height:0; border-radius:10px; overflow:hidden; box-shadow: inset 0 0 0 2px #e8a33c, inset 0 0 0 4px #3a1650, 0 0 18px rgb(255 140 40 / .25); }
.pb-art svg { position:absolute; inset:0; width:100%; height:100%; }
.pb-art.lit svg .pb-chase { animation: pb-chase 1.2s linear infinite; }
@keyframes pb-chase { to { stroke-dashoffset: -24; } }
.pb-tilt { position:absolute; inset:0; display:none; place-items:center; font:900 44px/1 system-ui; letter-spacing:.12em; color:#ff3b2f; text-shadow:0 0 14px #ff3b2f, 0 0 2px #fff; background:rgb(20 0 0 / .55); }
.pb-tilt.on { display:grid; animation: pb-blink .35s steps(2) infinite; }
@keyframes pb-blink { 50% { opacity:.15; } }
.pb-dmd { flex:none; width:100%; aspect-ratio: 4 / 1; max-height:36%; border-radius:6px; background:#120700; box-shadow: inset 0 0 0 2px #2a1404, 0 0 0 3px #000; display:block; }
.pb-dmd.strip { aspect-ratio:auto; height:100%; max-height:none; }
.pb-stat { flex:none; display:flex; gap:6px; align-items:center; font:700 10px/1 ui-monospace,Menlo,monospace; letter-spacing:.06em; }
.pb-lamp { padding:4px 7px; border-radius:999px; background:#2a1440; color:#c9a6e8; }
.pb-lamp.on { background:#ffb23e; color:#2a1000; box-shadow:0 0 8px #ffb23e; }
.pb-lamp.warn { background:#ff3b2f; color:#fff; animation: pb-blink .4s steps(2) infinite; }
.pb-stat .pb-hi { margin-left:auto; opacity:.7; }
.pb-play { background:#05030c; }
.pb-field { position:absolute; inset:0; }
.pb-field canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
.pb-zone { position:absolute; top:0; bottom:0; width:50%; touch-action:none; cursor:pointer; -webkit-tap-highlight-color:transparent; }
.pb-zone.l { left:0; } .pb-zone.r { right:0; }
.pb-field.fold-top .pb-zone { top:16px; }
.pb-field.fold-left .pb-zone.l { left:16px; width:calc(50% - 16px); }
.pb-tag { position:absolute; bottom:6px; font:800 9px/1 system-ui; letter-spacing:.16em; color:#8f7bb0; pointer-events:none; }
.pb-tag.l { left:8px; } .pb-tag.r { right:8px; }
.pb-btn { all:unset; box-sizing:border-box; cursor:pointer; touch-action:none; text-align:center; font:800 10px/1 system-ui; letter-spacing:.12em; text-transform:uppercase;
  padding:6px 10px; border-radius:999px; background:#2a1440; color:#e7d2ff; box-shadow: inset 0 0 0 1px #6a4598; }
.pb-btn:active { background:#4b2475; }
.pb-nudge { position:absolute; left:50%; bottom:5px; transform:translateX(-50%); z-index:2; }
.pb-hint { position:absolute; left:0; right:0; top:6px; text-align:center; font:700 10px/1.2 system-ui; letter-spacing:.06em; color:#ffd58a; pointer-events:none; text-shadow:0 1px 2px #000; }
.pb-closed { display:grid; grid-template-rows: 40px 1fr; }
.pb-strip { display:flex; gap:6px; align-items:stretch; padding:5px 6px; background:#14061f; border-bottom:1px solid #3a1650; }
.pb-strip .pb-mini { display:flex; flex-direction:column; justify-content:center; font:800 9px/1.3 ui-monospace,Menlo,monospace; color:#ffb23e; white-space:nowrap; }
.pb-cl { display:grid; grid-template-columns: 66px 1fr 66px; }
.pb-pad { position:relative; display:flex; flex-direction:column; gap:6px; padding:8px 6px; background:linear-gradient(180deg,#160822,#0b0414); }
.pb-thumb { flex:1; border-radius:14px; display:grid; place-items:center; touch-action:none; cursor:pointer; font:800 10px/1.2 system-ui; letter-spacing:.14em; color:#e7d2ff; text-align:center;
  background: radial-gradient(circle at 50% 40%, #6a2bb0, #2a1046); box-shadow: inset 0 0 0 2px #9a6ad8, 0 3px 0 #12061f; }
.pb-thumb.on { background: radial-gradient(circle at 50% 40%, #ffb23e, #b5520f); color:#2a1000; }
.pb-score { font:800 12px/1.2 ui-monospace,Menlo,monospace; color:#ffb23e; text-align:center; text-shadow:0 0 6px rgb(255 160 40 / .6); word-break:break-all; }
.pb-sub { font:700 9px/1.2 ui-monospace,Menlo,monospace; color:#c9a6e8; text-align:center; }
`;

// ---------------------------------------------------------------- art

const ART = `
<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <radialGradient id="pb-sky" cx="50%" cy="20%" r="90%"><stop offset="0" stop-color="#3b1670"/><stop offset=".55" stop-color="#160634"/><stop offset="1" stop-color="#05020e"/></radialGradient>
    <radialGradient id="pb-planet" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffcf7a"/><stop offset=".5" stop-color="#e2582a"/><stop offset="1" stop-color="#4a0f2a"/></radialGradient>
    <linearGradient id="pb-tail" x1="0" x2="1"><stop offset="0" stop-color="#7ef0ff" stop-opacity="0"/><stop offset="1" stop-color="#e9fdff"/></linearGradient>
    <linearGradient id="pb-title" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#ffb23e"/><stop offset="1" stop-color="#e2582a"/></linearGradient>
  </defs>
  <rect width="300" height="200" fill="url(#pb-sky)"/>
  ${STARS.slice(0, 45).map((s) => `<circle cx="${(s.x * 0.92).toFixed(1)}" cy="${(s.y * 0.5).toFixed(1)}" r="${(s.s * 0.8).toFixed(2)}" fill="#fff" opacity="${(0.35 + s.s / 3).toFixed(2)}"/>`).join("")}
  <circle cx="232" cy="150" r="58" fill="url(#pb-planet)"/>
  <ellipse cx="232" cy="150" rx="92" ry="14" fill="none" stroke="#ffd58a" stroke-width="3" opacity=".75" transform="rotate(-14 232 150)"/>
  <path d="M30 70 L112 108" stroke="url(#pb-tail)" stroke-width="9" stroke-linecap="round"/>
  <circle cx="114" cy="109" r="7" fill="#f4feff"/>
  <path d="M150 182 C 160 120, 140 90, 150 30" fill="none" stroke="#7ef0ff" stroke-width="2" stroke-dasharray="6 6" class="pb-chase" opacity=".6"/>
  <g transform="translate(150 54)">
    <text text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="40" font-style="italic" letter-spacing="2" fill="#2a0b45" transform="translate(3 4)">STARFOLD</text>
    <text text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="40" font-style="italic" letter-spacing="2" fill="url(#pb-title)" stroke="#2a0b45" stroke-width="1.5">STARFOLD</text>
    <text y="20" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="9" letter-spacing="5" fill="#c9f6ff">· TWO-LEAF SPACE RALLY ·</text>
  </g>
</svg>`;

// ---------------------------------------------------------------- dot matrix

/** Draw lines of text onto a canvas as a grid of lit and unlit dots. */
const DMD_SRC = typeof document === "undefined" ? null : document.createElement("canvas");
function drawDMD(c: HTMLCanvasElement, cols: number, rows: number, lines: { text: string; size: number; y: number }[]): void {
  const cw = c.clientWidth;
  const ch = c.clientHeight;
  if (!cw || !ch || !DMD_SRC) return;
  const px = 2;
  if (c.width !== cw * px || c.height !== ch * px) {
    c.width = cw * px;
    c.height = ch * px;
  }
  DMD_SRC.width = cols;
  DMD_SRC.height = rows;
  const s = DMD_SRC.getContext("2d", { willReadFrequently: true })!;
  s.clearRect(0, 0, cols, rows);
  s.fillStyle = "#fff";
  s.textAlign = "center";
  s.textBaseline = "middle";
  for (const l of lines) {
    s.font = `800 ${l.size}px ui-monospace, Menlo, Consolas, monospace`;
    s.fillText(l.text, cols / 2, l.y);
  }
  const data = s.getImageData(0, 0, cols, rows).data;
  const g = c.getContext("2d")!;
  g.fillStyle = "#120700";
  g.fillRect(0, 0, c.width, c.height);
  const cell = Math.min(c.width / cols, c.height / rows);
  const ox = (c.width - cell * cols) / 2;
  const oy = (c.height - cell * rows) / 2;
  const rad = cell * 0.4;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = data[(y * cols + x) * 4 + 3] ?? 0;
      g.fillStyle = a > 110 ? "#ff9a1f" : "#2b1405";
      g.beginPath();
      g.arc(ox + (x + 0.5) * cell, oy + (y + 0.5) * cell, rad, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// ---------------------------------------------------------------- the game

type Mode = "attract" | "plunger" | "play" | "drain";

function create(screens: Screens, state: DuoState): Instance {
  // --- state, which outlives every render ---
  let mode: Mode = "attract";
  let score = 0;
  let last = 0; // last game's score
  let high = 0;
  try {
    high = Number(localStorage.getItem("duo-pinball-high")) || 0;
  } catch {
    /* private mode */
  }
  let ball = 0; // ball number in play, 1..3
  let mult = 1;
  let lanes = [false, false, false];
  let targets = [false, false, false];
  let tilt = 0;
  let tilted = false;
  let simT = 0;
  let launchedAt = -99;
  let drainAt = 0;
  let msg = "";
  let msgUntil = 0;
  let shake = 0;
  let resumeAt = 0; // real time (ms) before which physics hold, after a pose change
  let charging = false;
  let chargeFrom = 0;
  let dragPower = 0;
  let power = 0;
  const b = { x: PLUNGE.x, y: PLUNGE.y, vx: 0, vy: 0 };
  const flippers: Flipper[] = [
    { px: 100, py: 352, s: 1, a: REST, w: 0, on: false },
    { px: 232, py: 352, s: -1, a: REST, w: 0, on: false },
  ];
  const bumperFlash = [0, 0, 0];
  const slingFlash = [0, 0];
  const held = { l: new Set<number | string>(), r: new Set<number | string>() };
  let prevPose = state.pose.id;

  // --- what each render owns ---
  let field: HTMLCanvasElement | null = null;
  let dmd: HTMLCanvasElement | null = null;
  let dmdCols = 128;
  let dmdRows = 32;
  let dmdKey = "";
  let tiltEl: HTMLElement | null = null;
  let artEl: HTMLElement | null = null;
  let statEl: HTMLElement | null = null;
  let statKey = "";
  let hintEl: HTMLElement | null = null;
  let thumbs: { l: HTMLElement | null; r: HTMLElement | null } = { l: null, r: null };
  let miniEl: HTMLElement | null = null;
  let stripEl: HTMLElement | null = null;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  // --- sound ---
  function unlock(): void {
    if (!running()) ready().catch(() => {});
  }
  const sfx = {
    flip: () => {
      burst(0.05, 0.35, 260, 0.8, undefined, "lowpass");
      tone(140, 70, 0.05, 0.18, "square");
    },
    bumper: (i: number) => tone([988, 1175, 1319][i] ?? 988, 494, 0.09, 0.14, "square"),
    sling: () => tone(660, 330, 0.06, 0.12, "square"),
    target: () => note(84, 0.12, 0.16, "triangle"),
    lane: () => note(91, 0.1, 0.14, "triangle"),
    award: () => [72, 76, 79, 84].forEach((m, i) => note(m, 0.12, 0.16, "square", audioNow() + i * 0.07)),
    launch: () => burst(0.18, 0.5, 900, 0.7, undefined, "lowpass"),
    drain: () => tone(330, 55, 0.7, 0.22, "sawtooth"),
    tilt: () => tone(90, 70, 0.5, 0.3, "sawtooth"),
    nudge: () => burst(0.08, 0.5, 140, 0.7, undefined, "lowpass"),
  };
  function play(fn: () => void): void {
    if (running()) fn();
  }

  // --- rules ---
  function say(text: string, seconds = 1.6): void {
    msg = text;
    msgUntil = simT + seconds;
  }
  function add(points: number): void {
    if (tilted || mode !== "play") return;
    score += points * mult;
  }
  function startGame(): void {
    score = 0;
    ball = 1;
    mult = 1;
    lanes = [false, false, false];
    targets = [false, false, false];
    tilt = 0;
    tilted = false;
    toPlunger();
    say("BALL 1", 1.4);
  }
  function toPlunger(): void {
    mode = "plunger";
    b.x = PLUNGE.x;
    b.y = PLUNGE.y;
    b.vx = b.vy = 0;
    power = 0;
  }
  function launch(): void {
    if (mode !== "plunger") return;
    const p = Math.max(0.08, power);
    mode = "play";
    b.vy = -(360 + p * 1140);
    b.vx = 0;
    launchedAt = simT;
    charging = false;
    power = 0;
    play(sfx.launch);
  }
  function lose(): void {
    if (!tilted && simT - launchedAt < SAVE_SECONDS) {
      toPlunger();
      say("BALL SAVED");
      return;
    }
    play(sfx.drain);
    mode = "drain";
    drainAt = simT;
    tilted = false;
    tilt = 0;
    flippers.forEach((f) => (f.on = false));
    if (ball >= BALLS) {
      last = score;
      if (score > high) {
        high = score;
        try {
          localStorage.setItem("duo-pinball-high", String(high));
        } catch {
          /* fine */
        }
        say("NEW HIGH SCORE", 3);
      } else say("GAME OVER", 3);
    } else say(`BALL ${ball + 1}`, 1.6);
  }
  function nudge(): void {
    if (mode !== "play" || tilted) return;
    b.vx += (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 60);
    b.vy -= 110;
    shake = 1;
    play(sfx.nudge);
    tilt += 1;
    if (tilt > 2.6) {
      tilted = true;
      flippers.forEach((f) => (f.on = false));
      say("TILT", 99);
      play(sfx.tilt);
    } else if (tilt > 1.5) say("DANGER", 1.2);
  }
  function setFlip(i: 0 | 1, on: boolean): void {
    const f = flippers[i]!;
    if (tilted || mode === "drain") on = false;
    if (on && !f.on) {
      play(sfx.flip);
      // Lane change: the flippers rotate the lit top lanes, as on real tables.
      if (mode === "play") lanes = i === 0 ? [lanes[1]!, lanes[2]!, lanes[0]!] : [lanes[2]!, lanes[0]!, lanes[1]!];
    }
    f.on = on;
  }

  // --- input, shared by pointers and keys ---
  function press(side: "l" | "r", id: number | string, down: boolean): void {
    const set = held[side];
    if (down) {
      unlock();
      if (mode === "attract" || (mode === "drain" && ball >= BALLS && simT - drainAt > 1)) {
        startGame();
        return;
      }
      set.add(id);
      if (mode === "plunger" && !charging) {
        charging = true;
        chargeFrom = performance.now();
        dragPower = 0;
      }
    } else {
      set.delete(id);
      if (charging && held.l.size + held.r.size === 0) launch();
    }
    setFlip(side === "l" ? 0 : 1, set.size > 0);
    paintThumbs();
  }

  function bindZone(el: HTMLElement, side: "l" | "r"): void {
    let y0 = 0;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      y0 = e.clientY;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic pointer */
      }
      press(side, e.pointerId, true);
    });
    el.addEventListener("pointermove", (e) => {
      if (charging && held[side].has(e.pointerId)) dragPower = Math.max(dragPower, Math.min(1, (e.clientY - y0) / 70));
    });
    const up = (e: PointerEvent) => {
      if (held[side].has(e.pointerId)) press(side, e.pointerId, false);
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
  }

  const KEYS: Record<string, "l" | "r" | "plunge" | "nudge" | "start"> = {
    KeyZ: "l", ShiftLeft: "l", ArrowLeft: "l",
    Slash: "r", ShiftRight: "r", ArrowRight: "r",
    Space: "plunge", ArrowDown: "plunge",
    KeyN: "nudge", ArrowUp: "nudge",
    Enter: "start",
  };
  function typing(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }
  function onKey(e: KeyboardEvent): void {
    const k = KEYS[e.code];
    if (!k || typing(e) || e.metaKey || e.ctrlKey || e.altKey || !field?.isConnected) return;
    e.preventDefault();
    const down = e.type === "keydown";
    if (down && e.repeat) return;
    if (k === "l" || k === "r") press(k, `key:${e.code}`, down);
    else if (k === "nudge") {
      if (down) nudge();
    } else if (k === "start") {
      if (down && (mode === "attract" || (mode === "drain" && ball >= BALLS))) {
        unlock();
        startGame();
      }
    } else if (down) {
      unlock();
      if (mode === "attract" || (mode === "drain" && ball >= BALLS && simT - drainAt > 1)) startGame();
      else if (mode === "plunger") {
        charging = true;
        chargeFrom = performance.now();
        dragPower = 0;
      }
    } else if (charging) launch();
  }
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);

  // --- physics ---
  function hitSeg(s: Seg): number {
    const dx = s.bx - s.ax;
    const dy = s.by - s.ay;
    const t = Math.max(0, Math.min(1, ((b.x - s.ax) * dx + (b.y - s.ay) * dy) / (dx * dx + dy * dy)));
    const px = s.ax + t * dx;
    const py = s.ay + t * dy;
    let nx = b.x - px;
    let ny = b.y - py;
    const d = Math.hypot(nx, ny);
    if (d >= R || d === 0) return 0;
    nx /= d;
    ny /= d;
    b.x = px + nx * R;
    b.y = py + ny * R;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const e = s.kind === "target" ? 0.5 : 0.42;
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
      // A touch of friction along the wall.
      b.vx *= 0.995;
      b.vy *= 0.995;
    }
    if (s.kind === "sling" && !tilted) {
      const kick = 300;
      const now = b.vx * nx + b.vy * ny;
      if (now < kick) {
        b.vx += (kick - now) * nx;
        b.vy += (kick - now) * ny;
      }
      if (slingFlash[s.id]! <= 0.1) {
        add(10);
        play(sfx.sling);
      }
      slingFlash[s.id] = 1;
    }
    if (s.kind === "target" && -vn > 60) {
      add(500);
      if (!targets[s.id]) {
        targets[s.id] = true;
        play(sfx.target);
        if (targets.every(Boolean) && !tilted) {
          add(5000);
          targets = [false, false, false];
          say("JACKPOT 5000");
          play(sfx.award);
        }
      }
    }
    return -vn;
  }

  function hitBumper(i: number): void {
    const k = BUMPERS[i]!;
    let nx = b.x - k.x;
    let ny = b.y - k.y;
    const d = Math.hypot(nx, ny);
    if (d >= R + k.r || d === 0) return;
    nx /= d;
    ny /= d;
    b.x = k.x + nx * (R + k.r);
    b.y = k.y + ny * (R + k.r);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= 1.4 * vn * nx;
      b.vy -= 1.4 * vn * ny;
    }
    if (tilted) return;
    const out = b.vx * nx + b.vy * ny;
    const kick = 420;
    if (out < kick) {
      b.vx += (kick - out) * nx;
      b.vy += (kick - out) * ny;
    }
    if (bumperFlash[i]! < 0.5) {
      add(100);
      play(() => sfx.bumper(i));
    }
    bumperFlash[i] = 1;
  }

  function hitFlipper(f: Flipper): void {
    const dx = f.s * Math.cos(f.a) * LEN;
    const dy = Math.sin(f.a) * LEN;
    const t = Math.max(0, Math.min(1, ((b.x - f.px) * dx + (b.y - f.py) * dy) / (LEN * LEN)));
    const px = f.px + t * dx;
    const py = f.py + t * dy;
    const rr = 8 - 3.5 * t;
    let nx = b.x - px;
    let ny = b.y - py;
    const d = Math.hypot(nx, ny);
    if (d >= R + rr || d === 0) return;
    nx /= d;
    ny /= d;
    b.x = px + nx * (R + rr);
    b.y = py + ny * (R + rr);
    // The flipper's surface velocity where the ball touches it.
    const sx = f.w * t * LEN * -f.s * Math.sin(f.a);
    const sy = f.w * t * LEN * Math.cos(f.a);
    const rel = (b.vx - sx) * nx + (b.vy - sy) * ny;
    if (rel < 0) {
      b.vx -= 1.25 * rel * nx;
      b.vy -= 1.25 * rel * ny;
    }
  }

  function step(dt: number): void {
    simT += dt;
    tilt = Math.max(0, tilt - 0.7 * dt);
    for (const f of flippers) {
      const target = f.on ? UP : REST;
      const speed = f.on ? 26 : 15;
      const prev = f.a;
      if (f.a > target) f.a = Math.max(target, f.a - speed * dt);
      else f.a = Math.min(target, f.a + speed * dt);
      f.w = (f.a - prev) / dt;
    }
    for (let i = 0; i < 3; i++) bumperFlash[i] = Math.max(0, bumperFlash[i]! - dt * 5);
    for (let i = 0; i < 2; i++) slingFlash[i] = Math.max(0, slingFlash[i]! - dt * 6);
    if (mode === "drain") {
      if (ball < BALLS && simT - drainAt > 1.4) {
        ball++;
        toPlunger();
      } else if (ball >= BALLS && simT - drainAt > 3) {
        mode = "attract";
      }
      return;
    }
    if (mode === "plunger") {
      if (charging) power = Math.min(1, Math.max(dragPower, (performance.now() - chargeFrom) / 900));
      return;
    }
    if (mode !== "play") return;

    const prevY = b.y;
    b.vy += GRAV * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > VMAX) {
      b.vx *= VMAX / sp;
      b.vy *= VMAX / sp;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    for (const s of SEGS) hitSeg(s);
    for (let i = 0; i < BUMPERS.length; i++) hitBumper(i);
    for (const f of flippers) hitFlipper(f);

    // Top rollover lanes: light one as the ball rolls down through it.
    if (prevY < 60 && b.y >= 60) {
      const i = LANES.findIndex((x) => Math.abs(b.x - x) < 16);
      if (i >= 0 && !tilted) {
        add(250);
        if (!lanes[i]) {
          lanes[i] = true;
          play(sfx.lane);
        }
        if (lanes.every(Boolean)) {
          lanes = [false, false, false];
          if (mult < 5) mult++;
          say(`MULTIPLIER ×${mult}`);
          play(sfx.award);
        }
      }
    }
    // Rolled back down the shooter lane: plunge again.
    if (b.x > 330 && b.y > PLUNGE.y - 4 && Math.abs(b.vy) < 60) toPlunger();
    if (b.y > H + 16) lose();
  }

  // --- the loop ---
  let raf = 0;
  let lastT = 0;
  let acc = 0;
  function frame(t: number): void {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    // Pause while the page is hidden, and for a beat after a pose change.
    if (!document.hidden && t >= resumeAt && field?.isConnected) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 40) {
        step(STEP);
        acc -= STEP;
        n++;
      }
      if (n >= 40) acc = 0;
      shake = Math.max(0, shake - dt * 4);
    }
    draw(t);
  }
  function onVisible(): void {
    lastT = performance.now();
    acc = 0;
  }
  document.addEventListener("visibilitychange", onVisible);
  raf = requestAnimationFrame((t) => {
    lastT = t;
    frame(t);
  });

  // --- drawing ---
  function displayText(): { big: string; small: string } {
    const showMsg = msg && simT < msgUntil;
    if (performance.now() < resumeAt && mode === "play") return { big: "GET READY", small: fmt(score) };
    if (mode === "attract") {
      const flip = Math.floor(performance.now() / 1800) % 3;
      if (flip === 0) return { big: "STARFOLD", small: "TAP TO START" };
      if (flip === 1) return { big: fmt(high), small: "HIGH SCORE" };
      return { big: fmt(last), small: "LAST GAME" };
    }
    if (showMsg) {
      const blink = msg === "TILT" ? Math.floor(performance.now() / 250) % 2 === 0 : true;
      return { big: blink ? msg : "", small: fmt(score) };
    }
    if (mode === "plunger") return { big: fmt(score), small: `BALL ${ball} · PULL TO LAUNCH` };
    return { big: fmt(score), small: `BALL ${ball}  ×${mult}` };
  }

  function setHTML(e: HTMLElement | null, html: string): void {
    if (e && e.dataset.html !== html) {
      e.dataset.html = html;
      e.innerHTML = html;
    }
  }

  function draw(t: number): void {
    if (field?.isConnected) drawField(field, t);
    const txt = displayText();
    if (dmd?.isConnected) {
      const key = `${txt.big}|${txt.small}|${dmd.clientWidth}|${dmd.clientHeight}`;
      if (key !== dmdKey) {
        dmdKey = key;
        const big = txt.big.length > 9 ? 13 : 19;
        if (dmdRows >= 24) drawDMD(dmd, dmdCols, dmdRows, [
          { text: txt.big, size: big, y: 12 },
          { text: txt.small, size: 8, y: 27 },
        ]);
        else drawDMD(dmd, dmdCols, dmdRows, [{ text: txt.big, size: txt.big.length > 10 ? 10 : 13, y: dmdRows / 2 + 0.5 }]);
      }
    }
    if (tiltEl) tiltEl.classList.toggle("on", tilted);
    if (artEl) artEl.classList.toggle("lit", mode === "play");
    if (statEl) {
      const k = `${ball}|${mult}|${mode}|${tilt > 1.5}|${high}|${lanes}|${targets}`;
      if (k !== statKey) {
        statKey = k;
        const balls = Array.from({ length: BALLS }, (_, i) => `<span class="pb-lamp ${mode !== "attract" && i + 1 === ball ? "on" : ""}">${i + 1}</span>`).join("");
        statEl.innerHTML = `<span style="opacity:.7">BALL</span>${balls}<span class="pb-lamp ${mult > 1 ? "on" : ""}">×${mult}</span>${
          tilt > 1.5 && !tilted ? `<span class="pb-lamp warn">DANGER</span>` : ""
        }<span class="pb-hi">HI ${fmt(high)}</span>`;
      }
    }
    setHTML(stripEl, `BALL ${Math.max(1, ball)}<br>×${mult}${tilted ? " TILT" : ""}`);
    setHTML(miniEl, `${fmt(score)}<div class="pb-sub">BALL ${Math.max(1, ball)} ×${mult}${tilted ? " TILT" : ""}</div>`);
    if (hintEl) {
      const h =
        mode === "attract" ? "Tap to start" : mode === "plunger" ? (charging ? `Pulling… ${Math.round(power * 100)}%` : "Hold, pull down, release to launch") : tilted ? "TILT — flippers dead until the ball drains" : "";
      if (hintEl.textContent !== h) hintEl.textContent = h;
    }
  }

  function drawField(c: HTMLCanvasElement, t: number): void {
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    if (!cw || !ch) return;
    const px = 2;
    if (c.width !== cw * px || c.height !== ch * px) {
      c.width = cw * px;
      c.height = ch * px;
    }
    const g = c.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#05030c";
    g.fillRect(0, 0, c.width, c.height);
    const k = Math.min(c.width / W, c.height / H);
    const jig = shake * 3 * Math.sin(t / 18);
    g.setTransform(k, 0, 0, k, (c.width - W * k) / 2 + jig * k, (c.height - H * k) / 2);

    // Playfield art.
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#22104a");
    bg.addColorStop(0.6, "#120830");
    bg.addColorStop(1, "#0a0418");
    g.fillStyle = bg;
    g.beginPath();
    g.moveTo(4, 420);
    g.lineTo(4, 180);
    g.arc(180, 180, 176, Math.PI, 0);
    g.lineTo(356, 400);
    g.closePath();
    g.fill();
    g.fillStyle = "#fff";
    for (const s of STARS) {
      g.globalAlpha = 0.18 + s.s * 0.15;
      g.fillRect(s.x, s.y, s.s, s.s);
    }
    g.globalAlpha = 1;
    // A planet insert in the middle and arrow lamps pointing up the field.
    const pl = g.createRadialGradient(158, 236, 2, 166, 244, 34);
    pl.addColorStop(0, "#ffcf7a");
    pl.addColorStop(0.55, "#b8401f");
    pl.addColorStop(1, "rgba(60,10,40,0)");
    g.fillStyle = pl;
    g.beginPath();
    g.arc(166, 244, 34, 0, Math.PI * 2);
    g.fill();
    for (let i = 2; i <= 5; i++) {
      const on = mult >= i;
      g.fillStyle = on ? "#ffb23e" : "#3a1f55";
      g.font = "800 10px system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(`×${i}`, 112 + (i - 2) * 36, 300);
    }
    const save = mode === "play" && simT - launchedAt < SAVE_SECONDS && !tilted;
    g.fillStyle = save && Math.floor(t / 200) % 2 ? "#7ef0ff" : "#1b3a4a";
    g.font = "800 8px system-ui, sans-serif";
    g.fillText("SAVE", 166, 396);

    // Lane lamps and target lamps.
    LANES.forEach((x, i) => {
      g.fillStyle = lanes[i] ? "#ffb23e" : "#3a1f55";
      g.beginPath();
      g.arc(x, 82, 5, 0, Math.PI * 2);
      g.fill();
    });
    [150, 178, 206].forEach((y, i) => {
      g.fillStyle = targets[i] ? "#ffb23e" : "#3a1f55";
      g.beginPath();
      g.arc(26, y, 4, 0, Math.PI * 2);
      g.fill();
    });

    // Walls.
    g.lineCap = "round";
    g.lineJoin = "round";
    for (const s of SEGS) {
      if (s.kind === "sling") continue;
      g.strokeStyle = s.kind === "target" ? (targets[s.id] ? "#ffb23e" : "#e2582a") : "#9fd3ff";
      g.lineWidth = s.kind === "target" ? 5 : 3;
      g.beginPath();
      g.moveTo(s.ax, s.ay);
      g.lineTo(s.bx, s.by);
      g.stroke();
    }
    // Slingshots.
    for (const [i, m] of [(x: number) => x, mirror].entries()) {
      g.fillStyle = "#3a1650";
      g.beginPath();
      g.moveTo(m(52), 246);
      g.lineTo(m(52), 300);
      g.lineTo(m(86), 324);
      g.closePath();
      g.fill();
      const f = slingFlash[i]!;
      g.strokeStyle = f > 0 ? `rgb(255 ${200 + 55 * f} ${120 + 135 * f})` : "#ff6aa8";
      g.lineWidth = 4 + f * 2;
      g.beginPath();
      g.moveTo(m(52), 246);
      g.lineTo(m(86), 324);
      g.stroke();
    }
    // Bumpers.
    BUMPERS.forEach((k, i) => {
      const f = bumperFlash[i]!;
      g.fillStyle = "#1a0c2c";
      g.beginPath();
      g.arc(k.x, k.y, k.r + 2, 0, Math.PI * 2);
      g.fill();
      const cap = g.createRadialGradient(k.x - 4, k.y - 5, 1, k.x, k.y, k.r);
      cap.addColorStop(0, f > 0.2 ? "#ffffff" : "#ffe08a");
      cap.addColorStop(1, f > 0.2 ? "#ffb23e" : ["#e2582a", "#c23a8a", "#2a8ad8"][i]!);
      g.fillStyle = cap;
      g.beginPath();
      g.arc(k.x, k.y, k.r - 2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = f > 0.2 ? "#fff" : "#ffd58a";
      g.lineWidth = 2;
      g.stroke();
    });
    // Plunger spring.
    const top = mode === "plunger" ? PLUNGE.y + R + power * 14 : PLUNGE.y + R;
    g.strokeStyle = "#c9c2d8";
    g.lineWidth = 2;
    g.beginPath();
    for (let y = top, i = 0; y < 398; y += 3, i++) g.lineTo(PLUNGE.x + (i % 2 ? 5 : -5), y);
    g.stroke();
    // Flippers.
    for (const f of flippers) {
      const tx = f.px + f.s * Math.cos(f.a) * LEN;
      const ty = f.py + Math.sin(f.a) * LEN;
      g.strokeStyle = tilted ? "#5a5168" : "#f4f0ff";
      g.lineWidth = 15;
      g.beginPath();
      g.moveTo(f.px, f.py);
      g.lineTo((f.px + tx) / 2, (f.py + ty) / 2);
      g.stroke();
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo((f.px + tx) / 2, (f.py + ty) / 2);
      g.lineTo(tx, ty);
      g.stroke();
      g.strokeStyle = tilted ? "#3a3448" : "#e2582a";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(f.px, f.py);
      g.lineTo(tx, ty);
      g.stroke();
    }
    // Ball.
    if (mode !== "drain" && mode !== "attract") {
      const by = mode === "plunger" ? PLUNGE.y + power * 14 : b.y;
      const bl = g.createRadialGradient(b.x - 2.5, by - 3, 0.5, b.x, by, R);
      bl.addColorStop(0, "#ffffff");
      bl.addColorStop(0.45, "#c7cbd6");
      bl.addColorStop(1, "#4b4f5e");
      g.fillStyle = bl;
      g.beginPath();
      g.arc(b.x, by, R, 0, Math.PI * 2);
      g.fill();
    }
    if (mode === "attract") {
      g.fillStyle = "rgba(5,3,12,0.55)";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#ffb23e";
      g.textAlign = "center";
      g.font = "italic 900 30px system-ui, sans-serif";
      g.fillText("STARFOLD", 166, 200);
      g.font = "800 11px system-ui, sans-serif";
      g.fillStyle = Math.floor(t / 500) % 2 ? "#fff" : "#c9a6e8";
      g.fillText("TAP TO START", 166, 224);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  function paintThumbs(): void {
    thumbs.l?.classList.toggle("pb-on", flippers[0]!.on);
    thumbs.r?.classList.toggle("pb-on", flippers[1]!.on);
    thumbs.l?.classList.toggle("on", flippers[0]!.on);
    thumbs.r?.classList.toggle("on", flippers[1]!.on);
  }

  // --- pieces ---
  function el(tag: string, cls = "", html = ""): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function backglass(): HTMLElement {
    const root = el("div", "pb pb-col pb-glass");
    artEl = el("div", "pb-art", ART);
    tiltEl = el("div", "pb-tilt", "TILT");
    artEl.append(tiltEl);
    dmd = document.createElement("canvas");
    dmd.className = "pb-dmd";
    dmd.setAttribute("role", "img");
    dmd.setAttribute("aria-label", "Score display");
    dmdCols = 128;
    dmdRows = 32;
    statEl = el("div", "pb-stat");
    root.append(artEl, dmd, statEl);
    return root;
  }

  function nudgeButton(cls = "pb-nudge"): HTMLElement {
    const n = el("button", `pb-btn ${cls}`, "Nudge");
    n.setAttribute("aria-label", "Nudge the table");
    n.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      unlock();
      nudge();
    });
    return n;
  }

  /** The playfield, with each half of the glass a flipper button. */
  function playfield(opts: { zones: boolean; nudge: boolean; fold?: "top" | "left" }): HTMLElement {
    const root = el("div", `pb-field${opts.fold ? ` fold-${opts.fold}` : ""}`);
    field = document.createElement("canvas");
    field.setAttribute("role", "img");
    field.setAttribute("aria-label", "Pinball playfield");
    root.append(field);
    if (opts.zones) {
      for (const side of ["l", "r"] as const) {
        const z = el("div", `pb-zone ${side}`);
        z.setAttribute("aria-label", side === "l" ? "Left flipper" : "Right flipper");
        bindZone(z, side);
        root.append(z, el("span", `pb-tag ${side}`, side === "l" ? "◀ FLIP" : "FLIP ▶"));
      }
    }
    if (opts.nudge) root.append(nudgeButton());
    hintEl = el("div", "pb-hint");
    root.append(hintEl);
    return root;
  }

  function render(s: DuoState): void {
    const { pose } = s;
    // Hold the ball for a beat whenever the phone changes shape mid-ball.
    if (pose.id !== prevPose && mode === "play") resumeAt = performance.now() + 900;
    prevPose = pose.id;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    field = dmd = null;
    tiltEl = artEl = statEl = hintEl = miniEl = stripEl = null;
    thumbs = { l: null, r: null };
    dmdKey = statKey = "";
    // Releasing everything on a pose change avoids a flipper stuck up.
    held.l.clear();
    held.r.clear();
    setFlip(0, false);
    setFlip(1, false);
    charging = false;

    if (pose.id === "closed") {
      const root = el("div", "pb pb-closed");
      const strip = el("div", "pb-strip");
      dmd = document.createElement("canvas");
      dmd.className = "pb-dmd strip";
      dmd.style.flex = "1";
      dmdCols = 100;
      dmdRows = 13;
      stripEl = el("div", "pb-mini");
      strip.append(dmd, stripEl);
      const play = el("div", "pb-play");
      play.style.position = "relative";
      play.append(playfield({ zones: true, nudge: true }));
      root.append(strip, play);
      screens.outer.append(root);
    } else if (pose.id === "closed-landscape") {
      const root = el("div", "pb pb-cl");
      const left = el("div", "pb-pad");
      const right = el("div", "pb-pad");
      left.append(nudgeButton(""));
      const lt = el("div", "pb-thumb", "◀<br>FLIP");
      const rt = el("div", "pb-thumb", "▶<br>FLIP");
      lt.setAttribute("aria-label", "Left flipper");
      rt.setAttribute("aria-label", "Right flipper");
      bindZone(lt, "l");
      bindZone(rt, "r");
      thumbs = { l: lt, r: rt };
      left.append(lt);
      miniEl = el("div", "pb-score");
      right.append(miniEl, rt);
      const mid = el("div", "pb-play");
      mid.style.position = "relative";
      mid.append(playfield({ zones: false, nudge: false }));
      root.append(left, mid, right);
      screens.outer.append(root);
    } else {
      screens.start.append(backglass());
      const play = el("div", "pb pb-play");
      // Keep the flipper buttons clear of the fold (HIG checklist §6).
      play.append(playfield({ zones: true, nudge: true, fold: pose.split === "stacked" ? "top" : "left" }));
      screens.end.append(play);
    }
    paintThumbs();
  }

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("visibilitychange", onVisible);
      style.remove();
    },
  };
}

export const pinballExample: Example = {
  id: "pinball",
  title: "Pinball",
  category: "games",
  summary:
    "Set the Duo down like a tiny laptop and it is a pinball machine: the flat half is the playfield under your thumbs, the standing half is the backglass with original art, a dot-matrix score and a TILT lamp.",
  bestPose: "table",
  poses: {
    closed: "A compact single-screen table with the dot-matrix score in a strip across the top; tap the left or right half to flip.",
    "closed-landscape": "Turned on its side: the table sits in the middle and the flipper buttons sit under your thumbs on either edge, with the score on the trailing side.",
    open: "Backglass on the left page, playfield on the right; each half of the right page is a flipper button.",
    "open-portrait": "The table-pose layout lying flat: backglass above, playfield below.",
    book: "Backglass on the left page, playfield on the right — like looking at a machine from the side.",
    table: "The real cabinet: the flat bottom half is the playfield, with gravity running toward you and a flipper under each thumb; the standing top half is the backglass with the score, ball count and TILT.",
    stand: "Stood on its edge, backglass left and playfield right — good for watching a friend play, or for a game with a keyboard (Z and /, Space to launch).",
  },
  principle:
    "Table pose puts what you watch — the backglass and score — on the standing half, and what you touch — the flippers — on the stable flat half (HIG checklist §6, 'Destination follows purpose'); the ball survives every fold because state lives outside the screens (HIG, 'Displays, poses, and continuity').",
  create,
};
