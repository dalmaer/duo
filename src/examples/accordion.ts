/**
 * Accordion — the hinge is the bellows.
 *
 * Hold the Duo in book pose (or stand it up, or set it down in table pose)
 * and it is a melodeon: bass and chord buttons under the left hand, two rows
 * of treble buttons under the right, and the fold between them is the
 * bellows. A held button only sounds while the bellows move: the example
 * measures how fast the hinge angle is changing, and that speed is the air.
 * Closing the hinge pushes, opening it pulls — and, like a real diatonic
 * button accordion, each treble button plays a different note on the push
 * than on the pull.
 *
 * Layout choice: a two-row G/C diatonic ("melodeon") rather than a chromatic
 * button board, because push/pull is the point of the instrument and it is
 * the point of this example — the hinge direction changes the music, not just
 * the volume. The C row pushes a C major chord (E G C E G C …) and pulls a
 * G7/Dm scale fill (G B D F A B …); the G row is the same a fourth lower. The
 * left hand is simplified to eight unisonoric buttons (bass + chord for C, G,
 * F, D) so the accompaniment does not fight the bellows while you learn.
 *
 * Flat (open) the hinge cannot move, so notes sound on tap at a fixed air
 * level with a push/pull switch; closed it is a one-row board. An
 * Auto-bellows switch breathes for you, for desktop players who cannot drag
 * the hinge slider and press buttons at the same time.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { HINGE_RANGE, type Pose } from "../core/poses.ts";
import { ready, running } from "../lib/audio.ts";

type Dir = "push" | "pull";
type Side = "l" | "r" | "t" | "b";

interface Treble {
  id: string;
  push: number;
  pull: number;
}
interface Bass {
  id: string;
  root: string;
  chord: boolean;
  notes: number[];
}

const C_PUSH = [52, 55, 60, 64, 67, 72, 76, 79, 84, 88];
const C_PULL = [55, 59, 62, 65, 69, 71, 74, 77, 81, 83];
const ROW_C: Treble[] = C_PUSH.map((p, i) => ({ id: `C${i + 1}`, push: p, pull: C_PULL[i]! }));
const ROW_G: Treble[] = C_PUSH.map((p, i) => ({ id: `G${i + 1}`, push: p - 5, pull: C_PULL[i]! - 5 }));

const ROOTS: [string, number][] = [
  ["C", 36],
  ["G", 43],
  ["F", 41],
  ["D", 38],
];
const BASS: Bass[] = ROOTS.flatMap(([name, m]) => [
  { id: `B${name}`, root: name, chord: false, notes: [m] },
  { id: `H${name}`, root: name, chord: true, notes: [m + 12 + 12, m + 12 + 16, m + 12 + 19].map((n) => (n > 62 ? n - 12 : n)) },
]);

const TREBLE = new Map([...ROW_C, ...ROW_G].map((t) => [t.id, t]));
const BASSES = new Map(BASS.map((b) => [b.id, b]));

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];
const nm = (m: number) => NAMES[m % 12]!;
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

const FIXED_AIR = 0.75;
const AUTO_PERIOD = 3.2; // seconds for one push and one pull
const FULL_SPEED = 80; // degrees per second of hinge travel that is full air

const CSS = `
.ac { position:absolute; inset:0; display:flex; color:#f7ecd9; font:600 11px/1.2 system-ui, sans-serif; overflow:hidden;
  background: radial-gradient(140% 100% at 50% 0%, #3a1119, #16070b 75%); --ext:.5; --air:0; }
.ac.sbs { flex-direction:row; } .ac.stk { flex-direction:column; }
.ac.bel.f-l { padding-left:44px; } .ac.bel.f-r { padding-right:44px; } .ac.bel.f-t { padding-top:42px; } .ac.bel.f-b { padding-bottom:42px; }
.ac.flat.f-l { padding-left:18px; } .ac.flat.f-r { padding-right:18px; } .ac.flat.f-t { padding-top:16px; } .ac.flat.f-b { padding-bottom:16px; }

.ac-bellows { position:absolute; pointer-events:none; z-index:1;
  --pl: linear-gradient(90deg, #3c0811, #a8263a 40%, #f2d6a2 50%, #a8263a 60%, #3c0811); }
.ac-bellows::before { content:""; position:absolute; inset:7px 0; background: var(--pl); background-size: calc(100% / 7) 100%; }
.ac-bellows::after { content:""; position:absolute; inset:0; border:solid #c9a24c; border-width:7px 0; }
.ac-bellows.v { top:0; bottom:0; width: calc(10px + var(--ext) * 32px); }
.ac-bellows.v.at-l { left:0; } .ac-bellows.v.at-r { right:0; }
.ac-bellows.h { left:0; right:0; height: calc(10px + var(--ext) * 30px);
  --pl: linear-gradient(180deg, #3c0811, #a8263a 40%, #f2d6a2 50%, #a8263a 60%, #3c0811); }
.ac-bellows.h::before { inset:0 7px; background-size: 100% calc(100% / 7); }
.ac-bellows.h::after { border-width:0 7px; }
.ac-bellows.h.at-t { top:0; } .ac-bellows.h.at-b { bottom:0; }

.ac-board { display:flex; flex:none; gap:6px; padding:8px; }
.ac.sbs .ac-board { flex-direction:row; } .ac.stk .ac-board { flex-direction:column; }
.ac-row { display:flex; justify-content:space-evenly; align-items:center; }
.ac.sbs .ac-row { flex-direction:column; }
.ac.stk .ac-row { flex-direction:row; }
.ac.sbs .ac-row.off1 { padding-top:16px; } .ac.sbs .ac-row.off0 { padding-bottom:16px; }
.ac.stk .ac-row.off1 { padding-left:16px; } .ac.stk .ac-row.off0 { padding-right:16px; }

.ac-key { position:relative; border:0; padding:0; border-radius:50%; aspect-ratio:1; cursor:pointer; touch-action:none; display:grid; place-content:center;
  color:#3a2414; font:800 9px/1 system-ui; background: radial-gradient(circle at 35% 30%, #fffaf0, #eadfc8 55%, #b7a585);
  box-shadow: 0 3px 0 #4a2c18, 0 4px 6px rgb(0 0 0 / .5), inset 0 -2px 3px rgb(0 0 0 / .18); transition: transform .04s; }
.ac-tr.sbs .ac-key { width: min(31px, 8.3cqh); }
.ac-tr.stk .ac-key { width: min(32px, 8.2cqw); }
.ac-key b { display:block; font:inherit; }
.ac-key .pl { font-size:7.5px; opacity:.55; margin-top:1px; }
.ac.pull .ac-key .ps { font-size:7.5px; opacity:.55; } .ac.pull .ac-key .pl { font-size:9px; opacity:1; }
.ac-key.g { background: radial-gradient(circle at 35% 30%, #fff, #d9e4ea 55%, #9fb0ba); }
.ac-key.on { transform: translateY(2px); background: radial-gradient(circle at 40% 35%, #fff4cc, #f0c35c 60%, #b8862a); box-shadow: 0 1px 0 #4a2c18, 0 0 14px rgb(255 200 90 / .6); }

.ac-bs .ac-key { width: min(46px, 13cqh); background: radial-gradient(circle at 35% 30%, #4a4a52, #26262c 60%, #111); color:#efe6d6; }
.ac-bs.stk .ac-key { width: min(48px, 15cqh); }
.ac-bs .ac-key.ch { background: radial-gradient(circle at 35% 30%, #7a5a3a, #4a3020 60%, #24160c); }
.ac-bs .ac-key small { display:block; font:700 7px/1 system-ui; opacity:.6; margin-top:2px; letter-spacing:.06em; }
.ac-bs .ac-key.on { background: radial-gradient(circle at 40% 35%, #fff4cc, #f0c35c 60%, #b8862a); color:#3a2414; }

.ac-grille { position:relative; flex:1; min-width:0; min-height:0; margin:8px; border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
  background:
    radial-gradient(circle, rgb(0 0 0 / .65) 30%, transparent 32%) 0 0 / 9px 9px,
    linear-gradient(160deg, #d8b25a, #9c7426 60%, #6e4f17);
  box-shadow: inset 0 0 0 2px #f3d98f, inset 0 0 0 5px #6e4f17, 0 4px 10px rgb(0 0 0 / .5); }
.ac-mark { font:900 italic 15px/1 Georgia, "Times New Roman", serif; letter-spacing:.06em; color:#fff3cf; background:#4a0d17; padding:5px 10px; border-radius:4px; box-shadow: 0 0 0 1.5px #e8c46a; }
.ac-dir { white-space:nowrap; font:800 10px/1 ui-monospace, monospace; letter-spacing:.18em; padding:4px 8px; border-radius:999px; background:#2a1a10; color:#ffb9a0; }
.ac.pull .ac-dir { color:#a8d8ff; }

.ac-panel { flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; justify-content:center; gap:10px; padding:12px; }
.ac-airbox { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.ac-airbox label { font:800 9px/1 system-ui; letter-spacing:.2em; opacity:.7; }
.ac-air { position:relative; flex:1; min-width:40px; height:12px; border-radius:6px; background:#2a1216; box-shadow: inset 0 1px 3px #000; overflow:hidden; }
.ac-air i { position:absolute; inset:0 auto 0 0; width: calc(var(--air) * 100%); border-radius:6px; background: linear-gradient(90deg, #ff9a6a, #ff5a4a); }
.ac.pull .ac-air i { background: linear-gradient(90deg, #8fd0ff, #4a8dff); }
.ac-btn { border:0; border-radius:9px; min-height:34px; padding:0 12px; cursor:pointer; font:800 11px/1 system-ui; letter-spacing:.04em; color:#2a1208; background:#f2d6a2; box-shadow: 0 2px 0 #5a3418; }
.ac-btn.on { background:#ff7a50; color:#fff; box-shadow: 0 0 12px rgb(255 122 80 / .55), 0 2px 0 #5a3418; }
.ac-hint { margin:0; font:500 10px/1.35 system-ui; opacity:.66; }
.ac-board.bass { gap:10px; padding:10px; }

/* closed: a one-row board */
.ac-cp { flex-direction:column; padding:12px 12px 10px; gap:8px; }
.ac-cp .ac-head { display:flex; align-items:center; gap:8px; padding-right:44px; }
.ac-cp .ac-mark { font-size:13px; padding:4px 8px; }
.ac-cp .ac-main { flex:1; min-height:0; display:grid; gap:8px; }
.ac-cp.port .ac-main { grid-template-columns: 1fr 1.5fr; }
.ac-cp .ac-col { display:flex; flex-direction:column; gap:4px; min-height:0; }
.ac-cp .ac-line { display:flex; gap:4px; min-width:0; }
.ac-cp .ac-key { aspect-ratio:auto; border-radius:999px; flex:1; min-height:0; min-width:0; }
.ac-cp.port .ac-key { display:flex; gap:8px; justify-content:center; align-items:center; }
.ac-cp .ac-key .pl { margin:0; }
.ac-cp .ac-key.ch { background: radial-gradient(circle at 35% 30%, #7a5a3a, #4a3020 60%, #24160c); color:#efe6d6; }
.ac-cp .ac-key.ch.on { background: radial-gradient(circle at 40% 35%, #fff4cc, #f0c35c 60%, #b8862a); color:#3a2414; }
.ac-cp.land { display:grid; grid-template-columns: 1fr 78px; grid-template-rows: auto 1fr; padding:10px; column-gap:10px; }
.ac-cp.land .ac-head { grid-column:1; padding-right:0; }
.ac-cp.land .ac-main { grid-column:1; grid-template-rows: 1.6fr 1fr auto; }
.ac-cp.land .ac-side { grid-column:2; grid-row: 1 / span 2; display:flex; flex-direction:column; gap:8px; padding-top:46px; }
.ac-cp.land .ac-side .ac-btn { flex:1; padding:0 6px; }
.ac-cp.land .ac-line .ac-key { flex-direction:column; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let cur = initial;
  let auto = false;
  let manualDir: Dir = "push";
  let dir: Dir = "push";
  let air = 0; // 0..1, what the reeds are getting
  let ext = 0.5; // 0..1, how far open the drawn bellows are
  let vel = 0; // smoothed hinge speed, degrees per second (+ opening)
  let lastH = initial.hinge;
  let lastHT = performance.now();
  let lastHingeAt = 0;
  let phase = 0;
  let lastFrame = performance.now();
  let raf = 0;
  const held = new Map<number, string>(); // pointer → button id

  // --- audio: our own reed bank ---
  let ctx: AudioContext | null = null;
  let treble: GainNode | null = null;
  let bassBus: GainNode | null = null;
  let reed: BiquadFilterNode | null = null;
  let airGain: GainNode | null = null;
  let lfoDepth: GainNode | null = null;
  let lfo: OscillatorNode | null = null;
  interface Voice {
    key: string;
    oscs: { o: OscillatorNode; off: number }[];
    gain: GainNode;
  }
  const voices = new Map<number, Voice>();
  let blipId = -1;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const bellowsMode = () => cur.pose.adjustable;

  async function audio(): Promise<AudioContext> {
    const c = await ready();
    if (ctx !== c) {
      ctx = c;
      treble = c.createGain();
      treble.gain.value = 1;
      reed = c.createBiquadFilter();
      reed.type = "lowpass";
      reed.frequency.value = 2700;
      reed.Q.value = 0.9;
      const honk = c.createBiquadFilter();
      honk.type = "peaking";
      honk.frequency.value = 1300;
      honk.Q.value = 1.1;
      honk.gain.value = 5;
      bassBus = c.createGain();
      const bassLp = c.createBiquadFilter();
      bassLp.type = "lowpass";
      bassLp.frequency.value = 1100;
      airGain = c.createGain();
      airGain.gain.value = 0;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      treble.connect(reed);
      reed.connect(honk);
      honk.connect(airGain);
      bassBus.connect(bassLp);
      bassLp.connect(airGain);
      airGain.connect(comp);
      comp.connect(c.destination);
      // Light vibrato on every reed, on top of the musette detuning.
      lfo = c.createOscillator();
      lfo.frequency.value = 5.6;
      lfoDepth = c.createGain();
      lfoDepth.gain.value = 3.5;
      lfo.connect(lfoDepth);
      lfo.start();
    }
    return c;
  }

  function freqsFor(key: string, d: Dir): number[] {
    const t = TREBLE.get(key);
    if (t) return [mtof(d === "push" ? t.push : t.pull)];
    return (BASSES.get(key)?.notes ?? []).map(mtof);
  }

  function startVoice(pid: number, key: string): void {
    if (!ctx || !treble || !bassBus || !lfoDepth) return;
    stopVoice(pid);
    const t = ctx.currentTime;
    const isTreble = TREBLE.has(key);
    const bass = BASSES.get(key);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(isTreble ? 0.17 : bass?.chord ? 0.07 : 0.22, t + 0.015);
    gain.connect(isTreble ? treble : bassBus);
    const oscs: Voice["oscs"] = [];
    for (const f of freqsFor(key, dir)) {
      // Two reeds per note, tuned apart for the musette shimmer.
      for (const cents of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = bass && !bass.chord && cents > 0 ? "square" : "sawtooth";
        o.frequency.value = f;
        o.detune.value = cents;
        lfoDepth.connect(o.detune);
        o.connect(gain);
        o.start(t);
        oscs.push({ o, off: cents });
      }
    }
    voices.set(pid, { key, oscs, gain });
    refreshHeld();
  }

  function stopVoice(pid: number, after = 0): void {
    const v = voices.get(pid);
    if (!v || !ctx) return;
    voices.delete(pid);
    const t = ctx.currentTime + after;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setTargetAtTime(0, t, 0.035);
    for (const { o } of v.oscs) o.stop(t + 0.3);
    setTimeout(() => v.gain.disconnect(), (after + 0.4) * 1000);
    refreshHeld();
  }

  /** The bellows changed direction: every held treble reed swaps to its other note. */
  function retune(): void {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const v of voices.values()) {
      const t2 = TREBLE.get(v.key);
      if (!t2) continue;
      const f = mtof(dir === "push" ? t2.push : t2.pull);
      for (const { o } of v.oscs) o.frequency.setTargetAtTime(f, t, 0.006);
    }
    // Pushed reeds read a touch brighter than pulled ones.
    reed?.frequency.setTargetAtTime(dir === "push" ? 2900 : 2300, t, 0.05);
  }

  function press(e: PointerEvent, key: string): void {
    e.preventDefault();
    held.set(e.pointerId, key);
    if (running() && ctx) startVoice(e.pointerId, key);
    else
      audio()
        .then(() => {
          if (held.get(e.pointerId) === key) startVoice(e.pointerId, key);
          else {
            // A quick first tap that unlocked audio still gets heard.
            const id = blipId--;
            startVoice(id, key);
            stopVoice(id, 0.25);
          }
        })
        .catch(() => {});
    refreshHeld();
  }

  function release(e: PointerEvent): void {
    if (!held.has(e.pointerId)) return;
    held.delete(e.pointerId);
    stopVoice(e.pointerId);
    refreshHeld();
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  // --- DOM ---
  const all = <T extends Element = HTMLElement>(sel: string): T[] =>
    [screens.outer, screens.start, screens.end].flatMap((s) => [...s.querySelectorAll<T>(sel)]);
  let roots: HTMLElement[] = [];
  let shown = { air: -1, ext: -1, dir: "" };

  function refreshHeld(): void {
    const on = new Set([...held.values(), ...[...voices.values()].map((v) => v.key)]);
    for (const k of all(".ac-key")) k.classList.toggle("on", on.has(k.dataset.k!));
  }

  function trebleKey(t: Treble, row: "c" | "g"): string {
    return `<button class="ac-key ${row}" data-k="${t.id}" aria-label="${row.toUpperCase()} row button ${t.id.slice(1)}: ${nm(t.push)} push, ${nm(t.pull)} pull"><b class="ps">${nm(t.push)}</b><b class="pl">${nm(t.pull)}</b></button>`;
  }
  function bassKey(b: Bass): string {
    return `<button class="ac-key ${b.chord ? "ch" : ""}" data-k="${b.id}" aria-label="${b.root} ${b.chord ? "chord" : "bass"}">${b.root}<small>${b.chord ? "CHORD" : "BASS"}</small></button>`;
  }

  function bellows(side: Side): string {
    if (!bellowsMode()) return "";
    return `<i class="ac-bellows ${side === "l" || side === "r" ? "v" : "h"} at-${side}"></i>`;
  }

  function base(p: Pose, extra: string, side: Side): HTMLElement {
    const root = document.createElement("div");
    root.className = `ac ${extra} ${p.split === "stacked" ? "stk" : "sbs"} ${bellowsMode() ? "bel" : "flat"} f-${side}`;
    return root;
  }

  /** The right-hand end: two rows of treble buttons by the bellows, a grille beyond. */
  function trebleView(p: Pose, side: Side): HTMLElement {
    const root = base(p, "ac-tr", side);
    const near = `<div class="ac-row off0">${ROW_C.map((t) => trebleKey(t, "c")).join("")}</div>`;
    const far = `<div class="ac-row off1">${ROW_G.map((t) => trebleKey(t, "g")).join("")}</div>`;
    const grille = `<div class="ac-grille"><span class="ac-mark">Melodeon</span><span class="ac-dir">PUSH</span></div>`;
    const nearFirst = side === "l" || side === "t";
    root.innerHTML = `${bellows(side)}${nearFirst ? `<div class="ac-board">${near}${far}</div>${grille}` : `${grille}<div class="ac-board">${far}${near}</div>`}`;
    return root;
  }

  function panel(p: Pose): string {
    const hint = bellowsMode()
      ? auto
        ? "Auto-bellows is breathing for you: hold buttons and listen to push and pull swap notes."
        : "Hold buttons and move the hinge. Closing pushes, opening pulls; the faster it moves, the louder."
      : p.id === "open" || p.id === "open-portrait"
        ? "Flat, the hinge can't move — air is fixed. Fold to play the bellows."
        : "";
    const ctl = bellowsMode()
      ? `<button class="ac-btn auto ${auto ? "on" : ""}">Auto-bellows: ${auto ? "on" : "off"}</button>`
      : `<button class="ac-btn dirbtn">Bellows: ${manualDir}</button>`;
    return `<div class="ac-panel"><div class="ac-airbox"><label>AIR</label><div class="ac-air"><i></i></div><span class="ac-dir">PUSH</span></div>${ctl}<p class="ac-hint">${hint}</p></div>`;
  }

  /** The left-hand end: bass and chord buttons by the bellows, air and controls beyond. */
  function bassView(p: Pose, side: Side): HTMLElement {
    const root = base(p, "ac-bs", side);
    const stk = p.split === "stacked";
    const bassRow = `<div class="ac-row">${BASS.filter((b) => !b.chord).map(bassKey).join("")}</div>`;
    const chordRow = `<div class="ac-row">${BASS.filter((b) => b.chord).map(bassKey).join("")}</div>`;
    const board = `<div class="ac-board bass">${stk ? bassRow + chordRow : chordRow + bassRow}</div>`;
    const nearFirst = side === "l" || side === "t";
    root.innerHTML = `${bellows(side)}${nearFirst ? board + panel(p) : panel(p) + board}`;
    return root;
  }

  /** Closed: the C row as one line of buttons, four chords, and a push/pull switch. */
  function compact(p: Pose): HTMLElement {
    const land = p.id === "closed-landscape";
    const root = document.createElement("div");
    root.className = `ac ac-cp ${land ? "land" : "port"}`;
    const keys = ROW_C.map((t) => `<button class="ac-key" data-k="${t.id}" aria-label="${nm(t.push)} push, ${nm(t.pull)} pull"><b class="ps">${nm(t.push)}</b><b class="pl">${nm(t.pull)}</b></button>`).join("");
    const chords = BASS.filter((b) => b.chord)
      .map((b) => `<button class="ac-key ch" data-k="${b.id}" aria-label="${b.root} chord">${b.root}</button>`)
      .join("");
    const dirBtn = `<button class="ac-btn dirbtn">Bellows: ${manualDir}</button>`;
    const head = `<div class="ac-head"><span class="ac-mark">Melodeon</span><span class="ac-dir">PUSH</span></div>`;
    if (land) {
      root.innerHTML = `${head}<div class="ac-main"><div class="ac-line">${keys}</div><div class="ac-line">${chords}</div><p class="ac-hint">Open and fold it to play the bellows.</p></div>
        <div class="ac-side"><div class="ac-airbox"><div class="ac-air"><i></i></div></div>${dirBtn}</div>`;
    } else {
      root.innerHTML = `${head}<div class="ac-main"><div class="ac-col">${chords}</div><div class="ac-col">${keys}</div></div>
        <div class="ac-airbox">${dirBtn}<p class="ac-hint">Open and fold it to play the bellows.</p></div>`;
    }
    return root;
  }

  function wire(root: HTMLElement): void {
    for (const b of root.querySelectorAll<HTMLElement>(".ac-key")) {
      b.addEventListener("pointerdown", (e) => press(e, b.dataset.k!));
      b.addEventListener("contextmenu", (e) => e.preventDefault());
    }
    for (const b of root.querySelectorAll<HTMLElement>(".ac-btn.auto"))
      b.onclick = () => {
        auto = !auto;
        if (auto) phase = 0;
        else vel = 0;
        void audio().catch(() => {});
        render(cur);
      };
    for (const b of root.querySelectorAll<HTMLElement>(".ac-btn.dirbtn"))
      b.onclick = () => {
        manualDir = manualDir === "push" ? "pull" : "push";
        for (const x of all(".ac-btn.dirbtn")) x.textContent = `Bellows: ${manualDir}`;
      };
  }

  const extFor = (h: number) => Math.min(1, Math.max(0, (h - HINGE_RANGE.min) / (HINGE_RANGE.max - HINGE_RANGE.min)));

  function render(state: DuoState): void {
    cur = state;
    const { pose } = state;
    // A pose change is not a bellows stroke.
    lastH = state.hinge;
    lastHT = performance.now();
    vel = 0;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.display === "outer") {
      screens.outer.append(compact(pose));
    } else if (pose.split === "side-by-side") {
      // Left hand bass, right hand treble, bellows between them at the fold.
      screens.start.append(bassView(pose, "r"));
      screens.end.append(trebleView(pose, "l"));
    } else {
      // Table: the treble keyboard stands up, the bass buttons lie flat.
      screens.start.append(trebleView(pose, "b"));
      screens.end.append(bassView(pose, "t"));
    }
    roots = all(".ac");
    for (const r of roots) wire(r);
    shown = { air: -1, ext: -1, dir: "" };
    refreshHeld();
    paint();
  }

  function hinge(state: DuoState): void {
    cur = state;
    const t = performance.now();
    const dt = (t - lastHT) / 1000;
    if (dt > 0.004) {
      const inst = (state.hinge - lastH) / dt;
      vel = dt < 0.25 ? vel * 0.45 + inst * 0.55 : inst * 0.5;
      lastH = state.hinge;
      lastHT = t;
      lastHingeAt = t;
    }
  }

  function setDir(d: Dir): void {
    if (d === dir) return;
    dir = d;
    retune();
  }

  function paint(): void {
    const a = Math.round(air * 50) / 50;
    const e = Math.round(ext * 100) / 100;
    if (a === shown.air && e === shown.ext && dir === shown.dir) return;
    for (const r of roots) {
      r.style.setProperty("--air", String(a));
      r.style.setProperty("--ext", String(e));
      r.classList.toggle("pull", dir === "pull");
    }
    if (dir !== shown.dir) for (const d of all(".ac-dir")) d.textContent = dir === "push" ? "◀ PUSH ▶" : "▶ PULL ◀";
    shown = { air: a, ext: e, dir };
  }

  function loop(): void {
    raf = requestAnimationFrame(loop);
    const t = performance.now();
    const dt = Math.min(0.1, (t - lastFrame) / 1000);
    lastFrame = t;
    let target: number;
    if (!bellowsMode()) {
      target = FIXED_AIR;
      setDir(manualDir);
      ext = 0.5;
    } else if (auto) {
      phase += dt;
      const w = (2 * Math.PI * phase) / AUTO_PERIOD;
      ext = 0.5 - 0.42 * Math.cos(w);
      const s = Math.sin(w); // > 0 while opening
      target = 0.12 + 0.88 * Math.abs(s);
      setDir(s >= 0 ? "pull" : "push");
    } else {
      // Bellows still: the air dies away over a short release.
      if (t - lastHingeAt > 70) vel *= Math.exp(-dt / 0.09);
      target = Math.min(1, Math.abs(vel) / FULL_SPEED);
      if (Math.abs(vel) > 4) setDir(vel < 0 ? "push" : "pull");
      ext = extFor(cur.hinge);
    }
    // Quick attack, a little slower release.
    const k = target > air ? Math.min(1, dt / 0.03) : Math.min(1, dt / 0.08);
    air += (target - air) * k;
    if (ctx && airGain) airGain.gain.setTargetAtTime(air * 0.9, ctx.currentTime, 0.02);
    paint();
  }
  loop();

  return {
    render,
    hinge,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      held.clear();
      for (const id of [...voices.keys()]) stopVoice(id);
      if (ctx && airGain) airGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      try {
        lfo?.stop();
      } catch {
        /* already stopped */
      }
      const g = airGain;
      setTimeout(() => g?.disconnect(), 400);
      style.remove();
    },
  };
}

export const accordionExample: Example = {
  id: "accordion",
  title: "Accordion",
  category: "music",
  summary:
    "The hinge is the bellows. Hold buttons and fold: the speed of the fold is the air, so the reeds only sing while it moves. Closing pushes and opening pulls, and like a real two-row G/C melodeon every treble button plays a different note each way.",
  bestPose: "book",
  poses: {
    closed: "A compact one-row board — the C row and four chords — that plays on tap at a fixed air level, with a push/pull switch and an invitation to open it.",
    "closed-landscape": "The same row for two thumbs: ten treble buttons in a line, four chords beneath, and the push/pull switch on the trailing edge.",
    open: "Flat, the hinge can't move, so there are no bellows: bass and chords on the left, both treble rows on the right, sounding on tap with fixed air and a hint to fold.",
    "open-portrait": "Treble rows on top, bass below, flat and tap-to-play with fixed air — fold it into table pose to bring the bellows back.",
    book: "The instrument proper: bass under the left hand, treble under the right, and the fold drawn as bellows that squeeze and stretch with the angle — moving the hinge is the air, and its direction picks push or pull notes.",
    table: "The treble keyboard stands up like the real right-hand end, the bass buttons lie flat under your left hand, and the bellows run along the fold.",
    stand: "Stood on its edge it plays like book pose — bass left, treble right, bellows at the fold — with Auto-bellows there to breathe for you hands-free.",
  },
  principle:
    "Apple says to use the hinge 'for interactions and effects only, never for layout' (HIG checklist §9): here the hinge's speed and direction are the bellows — volume and push/pull notes — while the buttons never move. Held notes and the Auto-bellows switch survive every pose change (HIG, 'Continuity checks').",
  create,
};
