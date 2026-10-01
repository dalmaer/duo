/**
 * Pop-up Storybook — the hinge raises the paper.
 *
 * A children's pop-up book, "Pip and the Sea" (written for this example), in
 * which every spread is built from layered paper cut-outs. Flat open, the
 * cut-outs lie pressed into the page; fold the Duo toward book pose and they
 * stand up off the paper — fully upright around 90–110° — then fold back
 * down as the book nears closing, exactly as a real pop-up does.
 *
 * This is the purest form of Apple's hinge rule: the angle drives an effect,
 * never the layout (HIG checklist §9). Layout follows the pose; `hinge()`
 * only tips the paper. The page you are on is the example's state, so every
 * pose change — even shutting the book — keeps your place.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, ready, running } from "../lib/audio.ts";

// ---------------------------------------------------------------------------
// Paper art. Every spread is drawn in one 600×240 space: x 0–300 is the left
// page, 300–600 the right. A page shows its slice; table pose shows it all.
// ---------------------------------------------------------------------------

const INK = "#5a3a22";

function pine(x: number, base: number, h: number, fill: string): string {
  const tiers = 4;
  let p = "";
  for (let i = 0; i < tiers; i++) {
    const top = base - h + (i * h) / (tiers + 0.6);
    const bot = top + h / tiers + 10;
    const w = h * 0.12 + i * h * 0.07;
    p += `<path d="M${x} ${top.toFixed(1)} L${(x - w).toFixed(1)} ${bot.toFixed(1)} L${(x + w).toFixed(1)} ${bot.toFixed(1)} Z"/>`;
  }
  return `<g fill="${fill}" stroke="rgb(0 0 0 / 0.18)" stroke-width="0.8">${p}<rect x="${x - 2}" y="${base - 10}" width="4" height="10" fill="#5b3b22"/></g>`;
}

/** A small fox sitting, facing right; ~46 tall at s=1. */
function fox(x: number, base: number, s = 1, flip = false): string {
  const sx = flip ? -s : s;
  return `<g transform="translate(${x} ${base}) scale(${sx} ${s})" stroke="#8a3a12" stroke-width="1" stroke-linejoin="round">
    <path d="M-8 -3 Q-36 -2 -32 -22 Q-28 -34 -17 -25 Q-22 -12 -6 -9 Z" fill="#d9682b"/>
    <path d="M-32 -22 Q-29 -34 -19 -27 Q-26 -25 -27 -18 Z" fill="#fff6e8" stroke="none"/>
    <path d="M-13 0 Q-17 -27 1 -33 Q15 -27 11 0 Z" fill="#e0752f"/>
    <path d="M-1 -29 Q7 -20 5 -4 Q-2 -14 -1 -29 Z" fill="#fff6e8" stroke="none"/>
    <path d="M-4 0 L-4 -6 M5 0 L5 -6" stroke="#5b2a10" stroke-width="2.4"/>
    <path d="M-9 -36 L-8 -51 L-1 -41 L6 -51 L8 -38 Q12 -36 23 -33 Q15 -25 3 -26 Q-10 -27 -9 -36 Z" fill="#e0752f"/>
    <path d="M-6 -46 L-5 -41 L-2 -42 Z M4 -47 L5 -41 L2 -42 Z" fill="#3a1a0a" stroke="none"/>
    <circle cx="5" cy="-35" r="1.7" fill="#2a1a10" stroke="none"/>
    <circle cx="23" cy="-33" r="1.8" fill="#2a1a10" stroke="none"/>
  </g>`;
}

function gull(x: number, y: number, s = 1): string {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M-12 0 Q-6 -8 0 0 Q6 -8 12 0" fill="none" stroke="#3b3b45" stroke-width="2.2" stroke-linecap="round"/>`;
}

function standingGull(x: number, base: number): string {
  return `<g transform="translate(${x} ${base})" stroke="#555" stroke-width="0.8">
    <path d="M-2 0 L-2 -8 M3 0 L3 -8" stroke="#e08a3a" stroke-width="1.6"/>
    <ellipse cx="0" cy="-15" rx="13" ry="8" fill="#fbfbf6"/>
    <path d="M-12 -15 Q-2 -22 9 -14 Q-2 -11 -12 -15 Z" fill="#9aa3ad"/>
    <circle cx="10" cy="-25" r="6" fill="#fbfbf6"/>
    <path d="M15 -25 L22 -23 L15 -22 Z" fill="#f2b23a"/>
    <circle cx="11" cy="-26" r="1" fill="#222" stroke="none"/>
  </g>`;
}

function hare(x: number, base: number): string {
  return `<g transform="translate(${x} ${base})" fill="#a07a52" stroke="${INK}" stroke-width="0.9">
    <ellipse cx="0" cy="-13" rx="17" ry="12"/>
    <circle cx="15" cy="-26" r="8"/>
    <path d="M12 -32 Q8 -58 14 -60 Q18 -50 17 -33 Z"/>
    <path d="M17 -32 Q20 -56 26 -56 Q26 -44 20 -31 Z"/>
    <circle cx="-17" cy="-15" r="4" fill="#f4ecdf"/>
    <circle cx="18" cy="-27" r="1.4" fill="#222" stroke="none"/>
  </g>`;
}

