/**
 * Pocket Pal — an egg-shaped keychain pet that lives in the phone.
 *
 * Closed, the outer display *is* the toy: a speckled egg with a tiny
 * monochrome LCD, three buttons and a row of printed care icons — select,
 * confirm, cancel, the way these things have always worked. Open the phone
 * and you step inside its little house in colour: the room on one half, the
 * garden on the other. Drag a snack to it, play catch in the garden, sweep up.
 *
 * Folding is tucking in: close the phone at night (or when it is tired) and
 * the lights go out and it sleeps; open it and it wakes up. Every one of
 * those things also has a button — the lamp on the LCD menu, the lamp in the
 * room — so no care is ever tied to a pose.
 *
 * Time runs fast: one real minute is one pet hour. Hunger, happiness and
 * energy decay as it does, in memory only.
 *
 * The creature, the egg and every icon are original pixel art drawn here.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, note, now, ready, running } from "../lib/audio.ts";

const NAME = "Mochi";

type Mood = "idle" | "happy" | "sleep" | "sad" | "eat";
type Scene = "room" | "garden";
type Pal = Record<string, string>;

// ---------- pixel art (original) ----------

const pad = (rows: string[], w = 16) => rows.map((r) => r.padEnd(w, ".").slice(0, w));

function petRows(mood: Mood, frame: number): string[] {
  const r = [
    frame ? "....l......l...." : ".....l....l.....",
    frame ? ".....l....l....." : "....l.l..l.l....",
    ".....l....l.....",
    "....########....",
    "...#oooooooo#...",
    "..#oooooooooo#..",
    ".#oooeooooeooo#.",
    ".#oooeooooeooo#.",
    ".#occoooooocco#.",
    ".#ooooommooooo#.",
    ".#oooooooooooo#.",
    "..#oooooooooo#..",
    "...#oooooooo#...",
    "....########....",
    frame ? ".....##..##....." : "....##....##....",
    "................",
  ];
  if (mood === "sleep") {
    r[6] = ".#oooooooooooo#.";
    r[7] = ".#ooo##oo##ooo#.";
  } else if (mood === "happy") {
    r[7] = ".#oo#o#oo#o#oo#.";
    r[6] = ".#oooeooooeooo#.";
    r[9] = ".#oooommmmoooo#.";
    r[10] = ".#ooooommooooo#.";
  } else if (mood === "sad") {
    r[9] = ".#ooooommooooo#.";
    r[10] = ".#oooomoomoooo#.";
    r[6] = ".#oooooooooooo#.";
  } else if (mood === "eat") {
    r[9] = frame ? ".#oooommmmoooo#." : ".#ooooommooooo#.";
    r[10] = frame ? ".#oooommmmoooo#." : ".#oooooooooooo#.";
  }
  return r;
}

const EGG = pad([
  "................",
  "......####......",
  ".....#oooo#.....",
  "....#oossoo#....",
  "...#oooooooo#...",
  "...#ossooooo#...",
  "..#oooooossoo#..",
  "..#oooooooooo#..",
  "..#oossoooooo#..",
  "..#oooooooooo#..",
  "..#ooooossooo#..",
  "...#oooooooo#...",
  "...#oooooooo#...",
  "....#oooooo#....",
  ".....######.....",
  "................",
]);

const CRACKS: [number, number][][] = [
  [],
  [[6, 6], [7, 7], [8, 6]],
  [[4, 7], [5, 6], [6, 6], [7, 7], [8, 6], [9, 7], [10, 6]],
  [[3, 7], [4, 7], [5, 6], [6, 6], [7, 7], [8, 6], [9, 7], [10, 6], [11, 7], [12, 7]],
];

const APPLE = pad(["....kg..", "...k....", ".rr.rr..", "rrrrrrr.", "rrwrrrr.", "rrrrrrr.", ".rrrrr..", "..r.r..."], 8);
const CAKE = pad(["...hh...", "..pppp..", ".pppppp.", "cccccccc", "yyyyyyyy", "cccccccc", "yyyyyyyy", "........"], 8);
const BALL = pad([".rrr.", "rwrrr", "rrrrr", "rrrrb", ".rbb."], 5);
const MESS = pad(["..b..", ".bb..", ".bbb.", "bbbbb", "....."], 5);
const ZED = ["####", "..#.", ".#..", "####"];
const HEART = [".#.#.", "#####", "#####", ".###.", "..#.."];
const HEART_E = [".#.#.", "#.#.#", "#...#", ".#.#.", "..#.."];
const DIGITS: Record<string, string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  ":": [".", "#", ".", "#", "."],
  "/": ["..#", "..#", ".#.", "#..", "#.."],
};

/** Menu icons, printed on the shell above the LCD. */
const ICONS = {
  feed: ["....##..", "...#....", ".##.##..", "#######.", "#######.", "#######.", ".#####..", "..#.#..."],
  play: ["..####..", ".#..#.#.", "#..#...#", "#.#....#", "#....#.#", "#...#..#", ".#.#..#.", "..####.."],
  clean: ["......#.", ".....#..", "....#...", "...#....", "..###...", ".#####..", "#.#.#.#.", "#.#.#.#."],
  light: ["..####..", ".#....#.", "#......#", "#......#", ".#....#.", "..####..", "..#..#..", "...##..."],
  stats: ["......##", "......##", "...##.##", "...##.##", "##.##.##", "##.##.##", "##.##.##", "########"],
} as const;
type MenuId = keyof typeof ICONS;
const MENU: MenuId[] = ["feed", "play", "clean", "light", "stats"];
const MENU_LABEL: Record<MenuId, string> = { feed: "Feed", play: "Play", clean: "Clean", light: "Light", stats: "Stats" };
const BOLT = ["....##..", "...##...", "..##....", ".######.", "....##..", "...##...", "..##....", ".#......"];
const SMILE = [".######.", "#......#", "#.#..#.#", "#......#", "#.#..#.#", "#..##..#", "#......#", ".######."];

