/**
 * Chomp — the crocodile-dentist game, where the phone is the jaw.
 *
 * Set the Duo down in table pose and it is a crocodile with its mouth open:
 * the standing half is the upper jaw and face, the flat half is the lower jaw
 * full of teeth, and the hinge is where the jaws meet. Take turns pressing
 * teeth. One of them is sore; press it and the jaw snaps shut.
 *
 * The hinge angle is only an effect (HIG checklist §9): the narrower you fold
 * the jaw, the more the croc sweats. Layout always follows the pose.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, ready, tone } from "../lib/audio.ts";

const TEETH = 12;
const MAX_PLAYERS = 4;
const COLORS = ["#ff7a59", "#4fb3ff", "#ffd23f", "#b48cff"];

type Phase = "play" | "snap" | "summary";

const CSS = `
.ch { position:absolute; inset:0; overflow:hidden; color:#f4ffe9; font:12px/1.3 system-ui,-apple-system,sans-serif; }
.ch-skin { background:
  radial-gradient(circle at 20% 30%, rgb(0 0 0 / .12) 0 7px, transparent 8px) 0 0/34px 30px,
  radial-gradient(circle at 70% 70%, rgb(0 0 0 / .1) 0 6px, transparent 7px) 0 0/28px 34px,
  linear-gradient(180deg, #3f8f3a, #2d6e2b); }
.ch-sky { background: radial-gradient(120% 90% at 50% 10%, #2f5d44, #13281c 75%); }
.ch-face { position:absolute; inset:0; display:grid; place-items:center; }
.ch-face svg { width:100%; height:100%; display:block; }
.ch-head { transform-box: fill-box; animation: ch-tremble calc(0.32s - var(--n, 0) * 0.2s) linear infinite; }
@keyframes ch-tremble { 0%,100% { transform: translate(0,0); } 25% { transform: translate(calc(var(--amp,0) * 1px), 0); } 75% { transform: translate(calc(var(--amp,0) * -1px), 0); } }
.ch-drop { animation: ch-drip 1.4s ease-in infinite; }
@keyframes ch-drip { 0% { transform: translateY(0); opacity:0; } 15% { opacity:1; } 100% { transform: translateY(26px); opacity:0; } }
.ch-score { position:absolute; display:flex; gap:5px; flex-wrap:wrap; z-index:2; }
.ch-chip { display:flex; align-items:center; gap:5px; padding:3px 8px 3px 4px; border-radius:999px; background:rgb(0 0 0 / .35); font:700 11px/1 system-ui; white-space:nowrap; }
.ch-chip i { width:14px; height:14px; border-radius:50%; display:block; }
.ch-chip.now { box-shadow: inset 0 0 0 2px #fff; background:rgb(0 0 0 / .55); }
.ch-chip b { font-variant-numeric:tabular-nums; }
.ch-chip small { font-weight:600; opacity:.7; }
.ch-kicker { font:800 9px/1 system-ui; letter-spacing:.18em; text-transform:uppercase; color:#b8e6a6; }
.ch-slam { animation: ch-slam .5s cubic-bezier(.6,0,.9,.4) forwards; }
@keyframes ch-slam { 0% { transform: translate(0,0); } 60% { transform: translate(var(--sx), var(--sy)) scale(1.04); } 72% { transform: translate(calc(var(--sx) * .8), calc(var(--sy) * .8)); } 100% { transform: translate(var(--sx), var(--sy)); } }
.ch-shake { animation: ch-shake .45s linear .25s; }
@keyframes ch-shake { 0%,100% { transform:translate(0,0); } 20% { transform:translate(-6px,3px); } 40% { transform:translate(5px,-4px); } 60% { transform:translate(-4px,-2px); } 80% { transform:translate(3px,4px); } }
.ch-flash { position:absolute; inset:0; pointer-events:none; background:#ff3b30; opacity:0; animation: ch-flash .7s ease-out .25s; z-index:3; }
@keyframes ch-flash { 0% { opacity:.65; } 100% { opacity:0; } }
.ch-bang { position:absolute; left:50%; top:42%; transform:translate(-50%,-50%) rotate(-8deg) scale(.2); font:900 44px/1 system-ui; color:#fff; -webkit-text-stroke:2px #8a1010; text-shadow:0 4px 0 #8a1010; opacity:0; animation: ch-bang .5s cubic-bezier(.2,1.6,.4,1) .28s forwards; z-index:4; pointer-events:none; }
@keyframes ch-bang { to { opacity:1; transform:translate(-50%,-50%) rotate(-8deg) scale(1); } }
.ch-mouth { position:absolute; inset:0; background:linear-gradient(180deg,#2d6e2b,#245a23); }
.ch-mouth svg.ch-gums { position:absolute; inset:0; width:100%; height:100%; }
.ch-tooth { all:unset; position:absolute; width:40px; height:44px; margin:-22px 0 0 -20px; cursor:pointer; touch-action:none; display:grid; place-items:center; -webkit-tap-highlight-color:transparent; }
.ch-tooth svg { width:34px; height:40px; overflow:visible; transition: transform .12s; }
.ch-tooth:hover svg { filter: brightness(1.06) drop-shadow(0 0 4px #fff8); }
.ch-tooth:focus-visible { outline:2px solid #fff; border-radius:8px; }
.ch-tooth.down { cursor:default; }
.ch-tooth.down svg { filter: brightness(.55) saturate(.6); }
.ch-tooth.sore svg path { fill:#ff9a8a; }
.ch-tongue { position:absolute; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; z-index:2; }
.ch-turn { font:800 16px/1.1 system-ui; color:#fff; text-shadow:0 1px 0 rgb(0 0 0 / .3); }
.ch-sub { font-size:11px; color:#fff; font-weight:600; }
.ch-btn { all:unset; cursor:pointer; padding:8px 16px; border-radius:999px; background:#fff; color:#7a1022; font:800 13px/1 system-ui; box-shadow:0 3px 0 #b0405a; }
.ch-btn:active { transform:translateY(2px); box-shadow:0 1px 0 #b0405a; }
.ch-step { display:flex; align-items:center; gap:6px; font:700 11px/1 system-ui; color:#ffe1e6; }
.ch-step button { all:unset; cursor:pointer; width:24px; height:24px; border-radius:50%; background:rgb(0 0 0 / .25); color:#fff; text-align:center; line-height:24px; font-weight:800; }
.ch-step button:disabled { opacity:.35; cursor:default; }
.ch-bite { position:absolute; pointer-events:none; z-index:3; background:linear-gradient(var(--bd), #2d6e2b 70%, #1d4a1c); animation: ch-bite .42s cubic-bezier(.6,0,.9,.4) forwards; }
@keyframes ch-bite { from { transform: var(--from); } to { transform: none; } }
.ch-closed { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; gap:8px; padding:18px 16px; box-sizing:border-box; text-align:center; }
.ch-closed h2 { margin:0; font:900 28px/1 system-ui; letter-spacing:-.01em; }
.ch-closed p { margin:0; color:#cfeec4; font-size:11.5px; max-width:240px; }
.ch-board { display:flex; flex-direction:column; gap:4px; width:100%; max-width:240px; }
.ch-board div { display:flex; align-items:center; gap:8px; padding:5px 10px; border-radius:10px; background:rgb(0 0 0 / .28); font-weight:700; }
.ch-board div i { width:12px; height:12px; border-radius:50%; }
.ch-board div b { margin-left:auto; font-variant-numeric:tabular-nums; }
.ch-row { position:absolute; display:flex; justify-content:space-between; }
.ch-row .ch-tooth { position:relative; margin:0; width:28px; }
.ch-row .ch-tooth svg { width:24px; height:34px; }
`;

/** One tooth, drawn pointing up; rotated into place by the caller. */
const TOOTH_SVG = `<svg viewBox="-17 -20 34 40" aria-hidden="true"><path d="M-14 18 C-14 4 -9 -10 0 -18 C9 -10 14 4 14 18 Z" fill="#fffbea" stroke="#d8cfae" stroke-width="2"/><path d="M-6 8 C-6 0 -3 -7 0 -11" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></svg>`;