function heron(x: number, base: number): string {
  return `<g transform="translate(${x} ${base})" stroke="#4a4f57" stroke-width="1">
    <path d="M-3 0 L-1 -34 M6 0 L4 -34" stroke="#6a5a3a" stroke-width="2"/>
    <ellipse cx="0" cy="-44" rx="20" ry="11" fill="#aeb6c0"/>
    <path d="M-20 -44 Q-30 -40 -34 -34 Q-22 -38 -12 -38 Z" fill="#7d8792"/>
    <path d="M12 -50 Q24 -60 14 -72 Q6 -82 16 -90" fill="none" stroke="#aeb6c0" stroke-width="6" stroke-linecap="round"/>
    <path d="M18 -92 L40 -88 L18 -86 Z" fill="#e2b34a"/>
    <path d="M12 -94 L0 -98" stroke="#333" stroke-width="1.6"/>
    <circle cx="18" cy="-91" r="1.3" fill="#222" stroke="none"/>
  </g>`;
}

function cat(x: number, base: number): string {
  return `<g transform="translate(${x} ${base})" fill="#2b2533">
    <path d="M-10 0 Q-14 -20 -4 -26 L-8 -36 L-1 -30 Q3 -31 6 -30 L12 -36 L10 -25 Q16 -18 10 0 Z"/>
    <path d="M10 -2 Q24 -2 22 -16" fill="none" stroke="#2b2533" stroke-width="3" stroke-linecap="round"/>
    <circle cx="-2" cy="-24" r="1.4" fill="#f3d36a"/><circle cx="5" cy="-24" r="1.4" fill="#f3d36a"/>
  </g>`;
}

function house(x: number, base: number, w: number, h: number, wall: string, roof: string, lit = true): string {
  const win = lit ? "#f6cf6c" : "#4a4057";
  return `<g stroke="rgb(0 0 0 / 0.25)" stroke-width="0.8">
    <rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${wall}"/>
    <path d="M${x - 4} ${base - h} L${x + w / 2} ${base - h - w * 0.55} L${x + w + 4} ${base - h} Z" fill="${roof}"/>
    <rect x="${x + w * 0.62}" y="${base - h - w * 0.5}" width="${w * 0.13}" height="${w * 0.3}" fill="${roof}"/>
    <rect x="${x + w * 0.2}" y="${base - h * 0.75}" width="${w * 0.22}" height="${h * 0.25}" fill="${win}"/>
    <rect x="${x + w * 0.58}" y="${base - h * 0.75}" width="${w * 0.22}" height="${h * 0.25}" fill="${win}"/>
    <rect x="${x + w * 0.4}" y="${base - h * 0.35}" width="${w * 0.2}" height="${h * 0.35}" fill="#4a2e22"/>
  </g>`;
}

function lighthouse(x: number, base: number, h: number): string {
  const w0 = h * 0.16;
  const w1 = h * 0.1;
  const band = (f: number) => {
    const y = base - h * f;
    const wa = w0 + (w1 - w0) * f;
    const yb = y - h * 0.12;
    const wb = w0 + (w1 - w0) * (f + 0.12);
    return `<path d="M${x - wa} ${y} L${x - wb} ${yb} L${x + wb} ${yb} L${x + wa} ${y} Z" fill="#d2453a"/>`;
  };
  return `<g stroke="rgb(0 0 0 / 0.25)" stroke-width="0.8">
    <path d="M${x - w0} ${base} L${x - w1} ${base - h} L${x + w1} ${base - h} L${x + w0} ${base} Z" fill="#fbf6ea"/>
    ${band(0.12)}${band(0.45)}${band(0.78)}
    <rect x="${x - w1 - 2}" y="${base - h - 3}" width="${2 * w1 + 4}" height="3" fill="#333"/>
    <rect x="${x - w1 + 1}" y="${base - h - 14}" width="${2 * w1 - 2}" height="11" fill="#ffe28a"/>
    <path d="M${x - w1 - 1} ${base - h - 14} L${x} ${base - h - 22} L${x + w1 + 1} ${base - h - 14} Z" fill="#333"/>
  </g>`;
}

function waves(top: number, base: number, fill: string, amp = 6, period = 60, foam = false, x0 = 0, x1 = 600): string {
  let d = `M${x0} ${base} L${x0} ${top}`;
  for (let x = x0; x < x1; x += period) d += ` q${period / 4} ${-amp} ${period / 2} 0 t${period / 2} 0`;
  d += ` L${x1} ${base} Z`;
  return `<path d="${d}" fill="${fill}" stroke="${foam ? "#f8fbff" : "rgb(0 0 0 / 0.15)"}" stroke-width="${foam ? 2 : 0.8}"/>`;
}

