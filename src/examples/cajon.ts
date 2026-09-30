/**
 * Cajón — play on the bottom half, watch the instrument on the top.
 *
 * In table pose the bottom leaf lies flat like the cajón's front plate (the
 * tapa) and the fold becomes its top edge: strike near the fold for a slap,
 * lower down for bass, left and right halves for each hand. The standing top
 * leaf shows the box itself answering — the plate flexing where you hit, the
 * snare wires buzzing on a slap — and, if you want it, a groove scrolling
 * toward a hit line to play along with.
 *
 * Sounds, strokes and the first two grooves are Ritmo's
 * (github.com/dalmaer/cajones), ported to this contract.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { cajon as strike, note, now, ready, running, type Stroke } from "../lib/audio.ts";

type Hand = "L" | "R";
type Step = { R: Stroke | null; L: Stroke | null };

const bar = (...tokens: string[]): Step[] =>
  tokens.map((t) => (t === "-" ? { R: null, L: null } : { R: t[0] === "R" ? (t[1] as Stroke) : null, L: t[0] === "L" ? (t[1] as Stroke) : null }));

/** Ritmo's first two grooves, eighth notes, 4/4. */
const GROOVES = {
  first: { title: "The first beat", bars: [bar("RB", "-", "Ls", "-", "RB", "-", "Ls", "-"), bar("RB", "-", "Ls", "-", "RB", "Ls", "RS", "-")] },
  backbeat: { title: "Find the backbeat", bars: [bar("RB", "Ls", "RS", "Ls", "RB", "Ls", "RS", "Ls"), bar("RB", "Ls", "RS", "-", "RB", "Ls", "RS", "LS")] },
} as const;
type GrooveId = keyof typeof GROOVES;

const STROKE_NAME: Record<Stroke, string> = { B: "Bass", s: "Slap", S: "Accent" };
const WINDOW = 0.13; // seconds either side of a note that still counts

const CSS = `
.cj { position:absolute; inset:0; display:flex; flex-direction:column; background:#1a120b; color:#f6e7d2; font-size:12px; }
.cj-wood { background:
  repeating-linear-gradient(92deg, rgb(0 0 0 / 0.06) 0 2px, transparent 2px 9px),
  repeating-linear-gradient(88deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 23px),
  linear-gradient(180deg, #c98d52, #a86a35 60%, #8e5427); }
.cj-box { position:relative; flex:1; margin:10px 14% 6px; border-radius:6px; box-shadow: 0 0 0 5px #4a2c16, 0 10px 24px rgb(0 0 0 / 0.6); overflow:hidden; }
.cj-wires { position:absolute; left:10%; right:10%; top:8%; height:16%; display:flex; flex-direction:column; justify-content:space-between; }
.cj-wires i { height:1.5px; background:rgb(40 25 10 / 0.55); transition: transform 0.05s; }
.cj-box.buzz .cj-wires i { animation: cj-buzz 0.16s linear; background:#ffe3b8; }
@keyframes cj-buzz { 0%,100%{transform:translateY(0)} 25%{transform:translateY(-1.5px)} 75%{transform:translateY(1.5px)} }
.cj-ripple { position:absolute; width:12px; height:12px; margin:-6px 0 0 -6px; border-radius:50%; border:2px solid #fff4e0; pointer-events:none; animation: cj-rip 0.5s ease-out forwards; }
.cj-ripple.B { border-color:#ffd08a; animation-duration:0.7s; }
@keyframes cj-rip { to { transform: scale(9); opacity:0; } }
.cj-box.thump { animation: cj-thump 0.18s ease-out; }
@keyframes cj-thump { 40% { transform: scale(0.985); } }
.cj-label { position:absolute; bottom:6px; left:0; right:0; text-align:center; font-weight:700; letter-spacing:0.3em; font-size:10px; color:rgb(60 30 10 / 0.7); }
.cj-lane { position:relative; height:44px; margin:0 10px 8px; border-radius:8px; background:rgb(0 0 0 / 0.45); overflow:hidden; }
.cj-lane[hidden] { display:none; }
.cj-lane .hit { position:absolute; left:18%; top:0; bottom:0; width:2px; background:#f07a4a; }
.cj-lane .row { position:absolute; left:0; right:0; height:50%; }
.cj-lane .row.R { top:0; } .cj-lane .row.L { top:50%; }
.cj-lane .nt { position:absolute; top:50%; transform:translate(-50%,-50%); font:700 11px/1 ui-monospace,monospace; padding:2px 4px; border-radius:4px; background:#f6e7d2; color:#2a1a0c; }
.cj-lane .nt.ok { background:#7bd88f; } .cj-lane .nt.miss { opacity:0.35; }
.cj-lane .tag { position:absolute; left:4px; font-size:9px; opacity:0.5; }
.cj-bar { display:flex; gap:6px; align-items:center; padding:0 10px 8px; }
.cj-bar button { border:0; border-radius:999px; padding:5px 10px; background:#f6e7d2; color:#2a1a0c; font:600 11px system-ui; cursor:pointer; }
.cj-bar button.on { background:#f07a4a; color:#fff; }
.cj-bar .score { margin-left:auto; font:600 11px ui-monospace,monospace; opacity:0.85; }
.cj-pads { position:absolute; inset:0; display:grid; gap:3px; padding:3px; background:#1a120b; }
.cj-pads.two { grid-template-columns:1fr 1fr; grid-template-rows: 1fr 1.2fr 1.6fr; }
.cj-pad { border:0; border-radius:10px; color:#3b220f; font:700 11px system-ui; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; position:relative; touch-action:none; }
.cj-pad span { position:absolute; left:8px; bottom:6px; opacity:0.75; }
.cj-pad.S { filter: brightness(1.12); } .cj-pad.B { filter: brightness(0.9); }
.cj-pad.hit { filter: brightness(1.5); }
.cj-edge { position:absolute; left:0; right:0; height:3px; background:#4a2c16; }
.cj-hint { position:absolute; left:0; right:0; text-align:center; font-size:10px; opacity:0.55; pointer-events:none; }
`;

