/**
 * Crate Sampler — finger drums below, sequencer above, and the hinge is the
 * filter.
 *
 * Set the Duo down in table pose and the bottom half is a 4×4 grid of pads —
 * kick, snare, hats, clap, toms, a cowbell, four bass notes and four chord
 * stabs, all synthesized — while the standing top half runs a 16-step
 * sequencer with a playhead. Turn on REC and whatever you tap is written into
 * the step it lands on.
 *
 * The hinge is a performance control, never a layout switch: in book and
 * table pose its angle sets a low-pass filter on the sampler's own master bus,
 * so folding flatter opens the sound up. Snap it from nearly shut to nearly
 * flat quickly and it drops: a short riser, the filter slams open, a crash.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { HINGE_RANGE, type Pose } from "../core/poses.ts";
import { ready, running } from "../lib/audio.ts";

type Group = "drum" | "perc" | "bass" | "stab";

interface Pad {
  name: string;
  short: string;
  group: Group;
}

const PADS: Pad[] = [
  { name: "Kick", short: "KCK", group: "drum" },
  { name: "Snare", short: "SNR", group: "drum" },
  { name: "Clap", short: "CLP", group: "drum" },
  { name: "Hat", short: "HAT", group: "drum" },
  { name: "Open hat", short: "OHT", group: "perc" },
  { name: "Low tom", short: "TM1", group: "perc" },
  { name: "High tom", short: "TM2", group: "perc" },
  { name: "Cowbell", short: "BEL", group: "perc" },
  { name: "Bass C", short: "B·C", group: "bass" },
  { name: "Bass E♭", short: "B·E♭", group: "bass" },
  { name: "Bass F", short: "B·F", group: "bass" },
  { name: "Bass G", short: "B·G", group: "bass" },
  { name: "Cm", short: "Cm", group: "stab" },
  { name: "A♭", short: "A♭", group: "stab" },
  { name: "B♭", short: "B♭", group: "stab" },
  { name: "Fm", short: "Fm", group: "stab" },
];

const BASS = [36, 39, 41, 43];
const STABS = [
  [60, 63, 67, 72],
  [56, 60, 63, 68],
  [58, 62, 65, 70],
  [53, 56, 60, 65],
];

/** The eight pads that fit on the outer display turned sideways. */
const LANDSCAPE_PADS = [0, 1, 2, 3, 4, 7, 8, 12];

const COLOR: Record<Group, string> = { drum: "#ff6b4a", perc: "#ffc145", bass: "#33d1c6", stab: "#a07cff" };

const STEPS = 16;
const MAX_CUTOFF = 20000;
const MIN_CUTOFF = 160;

function starter(): boolean[][] {
  const p = PADS.map(() => Array<boolean>(STEPS).fill(false));
  const set = (pad: number, steps: number[]) => steps.forEach((s) => (p[pad]![s] = true));
  set(0, [0, 4, 8, 12, 14]);
  set(1, [4, 12]);
  set(2, [12]);
  set(3, [2, 6, 10, 14]);
  set(4, [15]);
  set(8, [0, 3, 8]);
  set(9, [11]);
  set(11, [14]);
  set(12, [6]);
  return p;
}

