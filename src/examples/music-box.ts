/**
 * Music Box — opening and closing is the move.
 *
 * Shut, the Duo is a little wooden box: an inlaid lid with a brass clasp on
 * the outer display, and silence. Open it and the tune starts, the way a
 * music box does when its lid lifts. Set it down in table pose and the
 * standing half is the inside of the lid — a mirror and a dancer turning on
 * it — while the flat half is the movement: a pinned brass cylinder turning
 * against a steel comb, each tooth shivering as a pin plucks it, and a key
 * you wind with a circular drag. The spring runs down as it plays: the tempo
 * sags and the tune stops when it is unwound; winding brings it back up.
 *
 * Closing mid-tune cuts it mid-note, and the cylinder remembers where it was,
 * so opening again picks up from that note. The three tunes are public-domain
 * melodies (Brahms, Beethoven, and the traditional Greensleeves), transcribed
 * here as note lists; the art is drawn here.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import type { Pose } from "../core/poses.ts";
import { ready, running } from "../lib/audio.ts";

interface Ev {
  n: number[];
  d: number;
  s: number;
}
interface Tune {
  title: string;
  short: string;
  /** Seconds per unit at full spring. */
  unit: number;
  ev: Ev[];
  total: number;
  teeth: number[];
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "E5 D#5 A4+A2/2 r/2" → events. `/n` is a length in units, `+` stacks notes, `r` rests, `|` is a bar line for the reader. */
function parse(src: string, transpose: number): { ev: Ev[]; total: number } {
  const ev: Ev[] = [];
  let s = 0;
  for (const tok of src.split(/\s+/)) {
    if (!tok || tok === "|") continue;
    const [notes, len] = tok.split("/");
    const d = len ? Number(len) : 1;
    const n =
      notes === "r"
        ? []
        : notes!.split("+").map((x) => {
            const m = /^([A-G])(#|b)?(\d)$/.exec(x);
            if (!m) throw new Error(`bad note ${x}`);
            return 12 * (Number(m[3]) + 1) + PC[m[1]!]! + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + transpose;
          });
    ev.push({ n, d, s });
    s += d;
  }
  return { ev, total: s };
}

function tune(title: string, short: string, unit: number, transpose: number, src: string): Tune {
  const { ev, total } = parse(src, transpose);
  const teeth = [...new Set(ev.flatMap((e) => e.n))].sort((a, b) => a - b);
  return { title, short, unit, ev, total, teeth };
}

/** Public-domain melodies, transcribed here. Units: eighths (lullaby, Greensleeves), sixteenths (Für Elise). */
const TUNES: Tune[] = [
  tune(
    "Brahms' Lullaby",
    "Lullaby",
    0.3,
    12,
    `E4 E4 | G4+C3/4 E4 E4 | G4+C3/4 E4 G4 | C5+F3/2 B4/3 A4 | A4+C3/2 G4/2 D4 E4 | F4+G2/2 D4/2 D4 E4 | F4+G2/4 D4 F4 |
     B4+G2 A4 G4/2 B4/2 | C5+C3/4 C4 C4 | C5+F3/4 A4 F4 | G4+C3/4 E4 C4 | F4+G2/2 G4/2 A4/2 | G4+C3/4 C4 C4 |
     C5+F3/4 A4 F4 | G4+C3/4 E4 C4 | F4+G2/2 E4/2 D4/2 | C4+C3/6`,
  ),
  tune(
    "Für Elise",
    "Für Elise",
    0.15,
    12,
    `E5 D#5 | E5 D#5 E5 B4 D5 C5 | A4+A2/2 r C4 E4 A4 | B4+E2/2 r E4 G#4 B4 | C5+A2/2 r E4 E5 D#5 |
     E5 D#5 E5 B4 D5 C5 | A4+A2/2 r C4 E4 A4 | B4+E2/2 r E4 C5 B4 | A4+A2/4`,
  ),
  tune(
    "Greensleeves",
    "Greensleeves",
    0.24,
    12,
    `A4/2 | C5+A2/4 D5/2 | E5+C3/3 F5 E5/2 | D5+G2/4 B4/2 | G4+E2/3 A4 B4/2 | C5+A2/4 A4/2 | A4+F2/3 G#4 A4/2 |
     B4+E2/4 G#4/2 | E4+E2/4 A4/2 | C5+A2/4 D5/2 | E5+C3/3 F5 E5/2 | D5+G2/4 B4/2 | G4+E2/3 A4 B4/2 |
     C5+A2/3 B4 A4/2 | G#4+E2/3 F#4 G#4/2 | A4+A2/6`,
  ),
];

const RUN_SECONDS = 75; // a full spring
const TURN_WIND = 0.2; // one full turn of the key winds this much

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** The lid: walnut, a stringing border, fans in the corners, a rosette, a brass clasp. Drawn here. */
function lidSvg(w: number, h: number, clasp: "r" | "b"): string {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.26;
  let grain = "";
  for (let i = 0; i < 16; i++) {
    const y = (h / 16) * i + 6;
    const a = 3 + ((i * 7) % 5);
    grain += `<path d="M0 ${y} C ${w * 0.3} ${y - a}, ${w * 0.6} ${y + a}, ${w} ${y - a / 2}" stroke="#2a1608" stroke-opacity="${0.12 + (i % 3) * 0.05}" fill="none" stroke-width="${1 + (i % 2)}"/>`;
  }
  let petals = "";
  for (let i = 0; i < 12; i++)
    petals += `<ellipse cx="${cx}" cy="${cy - R * 0.55}" rx="${R * 0.16}" ry="${R * 0.42}" transform="rotate(${i * 30} ${cx} ${cy})" fill="${i % 2 ? "#e7c48a" : "#c9965a"}" stroke="#4a2810" stroke-width="1"/>`;
  let inner = "";
  for (let i = 0; i < 8; i++)
    inner += `<ellipse cx="${cx}" cy="${cy - R * 0.22}" rx="${R * 0.07}" ry="${R * 0.2}" transform="rotate(${i * 45 + 22.5} ${cx} ${cy})" fill="#f3e2b8" stroke="#4a2810" stroke-width=".8"/>`;
  const inset = 16;
  const fan = (x: number, y: number, rot: number) => {
    let s = "";
    for (const r of [14, 22, 30]) s += `<path d="M${x} ${y} m${r} 0 a${r} ${r} 0 0 1 ${-r} ${r}" transform="rotate(${rot} ${x} ${y})" fill="none" stroke="#e9d3a0" stroke-width="1.4" stroke-opacity=".8"/>`;
    for (let k = 1; k < 5; k++) {
      const a = (k * Math.PI) / 10;
      s += `<line x1="${x}" y1="${y}" x2="${x + 30 * Math.cos(a)}" y2="${y + 30 * Math.sin(a)}" transform="rotate(${rot} ${x} ${y})" stroke="#e9d3a0" stroke-opacity=".55" stroke-width="1"/>`;
    }
    return s;
  };
  const x0 = inset + 6;
  const y0 = inset + 6;
  const x1 = w - inset - 6;
  const y1 = h - inset - 6;
  const claspSvg =
    clasp === "r"
      ? `<rect x="${w - 16}" y="${cy - 26}" width="16" height="52" rx="4" fill="url(#mb-brass)" stroke="#5a3d10"/><circle cx="${w - 8}" cy="${cy - 6}" r="3" fill="#3a2608"/><rect x="${w - 9}" y="${cy - 5}" width="2" height="9" fill="#3a2608"/>`
      : `<rect x="${cx - 26}" y="${h - 16}" width="52" height="16" rx="4" fill="url(#mb-brass)" stroke="#5a3d10"/><circle cx="${cx}" cy="${h - 10}" r="3" fill="#3a2608"/>`;
  return `<svg class="mb-lid" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="mb-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a4520"/><stop offset=".55" stop-color="#5e3315"/><stop offset="1" stop-color="#43220c"/></linearGradient>
      <linearGradient id="mb-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe6a2"/><stop offset=".5" stop-color="#c99a3a"/><stop offset="1" stop-color="#7e5a16"/></linearGradient>
      <radialGradient id="mb-burl"><stop offset="0" stop-color="#a8683a"/><stop offset="1" stop-color="#6a3a18"/></radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#mb-wood)"/>${grain}
    <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="6" fill="none" stroke="#e9d3a0" stroke-width="2"/>
    <rect x="${inset + 5}" y="${inset + 5}" width="${w - inset * 2 - 10}" height="${h - inset * 2 - 10}" rx="4" fill="none" stroke="#2a1406" stroke-width="1.2"/>
    ${fan(x0, y0, 0)}${fan(x1, y0, 90)}${fan(x1, y1, 180)}${fan(x0, y1, 270)}
    <circle cx="${cx}" cy="${cy}" r="${R * 1.05}" fill="url(#mb-burl)" stroke="#e9d3a0" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${R * 0.97}" fill="none" stroke="#2a1406" stroke-dasharray="2 4"/>
    ${petals}${inner}
    <circle cx="${cx}" cy="${cy}" r="${R * 0.1}" fill="url(#mb-brass)" stroke="#4a2810"/>
    ${claspSvg}
  </svg>`;
}

/** A small dancer in fifth position, arms raised, one foot drawn up. Drawn here. */
const DANCER = `<svg viewBox="0 0 60 120" class="mb-fig" aria-hidden="true">
  <path d="M27 38 Q16 26 25 12" stroke="#f1cdb5" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M33 38 Q44 26 35 12" stroke="#f1cdb5" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="30" cy="11" r="2.5" fill="#f1cdb5"/>
  <path d="M28.5 58 L29.5 104" stroke="#f1cdb5" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M31.5 58 L39 74 L30.5 79" stroke="#f1cdb5" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 104 L31.5 108" stroke="#f08aa8" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="30" cy="26" r="6" fill="#f1cdb5"/>
  <circle cx="30" cy="19.5" r="3.4" fill="#5a3218"/>
  <path d="M24 25 Q30 18 36 25 Q34 21 30 21 Q26 21 24 25Z" fill="#5a3218"/>
  <path d="M28.5 31 L31.5 31 L31.2 34 L28.8 34Z" fill="#f1cdb5"/>
  <path d="M26 34 Q30 32 34 34 L33 52 L27 52Z" fill="#f48fb1"/>
  <path d="M12 54 Q18 47 30 49 Q42 47 48 54 Q44 57 40 56 Q36 59 30 57 Q24 59 20 56 Q16 57 12 54Z" fill="#ffe1ec" stroke="#f48fb1" stroke-width=".8"/>
  <path d="M16 54 Q30 50 44 54" stroke="#f48fb1" stroke-width=".6" fill="none"/>
</svg>`;

const CSS = `
.mb { position:absolute; inset:0; overflow:hidden; color:#f5ead6; font:600 11px/1.25 system-ui, sans-serif; }
.mb-lid { position:absolute; inset:0; width:100%; height:100%; }
.mb-closed { cursor:pointer; }
.mb-plate { position:absolute; left:50%; bottom:13%; transform:translateX(-50%); padding:5px 12px; border-radius:4px; text-align:center; white-space:nowrap;
  background: linear-gradient(160deg, #fbe6a2, #c99a3a 60%, #8a6418); color:#3a2608; font:italic 700 11px/1.2 Georgia, serif; box-shadow: 0 2px 4px rgb(0 0 0 / .5), inset 0 0 0 1px #fff3c4; }
.mb-plate small { display:block; font:600 8.5px/1.3 system-ui; font-style:normal; letter-spacing:.06em; opacity:.8; }
.mb-closed.land .mb-plate { left:calc(50% - 46px); bottom:12%; }
.mb-pick { display:flex; gap:5px; }
.mb-pick button { flex:1; border:0; border-radius:999px; padding:6px 6px; cursor:pointer; font:700 10px/1 system-ui; color:#3a2608; background:#e9d3a0; box-shadow: 0 2px 0 #5a3410; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.mb-pick button.on { background: linear-gradient(160deg, #fbe6a2, #d9a640); box-shadow: 0 0 0 2px #fff3c4, 0 2px 0 #5a3410; }
.mb-closed.land .mb-pick { position:absolute; right:10px; top:52px; bottom:14px; width:84px; flex-direction:column; }
.mb-closed.land .mb-pick button { flex:none; padding:10px 6px; }

.mb-stage { background:
  radial-gradient(circle at 25% 25%, rgb(255 255 255 / .07) 0 2px, transparent 3px) 0 0 / 22px 22px,
  radial-gradient(120% 90% at 50% 30%, #8c1d33, #4a0a18 70%, #2a040c); display:flex; flex-direction:column; align-items:center; justify-content:center; perspective:600px; }
.mb-stage::before { content:""; position:absolute; inset:8px; border-radius:12px; border:3px solid #c99a3a; box-shadow: inset 0 0 0 2px #5a3410; pointer-events:none; }
.mb-mirror { position:absolute; left:50%; top:10%; width:46%; height:62%; transform:translateX(-50%); border-radius:50%;
  background: linear-gradient(140deg, #e6eef2, #9fb0ba 40%, #dfe8ec 60%, #7e8f99); box-shadow: 0 0 0 4px #c99a3a, 0 0 0 6px #5a3410, inset 0 0 18px rgb(0 0 0 / .35); opacity:.9; }
.mb-floor { position:absolute; left:50%; bottom:18%; width:44%; height:13%; transform:translateX(-50%); border-radius:50%;
  background: radial-gradient(closest-side, #f4f8fa, #a9bac4 70%, #6c7c86); box-shadow: 0 0 0 3px #c99a3a, 0 6px 10px rgb(0 0 0 / .5); }
.mb-dancer { position:absolute; left:50%; bottom:23%; height:56%; aspect-ratio: 1 / 2; transform-style:preserve-3d; transform: translateX(-50%) rotateY(var(--spin, 0deg)); }
.mb-dancer .mb-fig { width:100%; height:100%; }
.mb-refl { position:absolute; left:50%; bottom:5%; height:20%; aspect-ratio: 1 / 2; transform: translateX(-50%) scaleY(-.36) rotateY(var(--spin, 0deg)); transform-origin: 50% 0; opacity:.22; filter: blur(.4px); }
.mb-title { position:absolute; bottom:5%; left:50%; transform:translateX(-50%); }

.mb-mech { display:flex; flex-direction:column; gap:8px; padding:10px 12px 12px;
  background: radial-gradient(120% 100% at 50% 0%, #3a2414, #1c1008 75%); }
.mb-mech.f-l { padding-left:22px; } .mb-mech.f-t { padding-top:20px; }
.mb-works { flex:1; min-height:0; display:flex; gap:10px; }
.mb-mech.port .mb-works { flex-direction:column; }
.mb-unit { flex:1; min-height:0; min-width:0; display:flex; flex-direction:column; border-radius:8px; padding:6px 8px; background:#2a1a0e; box-shadow: inset 0 0 0 1px #5a3a1e, inset 0 2px 8px #000; }
.mb-comb { position:relative; flex:0 0 46%; display:flex; }
.mb-tooth { position:relative; flex:1; }
.mb-tooth::before { content:""; position:absolute; left:0; right:0; top:0; bottom: var(--len); background: linear-gradient(180deg, #e9eef2, #a9b4bc); }
.mb-tooth:first-child::before { border-top-left-radius:4px; } .mb-tooth:last-child::before { border-top-right-radius:4px; }
.mb-tooth i { position:absolute; left:1px; right:1px; bottom:0; height: var(--len); border-radius:0 0 2px 2px; background: linear-gradient(90deg, #8d99a2, #eef3f6 45%, #9aa6ae); transform-origin: 50% 0; }
.mb-tooth.ring i { animation: mb-ring .45s ease-out; }
@keyframes mb-ring { 0% { transform: translateX(0); filter: brightness(1.6); } 15% { transform: translateX(1.3px); } 30% { transform: translateX(-1.1px); } 45% { transform: translateX(.8px); } 60% { transform: translateX(-.5px); } 100% { transform: none; filter:none; } }
.mb-screw { position:absolute; top:5px; width:6px; height:6px; border-radius:50%; background: radial-gradient(circle at 35% 35%, #fff, #8a959c); box-shadow: inset 0 0 0 1px #5a666e; }
.mb-cyl { position:relative; flex:1; min-height:0; overflow:hidden; border-radius:3px;
  background: linear-gradient(180deg, #5a3d10, #c99a3a 18%, #fbe6a2 45%, #d9a640 65%, #7e5a16); box-shadow: inset 0 0 0 1px #3a2608; }
.mb-strip { position:absolute; left:0; right:0; top:0; will-change:transform; }
.mb-pin { position:absolute; width:4px; height:4px; margin-left:-2px; border-radius:50%; background: radial-gradient(circle at 35% 35%, #fff, #7e8a92); box-shadow: 0 1px 0 rgb(0 0 0 / .45); }
.mb-keybox { position:relative; flex:0 0 112px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; }
.mb-mech.port .mb-keybox { flex:0 0 118px; flex-direction:row; justify-content:space-between; }
.mb-dial { position:relative; width:94px; height:94px; flex:none; border-radius:50%; touch-action:none; cursor:grab;
  background: conic-gradient(#e8c46a calc(var(--w) * 360deg), #3a2a1a 0); }
.mb-dial::before { content:""; position:absolute; inset:6px; border-radius:50%; background: radial-gradient(circle, #2a1a0e 55%, #1c1008); }
.mb-key { position:absolute; inset:12px; transform: rotate(var(--k, 0rad)); pointer-events:none; }
.mb-status { font:600 10px/1.35 system-ui; opacity:.8; text-align:center; max-width:150px; }
.mb-mech.port .mb-status { text-align:left; flex:1; }
.mb-tap[hidden] { display:none; }
.mb-tap { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; }
.mb-tap span { padding:5px 10px; border-radius:999px; background:#f5ead6; color:#3a2608; font:800 11px/1 system-ui; box-shadow: 0 0 16px rgb(255 220 150 / .7); animation: mb-pulse 1.4s ease-in-out infinite; }
@keyframes mb-pulse { 50% { transform: scale(1.08); } }
`;

const KEY_SVG = `<svg viewBox="0 0 70 70" class="mb-key" aria-hidden="true">
  <defs><linearGradient id="mb-kb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe6a2"/><stop offset=".5" stop-color="#c99a3a"/><stop offset="1" stop-color="#7e5a16"/></linearGradient></defs>
  <path d="M35 35 C 22 26, 8 22, 6 33 C 4 44, 22 42, 35 35 Z" fill="url(#mb-kb)" stroke="#5a3d10"/>
  <path d="M35 35 C 48 44, 62 48, 64 37 C 66 26, 48 28, 35 35 Z" fill="url(#mb-kb)" stroke="#5a3d10"/>
  <circle cx="14" cy="33" r="4" fill="#3a2608"/><circle cx="56" cy="37" r="4" fill="#3a2608"/>
  <circle cx="35" cy="35" r="7" fill="url(#mb-kb)" stroke="#5a3d10"/><circle cx="35" cy="35" r="2.2" fill="#3a2608"/>
</svg>`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let tuneIx = 0;
  let idx = 0; // the next note on the cylinder
  let wind = 0.6;
  let keyAngle = 0;
  let spin = 0;
  let pos = 0; // where the cylinder is, in units of the tune
  let playing = false;
  let prevPose: Pose | null = null;
  let lidOpen = initial.pose.display === "inner";
  let raf = 0;
  let timer = 0;
  let lastFrame = performance.now();

  // --- audio ---
  let ctx: AudioContext | null = null;
  let bus: GainNode | null = null;
  let run: GainNode | null = null;
  let nextTime = 0;
  let lastTick = 0;
  const sched: { i: number; t: number; d: number; rung: boolean }[] = [];

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const T = () => TUNES[tuneIx]!;
  const speed = () => (wind >= 0.25 ? 1 : 0.35 + 0.65 * (wind / 0.25));

  async function audio(): Promise<AudioContext> {
    const c = await ready();
    if (ctx !== c) {
      ctx = c;
      bus = c.createGain();
      bus.gain.value = 0.8;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 7500;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      bus.connect(lp);
      lp.connect(comp);
      comp.connect(c.destination);
    }
    return c;
  }

  function partial(f: number, vol: number, decay: number, t: number, dest: AudioNode): void {
    if (!ctx || f > ctx.sampleRate * 0.45) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  /** A comb tooth: the fundamental, a cantilever's inharmonic modes that die fast, a touch of octave. */
  function tine(m: number, t: number, vel: number): void {
    if (!run) return;
    const f = mtof(m);
    const decay = Math.min(2.8, Math.max(0.5, 2.6 - (m - 60) * 0.045));
    partial(f, 0.2 * vel, decay, t, run);
    partial(f * 2, 0.03 * vel, decay * 0.35, t, run);
    partial(f * 6.27, 0.045 * vel, 0.12, t, run);
    partial(f * 17.55, 0.012 * vel, 0.04, t, run);
  }

  function click(): void {
    if (!ctx || !bus) return;
    const t = ctx.currentTime;
    partial(2600, 0.05, 0.02, t, bus);
    partial(4100, 0.03, 0.015, t, bus);
  }

  function current(): (typeof sched)[number] | undefined {
    if (!ctx) return undefined;
    let c: (typeof sched)[number] | undefined;
    for (const s of sched) if (s.t <= ctx.currentTime) c = s;
    return c;
  }

  function start(): void {
    if (playing || !ctx || !bus || wind <= 0 || !lidOpen) return;
    playing = true;
    run = ctx.createGain();
    run.connect(bus);
    nextTime = ctx.currentTime + 0.06;
    lastTick = ctx.currentTime;
    sched.length = 0;
    timer = window.setInterval(tick, 25);
    tick();
    syncUI();
  }

  /** Stop where it is, mid-note if need be, and remember the note. */
  function stop(): void {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    const c = current() ?? sched[0];
    if (c) idx = c.i;
    pos = T().ev[idx]!.s;
    sched.length = 0;
    const r = run;
    run = null;
    if (ctx && r) {
      r.gain.setTargetAtTime(0, ctx.currentTime, 0.008);
      setTimeout(() => r.disconnect(), 150);
    }
    syncUI();
  }

  function tick(): void {
    if (!ctx || !playing) return;
    const now = ctx.currentTime;
    wind = Math.max(0, wind - (now - lastTick) / RUN_SECONDS);
    lastTick = now;
    if (wind <= 0) {
      stop();
      return;
    }
    const tn = T();
    if (nextTime < now - 0.2) nextTime = now + 0.03;
    while (nextTime < now + 0.12) {
      const ev = tn.ev[idx]!;
      const d = (ev.d * tn.unit) / speed();
      ev.n.forEach((m, k) => tine(m, nextTime, k === 0 ? 1 : 0.7));
      sched.push({ i: idx, t: nextTime, d, rung: false });
      nextTime += d;
      idx = (idx + 1) % tn.ev.length;
    }
    while (sched.length > 1 && sched[1]!.t <= now - 0.05 && sched[0]!.t + sched[0]!.d < now) sched.shift();
  }

  function maybeStart(): void {
    if (!lidOpen || wind <= 0 || playing || !running()) return;
    audio()
      .then(start)
      .catch(() => {});
  }

  function chooseTune(i: number): void {
    if (i === tuneIx) return;
    const was = playing;
    stop();
    tuneIx = i;
    idx = 0;
    pos = 0;
    if (prevPose) draw(prevPose);
    if (was) maybeStart();
  }

  // --- DOM ---
  const all = <T extends Element = HTMLElement>(sel: string): T[] =>
    [screens.outer, screens.start, screens.end].flatMap((s) => [...s.querySelectorAll<T>(sel)]);
  let strips: HTMLElement[] = [];
  let ppu = 8;

  const picker = () =>
    `<div class="mb-pick" role="group" aria-label="Tune">${TUNES.map((t, i) => `<button data-t="${i}" class="${i === tuneIx ? "on" : ""}">${t.short}</button>`).join("")}</div>`;

  function wirePicker(root: HTMLElement): void {
    for (const b of root.querySelectorAll<HTMLElement>(".mb-pick button"))
      b.onclick = (e) => {
        e.stopPropagation();
        chooseTune(Number(b.dataset.t));
      };
  }

  function closedView(p: Pose): HTMLElement {
    const land = p.id === "closed-landscape";
    const root = document.createElement("div");
    root.className = `mb mb-closed ${land ? "land" : ""}`;
    root.innerHTML = `${lidSvg(land ? 380 : 300, land ? 300 : 380, land ? "b" : "r")}
      <div class="mb-plate">${T().title}<small class="mb-cstat"></small></div>${land ? picker() : ""}`;
    // A tap on the shut box unlocks sound and gives the key a turn, so opening plays.
    root.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest(".mb-pick")) return;
      audio()
        .then(() => {
          wind = Math.min(1, wind + 0.08);
          click();
          syncUI();
        })
        .catch(() => {});
    });
    wirePicker(root);
    return root;
  }

  function stageView(): HTMLElement {
    const root = document.createElement("div");
    root.className = "mb mb-stage";
    root.innerHTML = `<div class="mb-mirror"></div><div class="mb-floor"></div><div class="mb-refl">${DANCER}</div><div class="mb-dancer">${DANCER}</div>
      <div class="mb-plate mb-title">${T().title}<small class="mb-cstat"></small></div>`;
    return root;
  }

  function mechView(p: Pose, side: "l" | "t"): HTMLElement {
    const tn = T();
    const root = document.createElement("div");
    const port = p.split === "side-by-side";
    root.className = `mb mb-mech ${port ? "port" : "land"} f-${side}`;
    const n = tn.teeth.length;
    const teeth = tn.teeth
      .map((m, k) => `<div class="mb-tooth" data-m="${m}" style="--len:${Math.round(88 - (k / Math.max(1, n - 1)) * 48)}%"><i></i></div>`)
      .join("");
    ppu = Math.max(7, 330 / tn.total);
    let pins = "";
    for (const copy of [0, 1])
      for (const ev of tn.ev)
        for (const m of ev.n) {
          const k = tn.teeth.indexOf(m);
          pins += `<i class="mb-pin" style="left:${((k + 0.5) / n) * 100}%;top:${(ev.s + copy * tn.total) * ppu + 2}px"></i>`;
        }
    root.innerHTML = `${picker()}<div class="mb-works">
        <div class="mb-unit"><div class="mb-comb">${teeth}<i class="mb-screw" style="left:18%"></i><i class="mb-screw" style="right:18%"></i></div>
          <div class="mb-cyl"><div class="mb-strip">${pins}</div></div></div>
        <div class="mb-keybox"><div class="mb-dial" role="slider" aria-label="Winding key: drag clockwise to wind" aria-valuemin="0" aria-valuemax="100">${KEY_SVG}<div class="mb-tap" hidden><span>tap to wind</span></div></div>
          <div class="mb-status"></div></div></div>`;
    wirePicker(root);
    wireKey(root.querySelector<HTMLElement>(".mb-dial")!);
    return root;
  }

  function wireKey(dial: HTMLElement): void {
    let drag: { id: number; a: number; turned: number; acc: number } | null = null;
    const angleOf = (e: PointerEvent) => {
      const r = dial.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    };
    dial.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try {
        dial.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic events */
      }
      drag = { id: e.pointerId, a: angleOf(e), turned: 0, acc: 0 };
      audio()
        .then(() => {
          syncUI();
          maybeStart();
        })
        .catch(() => {});
    });
    dial.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const a = angleOf(e);
      let d = a - drag.a;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      drag.a = a;
      if (d <= 0) return; // the ratchet only lets it turn clockwise
      drag.turned += d;
      drag.acc += d;
      keyAngle += d;
      wind = Math.min(1, wind + (d / (2 * Math.PI)) * TURN_WIND);
      while (drag.acc > 0.55) {
        drag.acc -= 0.55;
        click();
      }
      maybeStart();
      syncUI();
    });
    const end = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.turned < 0.3) {
        // A tap gives the key a quarter turn.
        keyAngle += Math.PI / 2;
        wind = Math.min(1, wind + TURN_WIND / 4);
        audio()
          .then(() => {
            click();
            maybeStart();
            syncUI();
          })
          .catch(() => {});
      }
      drag = null;
      syncUI();
    };
    dial.addEventListener("pointerup", end);
    dial.addEventListener("pointercancel", end);
  }

  function statusText(): string {
    const pct = Math.round(wind * 100);
    if (!running()) return lidOpen ? "Tap the key to wind it and start." : "Tap the lid to wind, then open it.";
    if (!lidOpen) return wind > 0 ? `Wound ${pct}% — open to play` : "Unwound — tap to wind";
    if (wind <= 0) return "Run down. Drag the key clockwise to wind it.";
    if (playing) return `Playing · spring ${pct}%${wind < 0.25 ? " — slowing" : ""}`;
    return `Spring ${pct}%`;
  }

  function syncUI(): void {
    for (const d of all(".mb-dial")) {
      d.style.setProperty("--w", wind.toFixed(3));
      d.style.setProperty("--k", `${keyAngle.toFixed(3)}rad`);
      d.setAttribute("aria-valuenow", String(Math.round(wind * 100)));
    }
    for (const t of all(".mb-tap")) {
      t.hidden = running() && wind > 0;
      t.querySelector("span")!.textContent = running() ? "wind me" : "tap to wind";
    }
    for (const s of all(".mb-status, .mb-cstat")) s.textContent = statusText();
    for (const b of all(".mb-pick button")) b.classList.toggle("on", Number(b.dataset.t) === tuneIx);
  }

  function draw(pose: Pose): void {
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.display === "outer") {
      screens.outer.append(closedView(pose));
    } else if (pose.split === "side-by-side") {
      screens.start.append(stageView());
      screens.end.append(mechView(pose, "l"));
    } else {
      // Table: the dancer on the standing lid, the movement flat under your hand.
      screens.start.append(stageView());
      screens.end.append(mechView(pose, "t"));
    }
    strips = all(".mb-strip");
    syncUI();
    paintFrame();
  }

  function render(state: DuoState): void {
    const opening = prevPose !== null && prevPose.display === "outer" && state.pose.display === "inner";
    lidOpen = state.pose.display === "inner";
    if (!lidOpen) stop();
    prevPose = state.pose;
    draw(state.pose);
    if (opening) maybeStart();
  }

  function paintFrame(): void {
    const tn = T();
    const y = -((((pos % tn.total) + tn.total) % tn.total) * ppu);
    for (const s of strips) s.style.transform = `translateY(${y.toFixed(1)}px)`;
    for (const r of all(".mb-stage")) r.style.setProperty("--spin", `${(spin % 360).toFixed(1)}deg`);
  }

  let uiAt = 0;
  function loop(): void {
    raf = requestAnimationFrame(loop);
    const t = performance.now();
    const dt = Math.min(0.1, (t - lastFrame) / 1000);
    lastFrame = t;
    if (!playing || !ctx) return;
    const now = ctx.currentTime;
    const tn = T();
    const c = current();
    if (c) {
      const ev = tn.ev[c.i]!;
      pos = ev.s + Math.min(1, (now - c.t) / c.d) * ev.d;
    }
    spin += dt * 150 * speed();
    for (const s of sched) {
      if (s.rung || s.t > now) continue;
      s.rung = true;
      for (const m of tn.ev[s.i]!.n)
        for (const tooth of all(`.mb-tooth[data-m="${m}"]`)) {
          tooth.classList.remove("ring");
          void tooth.offsetWidth;
          tooth.classList.add("ring");
        }
    }
    paintFrame();
    if (t - uiAt > 500) {
      uiAt = t;
      syncUI();
    }
  }
  loop();

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      stop();
      style.remove();
    },
  };
}