/** Where on the plate a stroke lands, as a fraction of the box: slaps high, bass low. */
function spot(hand: Hand, stroke: Stroke): { x: number; y: number } {
  const x = (hand === "L" ? 0.3 : 0.7) + (Math.random() - 0.5) * 0.12;
  const y = stroke === "S" ? 0.12 : stroke === "s" ? 0.28 : 0.6;
  return { x, y: y + (Math.random() - 0.5) * 0.06 };
}

function create(screens: Screens, _state: DuoState): Instance {
  // --- state, which outlives every render ---
  let groove: GrooveId = "first";
  let bpm = 84;
  let playing = false;
  let startAt = 0;
  let hits = 0;
  let matched = 0;
  let raf = 0;
  const judged = new Map<string, "ok" | "miss">();

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  let box: HTMLElement | null = null;
  let lane: HTMLElement | null = null;
  let score: HTMLElement | null = null;
  let playBtn: HTMLButtonElement | null = null;

  const stepDur = () => 60 / bpm / 2;
  const steps = () => GROOVES[groove].bars.flat();

  function instrument(): HTMLElement {
    const root = document.createElement("div");
    root.className = "cj";
    root.innerHTML = `
      <div class="cj-box cj-wood"><div class="cj-wires">${"<i></i>".repeat(4)}</div><div class="cj-label">CAJÓN</div></div>
      <div class="cj-lane" ${playing ? "" : "hidden"}><i class="hit"></i><div class="row R"><span class="tag">R</span></div><div class="row L"><span class="tag">L</span></div></div>
      <div class="cj-bar">
        <button class="play">${playing ? "Stop" : "Play along"}</button>
        <button class="groove">${GROOVES[groove].title}</button>
        <button class="tempo">${bpm} bpm</button>
        <span class="score"></span>
      </div>`;
    box = root.querySelector(".cj-box");
    lane = root.querySelector(".cj-lane");
    score = root.querySelector(".score");
    playBtn = root.querySelector(".play");
    playBtn!.onclick = () => toggle();
    root.querySelector<HTMLButtonElement>(".groove")!.onclick = (e) => {
      groove = groove === "first" ? "backbeat" : "first";
      (e.currentTarget as HTMLElement).textContent = GROOVES[groove].title;
      restart();
    };
    root.querySelector<HTMLButtonElement>(".tempo")!.onclick = (e) => {
      bpm = bpm >= 120 ? 64 : bpm + 16;
      (e.currentTarget as HTMLElement).textContent = `${bpm} bpm`;
      restart();
    };
    updateScore();
    return root;
  }

  /**
   * The playing surface. `edge` says which side the cajón's top edge is on:
   * next to the fold in table pose, so slaps are nearest the hinge.
   */
  function pads(edge: "top" | "none", hint: string): HTMLElement {
    const root = document.createElement("div");
    root.className = "cj-pads two cj-wood";
    const order: Stroke[] = ["S", "s", "B"];
    for (const stroke of order) {
      for (const hand of ["L", "R"] as Hand[]) {
        const b = document.createElement("button");
        b.className = `cj-pad cj-wood ${stroke}`;
        b.innerHTML = `<span>${hand} · ${STROKE_NAME[stroke]}</span>`;
        b.setAttribute("aria-label", `${hand === "L" ? "Left" : "Right"} hand ${STROKE_NAME[stroke]}`);
        bindPad(b, hand, stroke);
        root.append(b);
      }
    }
    if (edge === "top") root.insertAdjacentHTML("beforeend", `<i class="cj-edge" style="top:0"></i>`);
    root.insertAdjacentHTML("beforeend", `<div class="cj-hint" style="bottom:4px">${hint}</div>`);
    return root;
  }

  // Ritmo's rule: the first touch unlocks audio on pointerup (a trusted
  // activation); once running, strike on pointerdown for latency.
  function bindPad(b: HTMLButtonElement, hand: Hand, stroke: Stroke): void {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (running()) play(hand, stroke, b);
      else ready().then(() => play(hand, stroke, b)).catch(() => {});
    });
    b.addEventListener("click", (e) => {
      if ((e as MouseEvent).detail === 0) ready().then(() => play(hand, stroke, b));
    });
  }

  function play(hand: Hand, stroke: Stroke, pad?: HTMLElement): void {
    strike(stroke);
    hits++;
    pad?.classList.add("hit");
    setTimeout(() => pad?.classList.remove("hit"), 90);
    if (box) {
      const p = spot(hand, stroke);
      const r = document.createElement("i");
      r.className = `cj-ripple ${stroke}`;
      r.style.left = `${p.x * 100}%`;
      r.style.top = `${p.y * 100}%`;
      box.append(r);
      setTimeout(() => r.remove(), 750);
      box.classList.remove("buzz", "thump");
      void box.offsetWidth;
      box.classList.add(stroke === "B" ? "thump" : "buzz");
    }
    if (playing) judge(hand, stroke);
    updateScore();
  }

  function judge(hand: Hand, stroke: Stroke): void {
    const t = now() - startAt;
    const seq = steps();
    const d = stepDur();
    const i = Math.round(t / d);
    for (const k of [i, i - 1, i + 1]) {
      const step = seq[((k % seq.length) + seq.length) % seq.length];
      if (step?.[hand] === stroke && Math.abs(t - k * d) < WINDOW && !judged.has(`${k}${hand}`)) {
        judged.set(`${k}${hand}`, "ok");
        matched++;
        return;
      }
    }
  }

  function updateScore(): void {
    if (score) score.textContent = playing ? `${matched} in time` : hits ? `${hits} hits` : "";
  }

  function toggle(): void {
    if (playing) stop();
    else ready().then(start);
  }

  function start(): void {
    playing = true;
    matched = 0;
    judged.clear();
    // Two beats of count-in before the first note reaches the line.
    startAt = now() + 4 * stepDur();
    for (let i = 0; i < 4; i += 2) note(84, 0.05, 0.15, "sine", now() + i * stepDur());
    if (playBtn) playBtn.textContent = "Stop";
    if (lane) lane.hidden = false;
    loop();
  }

  function stop(): void {
    playing = false;
    cancelAnimationFrame(raf);
    if (playBtn) playBtn.textContent = "Play along";
    if (lane) lane.hidden = true;
    updateScore();
  }

  function restart(): void {
    if (!playing) return;
    stop();
    ready().then(start);
  }

  /** Draw the notes due in the next few seconds, sliding toward the hit line. */
  function loop(): void {
    raf = requestAnimationFrame(loop);
    if (!lane) return;
    const t = now() - startAt;
    const d = stepDur();
    const seq = steps();
    const span = 16; // steps visible after the line
    const first = Math.floor(t / d) - 3;
    const rows = { R: lane.querySelector<HTMLElement>(".row.R")!, L: lane.querySelector<HTMLElement>(".row.L")! };
    rows.R.querySelectorAll(".nt").forEach((n) => n.remove());
    rows.L.querySelectorAll(".nt").forEach((n) => n.remove());
    for (let k = Math.max(0, first); k < first + span; k++) {
      const step = seq[k % seq.length]!;
      for (const hand of ["R", "L"] as Hand[]) {
        const s = step[hand];
        if (!s) continue;
        const key = `${k}${hand}`;
        if (!judged.has(key) && t - k * d > WINDOW) judged.set(key, "miss");
        const x = 18 + ((k * d - t) / (span * d)) * 82;
        const n = document.createElement("span");
        n.className = `nt ${judged.get(key) ?? ""}`;
        n.textContent = s;
        n.style.left = `${x}%`;
        rows[hand].append(n);
      }
    }
    updateScore();
  }

  function render(state: DuoState): void {
    const { pose } = state;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    box = lane = score = playBtn = null;
    if (pose.id === "closed") {
      // One small screen: the plate is the whole display, with the box as a strip.
      const wrap = document.createElement("div");
      wrap.className = "x-fill";
      wrap.style.cssText = "display:grid;grid-template-rows:38% 1fr";
      const inst = instrument();
      inst.style.position = "relative";
      const surface = pads("none", "Open and set it down for the full kit");
      surface.style.position = "relative";
      wrap.append(inst, surface);
      screens.outer.append(wrap);
    } else if (pose.id === "closed-landscape") {
      screens.outer.append(pads("none", "Thumbs: left hand left, right hand right"));
    } else if (pose.split === "side-by-side") {
      screens.start.append(instrument());
      screens.end.append(pads("none", pose.id === "book" ? "Stand it up, or fold it flat for table pose" : "Fold it into table pose to play like a real one"));
    } else {
      screens.start.append(instrument());
      screens.end.append(pads("top", "The fold is the top edge: slap near it, bass below"));
    }
  }

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      style.remove();
    },
  };
}