function cloud(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="#fffdf7" stroke="rgb(0 0 0 / 0.12)" stroke-width="0.8">
    <path d="M-30 6 Q-34 -6 -20 -6 Q-16 -20 0 -16 Q10 -26 22 -14 Q36 -14 32 6 Z"/></g>`;
}

function tufts(xs: number[], base: number, color: string): string {
  return `<g stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none">${xs
    .map((x) => `<path d="M${x} ${base} q-6 -14 -10 -20 M${x} ${base} q0 -16 2 -26 M${x} ${base} q5 -12 12 -18"/>`)
    .join("")}</g>`;
}

function reeds(xs: number[], base: number, h: number): string {
  return `<g stroke="#5f7a3a" stroke-width="2" fill="#7a4a2a">${xs
    .map((x, i) => `<path d="M${x} ${base} Q${x + (i % 2 ? 4 : -4)} ${base - h / 2} ${x} ${base - h}"/><rect x="${x - 2.5}" y="${base - h - 2}" width="5" height="14" rx="2.5" stroke="none"/>`)
    .join("")}</g>`;
}

function fence(x0: number, x1: number, base: number): string {
  let s = "";
  for (let x = x0; x <= x1; x += 38) s += `<rect x="${x}" y="${base - 30}" width="6" height="30" rx="1"/>`;
  s += `<rect x="${x0}" y="${base - 24}" width="${x1 - x0 + 6}" height="4"/><rect x="${x0}" y="${base - 13}" width="${x1 - x0 + 6}" height="4"/>`;
  return `<g fill="#b08a5a" stroke="${INK}" stroke-width="0.6">${s}</g>`;
}

function lamppost(x: number, base: number): string {
  return `<g><circle cx="${x}" cy="${base - 64}" r="18" fill="#ffe59a" opacity="0.35"/>
    <rect x="${x - 2}" y="${base - 60}" width="4" height="60" fill="#2d2a33"/>
    <path d="M${x - 8} ${base - 60} L${x + 8} ${base - 60} L${x + 5} ${base - 72} L${x - 5} ${base - 72} Z" fill="#ffe28a" stroke="#2d2a33" stroke-width="1.5"/>
    <path d="M${x - 7} ${base - 72} L${x} ${base - 78} L${x + 7} ${base - 72} Z" fill="#2d2a33"/></g>`;
}

const stars = (pts: [number, number][]) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#fff8e0"/>`).join("");

// ---------------------------------------------------------------------------
// The story.
// ---------------------------------------------------------------------------

type Layer = {
  art: string;
  /** y of the fold line it stands on, in the 240-high space. */
  base: number;
  /** Stagger: 0 rises first, 0.3 last. */
  d: number;
  /** Swings out from the gutter (rotateY) instead of standing up. */
  swing?: "L" | "R";
};

type Spread = {
  sky: [string, string];
  ground: string;
  paint: string;
  left: string;
  right: string;
  layers: Layer[];
};