const CSS = `
.sp { position:absolute; inset:0; display:flex; flex-direction:column; background:#101016; color:#eceaf5; font:600 11px/1.2 system-ui, sans-serif; overflow:hidden; }
.sp-head { display:flex; align-items:center; gap:8px; padding:9px 12px 6px; flex:none; }
.sp-logo { font:900 13px/1 "Avenir Next", system-ui; letter-spacing:.16em; }
.sp-logo b { color:#ff6b4a; }
.sp-lcd { font:700 10px/1 ui-monospace, "SF Mono", monospace; background:#1c1d26; color:#9ff0c8; padding:4px 6px; border-radius:4px; letter-spacing:.06em; white-space:nowrap; }
.sp-lcd.rec { color:#ff5a5a; }
.sp-filter { margin-left:auto; display:flex; align-items:center; gap:6px; min-width:0; }
.sp-filter label { font:800 8px/1 system-ui; letter-spacing:.16em; opacity:.6; }
.sp-meter { position:relative; width:74px; height:8px; border-radius:4px; background:#23242f; overflow:hidden; box-shadow: inset 0 1px 2px #000; }
.sp-meter i { position:absolute; inset:0 auto 0 0; width:calc(var(--f) * 100%); border-radius:4px; background: linear-gradient(90deg, #33d1c6, #a07cff 60%, #ff6b4a); transition: width .08s; }
.sp-hz { font:700 9px/1 ui-monospace, monospace; width:40px; text-align:right; opacity:.85; }
.sp-grid { flex:1; min-height:0; display:grid; grid-template-columns: 34px repeat(${STEPS}, 1fr); grid-auto-rows:1fr; gap:2px; padding:2px 10px 8px;
  filter: saturate(calc(.25 + .75 * var(--f))) brightness(calc(.62 + .38 * var(--f))); transition: filter .1s; }
.sp-grid .lbl { font:700 8px/1 ui-monospace, monospace; align-self:center; opacity:.65; white-space:nowrap; overflow:hidden; }
.sp-cell { border:0; padding:0; border-radius:2px; background:#1e1f29; cursor:pointer; min-height:0; }
.sp-cell.q { background:#262734; }
.sp-cell.on { background: var(--c); box-shadow: 0 0 6px color-mix(in srgb, var(--c) 60%, transparent); }
.sp-cell.ph { outline: 1.5px solid rgb(255 255 255 / .85); outline-offset:-1px; }
.sp-cell.ph.on { filter: brightness(1.5); }
.sp-hint { flex:none; padding:0 12px 8px; font:500 9.5px/1.3 system-ui; opacity:.55; }
.sp-drop { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; font:900 italic 44px/1 "Avenir Next", system-ui; letter-spacing:.06em; color:#fff; opacity:0; text-shadow: 0 0 24px #ff6b4a, 0 0 4px #fff; }
.sp.riser .sp-drop { animation: sp-rise .6s ease-in forwards; }
.sp.dropped .sp-drop { animation: sp-drop 1s ease-out forwards; }
.sp.dropped { animation: sp-shake .35s; }
@keyframes sp-rise { from { opacity:0; transform:scale(.6); } to { opacity:.6; transform:scale(1); } }
@keyframes sp-drop { 0% { opacity:1; transform:scale(1.25); } 100% { opacity:0; transform:scale(1.6); } }
@keyframes sp-shake { 20% { transform: translate(-3px,2px); } 40% { transform: translate(3px,-2px); } 60% { transform: translate(-2px,-1px); } }

.sp-pads { flex:1; min-height:0; display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:1fr; gap:6px; padding:8px 10px 6px; }
.sp-pad { position:relative; border:0; border-radius:9px; cursor:pointer; touch-action:none; color:rgb(255 255 255 / .9); text-align:left; padding:0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 30%, #2a2b36), color-mix(in srgb, var(--c) 16%, #1b1c24));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 45%, transparent), inset 0 1px 0 rgb(255 255 255 / .08), 0 3px 0 #07070a; transition: transform .05s, box-shadow .05s, background .2s; }
.sp-pad span { position:absolute; left:7px; right:5px; bottom:6px; font:800 9px/1.1 system-ui; letter-spacing:.04em; }
.sp-pad small { position:absolute; right:7px; top:6px; font:700 8px/1 ui-monospace, monospace; opacity:.45; }
.sp-pad.hit { transform: translateY(2px) scale(.97); background: var(--c); color:#101016; box-shadow: 0 0 18px var(--c), 0 1px 0 #07070a; transition:none; }
.sp-pad.rec-armed::after { content:""; position:absolute; top:6px; left:7px; width:5px; height:5px; border-radius:50%; background:#ff5a5a; }
.sp-trans { flex:none; display:flex; gap:6px; padding:4px 10px 10px; align-items:center; }
.sp-btn { border:0; border-radius:7px; height:30px; padding:0 11px; cursor:pointer; font:800 10px/1 system-ui; letter-spacing:.1em; color:#eceaf5; background:#23242f; box-shadow: 0 2px 0 #07070a, inset 0 1px 0 rgb(255 255 255 / .06); }
.sp-btn:active { transform: translateY(1px); }
.sp-btn.play.on { background:#33d1c6; color:#07201e; }
.sp-btn.rec.on { background:#ff4a4a; color:#fff; box-shadow: 0 0 12px rgb(255 74 74 / .6); }
.sp-btn.small { padding:0 9px; }
.sp-bpm { font:700 10px/1 ui-monospace, monospace; min-width:48px; text-align:center; white-space:nowrap; }
.sp-trans .sp-btn { flex:1 1 auto; padding:0 6px; white-space:nowrap; }
.sp-dots { display:flex; gap:3px; margin-left:auto; }
.sp-dots i { width:6px; height:6px; border-radius:50%; background:#2a2b36; }
.sp-dots i:nth-child(4n+1) { background:#3a3b4a; }
.sp-dots i.ph { background:#ff6b4a; box-shadow: 0 0 6px #ff6b4a; }
.sp-land { flex:1; min-height:0; display:grid; grid-template-columns: 1fr 96px; }
.sp-land .sp-pads { grid-template-columns:repeat(4,1fr); padding:10px 6px 10px 10px; }
.sp-side { display:flex; flex-direction:column; gap:6px; padding:10px 10px 10px 4px; }
.sp-side .sp-btn { height:auto; flex:1; }
.sp-side .sp-dots { margin:0; flex-wrap:wrap; justify-content:center; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  const pattern = starter();
  let bpm = 104;
  let playing = false;
  let rec = false;
  let step = 0;
  let nextTime = 0;
  let shown = -1;
  let cur = initial;
  let cutoffAmt = 1; // 0..1
  let dropUntil = 0;
  let lastDrop = 0;
  const history: { t: number; h: number }[] = [];
  const queue: { step: number; time: number }[] = [];
  let lastPlayed: { step: number; time: number } | null = null;
  let timer = 0;
  let raf = 0;

  // --- our own master bus: voices → low-pass → compressor → out ---
  let ctx: AudioContext | null = null;
  let bus: GainNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let post: GainNode | null = null;
  let noise: AudioBuffer | null = null;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  async function audio(): Promise<AudioContext> {
    const c = await ready();
    if (ctx !== c) {
      ctx = c;
      bus = c.createGain();
      bus.gain.value = 0.8;
      filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 7;
      post = c.createGain();
      post.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 4;
      bus.connect(filter);
      filter.connect(post);
      post.connect(comp);
      comp.connect(c.destination);
      noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyFilter(true);
    }
    return c;
  }

  // --- voices ---
  function osc(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, t: number, dest: AudioNode | null = bus, cut = 0): void {
    if (!ctx || !dest) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let src: AudioNode = o;
    if (cut) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(cut * 3, t);
      lp.frequency.exponentialRampToValueAtTime(cut, t + dur * 0.6);
      lp.Q.value = 4;
      o.connect(lp);
      src = lp;
    }
    src.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function hiss(type: BiquadFilterType, freq: number, q: number, dur: number, vol: number, t: number, dest: AudioNode | null = bus): void {
    if (!ctx || !dest || !noise) return;
    const s = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    s.buffer = noise;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }

  const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

  function voice(pad: number, t: number, vel = 1): void {
    switch (pad) {
      case 0:
        osc("sine", 165, 42, 0.38, 1 * vel, t);
        hiss("highpass", 3000, 0.7, 0.012, 0.3 * vel, t);
        break;
      case 1:
        hiss("bandpass", 1900, 0.7, 0.18, 0.6 * vel, t);
        osc("triangle", 230, 160, 0.1, 0.35 * vel, t);
        break;
      case 2:
        for (let k = 0; k < 3; k++) hiss("bandpass", 1300, 1.4, 0.03, 0.55 * vel, t + k * 0.012);
        hiss("bandpass", 1200, 1, 0.2, 0.35 * vel, t + 0.036);
        break;
      case 3:
        hiss("highpass", 8200, 0.8, 0.045, 0.32 * vel, t);
        break;
      case 4:
        hiss("highpass", 7000, 0.8, 0.32, 0.24 * vel, t);
        break;
      case 5:
        osc("sine", 135, 82, 0.34, 0.75 * vel, t);
        break;
      case 6:
        osc("sine", 205, 132, 0.28, 0.65 * vel, t);
        break;
      case 7:
        osc("square", 560, 560, 0.2, 0.07 * vel, t, bus, 1400);
        osc("square", 845, 845, 0.2, 0.07 * vel, t, bus, 1800);
        break;
      default:
        if (pad < 12) {
          const f = mtof(BASS[pad - 8]!);
          osc("sawtooth", f, f, 0.34, 0.32 * vel, t, bus, 500);
          osc("sine", f / 2, f / 2, 0.36, 0.3 * vel, t);
        } else {
          for (const m of STABS[pad - 12]!) {
            osc("sawtooth", mtof(m) * 1.003, mtof(m) * 1.003, 0.3, 0.05 * vel, t, bus, 2400);
            osc("sawtooth", mtof(m) * 0.997, mtof(m) * 0.997, 0.3, 0.05 * vel, t, bus, 2400);
          }
        }
    }
  }

  // --- filter and the hinge ---
  function amountFor(state: DuoState): number {
    if (!state.pose.adjustable) return 1;
    return Math.min(1, Math.max(0, (state.hinge - HINGE_RANGE.min) / (HINGE_RANGE.max - HINGE_RANGE.min)));
  }
  const hz = (a: number) => MIN_CUTOFF * (MAX_CUTOFF / MIN_CUTOFF) ** (a ** 1.25);

  function applyFilter(now = false): void {
    if (!ctx || !filter) return;
    if (performance.now() < dropUntil) return; // the riser holds the filter
    const f = hz(cutoffAmt);
    if (now) filter.frequency.setValueAtTime(f, ctx.currentTime);
    else filter.frequency.setTargetAtTime(f, ctx.currentTime, 0.04);
  }

  function syncFilterUI(): void {
    const f = hz(cutoffAmt);
    const label = cutoffAmt >= 0.999 ? "OPEN" : f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${Math.round(f)}`;
    for (const r of all(".sp")) r.style.setProperty("--f", String(cutoffAmt));
    for (const e of all(".sp-hz")) e.textContent = label;
  }

  function track(state: DuoState): void {
    const t = performance.now();
    history.push({ t, h: state.pose.adjustable ? state.hinge : state.pose.hinge });
    while (history.length && t - history[0]!.t > 1000) history.shift();
    const h = history[history.length - 1]!.h;
    if (h > 150 && t - lastDrop > 2000 && history.some((s) => s.h < 70)) drop();
  }

  function drop(): void {
    lastDrop = performance.now();
    history.length = 0;
    flash("riser");
    const rise = 0.6;
    if (ctx && filter && post && running()) {
      dropUntil = performance.now() + rise * 1000;
      const t = ctx.currentTime;
      // Riser: noise sweeping up and a climbing saw, outside the filter so you hear it build.
      const s = ctx.createBufferSource();
      const hp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      s.buffer = noise;
      hp.type = "bandpass";
      hp.Q.value = 2;
      hp.frequency.setValueAtTime(400, t);
      hp.frequency.exponentialRampToValueAtTime(9000, t + rise);
      g.gain.setValueAtTime(0.02, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + rise);
      g.gain.linearRampToValueAtTime(0, t + rise + 0.02);
      s.connect(hp);
      hp.connect(g);
      g.connect(post);
      s.start(t);
      s.stop(t + rise + 0.05);
      osc("sawtooth", 180, 1500, rise * 1.4, 0.06, t, post);
      // Then the drop: filter slams open, a crash and a big kick.
      filter.frequency.cancelScheduledValues(t);
      filter.frequency.setValueAtTime(filter.frequency.value, t);
      filter.frequency.exponentialRampToValueAtTime(260, t + rise * 0.9);
      filter.frequency.setValueAtTime(MAX_CUTOFF, t + rise);
      hiss("highpass", 3500, 0.5, 1.8, 0.45, t + rise, post);
      hiss("bandpass", 5200, 0.6, 1.2, 0.25, t + rise, post);
      osc("sine", 120, 38, 0.6, 1, t + rise, post);
    }
    setTimeout(() => {
      dropUntil = 0;
      flash("dropped");
      applyFilter();
    }, rise * 1000);
  }

  function flash(cls: "riser" | "dropped"): void {
    for (const r of all(".sp-seq")) {
      r.classList.remove("riser", "dropped");
      void r.offsetWidth;
      r.classList.add(cls);
    }
  }

  // --- transport ---
  const stepDur = () => 60 / bpm / 4;

  function schedule(): void {
    if (!ctx || !playing) return;
    if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.03;
    while (nextTime < ctx.currentTime + 0.12) {
      const swing = step % 2 ? stepDur() * 0.08 : 0;
      for (let p = 0; p < PADS.length; p++) if (pattern[p]![step]) voice(p, nextTime + swing, step % 4 === 0 ? 1 : 0.82);
      queue.push({ step, time: nextTime });
      nextTime += stepDur();
      step = (step + 1) % STEPS;
    }
  }

  function togglePlay(): void {
    audio().then((c) => {
      playing = !playing;
      clearInterval(timer);
      if (playing) {
        step = 0;
        queue.length = 0;
        lastPlayed = null;
        nextTime = c.currentTime + 0.05;
        schedule();
        timer = window.setInterval(schedule, 25);
      } else {
        shown = -1;
        paintPlayhead(-1);
      }
      syncTransport();
    });
  }

  /** The step a tap right now belongs to, quantized to the nearest sixteenth. */
  function stepNow(): number | null {
    if (!ctx || !playing) return null;
    while (queue.length && queue[0]!.time <= ctx.currentTime) lastPlayed = queue.shift()!;
    if (!lastPlayed) return null;
    const off = Math.round((ctx.currentTime - lastPlayed.time) / stepDur());
    return (((lastPlayed.step + off) % STEPS) + STEPS) % STEPS;
  }

  function hitPad(p: number): void {
    voice(p, ctx!.currentTime);
    for (const e of all(`.sp-pad[data-p="${p}"]`)) {
      e.classList.add("hit");
      setTimeout(() => e.classList.remove("hit"), 110);
    }
    if (rec) {
      const s = stepNow();
      if (s !== null) {
        pattern[p]![s] = true;
        for (const c of all(`.sp-cell[data-p="${p}"][data-s="${s}"]`)) c.classList.add("on");
      }
    }
  }

  // --- DOM ---
  const all = <T extends Element = HTMLElement>(sel: string): T[] =>
    [screens.outer, screens.start, screens.end].flatMap((s) => [...s.querySelectorAll<T>(sel)]);

  function paintPlayhead(s: number): void {
    for (const c of all(".ph")) c.classList.remove("ph");
    if (s < 0) return;
    for (const c of all(`[data-s="${s}"]`)) c.classList.add("ph");
    for (const e of all(".sp-step")) e.textContent = `${String(s + 1).padStart(2, "0")}/16`;
  }

  function syncTransport(): void {
    for (const b of all(".sp-btn.play")) {
      b.classList.toggle("on", playing);
      b.textContent = playing ? "■ STOP" : "▶ PLAY";
    }
    for (const b of all(".sp-btn.rec")) b.classList.toggle("on", rec);
    for (const b of all(".sp-pad")) b.classList.toggle("rec-armed", rec);
    for (const e of all(".sp-bpm")) e.textContent = `${bpm} BPM`;
    for (const e of all(".sp-lcd.mode")) {
      e.textContent = rec ? "● REC" : playing ? "PLAY" : "STOP";
      e.classList.toggle("rec", rec);
    }
  }

  function header(p: Pose): string {
    return `<div class="sp-head"><span class="sp-logo">CR<b>A</b>TE</span><span class="sp-lcd sp-step">--/16</span><span class="sp-lcd mode">STOP</span>
      <div class="sp-filter"><label>${p.adjustable ? "HINGE LPF" : "LPF"}</label><div class="sp-meter"><i></i></div><span class="sp-hz">OPEN</span></div></div>`;
  }

  function sequencer(p: Pose): HTMLElement {
    const root = document.createElement("div");
    root.className = "sp sp-seq";
    let cells = "";
    for (let pad = 0; pad < PADS.length; pad++) {
      cells += `<span class="lbl" style="color:${COLOR[PADS[pad]!.group]}">${PADS[pad]!.short}</span>`;
      for (let s = 0; s < STEPS; s++) {
        cells += `<button class="sp-cell ${Math.floor(s / 4) % 2 ? "q" : ""} ${pattern[pad]![s] ? "on" : ""}" data-p="${pad}" data-s="${s}" style="--c:${COLOR[PADS[pad]!.group]}" aria-label="${PADS[pad]!.name} step ${s + 1}"></button>`;
      }
    }
    const hint = p.adjustable
      ? "Fold flatter to open the filter. Snap it from nearly shut to flat, fast, to drop."
      : "Tap a cell to toggle a step. In book or table pose the hinge becomes a filter.";
    root.innerHTML = `${header(p)}<div class="sp-grid">${cells}</div><div class="sp-hint">${hint}</div><div class="sp-drop">DROP</div>`;
    for (const c of root.querySelectorAll<HTMLElement>(".sp-cell")) {
      c.onclick = () => {
        const pad = Number(c.dataset.p);
        const s = Number(c.dataset.s);
        pattern[pad]![s] = !pattern[pad]![s];
        c.classList.toggle("on", pattern[pad]![s]);
        if (pattern[pad]![s] && (running() || !playing)) audio().then(() => voice(pad, ctx!.currentTime, 0.7));
      };
    }
    return root;
  }

  function padGrid(ids: number[]): string {
    return `<div class="sp-pads">${ids
      .map((p) => `<button class="sp-pad" data-p="${p}" style="--c:${COLOR[PADS[p]!.group]}" aria-label="${PADS[p]!.name}"><small>${p + 1}</small><span>${PADS[p]!.name.toUpperCase()}</span></button>`)
      .join("")}</div>`;
  }

  const dots = () => `<div class="sp-dots">${Array.from({ length: STEPS }, (_, s) => `<i data-s="${s}"></i>`).join("")}</div>`;

  function transport(): string {
    return `<div class="sp-trans"><button class="sp-btn play">▶ PLAY</button><button class="sp-btn rec">● REC</button>
      <button class="sp-btn small" data-bpm="-4">−</button><span class="sp-bpm">${bpm} BPM</span><button class="sp-btn small" data-bpm="4">+</button>
      <button class="sp-btn small clear">CLEAR</button></div>`;
  }

  function wire(root: HTMLElement): void {
    // Pads strike on pointerdown once audio runs; the first touch unlocks it.
    for (const b of root.querySelectorAll<HTMLElement>(".sp-pad")) {
      const p = Number(b.dataset.p);
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (running() && ctx) hitPad(p);
        else audio().then(() => hitPad(p)).catch(() => {});
      });
    }
    for (const b of root.querySelectorAll<HTMLElement>(".sp-btn.play")) b.onclick = togglePlay;
    for (const b of root.querySelectorAll<HTMLElement>(".sp-btn.rec"))
      b.onclick = () => {
        rec = !rec;
        if (rec && !playing) togglePlay();
        syncTransport();
      };
    for (const b of root.querySelectorAll<HTMLElement>("[data-bpm]"))
      b.onclick = () => {
        bpm = Math.min(160, Math.max(72, bpm + Number(b.dataset.bpm)));
        syncTransport();
      };
    for (const b of root.querySelectorAll<HTMLElement>(".clear"))
      b.onclick = () => {
        for (const row of pattern) row.fill(false);
        for (const c of all(".sp-cell.on")) c.classList.remove("on");
      };
  }

  function padsView(p: Pose): HTMLElement {
    const root = document.createElement("div");
    root.className = "sp";
    if (p.id === "closed-landscape") {
      root.innerHTML = `<div class="sp-land">${padGrid(LANDSCAPE_PADS)}<div class="sp-side">
        <button class="sp-btn play">▶ PLAY</button><button class="sp-btn rec">● REC</button>
        <div style="display:flex;gap:4px"><button class="sp-btn small" data-bpm="-4" style="flex:1">−</button><button class="sp-btn small" data-bpm="4" style="flex:1">+</button></div>
        <span class="sp-bpm" style="text-align:center">${bpm} BPM</span>${dots()}</div></div>`;
    } else {
      const closed = p.id === "closed";
      root.innerHTML = `${closed ? `<div class="sp-head"><span class="sp-logo">CR<b>A</b>TE</span><span class="sp-lcd mode">STOP</span>${dots()}</div>` : ""}
        ${padGrid(PADS.map((_, i) => i))}${transport()}`;
    }
    wire(root);
    return root;
  }

  function render(state: DuoState): void {
    cur = state;
    const { pose } = state;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.display === "outer") {
      screens.outer.append(padsView(pose));
    } else {
      screens.start.append(sequencer(pose));
      screens.end.append(padsView(pose));
    }
    cutoffAmt = amountFor(state);
    applyFilter();
    syncFilterUI();
    syncTransport();
    if (shown >= 0) paintPlayhead(shown);
    track(state);
  }

  function hinge(state: DuoState): void {
    cur = state;
    cutoffAmt = amountFor(state);
    applyFilter();
    syncFilterUI();
    track(state);
  }

  function loop(): void {
    raf = requestAnimationFrame(loop);
    if (!ctx || !playing) return;
    const t = ctx.currentTime;
    while (queue.length && queue[0]!.time <= t) lastPlayed = queue.shift()!;
    if (lastPlayed && lastPlayed.step !== shown) {
      shown = lastPlayed.step;
      paintPlayhead(shown);
    }
  }
  loop();

  void cur;
  return {
    render,
    hinge,
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      playing = false;
      if (ctx && post) post.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      style.remove();
    },
  };
}