export const cajonExample: Example = {
  id: "cajon",
  title: "Cajón",
  category: "music",
  summary:
    "Set the Duo down like a tiny laptop and it becomes a cajón: play the bottom half, and the top half shows the box answering — the plate flexing where you hit, the snare wires buzzing — with a groove to play along to.",
  bestPose: "table",
  poses: {
    closed: "A single pad with the box as a strip above it. Playable, but it is waiting for you to open it.",
    "closed-landscape": "Two thumbs: left hand on the left, right hand on the right, like Ritmo's phone layout.",
    open: "The box on the left page, the plate on the right. Everything works; it just isn't how you'd hold one.",
    "open-portrait": "The same split as table pose, lying flat.",
    book: "Box left, plate right — handy for watching someone else play.",
    table: "The bottom half is the plate and the fold is its top edge: slap near the hinge, bass lower down. The top half shows the instrument and the play-along lane.",
  },
  principle:
    "Table pose puts content you watch on top and controls you touch on the stable bottom half — the destination Apple gives for at-a-distance content and tappable controls (HIG checklist §6, 'Destination follows purpose').",
  credits: [
    { who: "Ritmo / dalmaer/cajones", url: "https://dalmaer.github.io/cajones/", what: "the cajón voices, strokes and grooves" },
    { who: "@stvnzhangshuhan (CRATE)", url: "https://x.com/stvnzhangshuhan", what: "finger drums on the bottom screen, sequencer on top" },
  ],
  create,
};