const SPREADS: Spread[] = [
  {
    sky: ["#2b3a67", "#e9a07a"],
    ground: "#3d5a3a",
    paint: `<circle cx="470" cy="48" r="16" fill="#f6ecd0"/>${stars([[60, 30], [130, 18], [210, 40], [330, 22], [400, 50], [560, 30], [520, 70]])}`,
    left: "In a pine wood, under the tallest tree, lived a small fox called Pip.",
    right: "Every evening the gulls flew over, crying about a place called the sea. “Big,” they said. “Blue. Never still.” Pip wanted to see it more than anything.",
    layers: [
      { base: 176, d: 0, art: [20, 70, 120, 175, 235, 330, 385, 440, 500, 560].map((x, i) => pine(x, 176, 70 + ((i * 37) % 30), "#2f4a3a")).join("") },
      { base: 206, d: 0.1, art: [40, 135, 270, 330, 520, 585].map((x, i) => pine(x, 206, 115 + ((i * 23) % 40), "#3f6b4a")).join("") },
      { base: 226, d: 0.18, art: `<path d="M140 226 Q200 156 262 226 Z" fill="#7a5a3a" stroke="${INK}" stroke-width="1"/><ellipse cx="201" cy="216" rx="15" ry="13" fill="#2a1a10"/>` },
      { base: 228, d: 0.26, art: fox(430, 228, 1.25) },
      { base: 120, d: 0.2, swing: "R", art: gull(480, 100) + gull(515, 82, 0.8) + gull(548, 104, 0.7) },
    ],
  },
  {
    sky: ["#bfe3f0", "#fbeec2"],
    ground: "#8fb565",
    paint: `<circle cx="90" cy="56" r="22" fill="#ffd36b"/>`,
    left: "So one bright morning Pip packed a pocket of blackberries and set off over the hills.",
    right: "“Which way is the sea?” Pip asked a hare. The hare twitched her nose. “Follow the wind that smells of salt.”",
    layers: [
      { base: 172, d: 0, art: `<path d="M0 172 L0 150 Q80 104 170 146 Q260 98 360 146 Q450 112 600 136 L600 172 Z" fill="#a9c98a" stroke="rgb(0 0 0 / 0.15)"/>` },
      { base: 206, d: 0.1, art: `<path d="M0 206 L0 188 Q120 136 260 186 Q380 146 480 180 Q540 160 600 172 L600 206 Z" fill="#7fa85a" stroke="rgb(0 0 0 / 0.15)"/>` },
      { base: 224, d: 0.2, art: fence(330, 580, 224) },
      { base: 228, d: 0.26, art: hare(180, 228) },
      { base: 230, d: 0.3, art: fox(420, 230, 1.15) },
      { base: 80, d: 0.15, swing: "L", art: cloud(200, 54, 1.1) + cloud(110, 92, 0.7) },
    ],
  },
  {
    sky: ["#cfe8e4", "#f4f1dc"],
    ground: "#9cbf7a",
    paint: cloud(470, 50, 0.9),
    left: "The wind led to a wide, wandering river. Pip did not know how to swim.",
    right: "“Step where I step,” said an old heron. One stone at a time, Pip crossed without a single wet paw.",
    layers: [
      { base: 162, d: 0, art: `<path d="M0 162 L0 140 Q150 124 300 140 Q450 126 600 140 L600 162 Z" fill="#7ea36a" stroke="rgb(0 0 0 / 0.15)"/>${reeds([30, 52, 380, 404, 560], 146, 30)}` },
      { base: 204, d: 0.1, art: waves(168, 204, "#6fa8c9", 5, 50) + waves(186, 204, "#5c97ba", 4, 70) },
      { base: 222, d: 0.18, art: [130, 225, 330, 420, 520].map((x) => `<ellipse cx="${x}" cy="213" rx="25" ry="9" fill="#a39f94" stroke="${INK}" stroke-width="0.8"/>`).join("") },
      { base: 222, d: 0.24, art: heron(90, 222) },
      { base: 212, d: 0.3, art: fox(420, 210, 1.05) },
      { base: 230, d: 0.12, swing: "L", art: reeds([238, 252, 266, 280, 292], 236, 64) },
    ],
  },
  {
    sky: ["#3a2f5c", "#d98a6a"],
    ground: "#4a3f4f",
    paint: `${stars([[40, 20], [150, 34], [250, 16], [350, 30], [430, 18], [580, 44]])}<path d="M548 98 L600 82 L600 110 Z" fill="#ffe9a8" opacity="0.5"/>`,
    left: "Beyond the river was a town of crooked roofs. The windows glowed like little lanterns.",
    right: "Far away, past the last chimney, a light turned round and round. “The lighthouse,” purred a cat. “The sea is just behind it.”",
    layers: [
      { base: 160, d: 0, art: lighthouse(548, 160, 62) },
      { base: 178, d: 0.05, art: [0, 52, 96, 150, 200, 255, 300, 352, 400, 452].map((x, i) => house(x + 4, 178, 40, 26 + ((i * 13) % 18), "#5a4a6a", "#463a58", i % 3 === 0)).join("") },
      { base: 212, d: 0.15, art: house(20, 212, 70, 54, "#a8705a", "#6a3a32") + house(120, 212, 58, 40, "#6a7a8a", "#3f4a5a") + house(330, 212, 64, 46, "#c08f5a", "#7a4a3a") },
      { base: 168, d: 0.22, art: `<g>${cat(173, 170)}</g>` },
      { base: 230, d: 0.3, art: fox(445, 230, 1.15) },
      { base: 230, d: 0.12, swing: "R", art: lamppost(360, 230) },
    ],
  },
  {
    sky: ["#f6d7a7", "#f9efd9"],
    ground: "#e8cf9a",
    paint: `<circle cx="490" cy="64" r="26" fill="#f7b267"/>`,
    left: "Pip climbed the dunes. The sand slid back with every step, and the grass whispered, “nearly, nearly.”",
    right: "At the top the wind tasted of salt, and the gulls from home were circling. “You came!” they cried.",
    layers: [
      { base: 172, d: 0, art: `<path d="M0 172 L0 160 Q150 104 330 152 Q470 112 600 146 L600 172 Z" fill="#e3c08a" stroke="rgb(0 0 0 / 0.12)"/>` },
      { base: 210, d: 0.1, art: `<path d="M0 210 L0 196 Q120 146 250 180 Q420 104 600 186 L600 210 Z" fill="#d9ad6a" stroke="rgb(0 0 0 / 0.15)"/>` },
      { base: 150, d: 0.26, art: fox(440, 150, 1.05) },
      { base: 228, d: 0.18, art: tufts([30, 90, 160, 330, 380, 520, 580], 228, "#7f8f4a") + standingGull(200, 228) },
      { base: 232, d: 0.22, art: fence(20, 130, 232) },
      { base: 110, d: 0.14, swing: "R", art: gull(400, 60) + gull(430, 44, 0.8) + gull(560, 90, 0.9) },
    ],
  },
  {
    sky: ["#ffb38a", "#fff0d0"],
    ground: "#ecd6a4",
    paint: `<circle cx="300" cy="136" r="34" fill="#ffd36b"/>`,
    left: "And there it was — the sea. Bigger than every story. Bluer than every sky. Never, ever still.",
    right: "Pip sat on the warm sand and watched the waves until the stars came out. Then Pip ran home to tell the pine wood all about it. The End.",
    layers: [
      { base: 162, d: 0, art: waves(138, 162, "#5d9bc0", 3, 80) },
      { base: 162, d: 0.04, art: `<path d="M20 162 Q60 140 120 162 Z" fill="#6c6a64" stroke="${INK}" stroke-width="0.8"/>${lighthouse(70, 152, 96)}` },
      { base: 186, d: 0.1, art: waves(164, 186, "#4f8fb8", 6, 60) },
      { base: 206, d: 0.18, art: waves(188, 206, "#7fb7d6", 7, 70, true) },
      { base: 232, d: 0.24, art: `<path d="M140 232 l8 -12 l8 12 l-8 -4 Z" fill="#f2a07a" stroke="${INK}" stroke-width="0.8"/><path d="M220 232 q8 -14 16 0 Z" fill="#f6e2c8" stroke="${INK}" stroke-width="0.8"/><path d="M540 232 l6 -10 l6 10 l-6 -3 Z" fill="#f2c27a" stroke="${INK}" stroke-width="0.8"/>` },
      { base: 230, d: 0.3, art: fox(440, 230, 1.2) },
    ],
  },
];