/** A canonical lower jaw: `along` runs from the hinge (0) to the snout tip, `lat` across. */
function jawGeometry(along: number, lat: number) {
  const lc = lat / 2;
  const r = Math.min(lc - 52, along * 0.42);
  const a1 = along - 24 - r;
  const teeth: { a: number; l: number; na: number; nl: number }[] = [];
  // Left arm, hinge to tip.
  for (const k of [2, 1, 0]) teeth.push({ a: a1 - 12 - k * 44, l: lc - r, na: 0, nl: 1 });
  // Round the snout tip, from the left arm to the right; each tooth points at the tongue.
  for (let k = 0; k < 6; k++) {
    const phi = ((-75 + k * 30) * Math.PI) / 180;
    teeth.push({ a: a1 + r * Math.cos(phi), l: lc + r * Math.sin(phi), na: -Math.cos(phi), nl: -Math.sin(phi) });
  }
  // Right arm, tip back to hinge.
  for (const k of [0, 1, 2]) teeth.push({ a: a1 - 12 - k * 44, l: lc + r, na: 0, nl: -1 });
  return { lc, r, a1, teeth };
}

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let current = initial;
  let players = 2;
  let scores = [0, 0, 0, 0];
  let turn = 0;
  let round = 1;
  let pressed = new Set<number>();
  let sore = Math.floor(Math.random() * TEETH);
  let phase: Phase = "play";
  let lastTooth = -1;
  let lastResult: { player: number; teeth: number } | null = null;
  let snapTimer = 0;
  let startedBy = 0;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const name = (p: number) => `Player ${p + 1}`;
  const remaining = () => TEETH - pressed.size;
  const risk = () => pressed.size / (TEETH - 1);
  /** Narrower jaw, more nerves. Only an effect: it never changes what goes where. */
  const hingeNerves = () => (current.pose.adjustable ? Math.min(1, Math.max(0, (160 - current.hinge) / 120)) : 0);
  const nerves = () => Math.min(1, risk() * 0.75 + hingeNerves() * 0.5);

  function newGame(n = players): void {
    players = n;
    scores = [0, 0, 0, 0];
    round = 1;
    startedBy = 0;
    lastResult = null;
    newRound(0);
  }

  function newRound(first: number): void {
    clearTimeout(snapTimer);
    pressed = new Set();
    sore = Math.floor(Math.random() * TEETH);
    phase = "play";
    lastTooth = -1;
    turn = first;
    startedBy = first;
    render(current);
  }

  function press(i: number): void {
    if (phase !== "play" || pressed.has(i)) return;
    ready()
      .then(() => {
        if (i === sore) chompSound();
        else {
          tone(1100 - pressed.size * 40, 500, 0.06, 0.16, "triangle");
          burst(0.03, 0.18, 2600, 1.2);
        }
      })
      .catch(() => {});
    pressed.add(i);
    lastTooth = i;
    if (i === sore) {
      phase = "snap";
      scores[turn]!++;
      lastResult = { player: turn, teeth: pressed.size };
      render(current);
      snapTimer = window.setTimeout(() => {
        phase = "summary";
        render(current);
      }, 1300);
      return;
    }
    turn = (turn + 1) % players;
    render(current);
  }

  function chompSound(): void {
    burst(0.4, 1, 260, 0.6, undefined, "lowpass");
    tone(200, 45, 0.4, 0.75, "square");
    burst(0.09, 0.8, 3200, 0.8);
    tone(90, 40, 0.5, 0.6, "sine");
  }

  // ---------- the croc's face (upper jaw) ----------

  /** Where the croc is looking: toward the last tooth pressed, as -1..1. */
  function gaze(): { x: number; y: number } {
    if (lastTooth < 0) return { x: 0, y: 0.6 };
    const t = jawGeometry(290, 370).teeth[lastTooth]!;
    const lx = (t.l - 185) / 140;
    const depth = t.a / 290;
    if (current.pose.split === "side-by-side") return { x: 0.6 + depth * 0.4, y: lx * 0.8 };
    return { x: lx, y: 0.4 + depth * 0.6 };
  }

  function faceSvg(opts: { grin?: boolean; compact?: boolean } = {}): string {
    const n = opts.grin ? 0 : nerves();
    const g = opts.grin ? { x: 0.3, y: 0.2 } : gaze();
    const pr = 9 - n * 4;
    const brow = n * 16; // inner ends rise when worried
    const lid = opts.grin ? 8 : 2 + (1 - n) * 6;
    const drops = opts.grin ? 0 : Math.round(risk() * 3 + hingeNerves() * 2);
    let sweat = "";
    const spots = [
      [40, 70],
      [262, 74],
      [28, 112],
      [272, 118],
      [150, 22],
    ];
    for (let k = 0; k < Math.min(drops, spots.length); k++) {
      const [x, y] = spots[k]!;
      sweat += `<path class="ch-drop" style="animation-delay:${k * 0.27}s" d="M${x} ${y} c-5 8 -7 12 -7 15 a7 7 0 0 0 14 0 c0 -3 -2 -7 -7 -15z" fill="#8fd8ff" stroke="#3a8fc4" stroke-width="1.2"/>`;
    }
    const eye = (cx: number, side: -1 | 1) => `
      <circle cx="${cx}" cy="64" r="34" fill="#3f8f3a"/>
      <circle cx="${cx}" cy="66" r="23" fill="#fffdf2"/>
      <circle cx="${cx + g.x * 9}" cy="${66 + g.y * 9}" r="${pr}" fill="#1a1a1a"/>
      <circle cx="${cx + g.x * 9 - 3}" cy="${66 + g.y * 9 - 3}" r="2.6" fill="#fff"/>
      <path d="M${cx - 25} ${66 - 23 + lid} Q${cx} ${40 + lid} ${cx + 25} ${66 - 23 + lid} L${cx + 25} 36 L${cx - 25} 36 Z" fill="#3f8f3a"/>
      <path d="M${cx - 22} ${34 + (side === 1 ? brow : 0)} L${cx + 22} ${34 + (side === -1 ? brow : 0)}" stroke="#1d4a1c" stroke-width="6" stroke-linecap="round"/>`;
    let upperTeeth = "";
    for (let k = 0; k < 11; k++) {
      const x = 42 + k * 21.6;
      const y = 214 - Math.abs(k - 5) * 1.6;
      upperTeeth += `<path d="M${x - 9} ${y - 4} L${x} ${y + 16} L${x + 9} ${y - 4} Z" fill="#fffbea" stroke="#d8cfae" stroke-width="1.5" stroke-linejoin="round"/>`;
    }
    const mouth = opts.grin
      ? `<path d="M40 196 Q150 250 260 196 Q150 232 40 196Z" fill="#7a1022"/>${upperTeeth}`
      : upperTeeth;
    return `
      <svg viewBox="0 0 300 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g class="ch-head" style="--amp:${(n * 2.4).toFixed(2)};--n:${n.toFixed(2)}">
          <ellipse cx="150" cy="118" rx="112" ry="76" fill="#3f8f3a"/>
          <ellipse cx="150" cy="176" rx="138" ry="46" fill="#4aa043"/>
          <ellipse cx="150" cy="168" rx="120" ry="30" fill="#56b04d" opacity=".55"/>
          <ellipse cx="128" cy="150" rx="7" ry="4.5" fill="#1d4a1c"/>
          <ellipse cx="172" cy="150" rx="7" ry="4.5" fill="#1d4a1c"/>
          <circle cx="92" cy="122" r="5" fill="#2d6e2b"/><circle cx="210" cy="116" r="6" fill="#2d6e2b"/><circle cx="150" cy="104" r="4" fill="#2d6e2b"/>
          ${eye(100, -1)}${eye(200, 1)}
          ${mouth}
          ${n > 0.55 ? `<path d="M118 192 Q150 ${200 - n * 8} 182 192" stroke="#1d4a1c" stroke-width="3" fill="none" stroke-linecap="round"/>` : ""}
          ${sweat}
        </g>
      </svg>`;
  }

  function scoreChips(): string {
    let s = "";
    for (let p = 0; p < players; p++) {
      s += `<span class="ch-chip${phase === "play" && p === turn ? " now" : ""}"><i style="background:${COLORS[p]}"></i>${name(p)} <b>${scores[p]}</b><small>chomped</small></span>`;
    }
    return s;
  }

  /** The upper jaw: the croc's face, slamming toward the fold on a snap. */
  function upperJaw(fold: "bottom" | "right"): HTMLElement {
    const root = document.createElement("div");
    root.className = `ch ch-sky${phase === "snap" ? " ch-shake" : ""}`;
    const face = document.createElement("div");
    face.className = `ch-face${phase === "snap" ? " ch-slam" : ""}`;
    face.style.cssText = fold === "bottom" ? "--sx:0;--sy:34%;inset:30px 0 18px 0" : "--sx:22%;--sy:6%;inset:30px 18px 0 0";
    face.innerHTML = faceSvg({ grin: phase === "summary" });
    root.append(face);
    const sc = document.createElement("div");
    sc.className = "ch-score";
    sc.style.cssText = "left:10px;right:10px;top:8px";
    sc.innerHTML = scoreChips();
    root.append(sc);
    if (phase === "snap") root.insertAdjacentHTML("beforeend", `<div class="ch-flash"></div><div class="ch-bang">CHOMP!</div>`);
    if (phase === "summary" && lastResult) {
      const card = document.createElement("div");
      card.className = "ch-score";
      card.style.cssText = "left:0;right:0;top:38px;justify-content:center";
      card.innerHTML = `<span class="ch-chip" style="padding:6px 12px 6px 6px;font-size:12px"><i style="background:${COLORS[lastResult.player]}"></i>${name(lastResult.player)} got chomped on tooth ${lastResult.teeth}</span>`;
      root.append(card);
    }
    return root;
  }

  // ---------- the lower jaw (the teeth you press) ----------

  function toothButton(i: number, x: number, y: number, angle: number): HTMLButtonElement {
    const b = document.createElement("button");
    const down = pressed.has(i);
    const showSore = phase !== "play" && i === sore;
    b.className = `ch-tooth${down ? " down" : ""}${showSore ? " sore" : ""}`;
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    b.setAttribute("aria-label", `Tooth ${i + 1}${down ? ", pressed" : ""}`);
    b.innerHTML = TOOTH_SVG;
    b.querySelector("svg")!.style.transform = `rotate(${angle}deg)${down ? " scale(.78) translateY(6px)" : ""}`;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      press(i);
    });
    b.addEventListener("click", (e) => {
      if ((e as MouseEvent).detail === 0) press(i);
    });
    return b;
  }

  function tongueControls(): HTMLElement {
    const t = document.createElement("div");
    t.className = "ch-tongue";
    if (phase === "play") {
      const left = remaining();
      t.innerHTML = `
        <span class="ch-kicker" style="color:#ffd0d8">Round ${round}</span>
        <div class="ch-turn"><span class="ch-chip" style="font-size:14px;padding:4px 12px 4px 5px"><i style="background:${COLORS[turn]}"></i>${name(turn)}</span></div>
        <div class="ch-sub">Press a tooth · ${left === TEETH ? "one is sore" : `1 in ${left} snaps`}</div>`;
      const step = document.createElement("div");
      step.className = "ch-step";
      step.innerHTML = `<button aria-label="Fewer players">−</button><span>${players} players</span><button aria-label="More players">+</button>`;
      const [minus, plus] = step.querySelectorAll("button");
      minus!.disabled = players <= 2;
      plus!.disabled = players >= MAX_PLAYERS;
      minus!.onclick = () => newGame(players - 1);
      plus!.onclick = () => newGame(players + 1);
      t.append(step);
    } else if (phase === "summary" && lastResult) {
      t.innerHTML = `
        <div class="ch-turn">Chomp!</div>
        <div class="ch-sub">${name(lastResult.player)} hit the sore tooth after ${lastResult.teeth - 1} safe ${lastResult.teeth - 1 === 1 ? "press" : "presses"}.</div>`;
      const b = document.createElement("button");
      b.className = "ch-btn";
      b.textContent = "Next round";
      b.onclick = () => {
        round++;
        newRound((startedBy + 1) % players);
      };
      t.append(b);
    }
    return t;
  }

  /**
   * The lower jaw, in canonical coordinates (`along` from the hinge, `lat`
   * across) mapped onto the half: the hinge is the fold, so the back of the
   * mouth is always on the fold side and the snout tip away from it.
   */
  function lowerJaw(foldSide: "top" | "left", w: number, h: number): HTMLElement {
    const along = foldSide === "top" ? h : w;
    const lat = foldSide === "top" ? w : h;
    const map = (a: number, l: number) => (foldSide === "top" ? { x: l, y: a } : { x: a, y: l });
    const G = jawGeometry(along, lat);
    const root = document.createElement("div");
    root.className = "ch-mouth";

    const tip = (rr: number) => {
      // The U as a path: arm, semicircle round the tip, arm back.
      const p0 = map(16, G.lc - rr);
      const p1 = map(G.a1, G.lc - rr);
      const p2 = map(G.a1, G.lc + rr);
      const p3 = map(16, G.lc + rr);
      const sweep = foldSide === "top" ? 0 : 1;
      return `M${p0.x} ${p0.y} L${p1.x} ${p1.y} A${rr} ${rr} 0 0 ${sweep} ${p2.x} ${p2.y} L${p3.x} ${p3.y}`;
    };
    const tongue = map(G.a1 - 14, G.lc);
    root.innerHTML = `
      <svg class="ch-gums" viewBox="0 0 ${w} ${h}" aria-hidden="true">
        <path d="${tip(G.r)} Z" fill="#7a1022"/>
        <path d="${tip(G.r)}" fill="none" stroke="#e86b86" stroke-width="58" stroke-linejoin="round"/>
        <path d="${tip(G.r)}" fill="none" stroke="#f28aa0" stroke-width="30" stroke-linejoin="round" opacity=".6"/>
        <ellipse cx="${tongue.x}" cy="${tongue.y}" rx="${foldSide === "top" ? G.r - 40 : G.r - 30}" ry="${foldSide === "top" ? G.r - 30 : G.r - 40}" fill="#d9506e"/>
        <path d="M${map(30, G.lc).x} ${map(30, G.lc).y} L${map(G.a1 + 10, G.lc).x} ${map(G.a1 + 10, G.lc).y}" stroke="#b83a58" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
    G.teeth.forEach((t, i) => {
      const p = map(t.a, t.l);
      const n = map(t.na, t.nl);
      const angle = (Math.atan2(n.y, n.x) * 180) / Math.PI + 90;
      root.append(toothButton(i, p.x, p.y, angle));
    });
    const tc = tongueControls();
    tc.style.left = `${tongue.x}px`;
    tc.style.top = `${tongue.y}px`;
    tc.style.maxWidth = `${G.r * 2 - 70}px`;
    root.append(tc);

    if (phase === "snap") {
      // The upper jaw's shadow sweeps in from the hinge and covers the teeth.
      const bite = document.createElement("div");
      bite.className = "ch-bite";
      bite.style.cssText =
        foldSide === "top"
          ? "left:0;right:0;top:0;bottom:16px;--bd:180deg;--from:translateY(-110%)"
          : "left:0;right:16px;top:0;bottom:0;--bd:90deg;--from:translateX(-110%)";
      // A row of upper teeth along its leading edge.
      const edge = document.createElement("i");
      edge.style.cssText =
        foldSide === "top"
          ? "position:absolute;left:0;right:0;bottom:-16px;height:16px;background:conic-gradient(from -30deg at 50% 100%, #fffbea 60deg, transparent 0) 0 0/26px 16px repeat-x"
          : "position:absolute;top:0;bottom:0;right:-16px;width:16px;background:conic-gradient(from 240deg at 100% 50%, #fffbea 60deg, transparent 0) 0 0/16px 26px repeat-y";
      bite.append(edge);
      root.append(bite);
      root.classList.add("ch-shake");
    }
    return root;
  }

  // ---------- closed ----------

  function closedCard(): HTMLElement {
    const root = document.createElement("div");
    root.className = "ch ch-sky";
    const c = document.createElement("div");
    c.className = "ch-closed";
    const board = Array.from(
      { length: players },
      (_, p) => `<div><i style="background:${COLORS[p]}"></i>${name(p)}${phase === "play" && p === turn ? " · next" : ""}<b>${scores[p]} chomped</b></div>`,
    ).join("");
    c.innerHTML = `
      <div style="width:200px;height:150px">${faceSvg({ grin: true })}</div>
      <h2>Open wide!</h2>
      <p>Open the phone and set it down like a laptop: the top half is the croc's jaw, the bottom half its teeth. One is sore.</p>
      <div class="ch-board">${board}</div>
      <p style="opacity:.75">${phase === "play" ? `Round ${round} · ${pressed.size} of ${TEETH} teeth pressed` : lastResult ? `${name(lastResult.player)} just got chomped` : ""}</p>`;
    root.append(c);
    return root;
  }

  /** Closed and sideways: the whole mouth, compact, with the lower teeth in a row. */
  function compactMouth(w: number, h: number): HTMLElement {
    const root = document.createElement("div");
    root.className = `ch ch-sky${phase === "snap" ? " ch-shake" : ""}`;
    const faceH = Math.round(h * 0.46);
    const face = document.createElement("div");
    face.className = `ch-face${phase === "snap" ? " ch-slam" : ""}`;
    face.style.cssText = `--sx:0;--sy:${Math.round(h * 0.2)}px;inset:6px 0 ${h - faceH}px 0`;
    face.innerHTML = faceSvg();
    root.append(face);
    const sc = document.createElement("div");
    sc.className = "ch-score";
    sc.style.cssText = "left:8px;top:8px;flex-direction:column;align-items:flex-start;gap:3px";
    sc.innerHTML = scoreChips();
    root.append(sc);
    const gum = document.createElement("div");
    gum.style.cssText = `position:absolute;left:10px;right:10px;top:${faceH + 4}px;height:72px;border-radius:18px 18px 40px 40px;background:#e86b86;box-shadow:inset 0 -12px 0 #c94a68`;
    root.append(gum);
    const row = document.createElement("div");
    row.className = "ch-row";
    row.style.cssText = `left:16px;right:16px;top:${faceH + 10}px;height:56px`;
    for (let i = 0; i < TEETH; i++) {
      const b = toothButton(i, 0, 0, 0);
      b.style.left = b.style.top = "";
      b.style.height = "56px";
      row.append(b);
    }
    root.append(row);
    const status = document.createElement("div");
    status.className = "ch-tongue";
    status.style.cssText = `left:50%;top:${faceH + 98 + (h - faceH - 98) / 2}px;flex-direction:row;gap:10px;white-space:nowrap`;
    if (phase === "summary" && lastResult) {
      status.innerHTML = `<span class="ch-sub" style="color:#fff">${name(lastResult.player)} got chomped!</span>`;
      const b = document.createElement("button");
      b.className = "ch-btn";
      b.textContent = "Next round";
      b.onclick = () => {
        round++;
        newRound((startedBy + 1) % players);
      };
      status.append(b);
    } else if (phase === "play") {
      status.innerHTML = `<span class="ch-turn" style="font-size:14px;color:${COLORS[turn]}">${name(turn)}</span><span class="ch-sub" style="color:#cfeec4">press a tooth · ${remaining() === TEETH ? "one is sore" : `1 in ${remaining()} snaps`}</span>`;
    }
    root.append(status);
    if (phase === "snap") root.insertAdjacentHTML("beforeend", `<div class="ch-flash"></div><div class="ch-bang">CHOMP!</div>`);
    return root;
  }

  function render(s: DuoState): void {
    current = s;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.display === "outer") {
      if (pose.id === "closed-landscape") screens.outer.append(compactMouth(screens.outer.clientWidth || 373, screens.outer.clientHeight || 293));
      else screens.outer.append(closedCard());
      return;
    }
    const w = screens.end.clientWidth || (pose.split === "stacked" ? 373 : 293);
    const h = screens.end.clientHeight || (pose.split === "stacked" ? 293 : 373);
    if (pose.split === "stacked") {
      screens.start.append(upperJaw("bottom"));
      screens.end.append(lowerJaw("top", w, h));
    } else {
      screens.start.append(upperJaw("right"));
      screens.end.append(lowerJaw("left", w, h));
    }
  }

  newGame(2);

  return {
    render,
    hinge(s: DuoState) {
      current = s;
      // Only the croc's nerves change with the angle; skip mid-snap so the animation runs.
      if (phase !== "snap") render(s);
    },
    destroy() {
      clearTimeout(snapTimer);
      style.remove();
    },
  };
}

