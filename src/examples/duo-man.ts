/**
 * Duo-Man — open it to pick a cassette, close it to listen.
 *
 * The Duo's fold is a cassette player's door. Opened flat or like a book, one
 * half is a shelf of four home-made tapes and the other is the open deck:
 * tap a tape and it slides into the door. Close the phone and the outer
 * display becomes the player's face — a see-through window with the reels
 * turning, chunky transport keys and a volume wheel — and if a tape is in,
 * closing it starts the music, the way snapping the door shut and pressing
 * play was one motion.
 *
 * Every tape is a little synthesized loop (chords, arpeggio, soft drum
 * machine, a wobble of wow and flutter) plus faint hiss. State — which tape,
 * where each one is wound to, the volume, whether it is playing — lives here,
 * so it survives every pose.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import type { Pose } from "../core/poses.ts";
import { burst, ready, running, tone } from "../lib/audio.ts";

type Mode = "stop" | "play" | "ff" | "rew";

interface Tape {
  title: string;
  tracks: string[];
  shell: string;
  label: string;
  stripe: string;
  ink: string;
  font: string;
  art: string;
  bpm: number;
  chords: number[][];
  bass: number[];
  arp: number[];
  lead: OscillatorType;
  pad: OscillatorType;
  cutoff: number;
  kick: number[];
  snare: number[];
  hat: number[];
  rain?: boolean;
}

const HAND = `"Marker Felt","Bradley Hand","Segoe Print","Comic Sans MS",cursive`;

const TAPES: Tape[] = [
  {
    title: "Summer '89",
    tracks: ["boardwalk", "sprinkler days", "cherry cola", "last bus home"],
    shell: "#f3efe6",
    label: "#fff6d8",
    stripe: "#ff7a59",
    ink: "#c2185b",
    font: HAND,
    art: `radial-gradient(circle at 50% 78%, #fff2a8 0 16%, transparent 17%), linear-gradient(180deg,#ffd35a 0 28%,#ffab40 28% 46%,#ff6f7d 46% 64%,#8f5bd8 64% 100%)`,
    bpm: 112,
    chords: [
      [60, 64, 67],
      [59, 62, 67],
      [60, 64, 69],
      [60, 65, 69],
    ],
    bass: [36, 43, 45, 41],
    arp: [0, 1, 2, 3, 2, 1, 0, 1],
    lead: "square",
    pad: "triangle",
    cutoff: 3800,
    kick: [0, 4],
    snare: [2, 6],
    hat: [1, 3, 5, 7],
  },
  {
    title: "Night Drive",
    tracks: ["exit 14", "sodium lights", "radio static", "4 a.m. diner"],
    shell: "#1b1b22",
    label: "#1d0f33",
    stripe: "#ff2fa0",
    ink: "#6ff3ff",
    font: `"Chalkduster","Marker Felt","Segoe Print",fantasy`,
    art: `repeating-linear-gradient(90deg, rgb(255 47 160 / .5) 0 1px, transparent 1px 14px) 0 62% / 100% 38% no-repeat, radial-gradient(circle at 50% 60%, #ffb347 0 14%, transparent 15%), linear-gradient(180deg,#0d0420 0 20%,#3a0b5e 58%,#ff2fa0 60%,#1a0633 62%)`,
    bpm: 96,
    chords: [
      [57, 60, 64],
      [57, 60, 65],
      [55, 60, 64],
      [55, 59, 62],
    ],
    bass: [33, 29, 36, 31],
    arp: [0, 1, 2, 3, 0, 1, 2, 3],
    lead: "sawtooth",
    pad: "sawtooth",
    cutoff: 2200,
    kick: [0, 3, 4],
    snare: [2, 6],
    hat: [0, 1, 2, 3, 4, 5, 6, 7],
  },
  {
    title: "Mixtape for M",
    tracks: ["the one from the car", "our song (?)", "for later", "don't skip this"],
    shell: "#fbfbfb",
    label: "#fffdf6",
    stripe: "#e53935",
    ink: "#1a237e",
    font: `"Bradley Hand","Segoe Script","Snell Roundhand",cursive`,
    art: `radial-gradient(circle at 30% 45%, #ff5a6e 0 9%, transparent 10%), radial-gradient(circle at 62% 60%, #ff8fa0 0 7%, transparent 8%), radial-gradient(circle at 78% 30%, #ffb3c0 0 5%, transparent 6%), repeating-linear-gradient(180deg, #fffdf6 0 9px, #cfe0ff 9px 10px)`,
    bpm: 84,
    chords: [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
    ],
    bass: [41, 40, 38, 36],
    arp: [0, 2, 1, 3, 2, 1, 3, 2],
    lead: "triangle",
    pad: "sine",
    cutoff: 3000,
    kick: [0, 5],
    snare: [4],
    hat: [2, 6],
  },
  {
    title: "Rainy Sunday",
    tracks: ["window seat", "tea gone cold", "slow puddles", "nap"],
    shell: "#5d7fa3",
    label: "#e8eef3",
    stripe: "#3d5a80",
    ink: "#263238",
    font: `"Noteworthy","Segoe Print","Comic Sans MS",cursive`,
    art: `repeating-linear-gradient(105deg, rgb(255 255 255 / .35) 0 1px, transparent 1px 9px), radial-gradient(ellipse at 50% 110%, #9fb6c8 0 30%, transparent 31%), linear-gradient(180deg,#5f7386,#8ea4b6)`,
    bpm: 72,
    chords: [
      [50, 53, 57, 60],
      [50, 53, 55, 59],
      [48, 52, 55, 59],
      [48, 52, 55, 57],
    ],
    bass: [38, 43, 36, 45],
    arp: [0, -1, 2, -1, 1, 3, -1, 2],
    lead: "sine",
    pad: "triangle",
    cutoff: 1900,
    kick: [0, 5],
    snare: [4],
    hat: [],
    rain: true,
  },
];

const TAPE_LEN = 300; // seconds a side lasts, in the explorer's world

const CSS = `
.dm { position:absolute; inset:0; display:flex; flex-direction:column; color:#1c2533; font:600 11px/1.2 system-ui, sans-serif; overflow:hidden; }
.dm-metal { background:
  repeating-linear-gradient(90deg, rgb(255 255 255 / .06) 0 1px, transparent 1px 3px),
  linear-gradient(160deg, #c9d3de 0%, #9fb0c2 45%, #b8c5d3 70%, #8698ad 100%); }
.dm-blue { background:
  repeating-linear-gradient(90deg, rgb(255 255 255 / .05) 0 1px, transparent 1px 3px),
  linear-gradient(160deg, #3d5f8f, #24406a 60%, #1b3255); color:#e8eef6; }
.dm-head { display:flex; align-items:center; gap:8px; padding:10px 14px 6px; }
.dm-logo { font:italic 900 18px/1 "Avenir Next", system-ui, sans-serif; letter-spacing:-0.02em; color:#18263b; }
.dm-logo b { color:#e0532f; }
.dm-blue .dm-logo { color:#fff; }
.dm-sub { font-size:8px; letter-spacing:0.18em; opacity:.6; text-transform:uppercase; }
.dm-led { margin-left:auto; width:8px; height:8px; border-radius:50%; background:#3b1f1a; box-shadow: inset 0 1px 2px #000; }
.dm-led.on { background:#ff5a36; box-shadow: 0 0 8px #ff5a36, inset 0 -1px 2px rgb(0 0 0 / .3); }
.dm-window { position:relative; margin:4px 12px; border-radius:12px; padding:10px; flex:1; min-height:0;
  background: linear-gradient(180deg,#1a1f28,#0c0f14); box-shadow: inset 0 2px 8px #000, 0 1px 0 rgb(255 255 255 / .5), 0 0 0 2px #56657a; display:grid; place-items:center; }
.dm-window::after { content:""; position:absolute; inset:0; border-radius:12px; pointer-events:none;
  background: linear-gradient(115deg, rgb(255 255 255 / .18) 0 18%, transparent 30% 62%, rgb(255 255 255 / .07) 70% 76%, transparent 80%); }
.dm-window svg { width:100%; height:100%; max-height:100%; }
.dm-empty { color:#6d7c90; text-align:center; font:600 12px system-ui; letter-spacing:.08em; }
.dm-empty small { display:block; font-weight:400; letter-spacing:0; opacity:.8; margin-top:4px; }
.dm-info { display:flex; align-items:center; gap:8px; padding:6px 14px; }
.dm-counter { font:700 13px/1 ui-monospace, "SF Mono", monospace; background:#101318; color:#ffb347; padding:3px 6px; border-radius:4px; letter-spacing:0.12em; box-shadow: inset 0 1px 3px #000; }
.dm-title { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:12px; }
.dm-title i { font-style:normal; opacity:.55; font-weight:500; }
.dm-keys { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; padding:6px 12px; }
.dm-key { position:relative; border:0; border-radius:8px 8px 10px 10px; height:52px; cursor:pointer; color:#1c2533; font:800 15px/1 system-ui;
  background: linear-gradient(180deg, #f4f6f9, #cfd7e1 70%, #b0bccb); box-shadow: 0 5px 0 #6b7a8f, 0 7px 10px rgb(0 0 0 / .35), inset 0 1px 0 #fff; transition: transform .06s, box-shadow .06s; touch-action:manipulation; }
.dm-key small { position:absolute; left:0; right:0; bottom:5px; font:700 7px/1 system-ui; letter-spacing:.15em; opacity:.55; }
.dm-key span { position:relative; top:-4px; }
.dm-key.play { background: linear-gradient(180deg, #ff8a65, #e8552f 70%, #c7431f); color:#fff; box-shadow: 0 5px 0 #8e2a10, 0 7px 10px rgb(0 0 0 / .35), inset 0 1px 0 #ffc0a8; }
.dm-key:active, .dm-key.on { transform: translateY(4px); box-shadow: 0 1px 0 #6b7a8f, 0 2px 4px rgb(0 0 0 / .35), inset 0 2px 3px rgb(0 0 0 / .2); }
.dm-key.play.on, .dm-key.play:active { box-shadow: 0 1px 0 #8e2a10, 0 2px 4px rgb(0 0 0 / .35), inset 0 2px 3px rgb(0 0 0 / .25); }
.dm-vol { display:flex; align-items:center; gap:10px; padding:6px 14px 12px; }
.dm-vol label { font:800 8px/1 system-ui; letter-spacing:.2em; opacity:.6; }
.dm-wheel { flex:1; height:26px; border-radius:6px; cursor:ew-resize; touch-action:none; position:relative;
  background: repeating-linear-gradient(90deg, #2a3342 0 2px, #5a6a80 2px 4px, #8796aa 4px 6px); box-shadow: inset 0 6px 6px rgb(0 0 0 / .45), inset 0 -6px 6px rgb(0 0 0 / .45), 0 1px 0 rgb(255 255 255 / .6); }
.dm-wheel::after { content:""; position:absolute; top:3px; bottom:3px; width:3px; border-radius:2px; left:calc(var(--v) * 100% - 1.5px); background:#ff6a3d; box-shadow:0 0 6px #ff6a3d; }
.dm-level { display:flex; gap:2px; align-items:flex-end; height:18px; }
.dm-level i { width:3px; background:#3a4658; border-radius:1px; }
.dm-level i.on { background:#ff6a3d; }
.dm-toast { position:absolute; left:50%; top:46%; transform:translate(-50%,-50%); background:rgb(12 16 22 / .9); color:#fff; padding:8px 12px; border-radius:10px; font:600 12px system-ui; pointer-events:none; animation: dm-fade 1.6s forwards; z-index:3; white-space:nowrap; }
@keyframes dm-fade { 0%{opacity:0} 10%,75%{opacity:1} 100%{opacity:0} }
.dm-hint { text-align:center; font:500 10px system-ui; opacity:.6; padding:0 10px 8px; }

/* shelf */
.dm-shelf { position:absolute; inset:0; display:flex; flex-direction:column; color:#f3e7d6;
  background: linear-gradient(180deg, rgb(0 0 0 / .25), transparent 30%), repeating-linear-gradient(90deg, rgb(0 0 0 / .08) 0 2px, transparent 2px 11px), linear-gradient(180deg,#6d4426,#4d2e18); }
.dm-shelf h3 { margin:0; padding:12px 14px 4px; font:700 13px/1 ${HAND}; letter-spacing:.02em; color:#ffe4bf; }
.dm-shelf h3 small { font:500 10px system-ui; opacity:.6; margin-left:6px; }
.dm-cases { flex:1; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 12px; padding:8px 14px 16px; min-height:0; }
@container (min-aspect-ratio: 1/1) { .dm-cases { grid-template-columns:repeat(4,minmax(0,1fr)); } }
.dm-case { position:relative; border:0; padding:0; cursor:pointer; border-radius:4px; background: linear-gradient(135deg, rgb(255 255 255 / .35), rgb(255 255 255 / .08) 40%, rgb(255 255 255 / .2)); box-shadow: 0 6px 0 -2px #2e1a0c, 0 8px 14px rgb(0 0 0 / .5), inset 0 0 0 1px rgb(255 255 255 / .5); padding:4px; transition: transform .15s; display:flex; min-width:0; }
.dm-case:hover { transform: translateY(-3px) rotate(-1deg); }
.dm-case:active { transform: translateY(1px); }
.dm-jcard { flex:1; min-width:0; border-radius:2px; display:flex; flex-direction:column; overflow:hidden; text-align:left; }
.dm-art { flex:1.1; min-height:0; position:relative; }
.dm-jcard .t { padding:4px 6px 1px; font-size:13px; line-height:1; transform: rotate(-2deg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dm-jcard ol { margin:0; padding:1px 6px 5px 18px; font-size:8.5px; line-height:1.25; opacity:.85; }
@container (max-height: 320px) { .dm-jcard ol { display:none; } }
.dm-case.gone { background: rgb(0 0 0 / .25); box-shadow: inset 0 2px 8px rgb(0 0 0 / .5); cursor:default; }
.dm-case.gone .dm-jcard { opacity:.0; }
.dm-case.gone::after { content:"in the deck"; position:absolute; inset:0; display:grid; place-items:center; font:500 10px system-ui; color:#e8c9a8; opacity:.6; }
.dm-case.gone:hover { transform:none; }

/* deck (door open) */
.dm-deck-well { position:relative; margin:6px 14px; flex:1; min-height:0; border-radius:10px; perspective:500px;
  background: radial-gradient(ellipse at 50% 40%, #2a3342, #0e1218 80%); box-shadow: inset 0 4px 14px #000, 0 0 0 2px #56657a, 0 1px 0 3px rgb(255 255 255 / .35); overflow:hidden; }
.dm-spindle { position:absolute; top:50%; width:18px; height:18px; margin:-9px; border-radius:50%; background: radial-gradient(circle, #cfd7e1 0 30%, #6b7a8f 32% 60%, #2a3342 62%); }
.dm-door { position:absolute; left:8%; right:8%; top:10%; bottom:8%; border-radius:8px; transform-origin:50% 100%; transform: rotateX(18deg);
  background: linear-gradient(180deg, rgb(160 180 205 / .25), rgb(120 140 170 / .12)); box-shadow: 0 0 0 2px rgb(200 214 230 / .5), 0 12px 18px rgb(0 0 0 / .5); display:grid; place-items:center; padding:6%; }
.dm-door svg { width:100%; height:100%; filter: drop-shadow(0 4px 6px rgb(0 0 0 / .5)); }
.dm-door .dm-slot { color:#8a9bb0; font:600 11px system-ui; text-align:center; }
.dm-door.in svg { animation: dm-insert .7s cubic-bezier(.2,.9,.3,1.15); }
@keyframes dm-insert { 0% { transform: translate(-90%, -40%) rotate(-14deg) scale(.8); opacity:0; } 60% { opacity:1; } 100% { transform:none; } }
.dm-eject { border:0; border-radius:6px; padding:5px 9px; font:800 9px/1 system-ui; letter-spacing:.15em; cursor:pointer; background:linear-gradient(180deg,#f4f6f9,#b0bccb); box-shadow:0 3px 0 #6b7a8f; color:#1c2533; }
.dm-eject:active { transform:translateY(2px); box-shadow:0 1px 0 #6b7a8f; }

@container (max-height: 320px) {
  .dm-deck .dm-hint, .dm-deck .dm-sub { display:none; }
  .dm-deck .dm-head { padding:8px 14px 2px; }
  .dm-deck .dm-key { height:40px; }
  .dm-deck .dm-vol { padding-bottom:8px; }
}
/* table / visualizer */
.dm-viz { height:34%; margin:4px 12px 10px; border-radius:8px; background:#0b0e13; box-shadow: inset 0 2px 6px #000; }
.dm-viz canvas { width:100%; height:100%; display:block; }
.dm-chips { display:flex; gap:6px; padding:4px 12px 10px; }
.dm-chip { flex:1; border:0; border-radius:6px; padding:5px 4px; cursor:pointer; font-size:11px; line-height:1; color:#1c2533; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; box-shadow: 0 2px 0 rgb(0 0 0 / .35); }
.dm-chip.on { outline:2px solid #ff6a3d; outline-offset:1px; }

.dm-land { display:grid; grid-template-columns: 1.45fr 1fr; grid-template-rows: auto 1fr auto; height:100%; }
.dm-land .dm-head { grid-column: 1 / -1; }
.dm-land .dm-window { grid-row: 2 / 4; margin:0 6px 12px 12px; }
.dm-land .dm-side { grid-row: 2 / 4; display:flex; flex-direction:column; justify-content:space-between; padding-bottom:10px; }
.dm-land .dm-keys { grid-template-columns: 1fr 1fr; padding:4px 12px 4px 4px; }
.dm-land .dm-key { height:44px; }
.dm-land .dm-info { padding:4px 12px 4px 4px; }
.dm-land .dm-vol { padding:4px 12px 0 4px; }
`;

let uid = 0;

/** A cassette as SVG. Reels are groups we rotate each frame; the tape packs grow and shrink. */
function cassette(t: Tape, n: number): string {
  const teeth = [0, 60, 120, 180, 240, 300].map((a) => `<rect x="-1.1" y="-6.6" width="2.2" height="2.6" rx=".4" fill="#f4f1ea" transform="rotate(${a})"/>`).join("");
  const hub = (cls: string, x: number) =>
    `<g transform="translate(${x} 57)"><g class="${cls}"><circle r="8" fill="#f4f1ea"/><circle r="5" fill="#15110d"/>${teeth}</g></g>`;
  return `<svg viewBox="0 0 200 126" class="dm-cas" aria-hidden="true">
    <defs><clipPath id="dmw${n}"><rect x="58" y="44" width="84" height="26" rx="5"/></clipPath>
    <linearGradient id="dms${n}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect x="1" y="1" width="198" height="124" rx="9" fill="${t.shell}" stroke="rgb(0 0 0 / .35)"/>
    ${[
      [8, 8],
      [192, 8],
      [8, 118],
      [192, 118],
      [100, 116],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="rgb(0 0 0 / .25)"/><path d="M${x! - 1.6} ${y} h3.2" stroke="rgb(0 0 0 / .35)" stroke-width=".7"/>`)
      .join("")}
    <rect x="13" y="11" width="174" height="78" rx="5" fill="${t.label}"/>
    <rect x="13" y="34" width="174" height="7" fill="${t.stripe}"/>
    <rect x="13" y="75" width="174" height="7" fill="${t.stripe}" opacity=".7"/>
    <circle cx="26" cy="23" r="7" fill="none" stroke="${t.ink}" stroke-width="1.4"/>
    <text x="26" y="27" text-anchor="middle" font-family="system-ui" font-weight="800" font-size="10" fill="${t.ink}">A</text>
    <text x="40" y="28" font-family='${t.font.replace(/"/g, "")}' font-size="15" fill="${t.ink}" transform="rotate(-2 40 28)">${t.title}</text>
    <rect x="56" y="42" width="88" height="30" rx="7" fill="#15110d"/>
    <g clip-path="url(#dmw${n})">
      <rect x="58" y="44" width="84" height="26" fill="#2a2320"/>
      <circle class="dm-packL" cx="78" cy="57" r="20" fill="#3d2a1e"/>
      <circle class="dm-packR" cx="122" cy="57" r="10" fill="#3d2a1e"/>
      <rect x="58" y="44" width="84" height="10" fill="url(#dms${n})"/>
    </g>
    ${hub("dm-reelL", 78)}${hub("dm-reelR", 122)}
    <path d="M42 125 L52 97 H148 L158 125Z" fill="rgb(0 0 0 / .12)"/>
    <circle cx="70" cy="113" r="3.2" fill="#15110d"/><circle cx="130" cy="113" r="3.2" fill="#15110d"/>
    <rect x="94" y="106" width="12" height="7" rx="1.5" fill="#15110d"/>
  </svg>`;
}

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let tape: number | null = 0;
  const pos = TAPES.map(() => 0);
  let mode: Mode = "stop";
  let volume = 0.7;
  let step = 0;
  let nextTime = 0;
  let angleL = 0;
  let angleR = 0;
  let inserting = false;
  let cur = initial;
  let wasOuter = initial.pose.display === "outer";
  let raf = 0;
  let timer = 0;
  let last = performance.now();

  // --- audio graph (built on first gesture) ---
  let ctx: AudioContext | null = null;
  let bus: GainNode | null = null;
  let toneFilter: BiquadFilterNode | null = null;
  let analyser: AnalyserNode | null = null;
  let wow: OscillatorNode | null = null;
  let wowDepth: GainNode | null = null;
  let whir: { osc: OscillatorNode; gain: GainNode } | null = null;
  let noiseBuf: AudioBuffer | null = null;
  let spectrum: Uint8Array<ArrayBuffer> | null = null;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  async function audio(): Promise<AudioContext> {
    const c = await ready();
    if (ctx !== c) {
      ctx = c;
      bus = c.createGain();
      toneFilter = c.createBiquadFilter();
      toneFilter.type = "lowpass";
      toneFilter.Q.value = 0.4;
      analyser = c.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      spectrum = new Uint8Array(analyser.frequencyBinCount);
      bus.connect(toneFilter);
      toneFilter.connect(analyser);
      analyser.connect(c.destination);
      wow = c.createOscillator();
      wow.frequency.value = 0.55;
      wowDepth = c.createGain();
      wowDepth.gain.value = 7; // cents of wow
      wow.connect(wowDepth);
      wow.start();
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVolume();
    }
    return c;
  }

  function applyVolume(): void {
    if (bus && ctx) bus.gain.setTargetAtTime(volume * volume * 0.9, ctx.currentTime, 0.03);
  }

  function voice(midi: number, t: number, dur: number, vol: number, type: OscillatorType, attack = 0.006): void {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    osc.detune.value = (Math.random() - 0.5) * 8;
    wowDepth?.connect(osc.detune);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    osc.onended = () => wowDepth?.disconnect(osc.detune);
  }

  function hit(t: number, dur: number, vol: number, freq: number, type: BiquadFilterType, q = 0.8): void {
    if (!ctx || !bus || !noiseBuf) return;
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  function kick(t: number, vol: number): void {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.16);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  /** One eighth-note of the current tape. */
  function playStep(t: Tape, s: number, at: number, sd: number): void {
    const chordIdx = Math.floor(s / 8) % t.chords.length;
    const sub = s % 8;
    const chord = t.chords[chordIdx]!;
    if (sub === 0) {
      for (const m of chord) voice(m, at, sd * 8.2, 0.035, t.pad, 0.12);
    }
    if (sub === 0 || sub === 4 || (sub === 7 && t.bpm > 90)) voice(t.bass[chordIdx]!, at, sd * (sub === 7 ? 0.9 : 3), 0.17, "triangle", 0.01);
    const a = t.arp[sub]!;
    if (a >= 0) {
      const m = chord[a % chord.length]! + 12 * Math.floor(a / chord.length) + 12;
      voice(m, at, sd * 1.6, t.lead === "square" || t.lead === "sawtooth" ? 0.045 : 0.09, t.lead);
    }
    if (t.kick.includes(sub)) kick(at, 0.55);
    if (t.snare.includes(sub)) hit(at, 0.14, 0.22, 1700, "bandpass", 0.7);
    if (t.hat.includes(sub)) hit(at, 0.035, 0.08, 8000, "highpass");
    if (t.rain) for (let i = 0; i < 3; i++) hit(at + Math.random() * sd, 0.012, 0.05 + Math.random() * 0.05, 3000 + Math.random() * 4000, "bandpass", 3);
    // Faint tape hiss, underneath everything.
    burst(sd * 1.3, 0.014 * volume, 7000, 0.4, at, "highpass");
  }

  function schedule(): void {
    if (!ctx || mode !== "play" || tape === null) return;
    const t = TAPES[tape]!;
    const sd = 60 / t.bpm / 2;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.14) {
      playStep(t, step, nextTime, sd);
      nextTime += sd;
      step++;
    }
  }

  function startWhir(dir: 1 | -1): void {
    stopWhir();
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = dir > 0 ? 1100 : 900;
    lfo.frequency.value = 7;
    lg.gain.value = 180;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.15);
    osc.connect(g);
    g.connect(bus);
    osc.start();
    lfo.start();
    osc.onended = () => lfo.stop();
    whir = { osc, gain: g };
  }

  function stopWhir(): void {
    if (!whir || !ctx) return;
    whir.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
    whir.osc.stop(ctx.currentTime + 0.2);
    whir = null;
  }

  function clunk(big = false): void {
    burst(0.03, big ? 0.5 : 0.3, 2600, 1.2);
    tone(big ? 140 : 220, 70, 0.06, big ? 0.3 : 0.15, "square");
  }

  function setMode(m: Mode): void {
    if (m !== "stop" && tape === null) {
      toast("No tape — open the Duo to pick one");
      return;
    }
    mode = m;
    stopWhir();
    clearInterval(timer);
    if (m === "play" && ctx) {
      toneFilter!.frequency.setValueAtTime(TAPES[tape!]!.cutoff, ctx.currentTime);
      nextTime = ctx.currentTime + 0.06;
      step = Math.floor(step / 8) * 8; // resume on a chord change
      schedule();
      timer = window.setInterval(schedule, 25);
    } else if (m === "ff" || m === "rew") {
      startWhir(m === "ff" ? 1 : -1);
    }
    syncKeys();
  }

  function press(m: Mode): void {
    audio()
      .then(() => {
        clunk(m === "play");
        setMode(m);
      })
      .catch(() => setMode(m));
  }

  function insert(i: number): void {
    audio()
      .then(() => clunk(true))
      .catch(() => {});
    if (mode !== "stop") setMode("stop");
    tape = i;
    step = 0;
    inserting = true;
    render(cur);
    setTimeout(() => (inserting = false), 750);
  }

  function eject(): void {
    audio()
      .then(() => clunk(true))
      .catch(() => {});
    setMode("stop");
    tape = null;
    render(cur);
  }

  // --- DOM helpers ---
  function counterText(): string {
    const p = tape === null ? 0 : pos[tape]!;
    return String(Math.floor(p * 3.33) % 1000).padStart(3, "0");
  }

  function head(sub = "stereo cassette player"): string {
    return `<div class="dm-head"><div><div class="dm-logo">DUO<b>·</b>MAN</div><div class="dm-sub">${sub}</div></div><i class="dm-led ${mode === "play" ? "on" : ""}"></i></div>`;
  }

  function windowHTML(): string {
    if (tape === null) return `<div class="dm-window"><div class="dm-empty">NO TAPE<small>Open the Duo to pick one from the shelf</small></div></div>`;
    return `<div class="dm-window">${cassette(TAPES[tape]!, ++uid)}</div>`;
  }

  function info(): string {
    const t = tape === null ? null : TAPES[tape]!;
    return `<div class="dm-info"><span class="dm-counter">${counterText()}</span><span class="dm-title">${t ? `${t.title} <i>· side A</i>` : "<i>empty</i>"}</span></div>`;
  }

  function keysHTML(): string {
    const k = (m: Mode, icon: string, name: string) => `<button class="dm-key ${m === "play" ? "play" : ""} ${mode === m && m !== "stop" ? "on" : ""}" data-mode="${m}" aria-label="${name}"><span>${icon}</span><small>${name}</small></button>`;
    return `<div class="dm-keys">${k("rew", "◀◀", "REW")}${k("play", "▶", "PLAY")}${k("stop", "■", "STOP")}${k("ff", "▶▶", "FF")}</div>`;
  }

  function volHTML(): string {
    return `<div class="dm-vol"><label>VOL</label><div class="dm-wheel" role="slider" aria-label="Volume" tabindex="0" style="--v:${volume}"></div><div class="dm-level">${Array.from({ length: 10 }, (_, i) => `<i style="height:${6 + i * 1.2}px"></i>`).join("")}</div></div>`;
  }

  function wire(root: HTMLElement): void {
    for (const b of root.querySelectorAll<HTMLButtonElement>(".dm-key")) b.onclick = () => press(b.dataset.mode as Mode);
    for (const w of root.querySelectorAll<HTMLElement>(".dm-wheel")) {
      let x0 = 0;
      let v0 = 0;
      w.addEventListener("pointerdown", (e) => {
        w.setPointerCapture(e.pointerId);
        x0 = e.clientX;
        v0 = volume;
        const r = w.getBoundingClientRect();
        // A tap sets the level directly; a drag rolls the wheel.
        volume = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        v0 = volume;
        syncVol();
        audio().catch(() => {});
      });
      w.addEventListener("pointermove", (e) => {
        if (!w.hasPointerCapture(e.pointerId)) return;
        const r = w.getBoundingClientRect();
        volume = Math.min(1, Math.max(0, v0 + (e.clientX - x0) / r.width));
        syncVol();
      });
      w.addEventListener("wheel", (e) => {
        e.preventDefault();
        volume = Math.min(1, Math.max(0, volume - Math.sign(e.deltaY) * 0.05));
        syncVol();
      });
      w.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") volume = Math.min(1, volume + 0.1);
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") volume = Math.max(0, volume - 0.1);
        else return;
        syncVol();
      });
    }
    syncVol();
  }

  function all<T extends Element = HTMLElement>(sel: string): T[] {
    return [screens.outer, screens.start, screens.end].flatMap((s) => [...s.querySelectorAll<T>(sel)]);
  }

  function syncVol(): void {
    applyVolume();
    for (const w of all(".dm-wheel")) {
      w.style.setProperty("--v", String(volume));
      w.style.backgroundPosition = `${volume * 60}px 0`;
      w.setAttribute("aria-valuenow", String(Math.round(volume * 10)));
    }
    for (const lv of all(".dm-level")) [...lv.children].forEach((c, i) => c.classList.toggle("on", i < Math.round(volume * 10)));
  }

  function syncKeys(): void {
    for (const b of all<HTMLButtonElement>(".dm-key")) b.classList.toggle("on", b.dataset.mode === mode && mode !== "stop");
    for (const l of all(".dm-led")) l.classList.toggle("on", mode === "play");
  }

  function toast(msg: string): void {
    const host = cur.pose.display === "outer" ? screens.outer : screens.end;
    const t = document.createElement("div");
    t.className = "dm-toast";
    t.textContent = msg;
    host.append(t);
    setTimeout(() => t.remove(), 1700);
  }

  // --- the views ---
  function face(p: Pose): HTMLElement {
    const root = document.createElement("div");
    root.className = "dm dm-metal";
    if (p.id === "closed-landscape") {
      root.innerHTML = `<div class="dm-land">${head()}${windowHTML()}<div class="dm-side">${info()}${keysHTML()}${volHTML()}</div></div>`;
    } else {
      root.innerHTML = `${head()}${windowHTML()}${info()}${keysHTML()}${volHTML()}`;
    }
    wire(root);
    return root;
  }

  function shelf(): HTMLElement {
    const root = document.createElement("div");
    root.className = "dm-shelf";
    root.innerHTML = `<h3>the tape shelf<small>tap one to put it in</small></h3><div class="dm-cases">${TAPES.map(
      (t, i) => `<button class="dm-case ${tape === i ? "gone" : ""}" data-i="${i}" aria-label="${t.title}">
        <div class="dm-jcard" style="background:${t.label};color:${t.ink};font-family:${t.font.replace(/"/g, "'")}">
          <div class="dm-art" style="background:${t.art}"></div>
          <div class="t">${t.title}</div>
          <ol>${t.tracks.map((x) => `<li>${x}</li>`).join("")}</ol>
        </div></button>`,
    ).join("")}</div>`;
    for (const b of root.querySelectorAll<HTMLButtonElement>(".dm-case")) {
      b.onclick = () => {
        const i = Number(b.dataset.i);
        if (i !== tape) insert(i);
      };
    }
    return root;
  }

  function deck(p: Pose): HTMLElement {
    const root = document.createElement("div");
    root.className = "dm dm-metal dm-deck";
    const body =
      tape === null
        ? `<div class="dm-slot">The door is open.<br>Pick a tape from the shelf.</div>`
        : cassette(TAPES[tape]!, ++uid);
    root.innerHTML = `${head(p.id === "book" ? "door open · stand it up or close to listen" : "door open")}
      <div class="dm-deck-well"><i class="dm-spindle" style="left:36%"></i><i class="dm-spindle" style="left:64%"></i>
        <div class="dm-door ${inserting ? "in" : ""}">${body}</div></div>
      <div class="dm-info"><span class="dm-counter">${counterText()}</span><span class="dm-title">${tape === null ? "<i>empty</i>" : `${TAPES[tape]!.title} <i>· side A</i>`}</span>${tape === null ? "" : `<button class="dm-eject">EJECT ⏏</button>`}</div>
      ${keysHTML()}${volHTML()}
      <div class="dm-hint">${tape === null ? "" : "Close the Duo to listen — it starts playing on its own"}</div>`;
    root.querySelector<HTMLButtonElement>(".dm-eject")?.addEventListener("click", eject);
    wire(root);
    return root;
  }

  function tableTop(): HTMLElement {
    const root = document.createElement("div");
    root.className = "dm dm-metal";
    root.innerHTML = `${head("now playing")}${windowHTML()}<div class="dm-viz"><canvas></canvas></div>`;
    return root;
  }

  function tableBottom(): HTMLElement {
    const root = document.createElement("div");
    root.className = "dm dm-blue";
    root.innerHTML = `${info()}${keysHTML()}${volHTML()}<div class="dm-chips">${TAPES.map(
      (t, i) => `<button class="dm-chip ${tape === i ? "on" : ""}" data-i="${i}" style="background:${t.label};color:${t.ink};font-family:${t.font.replace(/"/g, "'")}">${t.title}</button>`,
    ).join("")}</div>`;
    root.querySelector<HTMLElement>(".dm-info")!.style.paddingTop = "12px";
    for (const b of root.querySelectorAll<HTMLButtonElement>(".dm-chip")) {
      b.onclick = () => {
        const i = Number(b.dataset.i);
        if (i === tape) return;
        const was = mode === "play";
        insert(i);
        if (was) press("play");
      };
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
      screens.outer.append(face(pose));
    } else if (pose.id === "table") {
      screens.start.append(tableTop());
      screens.end.append(tableBottom());
    } else {
      screens.start.append(shelf());
      screens.end.append(deck(pose));
    }
    // Closing the door with a tape in starts it, like the real thing.
    const outer = pose.display === "outer";
    if (outer && !wasOuter && tape !== null && mode === "stop") {
      if (running()) {
        audio().then(() => {
          clunk(true);
          setMode("play");
        });
      } else toast("Press ▶ to play");
    }
    wasOuter = outer;
    syncKeys();
    frame();
  }

  function frame(): void {
    const t = performance.now();
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const speed = mode === "play" ? 1 : mode === "ff" ? 14 : mode === "rew" ? -14 : 0;
    if (tape !== null && speed !== 0) {
      const p = pos[tape]! + dt * speed;
      if (p >= TAPE_LEN && mode === "play") {
        pos[tape] = 0; // auto-reverse: keep playing from the top
      } else if (p >= TAPE_LEN || p <= 0) {
        // Auto-stop at either end when winding.
        pos[tape] = Math.min(TAPE_LEN, Math.max(0, p));
        if (ctx) clunk();
        setMode("stop");
      } else pos[tape] = p;
    }
    const frac = tape === null ? 0 : pos[tape]! / TAPE_LEN;
    const rL = 8 + 22 * (1 - frac);
    const rR = 8 + 22 * frac;
    // Constant tape speed: the reel with less tape turns faster.
    angleL += (speed * 90 * dt * 18) / rL;
    angleR += (speed * 90 * dt * 18) / rR;
    for (const g of all<SVGGElement>(".dm-reelL")) g.setAttribute("transform", `rotate(${angleL % 360})`);
    for (const g of all<SVGGElement>(".dm-reelR")) g.setAttribute("transform", `rotate(${angleR % 360})`);
    for (const c of all<SVGCircleElement>(".dm-packL")) c.setAttribute("r", rL.toFixed(2));
    for (const c of all<SVGCircleElement>(".dm-packR")) c.setAttribute("r", rR.toFixed(2));
    for (const c of all(".dm-counter")) c.textContent = counterText();
    drawViz();
  }

  function drawViz(): void {
    const canvas = screens.start.querySelector<HTMLCanvasElement>(".dm-viz canvas");
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * 2) {
      canvas.width = w * 2;
      canvas.height = h * 2;
    }
    const g = canvas.getContext("2d")!;
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.clearRect(0, 0, w, h);
    const bars = 24;
    const bw = w / bars;
    if (analyser && spectrum) analyser.getByteFrequencyData(spectrum);
    for (let i = 0; i < bars; i++) {
      const v = mode === "play" && spectrum ? spectrum[Math.min(spectrum.length - 1, Math.floor((i / bars) ** 1.4 * spectrum.length * 0.8))]! / 255 : 0.02;
      const segs = 10;
      const lit = Math.round(v * segs);
      for (let s = 0; s < segs; s++) {
        g.fillStyle = s < lit ? (s > 7 ? "#ff5a36" : s > 5 ? "#ffb347" : "#7ee0a1") : "#1b222c";
        g.fillRect(i * bw + 1.5, h - (s + 1) * (h / segs) + 1, bw - 3, h / segs - 2);
      }
    }
  }

  function loop(): void {
    raf = requestAnimationFrame(loop);
    frame();
  }
  loop();

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      stopWhir();
      wow?.stop();
      if (ctx && bus) {
        const b = bus;
        b.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        setTimeout(() => analyser?.disconnect(), 300);
      }
      style.remove();
    },
  };
}

export const duoManExample: Example = {
  id: "duo-man",
  title: "Duo-Man",
  category: "retro",
  summary:
    "A pocket cassette player with the Duo's fold as its door: open it to pick a home-made tape off the shelf and drop it in, close it and the outer display becomes the player — reels turning in the window — and the tape starts.",
  bestPose: "closed",
  poses: {
    closed: "The player's face: a see-through window with the reels turning, chunky REW / PLAY / STOP / FF keys and a volume wheel; closing with a tape in starts it playing.",
    "closed-landscape": "The same player turned on its side, window on the left and the keys and wheel beside it.",
    open: "The door is open: a shelf of four tapes on the left, the deck on the right — tap a tape and it slides in.",
    "open-portrait": "Shelf above, open deck below; pick a tape the same way.",
    book: "Hold it like a case: tapes on the left page, the open deck on the right, ready to close and listen.",
    table: "Set down like a boombox: the reels and a level meter stand on top, the transport keys, wheel and tape picker lie flat below.",
  },
  principle:
    "Continuity across poses: the tape, its position and the volume survive every fold, and closing — the most natural motion on a Duo — is itself the Play button, while the table pose puts what you watch on top and what you press below.",
  credits: [{ who: "@viditb", url: "https://x.com/viditb/status/2104103592726765722", what: "Duo-Man: open to pick and insert a cassette, close to listen" }],
  create,
};