export const samplerExample: Example = {
  id: "sampler",
  title: "Crate Sampler",
  category: "music",
  summary:
    "A pocket beat machine: finger-drum pads on the bottom half, a 16-step sequencer with a running playhead on the top — and the hinge is a filter, so folding flatter opens the sound, and snapping it open fast drops the beat.",
  bestPose: "table",
  poses: {
    closed: "Just the 4×4 pads and transport, with a row of dots to show where the pattern is.",
    "closed-landscape": "Eight pads for two thumbs, with play, record and tempo down the side.",
    open: "Sequencer on the left, pads on the right, filter wide open because the hinge is flat.",
    "open-portrait": "Sequencer above, pads below — the table layout, lying flat with the filter open.",
    book: "Sequencer left, pads right, and the hinge angle now sweeps the low-pass filter; snap it open fast for a drop.",
    table: "Pads lie flat under your fingers, the sequencer stands up on top, and folding the hinge flatter opens the filter — snap it from nearly shut to flat for a riser, a crash and the drop.",
    stand: "Stood up as a little beat station: sequencer on one side, pads on the other, the angle still on the filter.",
  },
  principle:
    "The hinge is an interaction and an effect, never a layout switch: the angle sweeps a filter while the pads and sequencer stay put, and in table pose you watch the pattern on top and play on the stable bottom half.",
  credits: [
    { who: "@stvnzhangshuhan (CRATE, YC × Bitrig hackathon winner)", url: "https://x.com/stvnzhangshuhan", what: "finger drums on the bottom screen, sequencer on top, drop with the hinge" },
    { who: "@acooldora", url: "https://x.com/acooldora", what: "music studio for iPhone Duo" },
  ],
  create,
};