const TITLE = "Pip and the Sea";

// ---------------------------------------------------------------------------

const PAPER = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .15  0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

const SERIF = `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;

const CSS = `
.pb-page { position:absolute; inset:0; background:#f7efdc ${PAPER}; color:#3b2a1c; font-family:${SERIF}; overflow:hidden; touch-action:pan-y; cursor:pointer; }
.pb-page::after { content:""; position:absolute; top:0; bottom:0; width:22px; pointer-events:none; }
.pb-page.pb-L::after { right:0; background:linear-gradient(to left, rgb(90 60 30 / 0.22), transparent); }
.pb-page.pb-R::after { left:0; background:linear-gradient(to right, rgb(90 60 30 / 0.22), transparent); }
.pb-page.pb-T::after { left:0; right:0; bottom:0; top:auto; width:auto; height:18px; background:linear-gradient(to top, rgb(90 60 30 / 0.2), transparent); }
.pb-page.pb-B::after { left:0; right:0; top:0; width:auto; height:18px; background:linear-gradient(to bottom, rgb(90 60 30 / 0.2), transparent); }
.pb-stage { position:relative; width:100%; perspective:760px; perspective-origin:50% -30%; overflow:visible; }
.pb-stage > svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.pb-bg { border-radius:2px; }
.pb-ghost { filter:sepia(1) saturate(0.4) brightness(1.05); mix-blend-mode:multiply; transition:opacity 0.15s linear; }
.pb-layer { backface-visibility:hidden; transition:transform 0.14s linear, filter 0.14s linear; will-change:transform; }
.pb-pop .pb-layer { transition:transform 0.75s cubic-bezier(.2,.9,.3,1.15), filter 0.75s; }
.pb-text { position:absolute; left:0; right:0; bottom:0; padding:10px 18px 24px; font-size:14px; line-height:1.45; text-wrap:pretty; }
.pb-text p { margin:0; }
.pb-text p::first-letter { font-size:1.6em; line-height:1; color:#8a3a12; }
.pb-folio { position:absolute; bottom:7px; font-size:10px; letter-spacing:0.12em; opacity:0.55; font-style:italic; }
.pb-L .pb-folio { left:18px; } .pb-R .pb-folio, .pb-B .pb-folio, .pb-T .pb-folio { right:18px; }
.pb-curl { position:absolute; bottom:0; width:26px; height:26px; pointer-events:none; }
.pb-curl.next { right:0; background:linear-gradient(135deg, transparent 50%, #e2d2b0 50%, #f3e7cd 80%); box-shadow:-2px -2px 4px rgb(0 0 0 / 0.08); border-top-left-radius:4px; }
.pb-curl.prev { left:0; background:linear-gradient(225deg, transparent 50%, #e2d2b0 50%, #f3e7cd 80%); border-top-right-radius:4px; }
.pb-hint { position:absolute; left:50%; top:14px; transform:translateX(-50%) rotate(-2deg); padding:5px 12px; background:#fffaf0; border:1px dashed #b08a5a; border-radius:3px; font:italic 13px/1.2 ${SERIF}; color:#7a4a22; white-space:nowrap; box-shadow:0 2px 6px rgb(0 0 0 / 0.12); pointer-events:none; transition:opacity 0.3s; }
.pb-in { animation:pb-in 0.35s ease-out; }
@keyframes pb-in { from { opacity:0.2; transform:translateX(var(--pb-dx, 0)); } }
.pb-wide { display:grid; grid-template-columns:58% 42%; height:100%; }
.pb-wide .pb-scene { position:relative; display:flex; align-items:flex-end; background:var(--pb-sky); }
.pb-wide .pb-text { position:relative; padding:14px 14px 22px 10px; font-size:13.5px; align-self:center; }
.pb-cover { position:absolute; inset:0; background:#2c4a6e; color:#fff6e4; font-family:${SERIF}; display:flex; flex-direction:column; }
.pb-cover svg { display:block; width:100%; height:100%; }
.pb-cover-t { position:absolute; left:0; right:0; top:20px; text-align:center; }
.pb-cover-t h1 { margin:0; font-size:30px; font-weight:600; letter-spacing:0.02em; text-shadow:0 2px 0 rgb(0 0 0 / 0.2); }
.pb-cover-t p { margin:4px 0 0; font-style:italic; font-size:13px; opacity:0.9; }
.pb-ribbon { position:absolute; top:0; right:26px; width:20px; height:54px; background:#c8443a; clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%); }
.pb-open { position:absolute; left:0; right:0; bottom:16px; text-align:center; font-size:13px; font-style:italic; }
.pb-table-text { position:absolute; inset:0; display:grid; place-items:center; }
.pb-card { max-width:86%; padding:14px 20px; background:#f7efdc ${PAPER}; color:#3b2a1c; font:15px/1.5 ${SERIF}; border-radius:3px; box-shadow:0 6px 18px rgb(0 0 0 / 0.25); }
.pb-card p { margin:0 0 0.5em; } .pb-card p:last-child { margin:0; }
.pb-nav { position:absolute; left:0; right:0; bottom:18px; display:flex; justify-content:center; gap:12px; align-items:center; }
.pb-nav button { border:1px solid #b08a5a; background:#fffaf0; color:#5a3a22; font:italic 14px ${SERIF}; padding:7px 14px; border-radius:999px; cursor:pointer; }
.pb-nav button:disabled { opacity:0.35; cursor:default; }
.pb-dots { display:flex; gap:5px; } .pb-dots i { width:6px; height:6px; border-radius:50%; background:#c9b48c; } .pb-dots i.on { background:#8a3a12; }
`;

/** How far the paper stands, 0–1, from the hinge angle: flat at 180°, upright 90–110°, folding back down as it shuts. */
export function rise(angle: number): number {
  let t: number;
  if (angle >= 110) t = (180 - angle) / 70;
  else if (angle >= 90) t = 1;
  else t = (angle - 30) / 60;
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

type Slice = "L" | "R" | "both";
const VIEW: Record<Slice, string> = { L: "0 0 300 240", R: "300 0 300 240", both: "0 0 600 240" };
const ASPECT: Record<Slice, string> = { L: "300 / 240", R: "300 / 240", both: "600 / 240" };

type Live = { el: SVGSVGElement; d: number; swing?: "L" | "R"; slice: Slice };

function create(screens: Screens, state: DuoState): Instance {
  let page = 0; // spread index — the one piece of state that matters
  let r = rise(state.hinge);
  let current = state;
  let live: Live[] = [];
  let ghosts: SVGSVGElement[] = [];
  let hints: HTMLElement[] = [];
  let popTimer = 0;
  let lastDir = 0;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const svgNS = "http://www.w3.org/2000/svg";
  function svg(slice: Slice, inner: string, cls: string): SVGSVGElement {
    const s = document.createElementNS(svgNS, "svg");
    s.setAttribute("viewBox", VIEW[slice]);
    s.setAttribute("preserveAspectRatio", "xMidYMax meet");
    s.setAttribute("class", cls);
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = inner;
    return s;
  }

  function background(sp: Spread, slice: Slice): SVGSVGElement {
    const id = `pb-sky-${slice}-${Math.random().toString(36).slice(2, 7)}`;
    return svg(
      slice,
      `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sp.sky[0]}"/><stop offset="1" stop-color="${sp.sky[1]}"/></linearGradient></defs>
       <rect x="0" y="0" width="600" height="240" fill="url(#${id})"/>${sp.paint}
       <rect x="0" y="176" width="600" height="64" fill="${sp.ground}"/>
       <rect x="0" y="176" width="600" height="2" fill="rgb(0 0 0 / 0.12)"/>`,
      "pb-bg",
    );
  }

  /** The pop-up stage: painted page, a printed ghost of the cut-outs, and the cut-outs themselves. */
  function stage(sp: Spread, slice: Slice): HTMLElement {
    const st = document.createElement("div");
    st.className = "pb-stage";
    st.style.aspectRatio = ASPECT[slice];
    st.append(background(sp, slice));
    const inRange = (l: Layer) => slice === "both" || !l.swing || l.swing === slice;
    const ghost = svg(slice, sp.layers.filter(inRange).map((l) => l.art).join(""), "pb-ghost");
    st.append(ghost);
    ghosts.push(ghost);
    for (const l of sp.layers) {
      if (!inRange(l)) continue;
      const el = svg(slice, l.art, "pb-layer");
      const ox = l.swing ? (slice === "L" ? "100%" : slice === "R" ? "0%" : "50%") : "50%";
      el.style.transformOrigin = `${ox} ${((l.base / 240) * 100).toFixed(2)}%`;
      st.append(el);
      live.push({ el, d: l.d, swing: slice === "both" ? undefined : l.swing, slice });
    }
    return st;
  }

  function hint(text: string): HTMLElement {
    const h = document.createElement("div");
    h.className = "pb-hint";
    h.textContent = text;
    hints.push(h);
    return h;
  }

  function folio(n: number): string {
    return `<div class="pb-folio">${n}</div>`;
  }

  /** One page of a side-by-side spread: the scene on top, the words below. */
  function tallPage(sp: Spread, side: "L" | "R", flatHint: string): HTMLElement {
    const p = document.createElement("div");
    p.className = `pb-page pb-${side}`;
    p.append(stage(sp, side));
    const text = document.createElement("div");
    text.className = "pb-text";
    text.innerHTML = `<p>${side === "L" ? sp.left : sp.right}</p>`;
    p.append(text);
    p.insertAdjacentHTML("beforeend", folio(page * 2 + (side === "L" ? 1 : 2)));
    if (side === "R" && page < SPREADS.length - 1) p.insertAdjacentHTML("beforeend", `<i class="pb-curl next"></i>`);
    if (side === "L" && page > 0) p.insertAdjacentHTML("beforeend", `<i class="pb-curl prev"></i>`);
    if (side === "L") p.append(hint(flatHint));
    bindTurns(p, side === "L" ? "start" : "end", "x");
    return p;
  }

  /** A page turned on its side (open-portrait): scene left, words right. */
  function widePage(sp: Spread, side: "L" | "R"): HTMLElement {
    const p = document.createElement("div");
    p.className = `pb-page pb-${side === "L" ? "T" : "B"}`;
    p.style.setProperty("--pb-sky", sp.sky[0]);
    const grid = document.createElement("div");
    grid.className = "pb-wide";
    const scene = document.createElement("div");
    scene.className = "pb-scene";
    scene.append(stage(sp, side));
    const text = document.createElement("div");
    text.className = "pb-text";
    text.innerHTML = `<p>${side === "L" ? sp.left : sp.right}</p>`;
    grid.append(scene, text);
    p.append(grid);
    p.insertAdjacentHTML("beforeend", folio(page * 2 + (side === "L" ? 1 : 2)));
    if (side === "R" && page < SPREADS.length - 1) p.insertAdjacentHTML("beforeend", `<i class="pb-curl next"></i>`);
    if (side === "L" && page > 0) p.insertAdjacentHTML("beforeend", `<i class="pb-curl prev"></i>`);
    if (side === "L") scene.append(hint("Fold it into table pose"));
    bindTurns(p, side === "L" ? "start" : "end", "x");
    return p;
  }

  function cover(landscape: boolean): HTMLElement {
    const c = document.createElement("div");
    c.className = "pb-cover";
    const art = `
      <defs><linearGradient id="pb-cv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c4a6e"/><stop offset="0.55" stop-color="#e99a74"/><stop offset="1" stop-color="#ffe6b8"/></linearGradient></defs>
      <rect width="600" height="240" fill="url(#pb-cv)"/>
      <circle cx="300" cy="170" r="40" fill="#ffd36b"/>
      ${stars([[60, 30], [140, 50], [470, 26], [540, 60], [380, 40]])}
      ${waves(168, 240, "#4f8fb8", 6, 60)}${waves(190, 240, "#7fb7d6", 7, 70, true)}
      <path d="M200 240 Q300 196 420 240 Z" fill="#ecd6a4" stroke="${INK}" stroke-width="1"/>
      ${fox(305, 226, 1.25)}
      ${gull(230, 110)}${gull(390, 96, 0.8)}`;
    const s = svg("both", art, "");
    s.setAttribute("preserveAspectRatio", landscape ? "xMidYMax slice" : "xMidYMax slice");
    c.append(s);
    c.insertAdjacentHTML(
      "beforeend",
      `<div class="pb-cover-t"><h1>${TITLE}</h1><p>A pop-up story</p></div>
       <div class="pb-ribbon" title="Bookmark"></div>
       <div class="pb-open">${landscape ? "Open me" : "Open the book, then fold it a little"}${page > 0 ? ` · bookmarked at page ${page * 2 + 1}` : ""}</div>`,
    );
    return c;
  }

  // --- turning pages: tap the outer edges, or swipe ---

  function bindTurns(el: HTMLElement, which: "start" | "end", _axis: "x"): void {
    let sx = 0;
    let sy = 0;
    let down = false;
    el.addEventListener("pointerdown", (e) => {
      down = true;
      sx = e.clientX;
      sy = e.clientY;
    });
    el.addEventListener("pointerup", (e) => {
      if (!down) return;
      down = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        turn(dx < 0 ? 1 : -1);
        return;
      }
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) return;
      const rect = el.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      if (which === "end" && fx > 0.6) turn(1);
      else if (which === "start" && fx < 0.4) turn(-1);
      else if (which === "end" && current.pose.split === "stacked" && fx < 0.4) turn(-1);
    });
    el.addEventListener("pointercancel", () => (down = false));
  }

  function rustle(): void {
    burst(0.22, 0.12, 2400, 0.4, undefined, "highpass");
    burst(0.12, 0.08, 900, 0.7);
  }

  function turn(dir: number): void {
    const next = Math.min(SPREADS.length - 1, Math.max(0, page + dir));
    if (next === page) return;
    page = next;
    lastDir = dir;
    if (running()) rustle();
    else ready().then(rustle).catch(() => {});
    draw(true);
  }

  // --- the effect: tip every cut-out by the hinge ---

  function apply(): void {
    for (const l of live) {
      const t0 = Math.min(1, Math.max(0, (r - l.d) / (1 - l.d)));
      const t = t0 * t0 * (3 - 2 * t0);
      const lie = (1 - t) * 86;
      l.el.style.transform = l.swing ? `rotateY(${(l.swing === "L" ? -lie : lie).toFixed(2)}deg)` : `rotateX(${lie.toFixed(2)}deg)`;
      l.el.style.filter = `drop-shadow(0 ${(1 + 4 * t).toFixed(1)}px ${(1 + 3 * t).toFixed(1)}px rgb(60 35 15 / ${(0.12 + 0.3 * t).toFixed(2)}))`;
    }
    for (const g of ghosts) g.style.opacity = ((1 - r) * 0.42).toFixed(3);
    for (const h of hints) h.style.opacity = r < 0.12 ? "1" : "0";
  }

  function draw(popped = false): void {
    const { pose } = current;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    live = [];
    ghosts = [];
    hints = [];
    const sp = SPREADS[page]!;
    r = pose.display === "inner" ? rise(current.hinge) : 0;

    if (pose.id === "closed") {
      screens.outer.append(cover(false));
      return;
    }
    if (pose.id === "closed-landscape") {
      screens.outer.append(cover(true));
      return;
    }

    const flatHint = pose.id === "open" ? "Fold me a little" : "Fold me a little more";
    let made: HTMLElement[] = [];
    if (pose.split === "side-by-side") {
      made = [tallPage(sp, "L", flatHint), tallPage(sp, "R", flatHint)];
      screens.start.append(made[0]!);
      screens.end.append(made[1]!);
    } else if (pose.id === "table") {
      // Standing half: the words, on the painted sky, for reading aloud.
      const top = document.createElement("div");
      top.className = "pb-page";
      const bg = background(sp, "both");
      bg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      bg.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
      top.append(bg);
      const holder = document.createElement("div");
      holder.className = "pb-table-text";
      holder.innerHTML = `<div class="pb-card"><p>${sp.left}</p><p>${sp.right}</p></div>`;
      top.append(holder);
      bindTurns(top, "start", "x");
      // Flat half: the whole scene stands on the page.
      const flat = document.createElement("div");
      flat.className = "pb-page pb-B";
      const st = stage(sp, "both");
      st.style.marginTop = "22px";
      flat.append(st);
      const h = hint("Fold me up to make it stand");
      h.style.top = "30px";
      flat.append(h);
      const nav = document.createElement("div");
      nav.className = "pb-nav";
      nav.innerHTML = `<button class="prev" ${page === 0 ? "disabled" : ""}>‹ Back</button><span class="pb-dots">${SPREADS.map((_, i) => `<i class="${i === page ? "on" : ""}"></i>`).join("")}</span><button class="next" ${page === SPREADS.length - 1 ? "disabled" : ""}>Turn ›</button>`;
      nav.querySelector<HTMLButtonElement>(".prev")!.onclick = (e) => (e.stopPropagation(), turn(-1));
      nav.querySelector<HTMLButtonElement>(".next")!.onclick = (e) => (e.stopPropagation(), turn(1));
      nav.addEventListener("pointerup", (e) => e.stopPropagation());
      flat.append(nav);
      bindTurns(flat, "end", "x");
      made = [top, flat];
      screens.start.append(top);
      screens.end.append(flat);
    } else {
      made = [widePage(sp, "L"), widePage(sp, "R")];
      screens.start.append(made[0]!);
      screens.end.append(made[1]!);
    }

    if (popped) {
      // The new spread starts pressed flat and springs up to where the hinge says.
      const target = r;
      r = 0;
      for (const m of made) {
        m.classList.add("pb-pop", "pb-in");
        m.style.setProperty("--pb-dx", `${lastDir * 18}px`);
      }
      apply();
      void made[0]?.offsetWidth;
      r = target;
      clearTimeout(popTimer);
      requestAnimationFrame(() => {
        apply();
        popTimer = window.setTimeout(() => made.forEach((m) => m.classList.remove("pb-pop")), 800);
      });
    } else {
      apply();
    }
  }

  return {
    render(s) {
      current = s;
      draw();
    },
    hinge(s) {
      current = s;
      if (s.pose.display !== "inner") return;
      r = rise(s.hinge);
      apply();
    },
    destroy() {
      clearTimeout(popTimer);
      style.remove();
    },
  };
}

export const popupBookExample: Example = {
  id: "popup-book",
  title: "Pop-up Storybook",
  category: "learning",
  summary:
    "“Pip and the Sea”, a children's pop-up book in which the hinge raises the paper: fold the Duo from flat toward book pose and the cut-out pines, hills, herons and waves stand up off the page; keep closing and they fold back down.",
  bestPose: "book",
  poses: {
    closed: "The illustrated cover, with a ribbon bookmark and the page you were on.",
    "closed-landscape": "The cover turned wide, with a quiet “open me”.",
    open: "Two facing pages lying flat, so every cut-out lies pressed into the paper as a faint print — a label says “fold me a little”.",
    "open-portrait": "The two pages stacked, scene beside words on each; still flat, so the paper stays down until you fold it.",
    book: "Two facing pages whose cut-outs rise with the hinge — flat at 180°, fully standing around 90–110°, folding down again as it nears shut. Tap the outer page edges or swipe to turn.",
    table: "The words stand on the upright half to read aloud, and the whole spread pops up from the flat half, with big Back and Turn buttons below it.",
    stand: "The book stood on its edge like a card on a table: the scenery stands at its fullest, hands-free for reading aloud to someone.",
  },
  principle:
    "Apple says to use the hinge angle “for interactions and effects only, never for layout” (HIG checklist §9): here the pages are laid out by the pose, and the angle only tips the paper up off them.",
  create,
};