export const musicBoxExample: Example = {
  id: "music-box",
  title: "Music Box",
  category: "music",
  summary:
    "Opening and closing is the move. Shut, it is an inlaid wooden box and silent; open it and the tune starts, with a dancer turning on a mirror in the lid and the pinned cylinder plucking a steel comb below — wind the key or it runs down, and closing cuts it mid-note, ready to resume.",
  bestPose: "table",
  poses: {
    closed: "The lid: walnut with a stringing border, corner fans, a rosette and a brass clasp. Silent — tap it to wind the key, then open it to play.",
    "closed-landscape": "The lid turned sideways with the clasp at the bottom and a tune picker down the trailing edge, so you can choose before you open.",
    open: "Opened out flat: the lid's mirror and dancer on the left, the movement — cylinder, comb and winding key — on the right; the tune plays on from wherever it was.",
    "open-portrait": "Like table pose lying flat: dancer on the top half, the movement and key on the bottom.",
    book: "Held like a book, the dancer twirls on the left page while the cylinder turns against the comb on the right.",
    table: "The music box itself: the standing half is the inside of the lid with the dancer turning on her mirror, and the flat half is the movement, where you wind the key by dragging round it.",
    stand: "Stood on its edge like an open box on a shelf: dancer on the left, movement on the right, playing hands-free until the spring runs down.",
  },
  principle:
    "Continuity is the instrument: the playhead and spring live in the example, not the screen, so closing stops the tune mid-note and reopening resumes it — Apple's rule that the same state and features carry across every pose (HIG, 'Continuity checks'). In table pose the dancer you watch stands on top and the key you touch lies flat (HIG checklist §6, 'Destination follows purpose').",
  create,
};