export const chompExample: Example = {
  id: "chomp",
  title: "Chomp",
  category: "games",
  summary:
    "The crocodile-dentist game, where the phone is the jaw: the standing half is the croc's face and upper jaw, the flat half its lower jaw full of teeth. Take turns pressing teeth — one is sore, and pressing it snaps the jaw shut.",
  bestPose: "table",
  poses: {
    closed: "The croc grins up at you with “Open wide!”, the scoreboard of who has been chomped, and where the round stands.",
    "closed-landscape": "A compact mouth: the croc's face above, the twelve lower teeth in one row below, still playable pass-and-play.",
    open: "Upper jaw on the left page, lower jaw on the right with the back of the mouth on the fold; it plays, but the jaw can't close on you.",
    "open-portrait": "The table layout lying flat: face on top, teeth below, with no hinge to make the croc nervous.",
    book: "Upper jaw left, lower jaw right; fold the pages narrower and the croc trembles and sweats more.",
    table:
      "The phone is the jaw: the standing half is the croc's face, watching the last tooth you pressed and sweating as the odds rise; the flat half holds the teeth, and the sore one slams the top jaw down.",
    stand: "Stood on its edge between players, face on one page and teeth on the other — the narrower the angle, the twitchier the croc.",
  },
  principle:
    "Destination follows purpose: the croc you watch stands on top and the teeth you press lie on the stable bottom half (HIG checklist §6). The hinge angle only drives an effect — the croc's nerves — never the layout (HIG checklist §9, AGENTS.md's hinge rule).",
  create,
};
