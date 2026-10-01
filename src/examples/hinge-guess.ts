/**
 * Hinge Guess — fold to a target angle by feel, then measure.
 *
 * erkamyaman/hinge-guess turned a foldable's hinge sensor into the game
 * controller: you're given an angle, you fold the phone to where you think it
 * is, and the phone tells you how close you got. Here the protractor is drawn
 * across both halves with its pivot on the fold, so the device *is* the
 * instrument — each half draws its own slice of one dial and they meet at the
 * hinge.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { note, ready } from "../lib/audio.ts";

const ROUNDS = 5;

type Result = { target: number; got: number; acc: number };
type Mode = "book" | "table";

const CSS = `
.hg { position:absolute; inset:0; background: radial-gradient(120% 100% at 50% 100%, #1b2233, #0a0c12 70%); color:#eef2f8; font:12px/1.3 system-ui,-apple-system,sans-serif; overflow:hidden; }
.hg svg { position:absolute; inset:0; width:100%; height:100%; }
.hg-panel { position:absolute; display:flex; flex-direction:column; gap:4px; }
.hg-kicker { font:800 9px/1 system-ui; letter-spacing:.18em; text-transform:uppercase; color:#8a9ab5; }
.hg-target { font:800 40px/1 system-ui; letter-spacing:-.02em; color:#ffb547; font-variant-numeric:tabular-nums; }
.hg-target small { font-size:14px; font-weight:600; color:#c9d3e3; letter-spacing:0; margin-right:6px; }
.hg-score { font:700 20px/1 system-ui; font-variant-numeric:tabular-nums; }
.hg-dots { display:flex; gap:4px; }
.hg-dots i { width:8px; height:8px; border-radius:50%; background:#2b3447; }
.hg-dots i.done { background:#ffb547; } .hg-dots i.now { box-shadow: inset 0 0 0 2px #ffb547; }
.hg-btn { all:unset; box-sizing:border-box; cursor:pointer; padding:9px 18px; border-radius:999px; background:#ffb547; color:#241600; font:800 13px/1 system-ui; letter-spacing:.02em; text-align:center; box-shadow:0 4px 14px rgb(255 181 71 / .3); }
.hg-btn:active { transform:scale(.97); }
.hg-btn.ghost { background:transparent; color:#c9d3e3; box-shadow: inset 0 0 0 1px #3b475e; }
.hg-toggle { all:unset; cursor:pointer; font-size:10px; color:#8a9ab5; }
.hg-toggle b { color:#5ad1ff; }
.hg-result { font-size:12px; color:#c9d3e3; }
.hg-result b { color:#fff; font-size:15px; }
.hg-acc { font:800 30px/1 system-ui; font-variant-numeric:tabular-nums; }
.hg-closed { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; text-align:center; padding:20px; box-sizing:border-box;
  background: radial-gradient(120% 90% at 50% 20%, #1b2233, #0a0c12 70%); color:#eef2f8; font:12px/1.35 system-ui,-apple-system,sans-serif; }
.hg-closed.row { flex-direction:row; text-align:left; gap:22px; }
.hg-closed h2 { margin:0; font:800 24px/1.1 system-ui; }
.hg-closed p { margin:0; color:#aab6c9; max-width:220px; }
.hg-phone { width:96px; height:96px; }
.hg-phone .leaf { transform-origin: 48px 80px; animation: hg-open 2.6s ease-in-out infinite; }
@keyframes hg-open { 0%,15% { transform: rotate(-80deg); } 55%,80% { transform: rotate(0deg); } 100% { transform: rotate(-80deg); } }
.hg-last { display:flex; gap:10px; justify-content:center; }
.hg-last div { background:rgb(255 255 255 / .06); border-radius:12px; padding:8px 12px; }
.hg-last b { display:block; font-size:20px; color:#ffb547; }
.hg-last span { font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:#8a9ab5; }
`;

const rad = (d: number) => (d * Math.PI) / 180;

/** The dial's world, shared by both halves so their slices meet at the fold. */
function world(mode: Mode) {
  return mode === "book"
    ? { w: 600, h: 380, px: 300, py: 334, r: 248, v: (a: number) => [-Math.cos(rad(a)), -Math.sin(rad(a))] as const }
    : { w: 380, h: 600, px: 30, py: 300, r: 262, v: (a: number) => [Math.sin(rad(a)), Math.cos(rad(a))] as const };
}