function svgPix(rows: readonly string[], color: string, size = 18): string {
  const w = rows[0]!.length;
  const h = rows.length;
  let rects = "";
  rows.forEach((r, y) => [...r].forEach((c, x) => (c !== "." ? (rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`) : null)));
  return `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${size}" fill="${color}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

function svgColor(rows: readonly string[], pal: Pal, size: number): string {
  const w = rows[0]!.length;
  const h = rows.length;
  let rects = "";
  rows.forEach((r, y) => [...r].forEach((c, x) => (pal[c] ? (rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${pal[c]}"/>`) : null)));
  return `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

function blit(g: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, pal: Pal): void {
  for (let j = 0; j < rows.length; j++) {
    const r = rows[j]!;
    for (let i = 0; i < r.length; i++) {
      const c = pal[r[i]!];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
    }
  }
}

const INK = "#24301f";
const LCD_BG = "#b3c29b";
const COLOR: Pal = { "#": "#4a2f3d", o: "#ffe2bd", e: "#2a1a22", c: "#ff9db0", m: "#b43d55", l: "#3fa34d", s: "#f0a35a", r: "#e8433d", w: "#ffd0c8", k: "#6b4428", g: "#4caf50", p: "#ff9ec4", h: "#e8433d", y: "#fff1c9", b: "#8a5a2b" };
const FOOD_PAL: Pal = { r: "#e8433d", w: "#ffc7bd", k: "#6b4428", g: "#4caf50", p: "#ff9ec4", h: "#e8433d", c: "#f7c873", y: "#fff1c9" };

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string): number {
  g.fillStyle = color;
  for (const ch of s) {
    const glyph = DIGITS[ch];
    if (!glyph) {
      x += 2;
      continue;
    }
    glyph.forEach((r, j) => [...r].forEach((c, i) => (c === "#" ? g.fillRect(x + i, y + j, 1, 1) : null)));
    x += glyph[0]!.length + 1;
  }
  return x;
}

const textWidth = (s: string) => [...s].reduce((w, ch) => w + (DIGITS[ch]?.[0]!.length ?? 1) + 1, -1);

// ---------- styles ----------

const CSS = `
.vp { position:absolute; inset:0; box-sizing:border-box; font:12px/1.25 ui-rounded, system-ui, -apple-system, sans-serif; color:#fff; overflow:hidden; }
.vp button { cursor:pointer; font:inherit; }
.vp-desk { background: radial-gradient(120% 90% at 50% 20%, #3b3352, #17131f 75%); display:grid; place-items:center; }
.vp-egg { position:relative; width:min(262px, 88cqw); height:min(340px, 92cqh); border-radius:50% 50% 50% 50% / 58% 58% 42% 42%;
  background:
    radial-gradient(circle at 30% 22%, rgb(255 255 255 / 0.55), transparent 22%),
    radial-gradient(circle at 20% 60%, #ffffff55 0 3px, transparent 4px) 0 0 / 46px 52px,
    radial-gradient(circle at 70% 30%, #ffffff44 0 2px, transparent 3px) 0 0 / 38px 34px,
    radial-gradient(120% 100% at 40% 30%, #ff9fbf, #e35d8c 60%, #a8336a);
  box-shadow: inset -10px -16px 30px rgb(80 0 40 / 0.45), inset 8px 10px 20px rgb(255 255 255 / 0.35), 0 16px 30px rgb(0 0 0 / 0.5);
  display:flex; flex-direction:column; align-items:center; padding-top:40px; box-sizing:border-box; }
.vp-ring { position:absolute; top:-6px; left:50%; width:28px; height:20px; margin-left:-14px; border:4px solid #c9c9d6; border-bottom:0; border-radius:16px 16px 0 0; box-shadow: 0 -1px 0 #fff8 inset; }
.vp-brand { font:800 10px ui-rounded, system-ui; letter-spacing:0.18em; color:#fff3f8; text-shadow:0 1px 0 #a8336a; text-transform:uppercase; }
.vp-icons { display:flex; gap:6px; margin:6px 0 5px; }
.vp-icons span { display:grid; place-items:center; width:24px; height:22px; border-radius:6px; color:#5c1838; opacity:0.55; transition: opacity .15s, background .15s; }
.vp-icons span.on { opacity:1; background:#fff6; box-shadow:0 0 0 1.5px #5c1838 inset; }
.vp-bezel { padding:9px; border-radius:18px; background: linear-gradient(160deg, #3a2a40, #1d1422); box-shadow: inset 0 2px 6px #000a, 0 1px 0 #fff6; }
.vp-lcd { display:block; width:160px; height:128px; image-rendering:pixelated; border-radius:6px; background:${LCD_BG}; }
.vp-lcdwrap { position:relative; }
.vp-lcdwrap::after { content:""; position:absolute; inset:0; border-radius:6px; pointer-events:none;
  background: repeating-linear-gradient(0deg, rgb(0 0 0 / 0.06) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgb(0 0 0 / 0.06) 0 1px, transparent 1px 4px);
  box-shadow: inset 0 0 12px rgb(0 0 0 / 0.25); }
.vp-msg { height:16px; margin-top:4px; font:700 10.5px ui-rounded, system-ui; color:#fff; text-shadow:0 1px 0 #8a2a58; text-align:center; white-space:nowrap; }
.vp-btns { display:flex; gap:16px; margin-top:4px; }
.vp-btns.vp-col { flex-direction:column; gap:10px; margin:0; }
.vp-btn { display:flex; flex-direction:column; align-items:center; gap:3px; border:0; background:none; padding:0; color:#fff3f8; font:700 9px ui-rounded, system-ui; letter-spacing:0.04em; }
.vp-btn i { display:block; width:34px; height:34px; border-radius:50%; background: radial-gradient(circle at 35% 30%, #fff8d8, #ffd34d 45%, #d99a12);
  box-shadow: 0 3px 0 #9a6a00, 0 5px 8px rgb(0 0 0 / 0.35); transition: transform .06s, box-shadow .06s; }
.vp-btn:active i { transform: translateY(3px); box-shadow: 0 0 0 #9a6a00, 0 2px 4px rgb(0 0 0 / 0.35); }
.vp-btn span { min-width:44px; text-align:center; text-shadow:0 1px 0 #8a2a58; }
.vp-land .vp-egg { width:min(356px, 95cqw); height:min(268px, 92cqh); border-radius:58% 42% 42% 58% / 50% 50% 50% 50%; flex-direction:row; padding:0 22px 0 34px; gap:14px; align-items:center; }
.vp-land .vp-ring { top:50%; left:-8px; margin:-14px 0 0; width:20px; height:28px; border:4px solid #c9c9d6; border-right:0; border-radius:16px 0 0 16px; }
.vp-land .vp-lcd { width:176px; height:140px; }
.vp-land .vp-face { display:flex; flex-direction:column; align-items:center; }
.vp-land .vp-icons { margin:4px 0 5px; }

.vp-house { background:#2a2238; }
.vp-scene { position:absolute; inset:0; width:100%; height:100%; image-rendering:pixelated; touch-action:none; }
.vp-bar { position:absolute; left:8px; right:8px; display:flex; gap:6px; align-items:center; z-index:2; }
.vp-top { top:8px; }
.vp-bottom { bottom:8px; }
.vp-chip { background:rgb(30 22 40 / 0.72); backdrop-filter: blur(4px); border-radius:12px; padding:5px 9px; font:700 11px ui-rounded, system-ui; display:flex; align-items:center; gap:6px; }
.vp-tool { border:0; border-radius:12px; min-width:44px; height:44px; padding:0 9px; display:flex; align-items:center; justify-content:center; gap:5px;
  background:rgb(255 255 255 / 0.92); color:#3a2340; font:800 11px ui-rounded, system-ui; box-shadow:0 2px 0 #0003; touch-action:none; }
.vp-tool:active { transform: translateY(1px); }
.vp-tool.vp-on { background:#ffd34d; }
.vp-food { padding:0 6px; }
.vp-tray { display:flex; gap:6px; background:rgb(30 22 40 / 0.6); border-radius:14px; padding:4px; }
.vp-grow { flex:1; }
.vp-meters { min-width:120px; display:grid; grid-template-columns:auto 1fr; gap:3px 6px; align-items:center; background:rgb(30 22 40 / 0.72); border-radius:12px; padding:6px 9px; font:700 10px ui-rounded, system-ui; }
.vp-meters b { display:block; height:6px; border-radius:3px; background:#ffffff26; overflow:hidden; }
.vp-meters b i { display:block; height:100%; border-radius:3px; transition: width .4s; }
.vp-toast { position:absolute; left:50%; top:46px; transform:translateX(-50%); z-index:3; background:#fff; color:#3a2340; border-radius:14px; padding:6px 12px; font:800 12px ui-rounded, system-ui; white-space:nowrap; box-shadow:0 4px 12px #0005; pointer-events:none; transition: opacity .25s; }
.vp-toast::after { content:""; position:absolute; left:50%; bottom:-5px; margin-left:-5px; border:5px solid transparent; border-bottom:0; border-top-color:#fff; }
.vp-ghost { position:absolute; z-index:9; pointer-events:none; transform:translate(-50%,-50%) scale(1.3); filter: drop-shadow(0 4px 4px #0006); }
.vp-score { font:800 12px ui-rounded, system-ui; }
.vp-stand .vp-frame { position:absolute; inset:0; pointer-events:none; z-index:1; border:7px solid #8a5a35; box-shadow: inset 0 0 0 2px #5e3a20; }
.vp-stand.vp-l .vp-frame { border-right-width:3px; border-radius:16px 0 0 16px; }
.vp-stand.vp-r .vp-frame { border-left-width:3px; border-radius:0 16px 16px 0; }
.vp-stand .vp-top { top:14px; } .vp-stand .vp-bottom { bottom:14px; }
.vp-stand .vp-bar { left:14px; right:14px; }
.vp-l .vp-bar { right:24px; } .vp-r .vp-bar { left:24px; }
.vp-t .vp-bar.vp-bottom { bottom:24px; } .vp-b .vp-bar.vp-top { top:24px; }

.vp-pad { background: linear-gradient(180deg, #3d2d4a, #241a2e); display:flex; flex-direction:column; gap:8px; padding:24px 12px 12px; }
.vp-pad .vp-meters { grid-template-columns:auto 1fr auto 1fr; }
.vp-padgrid { flex:1; display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; min-height:0; }
.vp-padgrid .vp-tool { height:auto; min-height:44px; flex-direction:column; gap:2px; font-size:11px; }
.vp-strip { flex:1; border-radius:16px; background: repeating-linear-gradient(90deg, #ffffff10 0 2px, transparent 2px 24px), #4a8a3f; display:grid; place-items:center; touch-action:none; font:800 13px ui-rounded, system-ui; color:#fff; text-shadow:0 1px 0 #0006; position:relative; }
.vp-strip i { position:absolute; bottom:10px; width:44px; height:10px; margin-left:-22px; border-radius:5px; background:#ffd34d; }
.vp-padrow { display:flex; gap:8px; }
`;

// ---------- the example ----------

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let state = initial;
  let lastDisplay = initial.pose.display;
  let hatch = 0; // 0..1 until hatched
  let hatched = false;
  let clock = 18; // pet hours; starts at 6 pm
  let bornAt = 0;
  let fullness = 70;
  let happy = 70;
  let energy = 60;
  let mess = 0;
  let messTimer = 0;
  let asleep = false;
  let lightsOn = true;
  const pet = { x: 0.5, tx: 0.5, where: "room" as Scene, cross: false, wander: 3 };
  let eatUntil = 0;
  let eatFood: readonly string[] = APPLE;
  let happyUntil = 0;
  let sweepAt = -10;
  let toast = { text: "", until: 0 };
  // LCD
  let mode: "home" | "feed" | "stats" | "game" = "home";
  let menu = -1;
  let feedPick = 0;
  let statsPage = 0;
  const lcdGame = { round: 0, wins: 0, phase: "ask" as "ask" | "show" | "done", guess: 0, answer: 0, until: 0 };
  // garden catch
  const ball = { active: false, x: 0.5, y: 0, vx: 0, vy: 0, n: 0, caught: 0, wait: 0, flash: 0 };

  let t = 0; // seconds since create
  let dead = false;
  let raf = 0;
  let last = performance.now();
  let uiTick = 0;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  // --- per-render references ---
  let lcd: CanvasRenderingContext2D | null = null;
  const scenes: { g: CanvasRenderingContext2D; scene: Scene | "auto"; w: number; h: number }[] = [];
  let refresh: (() => void)[] = [];

  // --- helpers ---
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const hour = () => ((clock % 24) + 24) % 24;
  const night = () => hour() >= 21 || hour() < 7;
  const sleepy = () => energy < 40 || night();
  const days = () => Math.floor((clock - bornAt) / 24);
  const clockText = () => `${String(Math.floor(hour())).padStart(2, "0")}:${String(Math.floor((hour() % 1) * 60)).padStart(2, "0")}`;
  const say = (s: string, secs = 2.2) => (toast = { text: s, until: t + secs });
  const mood = (): Mood => {
    if (asleep) return "sleep";
    if (t < eatUntil) return "eat";
    if (t < happyUntil) return "happy";
    if (fullness < 25 || happy < 25) return "sad";
    return "idle";
  };

  function sfx(fn: () => void): void {
    void ready()
      .then(fn)
      .catch(() => {});
  }
  const play = (fn: () => void) => {
    if (running()) fn();
  };
  const blip = () => note(96, 0.04, 0.06, "square");
  const chew = () => {
    const n = now();
    [0, 0.14, 0.28].forEach((d) => burst(0.05, 0.25, 900, 1.5, n + d));
  };
  const cheer = () => {
    const n = now();
    [76, 79, 84].forEach((m, i) => note(m, 0.1, 0.08, "square", n + i * 0.09));
  };
  const lullaby = () => {
    const n = now();
    [79, 76, 72].forEach((m, i) => note(m, 0.3, 0.07, "triangle", n + i * 0.3));
  };
  const morning = () => {
    const n = now();
    [72, 76, 79, 84].forEach((m, i) => note(m, 0.12, 0.07, "triangle", n + i * 0.1));
  };
  const fanfare = () => {
    const n = now();
    [72, 76, 79, 84, 79, 84].forEach((m, i) => note(m, 0.12, 0.08, "square", n + i * 0.11));
  };

  // --- care actions (the same verbs from every pose) ---
  function feed(kind: "meal" | "snack"): boolean {
    if (!hatched) return false;
    if (asleep) return say(`Shh… ${NAME} is asleep`), false;
    if (fullness >= 95) return say(`${NAME} is full!`), false;
    fullness = clamp(fullness + (kind === "meal" ? 32 : 12));
    happy = clamp(happy + (kind === "meal" ? 3 : 10));
    eatFood = kind === "meal" ? APPLE : CAKE;
    eatUntil = t + 1.6;
    say(kind === "meal" ? "Nom nom nom" : "A treat!");
    play(chew);
    return true;
  }
  function clean(): void {
    if (!hatched) return;
    if (!mess) return void say("Already spotless");
    mess = 0;
    happy = clamp(happy + 4);
    sweepAt = t;
    say("Squeaky clean!");
    play(() => burst(0.5, 0.25, 3000, 0.7, undefined, "highpass"));
  }
  function toggleLight(): void {
    if (!hatched) return;
    if (lightsOn) {
      lightsOn = false;
      if (!asleep && sleepy()) {
        asleep = true;
        say("Night night…");
        play(lullaby);
      } else if (!asleep) say(`Too dark! ${NAME} isn't sleepy`);
      else say("Lights out");
    } else {
      lightsOn = true;
      if (asleep) wake("Morning already?");
    }
  }
  function tuck(): void {
    asleep = true;
    lightsOn = false;
    pet.where = "room";
    ball.active = false;
    say("Tucked in. Zzz…", 3);
    play(lullaby);
  }
  function wake(msg = "Good morning!"): void {
    asleep = false;
    lightsOn = true;
    if (energy < 30) {
      happy = clamp(happy - 5);
      say("Yawn… still tired", 2.6);
    } else say(msg, 2.6);
    play(morning);
  }
  function startCatch(): void {
    if (!hatched) return;
    if (asleep) return void say(`Shh… ${NAME} is asleep`);
    if (energy < 10) return void say("Too tired to play");
    Object.assign(ball, { active: true, n: 0, caught: 0, wait: 0.6, y: -1 });
    pet.where = "garden";
    pet.cross = false;
    say("Catch!");
  }
  function stopCatch(): void {
    if (!ball.active) return;
    ball.active = false;
    happy = clamp(happy + ball.caught * 5);
    energy = clamp(energy - 4 - ball.n);
    happyUntil = t + 1.5;
    say(`Caught ${ball.caught} of ${ball.n}!`, 2.6);
    play(cheer);
  }
  function goOutside(): void {
    if (!hatched || asleep) return void (asleep && say(`Shh… ${NAME} is asleep`));
    pet.where = pet.where === "room" ? "garden" : "room";
    pet.x = pet.tx = 0.5;
    pet.cross = false;
    if (pet.where === "room") ball.active = false;
  }

  // --- LCD buttons: A select, B confirm, C cancel ---
  function press(b: "A" | "B" | "C"): void {
    if (!hatched) {
      hatch = Math.min(0.99, hatch + 0.12);
      play(blip);
      return;
    }
    play(blip);
    if (mode === "game") {
      if (b === "C") return void (mode = "home");
      if (lcdGame.phase !== "ask") return;
      lcdGame.guess = b === "A" ? -1 : 1;
      lcdGame.answer = Math.random() < 0.5 ? -1 : 1;
      lcdGame.phase = "show";
      lcdGame.until = t + 1.1;
      if (lcdGame.guess === lcdGame.answer) {
        lcdGame.wins++;
        play(() => note(88, 0.12, 0.08, "square"));
      }
      return;
    }
    if (mode === "feed") {
      if (b === "A") feedPick = 1 - feedPick;
      else if (b === "B") {
        if (feed(feedPick ? "snack" : "meal")) mode = "home";
      } else mode = "home";
      return;
    }
    if (mode === "stats") {
      if (b === "C") mode = "home";
      else statsPage = (statsPage + 1) % 4;
      return;
    }
    if (b === "A") menu = (menu + 1) % MENU.length;
    else if (b === "C") menu = -1;
    else if (menu >= 0) {
      const m = MENU[menu]!;
      if (asleep && m !== "light" && m !== "stats") return void say(`Shh… ${NAME} is asleep`);
      if (m === "feed") (mode = "feed"), (feedPick = 0);
      else if (m === "play") {
        if (energy < 10) say("Too tired to play");
        else Object.assign(lcdGame, { round: 0, wins: 0, phase: "ask" }), (mode = "game");
      } else if (m === "clean") clean();
      else if (m === "light") toggleLight();
      else (mode = "stats"), (statsPage = 0);
    }
    paintChrome();
  }

  // --- simulation ---
  function step(dt: number): void {
    t += dt;
    if (!hatched) {
      hatch += dt / 7;
      if (hatch >= 1) {
        hatched = true;
        bornAt = clock;
        happyUntil = t + 2;
        say(`${NAME} hatched!`, 3);
        play(fanfare);
      }
      return;
    }
    const h = dt / 60; // one real minute is one pet hour
    clock += h;
    if (asleep) {
      energy = clamp(energy + (lightsOn ? 7 : 16) * h);
      fullness = clamp(fullness - 3 * h);
      if (lightsOn) happy = clamp(happy - 2 * h);
      if (energy >= 100 && !night()) wake();
    } else {
      fullness = clamp(fullness - 8 * h);
      happy = clamp(happy - (4 + mess * 3 + (fullness < 20 ? 4 : 0)) * h);
      energy = clamp(energy - (ball.active && state.pose.display === "inner" ? 12 : 5) * h);
      messTimer += h;
      if (messTimer > 3.5 && mess < 3) {
        mess++;
        messTimer = 0;
      }
      if (night() && energy < 22) {
        asleep = true;
        say("Dozed off… lights?", 2.6);
      }
    }
    // LCD game
    if (mode === "game" && lcdGame.phase !== "ask" && t > lcdGame.until) {
      if (lcdGame.phase === "show") {
        lcdGame.round++;
        if (lcdGame.round >= 5) {
          lcdGame.phase = "done";
          lcdGame.until = t + 1.6;
        } else lcdGame.phase = "ask";
      } else {
        happy = clamp(happy + lcdGame.wins * 5);
        energy = clamp(energy - 5);
        happyUntil = t + 1.5;
        say(`Won ${lcdGame.wins} of 5`);
        mode = "home";
      }
    }
    // movement
    const inner = state.pose.display === "inner";
    if (asleep) {
      pet.where = "room";
      pet.x = 0.22;
    } else if (ball.active && inner) {
      const sp = 1.1 * dt;
      pet.x += Math.max(-sp, Math.min(sp, pet.tx - pet.x));
    } else if (t > eatUntil) {
      pet.wander -= dt;
      if (pet.wander <= 0) {
        pet.wander = 2 + Math.random() * 4;
        if (inner && state.pose.split === "side-by-side" && Math.random() < 0.25 && !night()) {
          pet.cross = true;
          pet.tx = pet.where === "room" ? 1.1 : -0.1;
        } else pet.tx = 0.15 + Math.random() * 0.7;
      }
      const sp = 0.18 * dt;
      pet.x += Math.max(-sp, Math.min(sp, pet.tx - pet.x));
      if (pet.cross && Math.abs(pet.tx - pet.x) < 0.01) {
        pet.where = pet.where === "room" ? "garden" : "room";
        pet.x = pet.where === "garden" ? -0.1 : 1.1;
        pet.tx = pet.where === "garden" ? 0.3 : 0.7;
        pet.cross = false;
      }
    }
    // catch game
    if (ball.active && inner) {
      if (ball.y < 0) {
        ball.wait -= dt;
        if (ball.wait <= 0) Object.assign(ball, { x: 0.15 + Math.random() * 0.7, y: 0, vx: (Math.random() - 0.5) * 0.5, vy: 0.15 });
      } else {
        ball.vy += 0.55 * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x < 0.05 || ball.x > 0.95) ball.vx *= -1;
        if (ball.y >= 1) {
          ball.n++;
          if (Math.abs(ball.x - pet.x) < 0.14) {
            ball.caught++;
            happyUntil = t + 0.8;
            ball.flash = t + 0.5;
            play(() => note(84, 0.1, 0.1, "square"));
          } else play(() => burst(0.08, 0.2, 400, 1));
          ball.y = -1;
          ball.wait = 0.5;
          if (ball.n >= 6) stopCatch();
        }
      }
    }
  }

  // --- drawing: LCD ---
  function drawLcd(g: CanvasRenderingContext2D): void {
    const W = 40;
    const H = 32;
    const dark = !lightsOn && hatched;
    g.fillStyle = dark ? "#1c2218" : LCD_BG;
    g.fillRect(0, 0, W, H);
    const ink = dark ? "#71815f" : INK;
    const pal: Pal = { "#": ink, e: ink, m: ink, l: ink, s: ink };
    const frame = Math.floor(t * 2) % 2;
    if (!hatched) {
      const stage = Math.min(3, Math.floor(hatch * 4));
      const wob = hatch > 0.5 ? Math.round(Math.sin(t * (6 + hatch * 14))) : 0;
      blit(g, EGG, 12 + wob, 9, pal);
      g.fillStyle = ink;
      for (const [x, y] of CRACKS[stage]!) g.fillRect(12 + wob + x, 9 + y, 1, 1);
      return;
    }
    if (mode === "stats") {
      if (statsPage === 0) {
        const s = clockText();
        text(g, s, Math.round((W - textWidth(s)) / 2), 7, ink);
        const a = `${days()}`;
        g.fillStyle = ink;
        const x = text(g, a, 14, 19, ink);
        blit(g, ["..#", "..#", "###", "#.#", "###"], x + 1, 19, { "#": ink });
        return;
      }
      const v = [fullness, happy, energy][statsPage - 1]!;
      blit(g, [ICONS.feed, SMILE, BOLT][statsPage - 1]!, 16, 4, { "#": ink });
      for (let i = 0; i < 4; i++) blit(g, v > i * 25 + 5 ? HEART : HEART_E, 6 + i * 7, 19, { "#": ink });
      return;
    }
    if (mode === "feed") {
      blit(g, APPLE, 8, 10, { r: ink, k: ink, g: ink });
      blit(g, CAKE, 24, 10, { h: ink, p: ink, c: ink });
      g.fillStyle = ink;
      const cx = feedPick ? 27 : 11;
      g.fillRect(cx, 21, 2, 1);
      g.fillRect(cx - 1, 22, 4, 1);
      return;
    }
    if (mode === "game") {
      let px = 12;
      let m: Mood = "idle";
      if (lcdGame.phase === "ask") {
        if (frame) {
          g.fillStyle = ink;
          [[3, 15], [4, 14], [4, 16], [36, 15], [35, 14], [35, 16]].forEach(([x, y]) => g.fillRect(x!, y!, 1, 1));
        }
      } else if (lcdGame.phase === "show") {
        px = 12 + lcdGame.answer * 8;
        m = lcdGame.guess === lcdGame.answer ? "happy" : "sad";
        if (m === "happy") blit(g, HEART, px + 5, 1, { "#": ink });
      } else {
        m = lcdGame.wins >= 3 ? "happy" : "sad";
        text(g, `${lcdGame.wins}/5`, 13, 1, ink);
      }
      blit(g, petRows(m, frame), px, 13, pal);
      return;
    }
    // home
    const m = mood();
    const px = Math.round(3 + Math.max(0, Math.min(1, pet.x)) * 17);
    const bob = m === "happy" ? (frame ? -2 : 0) : 0;
    blit(g, petRows(m, asleep ? 0 : frame), px, 13 + bob, pal);
    if (asleep) {
      const zy = 6 - (Math.floor(t * 1.5) % 3);
      blit(g, ZED, px + 15, zy, { "#": ink });
    }
    if (t < eatUntil) {
      const bite = Math.floor(((eatUntil - t) / 1.6) * 8);
      blit(g, eatFood.slice(8 - bite), px - 9, 21 + (8 - bite), { r: ink, k: ink, g: ink, h: ink, p: ink, c: ink });
    }
    for (let i = 0; i < mess; i++) blit(g, MESS, 34, 25 - i * 6, { b: ink });
    if (t - sweepAt < 1) {
      g.fillStyle = ink;
      const x = Math.round(W - ((t - sweepAt) / 1) * W);
      g.fillRect(x, 0, 1, H);
    }
    const needy = !asleep && (fullness < 25 || happy < 25 || mess >= 2 || (sleepy() && lightsOn && energy < 30));
    if ((needy || (asleep && lightsOn)) && frame) {
      g.fillStyle = ink;
      g.fillRect(38, 1, 1, 4);
      g.fillRect(38, 6, 1, 1);
    }
  }

  // --- drawing: the house in colour ---
  function sky(): [string, string] {
    const h = hour();
    if (h >= 7 && h < 17.5) return ["#62b8ff", "#bfe6ff"];
    if (h >= 17.5 && h < 19) return ["#ff8a65", "#ffd59e"];
    if (h >= 19 && h < 21) return ["#5a3f8c", "#e8798a"];
    if (h >= 5 && h < 7) return ["#7a6bb8", "#ffc1a8"];
    return ["#0f1533", "#26305e"];
  }

  function drawSky(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const [a, b] = sky();
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, a);
    grad.addColorStop(1, b);
    g.fillStyle = grad;
    g.fillRect(x, y, w, h);
    const hr = hour();
    if (night()) {
      g.fillStyle = "#fff";
      for (let i = 0; i < 14; i++) {
        const sx = x + ((i * 37) % w);
        const sy = y + ((i * 23) % Math.max(1, h * 0.7));
        if ((i + Math.floor(t)) % 5) g.fillRect(sx, sy, 1, 1);
      }
      g.fillStyle = "#fff6c8";
      g.fillRect(x + w * 0.7, y + 3, 4, 4);
      g.fillStyle = a;
      g.fillRect(x + w * 0.7 + 2, y + 2, 3, 3);
    } else {
      const p = Math.max(0, Math.min(1, (hr - 6) / 14));
      const sx = x + p * w;
      const sy = y + h * 0.15 + Math.abs(p - 0.5) * h * 0.6;
      g.fillStyle = hr > 17 ? "#ffb347" : "#ffe45c";
      g.fillRect(sx - 3, sy - 3, 6, 6);
      g.fillRect(sx - 2, sy - 4, 4, 8);
      g.fillRect(sx - 4, sy - 2, 8, 4);
    }
    // clouds drift
    g.fillStyle = night() ? "#ffffff22" : "#ffffffcc";
    for (let i = 0; i < 3; i++) {
      const cx = x + ((t * (2 + i) + i * 40) % (w + 30)) - 15;
      const cy = y + 6 + i * 7;
      g.fillRect(cx, cy, 14, 3);
      g.fillRect(cx + 3, cy - 2, 7, 2);
    }
  }

  function drawPetAt(g: CanvasRenderingContext2D, W: number, floor: number): void {
    const m = mood();
    const frame = Math.floor(t * 3) % 2;
    const moving = Math.abs(pet.tx - pet.x) > 0.01 && !asleep;
    const px = pet.x * W - 8;
    const bob = m === "happy" ? (frame ? -3 : 0) : moving && frame ? -1 : 0;
    blit(g, petRows(m, moving || m === "happy" || m === "eat" ? frame : 0), px, floor - 15 + bob, COLOR);
    if (t < eatUntil) {
      const bite = Math.floor(((eatUntil - t) / 1.6) * 8);
      blit(g, eatFood.slice(8 - bite), px + (pet.x > 0.5 ? -9 : 17), floor - 8 + (8 - bite), FOOD_PAL);
    }
  }

  function drawRoom(g: CanvasRenderingContext2D, W: number, H: number): void {
    const floor = Math.round(H * 0.74);
    g.fillStyle = "#f6d3b3";
    g.fillRect(0, 0, W, floor);
    g.fillStyle = "#efc39e";
    for (let x = 2; x < W; x += 7) g.fillRect(x, 0, 2, floor);
    g.fillStyle = "#c98f63";
    g.fillRect(0, floor - 2, W, 2);
    g.fillStyle = "#b8794a";
    g.fillRect(0, floor, W, H - floor);
    g.fillStyle = "#a66a3e";
    for (let y = floor + 4; y < H; y += 5) g.fillRect(0, y, W, 1);
    for (let y = floor, k = 0; y < H; y += 5, k++) g.fillRect(((k * 17) % 23) + 8, y, 1, 5);
    // window
    const wx = Math.round(W * 0.56);
    const wy = Math.round(H * 0.12);
    const ww = Math.round(W * 0.3);
    const wh = Math.round(H * 0.24);
    g.fillStyle = "#fff";
    g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
    drawSky(g, wx, wy, ww, wh);
    g.fillStyle = "#fff";
    g.fillRect(wx + ww / 2 - 1, wy, 2, wh);
    g.fillRect(wx, wy + wh / 2 - 1, ww, 2);
    g.fillStyle = "#7fc8a9";
    g.fillRect(wx - 4, wy - 3, 4, wh + 8);
    g.fillRect(wx + ww, wy - 3, 4, wh + 8);
    // picture
    g.fillStyle = "#8a5a35";
    g.fillRect(8, Math.round(H * 0.16), 14, 11);
    g.fillStyle = "#9fd8ff";
    g.fillRect(9, Math.round(H * 0.16) + 1, 12, 9);
    g.fillStyle = "#57a64a";
    g.fillRect(9, Math.round(H * 0.16) + 6, 12, 4);
    // bed
    const bx = Math.round(W * 0.22) - 13;
    g.fillStyle = "#8a5a35";
    g.fillRect(bx, floor - 12, 3, 12);
    g.fillRect(bx + 3, floor - 6, 24, 4);
    g.fillRect(bx + 26, floor - 8, 2, 8);
    g.fillStyle = "#fff";
    g.fillRect(bx + 3, floor - 9, 23, 3);
    // lamp
    const lx = Math.round(W * 0.47);
    g.fillStyle = "#6b4428";
    g.fillRect(lx, floor - 20, 1, 20);
    g.fillRect(lx - 3, floor - 1, 7, 1);
    g.fillStyle = lightsOn ? "#ffe07a" : "#c9a96a";
    g.fillRect(lx - 4, floor - 26, 9, 6);
    // bowl
    g.fillStyle = "#4b8bd6";
    g.fillRect(Math.round(W * 0.8), floor + 3, 9, 3);
    // mess
    for (let i = 0; i < mess; i++) blit(g, MESS, Math.round(W * 0.62) + i * 7, floor + 6 + (i % 2) * 4, COLOR);
    // pet (or the bed with a pet in it)
    if (hatched && pet.where === "room") {
      if (asleep) {
        blit(g, petRows("sleep", 0), bx + 6, floor - 22, COLOR);
        g.fillStyle = "#6b8cff";
        g.fillRect(bx + 3, floor - 13, 24, 7);
        g.fillStyle = "#8aa6ff";
        for (let x = bx + 4; x < bx + 26; x += 4) g.fillRect(x, floor - 12, 2, 2);
        const zy = floor - 30 - (Math.floor(t * 1.5) % 3) * 3;
        blit(g, ZED, bx + 22, zy, { "#": "#fff" });
        blit(g, ZED, bx + 27, zy - 7, { "#": "#ffffffaa" });
      } else drawPetAt(g, W, floor + 3);
    }
    if (!hatched) {
      const wob = hatch > 0.5 ? Math.round(Math.sin(t * (6 + hatch * 14))) : 0;
      blit(g, EGG, W / 2 - 8 + wob, floor - 12, COLOR);
      g.fillStyle = COLOR["#"]!;
      for (const [x, y] of CRACKS[Math.min(3, Math.floor(hatch * 4))]!) g.fillRect(W / 2 - 8 + wob + x, floor - 12 + y, 1, 1);
    }
    if (!lightsOn) {
      g.fillStyle = "rgb(8 10 40 / 0.62)";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "rgb(255 240 180 / 0.15)";
      g.fillRect(wx, wy, ww, wh);
    }
    if (t - sweepAt < 1.2) {
      const x = W - ((t - sweepAt) / 1.2) * (W + 10);
      g.fillStyle = "#c8a14a";
      g.fillRect(x, floor - 4, 3, H - floor + 4);
      g.fillStyle = "#e6f4ff";
      for (let i = 0; i < 6; i++) g.fillRect(x + 4 + ((i * 5) % 9), floor + ((i * 7) % (H - floor)), 1, 1);
    }
  }

  function drawGarden(g: CanvasRenderingContext2D, W: number, H: number): void {
    const ground = Math.round(H * 0.74);
    drawSky(g, 0, 0, W, ground);
    g.fillStyle = "#7cc06a";
    for (let x = 0; x < W; x++) g.fillRect(x, ground - 6 - Math.round(4 * Math.sin(x / 9)), 1, 12);
    g.fillStyle = "#5aa84a";
    g.fillRect(0, ground, W, H - ground);
    g.fillStyle = "#4b9a3d";
    for (let x = 1; x < W; x += 3) g.fillRect(x, ground + ((x * 7) % (H - ground)), 1, 2);
    // fence
    g.fillStyle = "#fff3e0";
    g.fillRect(0, ground - 6, W, 1);
    for (let x = 2; x < W; x += 6) g.fillRect(x, ground - 9, 2, 9);
    // tree
    const tx = Math.round(W * 0.8);
    g.fillStyle = "#7a4a2a";
    g.fillRect(tx, ground - 22, 4, 22);
    g.fillStyle = "#3f8f3a";
    g.fillRect(tx - 9, ground - 36, 22, 14);
    g.fillRect(tx - 6, ground - 41, 16, 6);
    g.fillStyle = "#e8433d";
    [[-5, -31], [6, -28], [1, -38]].forEach(([dx, dy]) => g.fillRect(tx + dx!, ground + dy!, 2, 2));
    // flowers
    for (let i = 0; i < 6; i++) {
      const fx = 5 + ((i * 29) % (W - 10));
      const fy = ground + 4 + ((i * 11) % Math.max(1, H - ground - 6));
      g.fillStyle = ["#ffd34d", "#ff9ec4", "#ffffff"][i % 3]!;
      g.fillRect(fx, fy, 3, 1);
      g.fillRect(fx + 1, fy - 1, 1, 3);
    }
    if (hatched && pet.where === "garden") drawPetAt(g, W, ground + 6);
    if (ball.active && ball.y >= 0) {
      const top = ground + 6 - 16;
      blit(g, BALL, ball.x * W - 2, ball.y * top - 2, { r: "#3f7bf0", w: "#cfe0ff", b: "#2a55b0" });
    }
    if (t < ball.flash) blit(g, HEART, pet.x * W - 2, ground - 20, { "#": "#ff5d7a" });
    if (night()) {
      g.fillStyle = "rgb(8 10 40 / 0.45)";
      g.fillRect(0, 0, W, H);
    }
  }

  // --- DOM per pose ---
  function el(tag: string, cls: string, html = ""): HTMLElement {
    const e = document.createElement(tag);
    e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function canvas(scene: Scene | "auto", w: number, h: number): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.className = "vp-scene";
    c.width = w;
    c.height = h;
    c.dataset.scene = scene;
    const g = c.getContext("2d")!;
    scenes.push({ g, scene, w, h });
    return c;
  }

  function sceneFor(c: HTMLCanvasElement): Scene {
    const s = c.dataset.scene as Scene | "auto";
    return s === "auto" ? pet.where : s;
  }

  function steer(c: HTMLCanvasElement): void {
    const move = (e: PointerEvent) => {
      if (!ball.active || sceneFor(c) !== "garden") return;
      const r = c.getBoundingClientRect();
      pet.tx = Math.max(0.06, Math.min(0.94, (e.clientX - r.left) / r.width));
    };
    c.onpointerdown = (e) => {
      sfx(() => {});
      if (!hatched) hatch = Math.min(0.99, hatch + 0.12);
      else if (!ball.active && !asleep && sceneFor(c) === pet.where) {
        const r = c.getBoundingClientRect();
        if (Math.abs((e.clientX - r.left) / r.width - pet.x) < 0.15) {
          happy = clamp(happy + 2);
          happyUntil = t + 1;
          play(cheer);
        }
      }
      move(e);
      c.setPointerCapture(e.pointerId);
    };
    c.onpointermove = (e) => {
      if (c.hasPointerCapture(e.pointerId) || e.pointerType === "mouse") move(e);
    };
  }

  /** A speech bubble; given a scene, it only speaks when the pet is there. */
  function toastEl(scene?: Scene): HTMLElement {
    const e = el("div", "vp-toast");
    if (scene === "garden") e.style.top = "38%";
    refresh.push(() => {
      const on = t < toast.until && toast.text && (!scene || !hatched || scene === pet.where);
      e.style.opacity = on ? "1" : "0";
      if (on) e.textContent = toast.text;
    });
    return e;
  }

  function meters(): HTMLElement {
    const e = el("div", "vp-meters");
    const rows: [string, () => number, string][] = [
      ["Full", () => fullness, "#ff8a65"],
      ["Happy", () => happy, "#ff9ec4"],
      ["Energy", () => energy, "#ffd34d"],
      ["Clean", () => 100 - mess * 33, "#7fd1ff"],
    ];
    for (const [label, get, color] of rows) {
      const bar = el("b", "", `<i style="background:${color}"></i>`);
      e.append(el("span", "", label), bar);
      const i = bar.firstElementChild as HTMLElement;
      refresh.push(() => (i.style.width = `${Math.round(get())}%`));
    }
    return e;
  }

  function chip(): HTMLElement {
    const e = el("div", "vp-chip");
    refresh.push(() => {
      const icon = night() ? "☾" : "☀";
      e.textContent = hatched ? `${NAME} · ${icon} ${clockText()} · day ${days() + 1}${asleep ? " · asleep" : ""}` : "An egg… tap it";
    });
    return e;
  }

  function tool(label: string, onTap: () => void, html = label): HTMLButtonElement {
    const b = el("button", "vp-tool", html) as HTMLButtonElement;
    b.setAttribute("aria-label", label);
    b.onpointerdown = () => sfx(blip);
    b.onclick = () => {
      onTap();
      update();
    };
    return b;
  }

  /** A tool whose face follows state (the lamp, the door) without rebuilding the DOM. */
  function liveTool(label: string, onTap: () => void, html: () => string): HTMLButtonElement {
    const b = tool(label, onTap, html());
    let last = b.innerHTML;
    refresh.push(() => {
      const h = html();
      if (h !== last) b.innerHTML = last = h;
    });
    return b;
  }

  /** A food you can drag onto the pet, or tap to feed in place. */
  function food(kind: "meal" | "snack", host: HTMLElement): HTMLElement {
    const rows = kind === "meal" ? APPLE : CAKE;
    const b = el("button", "vp-tool vp-food", svgColor(rows, FOOD_PAL, 26)) as HTMLButtonElement;
    b.setAttribute("aria-label", kind === "meal" ? "Apple (drag to feed)" : "Cake (drag to feed)");
    let start: { x: number; y: number } | null = null;
    let ghost: HTMLElement | null = null;
    const local = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * host.offsetWidth) / r.width, y: ((e.clientY - r.top) * host.offsetHeight) / r.height };
    };
    b.onpointerdown = (e) => {
      sfx(blip);
      start = { x: e.clientX, y: e.clientY };
      b.setPointerCapture(e.pointerId);
    };
    b.onpointermove = (e) => {
      if (!start) return;
      if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
        ghost = el("div", "vp-ghost", svgColor(rows, FOOD_PAL, 30));
        host.append(ghost);
      }
      if (ghost) {
        const p = local(e);
        ghost.style.left = `${p.x}px`;
        ghost.style.top = `${p.y}px`;
      }
    };
    const end = (e: PointerEvent) => {
      if (!start) return;
      start = null;
      if (!ghost) return void feed(kind);
      ghost.remove();
      ghost = null;
      b.style.visibility = "hidden";
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      b.style.visibility = "";
      const c = hit instanceof HTMLCanvasElement && hit.classList.contains("vp-scene") ? hit : null;
      if (!c) return;
      const r = c.getBoundingClientRect();
      const where = sceneFor(c);
      if (!asleep && hatched) {
        if (pet.where !== where) pet.where = where;
        pet.x = pet.tx = Math.max(0.12, Math.min(0.88, (e.clientX - r.left) / r.width));
        pet.cross = false;
      }
      feed(kind);
      update();
    };
    b.onpointerup = end;
    b.onpointercancel = () => {
      start = null;
      ghost?.remove();
      ghost = null;
    };
    return b;
  }

  const lampHtml = () => `${svgPix(ICONS.light, lightsOn ? "#d99a12" : "#3a2340", 18)}${lightsOn ? "Off" : "On"}`;
  const doorHtml = () => (pet.where === "room" ? "Call out" : "Go in");

  let paintChrome = () => {};

  function drawOuter(landscape: boolean): void {
    const root = el("div", `vp vp-desk ${landscape ? "vp-land" : ""}`);
    const egg = el("div", "vp-egg");
    egg.append(el("div", "vp-ring"));
    const icons = el("div", "vp-icons");
    const spans = MENU.map((m) => {
      const s = el("span", "", svgPix(ICONS[m], "currentColor", 16));
      s.title = MENU_LABEL[m];
      icons.append(s);
      return s;
    });
    const wrap = el("div", "vp-lcdwrap");
    const c = document.createElement("canvas");
    c.className = "vp-lcd";
    c.width = 40;
    c.height = 32;
    wrap.append(c);
    const bezel = el("div", "vp-bezel");
    bezel.append(wrap);
    lcd = c.getContext("2d");
    c.onpointerdown = () => sfx(() => {});
    c.onclick = () => {
      if (!hatched) press("A");
    };
    const msg = el("div", "vp-msg");
    const btns = el("div", `vp-btns ${landscape ? "vp-col" : ""}`);
    const labels: HTMLElement[] = [];
    (["A", "B", "C"] as const).forEach((k) => {
      const b = el("button", "vp-btn", `<i></i><span></span>`) as HTMLButtonElement;
      b.onpointerdown = () => sfx(() => {});
      b.onclick = () => press(k);
      labels.push(b.querySelector("span")!);
      btns.append(b);
    });
    paintChrome = () => {
      spans.forEach((s, i) => s.classList.toggle("on", i === menu && mode === "home"));
      const L =
        !hatched ? ["tap", "tap", "tap"]
        : mode === "game" ? ["◀ left", "right ▶", "quit"]
        : mode === "feed" ? ["switch", "eat", "back"]
        : mode === "stats" ? ["next", "next", "back"]
        : ["select", menu >= 0 ? MENU_LABEL[MENU[menu]!].toLowerCase() : "ok", "cancel"];
      labels.forEach((l, i) => (l.textContent = L[i]!));
    };
    paintChrome();
    refresh.push(() => {
      const on = t < toast.until && toast.text;
      msg.textContent = on ? toast.text : hatched ? `${clockText()}${asleep ? " · zzz" : ""}` : "Hatching…";
      paintChrome();
    });
    const face = el("div", "vp-face");
    face.append(el("div", "vp-brand", "Pocket Pal"), icons, bezel, msg);
    if (landscape) egg.append(face, btns);
    else egg.append(face, btns);
    root.append(egg);
    screens.outer.append(root);
  }

  function sceneHalf(scene: Scene, side: string, stand: boolean, stacked: boolean): HTMLElement {
    const root = el("div", `vp vp-house ${side} ${stand ? "vp-stand" : ""}`);
    const [w, h] = stacked ? [95, 75] : [75, 95];
    const c = canvas(scene, w, h);
    steer(c);
    root.append(c);
    if (stand) root.append(el("div", "vp-frame"));
    return root;
  }

  function drawInner(): void {
    const { pose } = state;
    const stacked = pose.split === "stacked";
    if (pose.id === "table") {
      // Watch on top: whichever scene the pet is in. Touch below: every care verb.
      const top = el("div", "vp vp-house vp-t");
      const c = canvas("auto", 95, 75);
      steer(c);
      const bar = el("div", "vp-bar vp-top");
      bar.append(chip());
      top.append(c, bar, toastEl());
      screens.start.append(top);

      const pad = el("div", "vp vp-pad vp-b");
      pad.append(meters());
      if (ball.active) {
        const strip = el("div", "vp-strip", "Slide to move " + NAME);
        const knob = el("i", "");
        strip.append(knob);
        refresh.push(() => (knob.style.left = `${pet.x * 100}%`));
        const move = (e: PointerEvent) => {
          const r = strip.getBoundingClientRect();
          pet.tx = Math.max(0.06, Math.min(0.94, (e.clientX - r.left) / r.width));
        };
        strip.onpointerdown = (e) => {
          sfx(() => {});
          strip.setPointerCapture(e.pointerId);
          move(e);
        };
        strip.onpointermove = (e) => {
          if (strip.hasPointerCapture(e.pointerId) || e.pointerType === "mouse") move(e);
        };
        const row = el("div", "vp-padrow");
        const score = el("div", "vp-chip vp-score vp-grow");
        refresh.push(() => (score.textContent = `Caught ${ball.caught} · ball ${Math.min(6, ball.n + 1)} of 6`));
        row.append(score, tool("Stop", () => stopCatch()));
        pad.append(strip, row);
      } else {
        const grid = el("div", "vp-padgrid");
        grid.append(
          tool("Meal", () => feed("meal"), `${svgColor(APPLE, FOOD_PAL, 22)}Meal`),
          tool("Snack", () => feed("snack"), `${svgColor(CAKE, FOOD_PAL, 22)}Snack`),
          tool("Play catch", () => startCatch(), `${svgPix(ICONS.play, "#3f7bf0", 20)}Catch`),
          tool("Clean", () => clean(), `${svgPix(ICONS.clean, "#3a2340", 20)}Clean`),
          liveTool("Lamp", () => toggleLight(), () => `${svgPix(ICONS.light, lightsOn ? "#d99a12" : "#3a2340", 20)}${lightsOn ? "Lights off" : "Lights on"}`),
          liveTool("Room or garden", () => goOutside(), () => (pet.where === "room" ? "Go outside" : "Go inside")),
        );
        pad.append(grid);
      }
      screens.end.append(pad);
      return;
    }
    const stand = pose.id === "stand";
    const room = sceneHalf("room", stacked ? "vp-t" : "vp-l", stand, stacked);
    const top = el("div", "vp-bar vp-top");
    top.append(chip());
    const bottom = el("div", "vp-bar vp-bottom");
    const tray = el("div", "vp-tray");
    tray.append(food("meal", screens.start), food("snack", screens.start));
    bottom.append(tray, el("div", "vp-grow"), tool("Clean", () => clean(), svgPix(ICONS.clean, "#3a2340", 18)), liveTool("Lamp", () => toggleLight(), lampHtml));
    room.append(top, bottom, toastEl("room"));
    screens.start.append(room);

    const garden = sceneHalf("garden", stacked ? "vp-b" : "vp-r", stand, stacked);
    const gtop = el("div", "vp-bar vp-top");
    gtop.append(el("div", "vp-grow"), meters());
    const gb = el("div", "vp-bar vp-bottom");
    if (ball.active) {
      const score = el("div", "vp-chip vp-score");
      refresh.push(() => (score.textContent = `Drag to run · caught ${ball.caught}/${ball.n}`));
      gb.append(score, el("div", "vp-grow"), tool("Stop", () => stopCatch()));
    } else {
      gb.append(
        tool("Play catch", () => startCatch(), `${svgPix(ICONS.play, "#3f7bf0", 18)} Catch`),
        el("div", "vp-grow"),
        liveTool("Room or garden", () => goOutside(), doorHtml),
      );
    }
    garden.append(gtop, gb, toastEl("garden"));
    screens.end.append(garden);
  }

  /** Redraw the DOM from state (cheap), keeping the canvases animated by the loop. */
  let shape = "";
  function update(force = false): void {
    // Rebuild only when the set of controls changes; otherwise the loop repaints.
    const key = `${state.pose.id}|${ball.active}`;
    if (!force && key === shape) return;
    shape = key;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    lcd = null;
    scenes.length = 0;
    refresh = [];
    paintChrome = () => {};
    if (state.pose.display === "outer") drawOuter(state.pose.id === "closed-landscape");
    else drawInner();
    paint();
  }

  function paint(): void {
    if (lcd) drawLcd(lcd);
    for (const s of scenes) {
      const which = s.scene === "auto" ? pet.where : s.scene;
      if (which === "room") drawRoom(s.g, s.w, s.h);
      else drawGarden(s.g, s.w, s.h);
    }
    for (const f of refresh) f();
  }

  /** The pet lives on real time, even when nothing is drawing (a hidden tab). */
  function tick(): void {
    const ts = performance.now();
    let dt = Math.min(120, (ts - last) / 1000);
    last = ts;
    while (dt > 0) {
      const d = Math.min(0.05, dt);
      step(d);
      dt -= d;
    }
  }

  function loop(): void {
    if (dead) return;
    tick();
    uiTick += 1 / 60;
    if (state.pose.display === "inner") update(); // controls follow ball/lamp/where
    if (lcd) drawLcd(lcd);
    for (const s of scenes) {
      const which = s.scene === "auto" ? pet.where : s.scene;
      if (which === "room") drawRoom(s.g, s.w, s.h);
      else drawGarden(s.g, s.w, s.h);
    }
    if (uiTick > 0.2) {
      uiTick = 0;
      for (const f of refresh) f();
    }
    raf = requestAnimationFrame(loop);
  }

  function render(s: DuoState): void {
    if (dead) return;
    state = s;
    // Folding is tucking in; unfolding is waking up.
    if (hatched && lastDisplay === "inner" && s.pose.display === "outer" && !asleep) {
      if (sleepy()) tuck();
      else say(`${NAME} isn't sleepy yet`);
    } else if (hatched && lastDisplay === "outer" && s.pose.display === "inner" && asleep) wake();
    if (s.pose.display === "outer") {
      mode = mode === "game" ? "home" : mode;
    }
    lastDisplay = s.pose.display;
    update(true);
  }

  render(initial);
  raf = requestAnimationFrame(loop);
  const timer = setInterval(tick, 250);

  return {
    render,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      clearInterval(timer);
      style.remove();
    },
  };
}

export const virtualPetExample: Example = {
  id: "virtual-pet",
  title: "Pocket Pal",
  category: "retro",
  summary:
    "An egg-shaped keychain pet. Closed, the outer display is the toy — a tiny monochrome LCD, three buttons and a menu of care icons. Open the phone to step inside its house in colour, room on one half and garden on the other. Fold it shut at night to tuck it in; open it to wake it up. One real minute is one pet hour.",
  bestPose: "closed",
  poses: {
    closed:
      "The speckled egg: a 40×32 LCD with the hatchling, feed / play / clean / light / stats icons above, and select, confirm and cancel buttons below. Closing it from an open pose at night, or when it's tired, tucks it in with the lights out.",
    "closed-landscape": "The egg turned on its side with a bigger LCD, and the three buttons in a column under your right thumb.",
    open: "Its house across both halves: the room on the left (drag an apple or cake to it, sweep up, switch the lamp) and the garden on the right (play catch). Opening wakes it up.",
    "open-portrait": "The room on the top half and the garden on the bottom, with the same tray, lamp and catch game.",
    book: "Room on the left page, garden on the right; it wanders between them across the fold, and nothing you tap sits in the crease.",
    table: "Watch on top: whichever room it is in, standing. Touch below: big care buttons, the meters, and a slide strip to steer it during catch.",
    stand: "A dollhouse stood on the table: room and garden in a wooden frame, every care button still in reach.",
  },
  principle:
    "Folding to tuck it in and unfolding to wake it is the delight, but never the only way: the lamp on the LCD menu and in the room does the same, and feeding, play and cleaning work in every pose — Apple asks you to never tie functionality to a pose, and to keep the same state across opening and closing (HIG checklist §8 and Continuity checks).",
  create,
};