function create(screens: Screens, state: DuoState): Instance {
  // --- state, which outlives every render ---
  let current = state;
  let target = randomTarget();
  let phase: "aim" | "result" = "aim";
  let results: Result[] = [];
  let lastGame: { avg: number; best: number } | null = null;
  let live = false;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  function randomTarget(): number {
    return 30 + 5 * Math.floor(Math.random() * 28); // 30..165
  }

  const avg = () => (results.length ? Math.round(results.reduce((n, r) => n + r.acc, 0) / results.length) : 0);
  const last = () => results[results.length - 1];
  const gameOver = () => results.length >= ROUNDS && phase === "result";

  function measure(): void {
    const got = current.hinge;
    const acc = Math.max(0, Math.round(100 - Math.abs(got - target) * 2));
    results.push({ target, got, acc });
    phase = "result";
    if (results.length >= ROUNDS) lastGame = { avg: avg(), best: Math.max(...results.map((r) => r.acc)) };
    ready()
      .then(() => {
        const base = acc >= 90 ? 84 : acc >= 70 ? 79 : 72;
        note(base, 0.12, 0.18, "triangle");
        note(base + (acc >= 70 ? 7 : -5), 0.22, 0.18, "triangle", undefined);
      })
      .catch(() => {});
    render(current);
  }

  function next(): void {
    if (results.length >= ROUNDS) results = [];
    target = randomTarget();
    phase = "aim";
    render(current);
  }

  /** One half's slice of the protractor. */
  function dial(mode: Mode, half: "start" | "end", flat: boolean): SVGSVGElement {
    const W = world(mode);
    const at = (a: number, r: number) => {
      const [x, y] = W.v(a);
      return `${(W.px + x * r).toFixed(1)},${(W.py + y * r).toFixed(1)}`;
    };
    const arc = (r: number, from = 0, to = 180) => {
      const pts: string[] = [];
      for (let a = from; a <= to; a += 2) pts.push(at(a, r));
      pts.push(at(to, r));
      return pts.join(" ");
    };
    const vb =
      mode === "book"
        ? half === "start"
          ? `0 0 300 ${W.h}`
          : `300 0 300 ${W.h}`
        : half === "start"
          ? `0 0 ${W.w} 300`
          : `0 300 ${W.w} 300`;
    const align = mode === "book" ? (half === "start" ? "xMaxYMid" : "xMinYMid") : half === "start" ? "xMinYMax" : "xMinYMin";

    let ticks = "";
    for (let a = 0; a <= 180; a += 5) {
      const long = a % 15 === 0;
      ticks += `<line x1="${at(a, W.r).split(",")[0]}" y1="${at(a, W.r).split(",")[1]}" x2="${at(a, W.r - (long ? 16 : 8)).split(",")[0]}" y2="${at(a, W.r - (long ? 16 : 8)).split(",")[1]}" stroke="#cfd8e6" stroke-opacity="${long ? 0.9 : 0.45}" stroke-width="${long ? 2 : 1}"/>`;
      if (a % 30 === 0) {
        const [x, y] = at(a, W.r - 30).split(",");
        ticks += `<text x="${x}" y="${y}" fill="#9fb0c9" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central">${a}</text>`;
      }
    }

    const arm = (a: number, color: string, extra = "") =>
      `<line x1="${W.px}" y1="${W.py}" x2="${at(a, W.r + 6).split(",")[0]}" y2="${at(a, W.r + 6).split(",")[1]}" stroke="${color}" stroke-width="5" stroke-linecap="round" ${extra}/>`;

    let arms = "";
    const r = last();
    if (flat) {
      arms += arm(180, "#5ad1ff");
    } else if (phase === "result" && r) {
      const lo = Math.min(r.target, r.got);
      const hi = Math.max(r.target, r.got);
      if (hi > lo) arms += `<polygon points="${W.px},${W.py} ${arc(W.r - 40, lo, hi)}" fill="#ff5d5d" fill-opacity=".28"/>`;
      arms += arm(r.target, "#ffb547");
      arms += arm(r.got, "#ffffff", `stroke-dasharray="10 8" stroke-width="3"`);
    } else if (live) {
      arms += arm(current.hinge, "#5ad1ff", `stroke-opacity=".75"`);
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", vb);
    svg.setAttribute("preserveAspectRatio", `${align} meet`);
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `
      <defs>
        <radialGradient id="hg-face-${half}" cx="${W.px}" cy="${W.py}" r="${W.r}" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#7fb0ff" stop-opacity=".02"/><stop offset="1" stop-color="#7fb0ff" stop-opacity=".14"/>
        </radialGradient>
      </defs>
      <polygon points="${W.px},${W.py} ${arc(W.r)}" fill="url(#hg-face-${half})"/>
      <polyline points="${arc(W.r)}" fill="none" stroke="#cfd8e6" stroke-opacity=".8" stroke-width="2"/>
      <polyline points="${arc(W.r * 0.42)}" fill="none" stroke="#cfd8e6" stroke-opacity=".18" stroke-width="1"/>
      ${ticks}
      ${arms}
      ${arm(0, "#8a9ab5")}
      <circle cx="${W.px}" cy="${W.py}" r="9" fill="#0a0c12" stroke="#cfd8e6" stroke-width="2.5"/>
      <circle cx="${W.px}" cy="${W.py}" r="3" fill="#ffb547"/>`;
    return svg;
  }

  function panel(pos: string): HTMLElement {
    const p = document.createElement("div");
    p.className = "hg-panel";
    p.style.cssText = pos;
    return p;
  }

  function dots(): string {
    let s = "";
    for (let k = 0; k < ROUNDS; k++) s += `<i class="${k < results.length ? "done" : k === results.length ? "now" : ""}"></i>`;
    return `<div class="hg-dots">${s}</div>`;
  }

  function targetBlock(flat: boolean): HTMLElement {
    const p = panel("");
    const n = Math.min(results.length + (phase === "aim" ? 1 : 0), ROUNDS);
    p.innerHTML = flat
      ? `<span class="hg-kicker">Flat</span><div class="hg-target" style="color:#5ad1ff">180°</div><span class="hg-result">Fold into book or table to play.</span>`
      : `<span class="hg-kicker">Round ${n} of ${ROUNDS}</span><div class="hg-target"><small>Fold to</small>${target}°</div>${dots()}`;
    return p;
  }

  function actionBlock(flat: boolean, alignRight: boolean): HTMLElement {
    const p = panel("");
    p.style.alignItems = alignRight ? "flex-end" : "flex-start";
    p.style.textAlign = alignRight ? "right" : "left";
    const r = last();
    if (flat) {
      p.innerHTML = `<span class="hg-kicker">Meter</span><div class="hg-score">180°</div>`;
      return p;
    }
    if (phase === "result" && r) {
      const off = Math.abs(r.got - r.target);
      const color = r.acc >= 90 ? "#6be38f" : r.acc >= 70 ? "#ffb547" : "#ff6b6b";
      p.innerHTML = `<div class="hg-acc" style="color:${color}">${r.acc}%</div>
        <div class="hg-result">You folded to <b>${r.got}°</b> · off by ${off}°</div>
        <div class="hg-result">${gameOver() ? `Game: <b>${avg()}%</b> average` : `Average <b>${avg()}%</b>`}</div>`;
      const b = document.createElement("button");
      b.className = "hg-btn";
      b.textContent = gameOver() ? "Play again" : "Next round";
      b.onclick = next;
      p.append(b);
    } else {
      p.innerHTML = `<span class="hg-kicker">Score</span><div class="hg-score">${results.length ? `${avg()}%` : "—"}</div>`;
      const b = document.createElement("button");
      b.className = "hg-btn";
      b.textContent = "Measure";
      b.onclick = measure;
      const t = document.createElement("button");
      t.className = "hg-toggle";
      t.innerHTML = live ? "Live arm: <b>on</b>" : "Live arm: off";
      t.title = "Show where the hinge is while you fold (practice)";
      t.onclick = () => {
        live = !live;
        render(current);
      };
      p.append(b, t);
    }
    return p;
  }

  function closedCard(row: boolean): HTMLElement {
    const c = document.createElement("div");
    c.className = `hg-closed${row ? " row" : ""}`;
    const done = lastGame ?? (results.length ? { avg: avg(), best: Math.max(...results.map((r) => r.acc)) } : null);
    c.innerHTML = `
      <svg class="hg-phone" viewBox="0 0 96 96" aria-hidden="true">
        <rect x="16" y="78" width="64" height="5" rx="2.5" fill="#8a9ab5"/>
        <g class="leaf"><rect x="16" y="73" width="64" height="5" rx="2.5" fill="#ffb547"/></g>
        <circle cx="48" cy="80" r="3" fill="#eef2f8"/>
      </svg>
      <div style="display:flex;flex-direction:column;gap:10px;align-items:${row ? "flex-start" : "center"}">
        <span class="hg-kicker">Hinge Guess</span>
        <h2>Open the phone to play</h2>
        <p>The game is the hinge. Fold to the angle you're given, then measure how close you got.</p>
        ${
          done
            ? `<div class="hg-last"><div><b>${done.avg}%</b><span>${lastGame ? "Last game" : "So far"}</span></div><div><b>${done.best}%</b><span>Best round</span></div></div>`
            : ""
        }
      </div>`;
    return c;
  }

  function render(s: DuoState): void {
    current = s;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();

    if (pose.display === "outer") {
      screens.outer.append(closedCard(pose.id === "closed-landscape"));
      return;
    }
    const flat = !pose.adjustable;
    const mode: Mode = pose.split === "side-by-side" ? "book" : "table";
    const a = document.createElement("div");
    a.className = "hg";
    const b = document.createElement("div");
    b.className = "hg";
    a.append(dial(mode, "start", flat));
    b.append(dial(mode, "end", flat));

    const t = targetBlock(flat);
    const act = actionBlock(flat, true);
    if (mode === "book") {
      t.style.cssText += "left:16px;top:14px;";
      act.style.cssText += "right:16px;top:14px;";
      a.append(t);
      b.append(act);
    } else {
      // Table: the question stands on top; the button you press lies flat.
      t.style.cssText += "right:16px;top:14px;align-items:flex-end;text-align:right;";
      act.style.cssText += "right:16px;bottom:14px;";
      a.append(t);
      b.append(act);
    }
    screens.start.append(a);
    screens.end.append(b);
  }

  return {
    render,
    hinge(s: DuoState) {
      current = s;
      // Blind by default: the dial only changes while you aim if the live arm is on.
      if (live && phase === "aim") render(s);
    },
    destroy() {
      style.remove();
    },
  };
}

export const hingeGuessExample: Example = {
  id: "hinge-guess",
  title: "Hinge Guess",
  category: "games",
  summary:
    "A game played with the hinge: you're given an angle, fold the Duo to where you think it is, and measure. A protractor drawn across both halves, pivoting on the fold, shows the target against where you actually were.",
  bestPose: "book",
  poses: {
    closed: "The outer display has no hinge to read, so it asks you to open the phone, and shows your last score.",
    "closed-landscape": "The same prompt to open up, laid out sideways, with your last score.",
    open: "Flat is 180°: the dial reads 180 across both halves and asks you to fold it partway to play.",
    "open-portrait": "Flat and tall, the dial reads 180 with its pivot on the horizontal fold.",
    book: "The protractor's pivot sits at the bottom of the fold and its arms sweep across both pages; fold to the target, tap Measure, and see your dashed arm against the real one.",
    table: "The dial turns on its side: the target stands on the upright half, the fixed arm lies along the flat half, and Measure sits under your thumb.",
    stand: "Stood on its edge, the protractor pivots on the vertical fold — measure the angle hands-free.",
  },
  principle:
    "The hinge is used for interaction, not just layout: the angle between the halves is the game's input, and the round carries over between book and table because state lives in the app, not the pose (HIG, 'Displays, poses, and continuity').",
  credits: [{ who: "erkamyaman/hinge-guess", url: "https://github.com/erkamyaman/hinge-guess", what: "the game: fold to a target angle, then measure" }],
  create,
};
