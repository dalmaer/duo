/**
 * DJ Decks — two turntables, one per half, the mixer at the fold.
 *
 * Opened flat, the Duo is a pair of decks: deck A on the left page, deck B on
 * the right, and a mixer face plate straddling the fold between them. The
 * fold itself carries nothing you touch: the plate is split, each channel's
 * filter knob sits on its own half, and the crossfader lives on the right half
 * just beside the fold.
 *
 * Each deck plays one of two original loops, synthesized here in Web Audio — a
 * house groove and a breakbeat, both 124 BPM — rendered once into AudioBuffers
 * with an OfflineAudioContext and played through AudioBufferSourceNodes. Drag
 * a platter to scratch: the record follows your finger, the playback rate
 * follows its velocity (backwards too, from a reversed copy of the loop), and
 * when you let go the motor pulls it back to pitch. Each deck has play, cue, a
 * ±8% pitch slider and a filter knob (low-pass left, high-pass right). The
 * crossfader uses an equal-power curve.
 *
 * In table pose the standing half shows the scrolling waveforms with their
 * playheads and BPM; the platters and mixer lie flat beneath your hands.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import type { Pose } from "../core/poses.ts";
import { ready } from "../lib/audio.ts";

const BPM = 124;
const BEAT = 60 / BPM;
const LOOP = 16 * BEAT; // four bars
/** 33⅓ rpm, in radians per second of audio. */
const OMEGA = (2 * Math.PI * (100 / 3)) / 60;
/** Waveform window, seconds, centred on the playhead. */
const WIN = 4;
const PEAKS_PER_S = 120;

type DeckId = "A" | "B";
type Kind = "house" | "breaks";

interface Deck {
  id: DeckId;
  kind: Kind;
  title: string;
  color: string;
  playing: boolean;
  pitch: number; // −0.08 … 0.08
  filter: number; // −1 (low-pass) … 0 … 1 (high-pass)
  cue: number;
  pos: number; // seconds into the loop
  travel: number; // unwrapped seconds, for the platter angle
  rate: number; // current playback rate, negative when scratching backwards
  touching: boolean;
  lastMove: number;
  resync: boolean;
  // audio
  buf: AudioBuffer | null;
  rev: AudioBuffer | null;
  peaks: Float32Array | null;
  src: AudioBufferSourceNode | null;
  srcGain: GainNode | null;
  srcDir: 1 | -1;
  filt: BiquadFilterNode | null;
  chan: GainNode | null;
}

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** Render one of the two loops. Original patterns, synthesized; the tail past the loop folds back to its start so it loops seamlessly. */
async function pressRecord(kind: Kind, sr: number): Promise<AudioBuffer> {
  const tail = 1;
  const oc = new OfflineAudioContext(2, Math.ceil((LOOP + tail) * sr), sr);
  const out = oc.createGain();
  out.gain.value = 0.55;
  out.connect(oc.destination);
  const noise = oc.createBuffer(1, sr, sr);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const env = (t: number, peak: number, attack: number, decay: number, dest: AudioNode = out): GainNode => {
    const g = oc.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(dest);
    return g;
  };
  const pan = (p: number): AudioNode => {
    const s = oc.createStereoPanner();
    s.pan.value = p;
    s.connect(out);
    return s;
  };
  const hiss = (t: number, type: BiquadFilterType, f: number, q: number, peak: number, decay: number, dest: AudioNode = out) => {
    const s = oc.createBufferSource();
    s.buffer = noise;
    const fl = oc.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    s.connect(fl);
    fl.connect(env(t, peak, 0.001, decay, dest));
    s.start(t, Math.random() * 0.5);
    s.stop(t + decay + 0.05);
  };
  const osc = (t: number, type: OscillatorType, f0: number, f1: number, peak: number, attack: number, decay: number, dest: AudioNode = out, cutoff = 0) => {
    const o = oc.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(decay, 0.12));
    let node: AudioNode = o;
    if (cutoff) {
      const lp = oc.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 5;
      lp.frequency.setValueAtTime(cutoff * 4, t);
      lp.frequency.exponentialRampToValueAtTime(cutoff, t + decay * 0.6);
      o.connect(lp);
      node = lp;
    }
    node.connect(env(t, peak, attack, decay, dest));
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  };
  const kick = (t: number, v = 1) => {
    osc(t, "sine", 155, 46, 1.1 * v, 0.002, 0.42);
    hiss(t, "highpass", 4000, 0.7, 0.25 * v, 0.012);
  };
  const clap = (t: number, v = 1) => {
    for (let k = 0; k < 3; k++) hiss(t + k * 0.011, "bandpass", 1150, 1.2, 0.6 * v, 0.03);
    hiss(t + 0.033, "bandpass", 1050, 0.9, 0.42 * v, 0.2);
  };
  const snare = (t: number, v = 1) => {
    hiss(t, "bandpass", 1900, 0.7, 0.75 * v, 0.17);
    osc(t, "triangle", 210, 150, 0.4 * v, 0.002, 0.09);
  };
  const hat = (t: number, open: boolean, v = 1, p = 0.25) => hiss(t, "highpass", 7600, 0.8, (open ? 0.32 : 0.22) * v, open ? 0.2 : 0.035, pan(p));

  if (kind === "house") {
    const roots = [33, 33, 36, 31];
    const chords = [[57, 60, 64, 67], [57, 60, 64, 67], [60, 64, 67, 71], [55, 59, 62, 67]];
    for (let b = 0; b < 16; b++) {
      const t = b * BEAT;
      const bar = Math.floor(b / 4);
      kick(t);
      if (b % 2 === 1) clap(t);
      hat(t + BEAT / 2, true, 0.9);
      for (const k of [1, 3]) hat(t + (k * BEAT) / 4, false, k === 3 ? 0.7 : 0.5, -0.3);
      const root = roots[bar]!;
      osc(t + BEAT / 2, "sawtooth", mtof(root), mtof(root), 0.45, 0.004, 0.2, out, 260);
      osc(t + BEAT / 2, "sine", mtof(root), mtof(root), 0.35, 0.004, 0.22);
      if (b % 4 === 3) osc(t + BEAT * 0.75, "sawtooth", mtof(root + 12), mtof(root + 12), 0.3, 0.004, 0.12, out, 400);
      if (b % 4 === 1 || b % 4 === 2) {
        const at = b % 4 === 1 ? t + BEAT / 2 : t + BEAT * 0.75;
        chords[bar]!.forEach((m, i) => {
          osc(at, "sawtooth", mtof(m) * 1.004, mtof(m) * 1.004, 0.07, 0.003, 0.26, pan(i % 2 ? 0.35 : -0.35), 1500);
          osc(at, "sawtooth", mtof(m) * 0.996, mtof(m) * 0.996, 0.07, 0.003, 0.26, pan(i % 2 ? -0.35 : 0.35), 1500);
        });
      }
    }
  } else {
    const S = BEAT / 4;
    const delay = oc.createDelay(1);
    delay.delayTime.value = S * 3;
    const fb = oc.createGain();
    fb.gain.value = 0.32;
    const wet = oc.createGain();
    wet.gain.value = 0.5;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(pan(0.4));
    const arp = [69, 72, 76, 72, 79, 76, 72, 74];
    const subs = [33, 33, 36, 31];
    for (let bar = 0; bar < 4; bar++) {
      const t0 = bar * 4 * BEAT;
      const kicks = bar % 2 ? [0, 6, 10, 11] : [0, 3, 10];
      const ghosts = bar === 3 ? [7, 9, 13, 14, 15] : [7, 9, 15];
      for (const s of kicks) kick(t0 + s * S, s === 0 ? 1 : 0.85);
      for (const s of [4, 12]) snare(t0 + s * S);
      for (const s of ghosts) snare(t0 + s * S, 0.28);
      for (let s = 0; s < 16; s += 2) hat(t0 + s * S, s === 6 && bar % 2 === 0, s % 4 ? 0.6 : 0.9);
      hat(t0 + 13 * S, false, 0.4, -0.4);
      osc(t0, "sine", mtof(subs[bar]!), mtof(subs[bar]!), 0.6, 0.01, BEAT * 1.6);
      osc(t0 + 10 * S, "sine", mtof(subs[bar]! + (bar === 3 ? 2 : 0)), mtof(subs[bar]!), 0.5, 0.01, BEAT * 1.2);
      for (let k = 0; k < 8; k++) {
        const m = arp[(k + bar * 2) % 8]! - (bar === 2 ? 3 : 0);
        const dry = pan(k % 2 ? 0.2 : -0.2);
        osc(t0 + k * 2 * S, "square", mtof(m), mtof(m), 0.05, 0.003, 0.16, dry, 1400);
        osc(t0 + k * 2 * S, "triangle", mtof(m), mtof(m), 0.05, 0.003, 0.16, delay);
      }
    }
  }

  const rendered = await oc.startRendering();
  const n = Math.round(LOOP * sr);
  const buf = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: sr });
  let peak = 0.0001;
  for (let c = 0; c < 2; c++) {
    const src = rendered.getChannelData(c);
    const dst = buf.getChannelData(c);
    for (let i = 0; i < n; i++) {
      dst[i] = src[i]! + (i + n < src.length ? src[i + n]! : 0);
      peak = Math.max(peak, Math.abs(dst[i]!));
    }
  }
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (d[i]! / peak) * 0.9;
  }
  return buf;
}

function reversed(b: AudioBuffer): AudioBuffer {
  const r = new AudioBuffer({ length: b.length, numberOfChannels: b.numberOfChannels, sampleRate: b.sampleRate });
  for (let c = 0; c < b.numberOfChannels; c++) {
    const s = b.getChannelData(c);
    const d = r.getChannelData(c);
    for (let i = 0, n = s.length; i < n; i++) d[i] = s[n - 1 - i]!;
  }
  return r;
}

function peaksOf(b: AudioBuffer): Float32Array {
  const bins = Math.ceil(b.duration * PEAKS_PER_S);
  const p = new Float32Array(bins);
  const per = b.length / bins;
  const l = b.getChannelData(0);
  const r = b.getChannelData(1);
  for (let k = 0; k < bins; k++) {
    let m = 0;
    for (let i = Math.floor(k * per), e = Math.floor((k + 1) * per); i < e; i++) m = Math.max(m, Math.abs(l[i]!), Math.abs(r[i]!));
    p[k] = m;
  }
  return p;
}

const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const CSS = `
.dj { position:absolute; inset:0; overflow:hidden; color:#e7e9ee; font:600 10px/1.2 system-ui, sans-serif;
  background: radial-gradient(140% 90% at 50% 0%, #2a2d33, #16181c 70%); }
.dj-grid { position:absolute; inset:0; display:grid; }
.dj-cell { position:relative; min-width:0; min-height:0; display:flex; align-items:center; justify-content:center; gap:8px; }
.dj-col { flex-direction:column; }
.dj-plate { background: linear-gradient(180deg, #2f3238, #222429); box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.05); }
.dj-plat { position:relative; width:var(--p); height:var(--p); flex:none; border-radius:50%; touch-action:none; cursor:grab;
  background: radial-gradient(circle, #3b3e44 0 69%, #8b9097 70% 71%, #2a2c31 72%);
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.55), inset 0 0 0 2px #50545b; }
.dj-plat:active { cursor:grabbing; }
.dj-plat::before { content:""; position:absolute; inset:-1px; border-radius:50%; pointer-events:none;
  background: repeating-conic-gradient(rgb(255 255 255 / 0.35) 0 1.5deg, transparent 1.5deg 6deg);
  -webkit-mask: radial-gradient(circle, transparent 0 calc(50% - 6px), #000 calc(50% - 5px)); mask: radial-gradient(circle, transparent 0 calc(50% - 6px), #000 calc(50% - 5px)); }
.dj-disc { position:absolute; inset:7%; border-radius:50%; pointer-events:none;
  background:
    radial-gradient(circle, transparent 0 31%, rgb(255 255 255 / 0.05) 31.5% 32%, transparent 33%),
    repeating-radial-gradient(circle, #121214 0 1.2px, #1d1d21 1.6px 2.6px),
    #111;
  box-shadow: inset 0 0 0 1px #000; }
.dj-disc::after { content:""; position:absolute; inset:0; border-radius:50%;
  background: conic-gradient(from 20deg, transparent 0 40deg, rgb(255 255 255 / 0.10) 55deg, transparent 75deg 220deg, rgb(255 255 255 / 0.07) 235deg, transparent 255deg); }
.dj-label { position:absolute; inset:33%; border-radius:50%; background: var(--c); display:grid; place-items:center; color:#16181c;
  box-shadow: inset 0 0 0 2px rgb(0 0 0 / 0.15); }
.dj-label b { font:900 calc(var(--p) * 0.1)/1 "Avenir Next", system-ui; }
.dj-label small { position:absolute; bottom:12%; font:800 calc(var(--p) * 0.035)/1 system-ui; letter-spacing:0.12em; opacity:0.7; }
.dj-label::before { content:""; position:absolute; top:8%; left:50%; width:3px; height:24%; margin-left:-1.5px; background:#fff; border-radius:2px; }
.dj-spindle { position:absolute; left:50%; top:50%; width:8px; height:8px; margin:-4px; border-radius:50%; background:linear-gradient(135deg,#eee,#888); pointer-events:none; }
.dj-btn { border:0; border-radius:8px; min-width:40px; height:30px; padding:0 9px; cursor:pointer; font:800 10px/1 system-ui; letter-spacing:0.08em;
  color:#e7e9ee; background:#30333a; box-shadow: 0 2px 0 #0b0c0e, inset 0 1px 0 rgb(255 255 255 / 0.07); }
.dj-btn:active { transform:translateY(1px); }
.dj-btn.play.on { background:var(--c); color:#121316; box-shadow: 0 0 12px color-mix(in srgb, var(--c) 60%, transparent), 0 2px 0 #0b0c0e; }
.dj-btn.cue { color:#ffb648; }
.dj-btn.cue.flash { background:#ffb648; color:#121316; }
.dj-row { display:flex; gap:6px; align-items:center; }
.dj-wavebox { position:relative; width:100%; border-radius:6px; overflow:hidden; background:#0b0c0f; box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.06); }
.dj-wave { position:absolute; inset:0; width:100%; height:100%; display:block; }
.dj-tag { position:absolute; left:6px; top:4px; font:800 9px/1 system-ui; letter-spacing:0.12em; color:var(--c); pointer-events:none; text-shadow:0 1px 2px #000; }
.dj-bpm { font:700 11px/1 ui-monospace, "SF Mono", monospace; color:#9ff0c8; white-space:nowrap; }
.dj-wavebox .dj-bpm { position:absolute; right:6px; top:4px; pointer-events:none; text-shadow:0 1px 2px #000; }
.dj-big { font:800 26px/1 ui-monospace, "SF Mono", monospace; color:#9ff0c8; }
.dj-pitch { display:flex; align-items:center; gap:6px; }
.dj-pitch input { accent-color: var(--c); margin:0; cursor:pointer; touch-action:none; }
.dj-pitch.v { flex-direction:column; height:var(--h, 120px); }
.dj-pitch.v input { writing-mode: vertical-lr; direction: rtl; flex:1; width:22px; }
.dj-pitch.h input { width:var(--w, 90px); }
.dj-pv { font:700 9px/1 ui-monospace, monospace; opacity:0.8; white-space:nowrap; }
.dj-knob { position:relative; width:var(--kn, 38px); height:var(--kn, 38px); border-radius:50%; cursor:ns-resize; touch-action:none; flex:none;
  background: radial-gradient(circle at 40% 35%, #5a5e66, #2a2c31 70%); box-shadow: 0 3px 6px rgb(0 0 0 / 0.6), inset 0 0 0 1px rgb(255 255 255 / 0.08); }
.dj-knob::before { content:""; position:absolute; inset:-5px; border-radius:50%; pointer-events:none;
  background: conic-gradient(from -135deg, #6ab7ff 0 135deg, #ff8a5c 135deg 270deg, transparent 270deg); opacity:0.25;
  -webkit-mask: radial-gradient(circle, transparent 0 calc(50% - 2px), #000 calc(50% - 1px)); mask: radial-gradient(circle, transparent 0 calc(50% - 2px), #000 calc(50% - 1px)); }
.dj-knob i { position:absolute; inset:0; pointer-events:none; }
.dj-knob i::after { content:""; position:absolute; left:50%; top:4px; width:3px; height:30%; margin-left:-1.5px; border-radius:2px; background:#fff; }
.dj-kl { font:800 8px/1 system-ui; letter-spacing:0.14em; opacity:0.6; text-align:center; }
.dj-kv { font:700 9px/1 ui-monospace, monospace; color:#9ff0c8; text-align:center; min-width:36px; }
.dj-vu { display:flex; flex-direction:column-reverse; gap:2px; width:10px; }
.dj-vu i { height:5px; border-radius:1px; background:#2b2e34; }
.dj-vu i.on { background:#4fe08c; } .dj-vu i.on:nth-child(n+7) { background:#ffcc48; } .dj-vu i.on:nth-child(n+9) { background:#ff5a4a; }
.dj-xf { display:flex; align-items:center; gap:6px; }
.dj-xf input { width:var(--w, 110px); margin:0; accent-color:#e7e9ee; cursor:pointer; touch-action:none; }
.dj-xf b { font:900 10px/1 system-ui; }
.dj-xfshow { position:relative; height:10px; border-radius:5px; background:#0b0c0f; width:var(--w, 120px); }
.dj-xfshow i { position:absolute; top:-3px; width:12px; height:16px; margin-left:-6px; border-radius:3px; background:#e7e9ee; }
.dj-seg { display:flex; border-radius:9px; background:#0f1013; padding:2px; gap:2px; }
.dj-seg button { border:0; border-radius:7px; padding:6px 10px; cursor:pointer; font:800 10px/1 system-ui; letter-spacing:0.1em; color:#9aa0a8; background:transparent; }
.dj-seg button.on { background:#30333a; color:var(--c); }
.dj-note { font:500 9px/1.3 system-ui; opacity:0.55; text-align:center; }
.dj-fold { position:absolute; top:0; bottom:0; width:2px; background:rgb(255 255 255 / 0.06); pointer-events:none; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  const mk = (id: DeckId, kind: Kind, title: string, color: string): Deck => ({
    id, kind, title, color, playing: false, pitch: 0, filter: 0, cue: 0, pos: 0, travel: 0, rate: 0, touching: false, lastMove: 0, resync: false,
    buf: null, rev: null, peaks: null, src: null, srcGain: null, srcDir: 1, filt: null, chan: null,
  });
  const decks: Record<DeckId, Deck> = { A: mk("A", "house", "HOUSE", "#33d1c6"), B: mk("B", "breaks", "BREAKS", "#ff7a59") };
  let xf = 0.5;
  let sel: DeckId = "A";
  let pose: Pose = initial.pose;
  let raf = 0;
  let last = performance.now();
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let pressing: Promise<void> | null = null;
  let alive = true;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  // An OfflineAudioContext needs no gesture, so the two records are pressed straight away and the
  // waveforms can show before anything plays. Playback resamples them to the live context's rate.
  const records: Promise<void> = Promise.all([pressRecord("house", 44100), pressRecord("breaks", 44100)])
    .then(([a, b]) => {
      if (!alive) return;
      for (const [d, buf] of [[decks.A, a], [decks.B, b]] as const) {
        d.buf = buf;
        d.rev = reversed(buf);
        d.peaks = peaksOf(buf);
      }
    })
    .catch(() => syncStatus("This browser could not press the records."));

  const all = <T extends Element = HTMLElement>(sel: string, root?: Element): T[] =>
    root ? [...root.querySelectorAll<T>(sel)] : [screens.outer, screens.start, screens.end].flatMap((s) => [...s.querySelectorAll<T>(sel)]);

  // --- audio ---
  /** Call from a pointer handler: unlocks audio, builds the mixer, presses the two records once. */
  function audio(): Promise<void> {
    if (pressing) return pressing;
    pressing = ready().then(async (c) => {
      ctx = c;
      master = c.createGain();
      master.gain.value = 0.85;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 4;
      master.connect(comp);
      comp.connect(c.destination);
      for (const d of Object.values(decks)) {
        d.filt = c.createBiquadFilter();
        d.chan = c.createGain();
        d.filt.connect(d.chan);
        d.chan.connect(master);
        applyFilter(d);
      }
      applyXf();
      await records;
      syncStatus("");
    });
    pressing.catch(() => {
      pressing = null;
    });
    return pressing;
  }

  function applyFilter(d: Deck): void {
    if (!d.filt || !ctx) return;
    const v = d.filter;
    const t = ctx.currentTime;
    if (Math.abs(v) < 0.04) {
      d.filt.type = "lowpass";
      d.filt.frequency.setTargetAtTime(20000, t, 0.02);
      d.filt.Q.value = 0.7;
    } else if (v < 0) {
      d.filt.type = "lowpass";
      d.filt.frequency.setTargetAtTime(20000 * (180 / 20000) ** -v, t, 0.02);
      d.filt.Q.value = 3;
    } else {
      d.filt.type = "highpass";
      d.filt.frequency.setTargetAtTime(30 * (6000 / 30) ** v, t, 0.02);
      d.filt.Q.value = 3;
    }
  }

  /** Equal-power crossfade. */
  function applyXf(): void {
    if (!ctx) return;
    const t = ctx.currentTime;
    decks.A.chan?.gain.setTargetAtTime(Math.cos((xf * Math.PI) / 2), t, 0.01);
    decks.B.chan?.gain.setTargetAtTime(Math.sin((xf * Math.PI) / 2), t, 0.01);
  }

  function stopSource(d: Deck): void {
    if (!d.src || !d.srcGain || !ctx) return;
    const t = ctx.currentTime;
    d.srcGain.gain.setTargetAtTime(0, t, 0.004);
    d.src.stop(t + 0.03);
    d.src = null;
    d.srcGain = null;
  }

  function startSource(d: Deck, dir: 1 | -1): void {
    stopSource(d);
    if (!ctx || !d.buf || !d.rev || !d.filt) return;
    const s = ctx.createBufferSource();
    s.buffer = dir > 0 ? d.buf : d.rev;
    s.loop = true;
    s.playbackRate.value = Math.max(0.001, Math.abs(d.rate));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.setTargetAtTime(1, ctx.currentTime, 0.004);
    s.connect(g);
    g.connect(d.filt);
    const off = dir > 0 ? wrap(d.pos) : wrap(LOOP - d.pos);
    s.start(ctx.currentTime, Math.min(off, d.buf.duration - 0.001));
    d.src = s;
    d.srcGain = g;
    d.srcDir = dir;
  }

  /** Keep the audio source in step with the deck's rate and direction. */
  function syncAudio(d: Deck): void {
    if (!ctx || !d.buf) return;
    const wants = d.playing || d.touching || Math.abs(d.rate) > 0.01;
    if (!wants) return stopSource(d);
    const dir: 1 | -1 = d.rate < -0.02 ? -1 : d.rate > 0.02 ? 1 : d.srcDir;
    if (!d.src || dir !== d.srcDir || d.resync) {
      d.resync = false;
      startSource(d, dir);
    } else d.src.playbackRate.setTargetAtTime(Math.max(0.001, Math.abs(d.rate)), ctx.currentTime, 0.012);
  }

  // --- the motor and the screens ---
  function frame(): void {
    raf = requestAnimationFrame(frame);
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    for (const d of Object.values(decks)) {
      if (d.touching) {
        // A finger holding the record still stops it.
        if (nowMs - d.lastMove > 50) d.rate *= 0.6;
      } else {
        const target = d.playing ? 1 + d.pitch : 0;
        const k = d.playing ? 10 : 5; // quick start, slower brake
        d.rate += (target - d.rate) * Math.min(1, dt * k);
        if (Math.abs(target - d.rate) < 0.002) d.rate = target;
        d.pos = wrap(d.pos + d.rate * dt);
        d.travel += d.rate * dt;
      }
      syncAudio(d);
      paintDeck(d);
    }
  }

  function paintDeck(d: Deck): void {
    const deg = ((d.travel * OMEGA * 180) / Math.PI) % 360;
    for (const e of all(`.dj-disc[data-d="${d.id}"]`)) e.style.transform = `rotate(${deg.toFixed(2)}deg)`;
    for (const c of all<HTMLCanvasElement>(`canvas.dj-wave[data-d="${d.id}"]`)) drawWave(c, d);
    const level = d.peaks ? d.peaks[Math.floor(d.pos * PEAKS_PER_S) % d.peaks.length]! * Math.min(1, Math.abs(d.rate)) : 0;
    const gain = d.id === "A" ? Math.cos((xf * Math.PI) / 2) : Math.sin((xf * Math.PI) / 2);
    const lit = Math.round(level * gain * 10);
    for (const vu of all(`.dj-vu[data-d="${d.id}"]`)) vu.querySelectorAll("i").forEach((i, k) => i.classList.toggle("on", k < lit));
  }

  function drawWave(c: HTMLCanvasElement, d: Deck): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const g = c.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, w, h);
    const mid = h / 2;
    // Beat lines.
    g.fillStyle = "rgb(255 255 255 / 0.12)";
    const first = Math.ceil((d.pos - WIN / 2) / BEAT);
    for (let b = first; b * BEAT < d.pos + WIN / 2; b++) {
      const x = ((b * BEAT - d.pos) / WIN + 0.5) * w;
      g.fillRect(Math.round(x), 0, b % 4 === 0 ? 2 * dpr : dpr, b % 4 === 0 ? h : h * 0.2);
    }
    if (d.peaks) {
      const p = d.peaks;
      for (let x = 0; x < w; x += dpr) {
        const t = wrap(d.pos + (x / w - 0.5) * WIN);
        const v = p[Math.floor(t * PEAKS_PER_S) % p.length]!;
        g.fillStyle = x < w / 2 ? `color-mix(in srgb, ${d.color} 55%, #0b0c0f)` : d.color;
        g.fillRect(x, mid - v * mid * 0.9, dpr, Math.max(dpr, v * mid * 1.8));
      }
    } else {
      g.fillStyle = "rgb(255 255 255 / 0.25)";
      g.fillRect(0, mid, w, dpr);
    }
    // Cue marker and playhead.
    const cx = ((wrap(d.cue - d.pos + LOOP / 2) - LOOP / 2) / WIN + 0.5) * w;
    if (cx >= 0 && cx <= w) {
      g.fillStyle = "#ffb648";
      g.beginPath();
      g.moveTo(cx - 5 * dpr, 0);
      g.lineTo(cx + 5 * dpr, 0);
      g.lineTo(cx, 7 * dpr);
      g.fill();
    }
    g.fillStyle = "#fff";
    g.fillRect(w / 2 - dpr, 0, 2 * dpr, h);
  }

  // --- controls ---
  function setPlaying(d: Deck, on: boolean): void {
    d.playing = on;
    syncDeckUI(d);
  }

  function cue(d: Deck): void {
    if (d.playing) {
      d.playing = false;
      d.travel += wrap(d.cue - d.pos);
      d.pos = d.cue;
      d.rate = 0;
      d.resync = true;
    } else {
      d.cue = d.pos;
    }
    for (const b of all(`.dj-btn.cue[data-d="${d.id}"]`)) {
      b.classList.add("flash");
      setTimeout(() => b.classList.remove("flash"), 160);
    }
    syncDeckUI(d);
  }

  function bpmText(d: Deck): string {
    return (BPM * (1 + d.pitch)).toFixed(1);
  }
  function filterText(d: Deck): string {
    return Math.abs(d.filter) < 0.04 ? "FLAT" : d.filter < 0 ? `LP ${Math.round(-d.filter * 100)}` : `HP ${Math.round(d.filter * 100)}`;
  }

  function syncDeckUI(d: Deck): void {
    for (const b of all(`.dj-btn.play[data-d="${d.id}"]`)) {
      b.classList.toggle("on", d.playing);
      b.textContent = d.playing ? "❚❚" : "▶";
      b.setAttribute("aria-label", d.playing ? `Pause deck ${d.id}` : `Play deck ${d.id}`);
    }
    for (const e of all(`.dj-bpm[data-d="${d.id}"]`)) e.textContent = bpmText(d);
    for (const e of all(`.dj-pv[data-d="${d.id}"]`)) e.textContent = `${d.pitch >= 0 ? "+" : "−"}${Math.abs(d.pitch * 100).toFixed(1)}%`;
    for (const e of all<HTMLInputElement>(`.dj-pitch input[data-d="${d.id}"]`)) if (document.activeElement !== e) e.value = String(d.pitch * 100);
    for (const e of all(`.dj-knob[data-d="${d.id}"]`)) {
      e.querySelector("i")!.style.transform = `rotate(${d.filter * 135}deg)`;
      e.setAttribute("aria-valuenow", String(Math.round(d.filter * 100)));
    }
    for (const e of all(`.dj-kv[data-d="${d.id}"]`)) e.textContent = filterText(d);
  }

  function syncXfUI(): void {
    for (const e of all<HTMLInputElement>(".dj-xf input")) if (document.activeElement !== e) e.value = String(Math.round(xf * 100));
    for (const e of all(".dj-xfshow i")) e.style.left = `${xf * 100}%`;
  }

  function syncStatus(text: string): void {
    for (const e of all(".dj-status")) e.textContent = text;
  }

  function wire(root: HTMLElement): void {
    // Platters: the record follows the finger; its rate follows the finger's speed.
    for (const p of all(".dj-plat", root)) {
      const d = decks[p.dataset.d as DeckId];
      let a0 = 0;
      let t0 = 0;
      let pid = -1;
      const angle = (e: PointerEvent) => Math.atan2(e.offsetY - p.clientHeight / 2, e.offsetX - p.clientWidth / 2);
      p.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        void audio();
        pid = e.pointerId;
        p.setPointerCapture(e.pointerId);
        a0 = angle(e);
        t0 = performance.now();
        d.touching = true;
        d.lastMove = t0;
      });
      p.addEventListener("pointermove", (e) => {
        if (e.pointerId !== pid) return;
        const a = angle(e);
        let da = a - a0;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > 1.4) {
          a0 = a;
          return;
        }
        const t = performance.now();
        const dt = Math.max(0.004, (t - t0) / 1000);
        const dpos = da / OMEGA;
        d.pos = wrap(d.pos + dpos);
        d.travel += dpos;
        d.rate = clamp(d.rate * 0.55 + (dpos / dt) * 0.45, -4, 4);
        d.lastMove = t;
        a0 = a;
        t0 = t;
      });
      const up = (e: PointerEvent) => {
        if (e.pointerId !== pid) return;
        pid = -1;
        d.touching = false;
        d.resync = true; // land the audio exactly where the record is
      };
      p.addEventListener("pointerup", up);
      p.addEventListener("pointercancel", up);
    }
    for (const b of all(".dj-btn.play", root)) {
      const d = decks[b.dataset.d as DeckId];
      b.addEventListener("click", () => {
        void audio();
        setPlaying(d, !d.playing);
      });
    }
    for (const b of all(".dj-btn.cue", root)) {
      const d = decks[b.dataset.d as DeckId];
      b.addEventListener("click", () => {
        void audio();
        cue(d);
      });
    }
    for (const i of all<HTMLInputElement>(".dj-pitch input", root)) {
      const d = decks[i.dataset.d as DeckId];
      i.addEventListener("input", () => {
        d.pitch = Number(i.value) / 100;
        syncDeckUI(d);
      });
      i.addEventListener("dblclick", () => {
        d.pitch = 0;
        i.value = "0";
        syncDeckUI(d);
      });
    }
    for (const k of all(".dj-knob", root)) {
      const d = decks[k.dataset.d as DeckId];
      let y0 = 0;
      let v0 = 0;
      let pid = -1;
      k.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        void audio();
        pid = e.pointerId;
        k.setPointerCapture(e.pointerId);
        y0 = e.clientY;
        v0 = d.filter;
      });
      k.addEventListener("pointermove", (e) => {
        if (e.pointerId !== pid) return;
        d.filter = clamp(v0 - (e.clientY - y0) / 90, -1, 1);
        if (Math.abs(d.filter) < 0.05) d.filter = 0;
        applyFilter(d);
        syncDeckUI(d);
      });
      const up = (e: PointerEvent) => {
        if (e.pointerId === pid) pid = -1;
      };
      k.addEventListener("pointerup", up);
      k.addEventListener("pointercancel", up);
      k.addEventListener("dblclick", () => {
        d.filter = 0;
        applyFilter(d);
        syncDeckUI(d);
      });
      k.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -0.1 : 0;
        if (!step) return;
        e.preventDefault();
        d.filter = clamp(Math.round((d.filter + step) * 10) / 10, -1, 1);
        applyFilter(d);
        syncDeckUI(d);
      });
    }
    for (const i of all<HTMLInputElement>(".dj-xf input", root)) {
      i.addEventListener("input", () => {
        void audio();
        xf = Number(i.value) / 100;
        applyXf();
        syncXfUI();
      });
    }
    for (const b of all<HTMLButtonElement>(".dj-seg button", root)) {
      b.addEventListener("click", () => {
        sel = b.dataset.sel as DeckId;
        render(current);
      });
    }
  }

  // --- pieces ---
  const dv = (d: Deck) => `data-d="${d.id}" style="--c:${d.color}"`;
  const platter = (d: Deck, size: string) =>
    `<div class="dj-plat" data-d="${d.id}" style="--c:${d.color};--p:${size}" role="slider" aria-label="Deck ${d.id} platter: drag to scratch"><div class="dj-disc" data-d="${d.id}"><i class="dj-label" style="--c:${d.color}"><b>${d.id}</b><small>${d.title} ${BPM}</small></i></div><i class="dj-spindle"></i></div>`;
  const wave = (d: Deck, h: string) =>
    `<div class="dj-wavebox" style="height:${h};--c:${d.color}"><canvas class="dj-wave" data-d="${d.id}"></canvas><span class="dj-tag">${d.id} · ${d.title}</span><span class="dj-bpm" data-d="${d.id}">${bpmText(d)}</span></div>`;
  const transport = (d: Deck) =>
    `<div class="dj-row"><button class="dj-btn play" ${dv(d)}>▶</button><button class="dj-btn cue" ${dv(d)}>CUE</button></div>`;
  const pitch = (d: Deck, o: "v" | "h", size: string) =>
    `<label class="dj-pitch ${o}" style="${o === "v" ? `--h:${size}` : `--w:${size}`};--c:${d.color}"><input type="range" min="-8" max="8" step="0.1" value="${d.pitch * 100}" data-d="${d.id}" aria-label="Deck ${d.id} pitch"><span class="dj-pv" data-d="${d.id}"></span></label>`;
  const knob = (d: Deck) =>
    `<div class="dj-col dj-cell" style="gap:5px;flex:none"><span class="dj-kl">FILTER ${d.id}</span><div class="dj-knob" data-d="${d.id}" tabindex="0" role="slider" aria-label="Deck ${d.id} filter" aria-valuemin="-100" aria-valuemax="100"><i></i></div><span class="dj-kv" data-d="${d.id}"></span></div>`;
  const vu = (d: Deck) => `<div class="dj-vu" data-d="${d.id}">${"<i></i>".repeat(10)}</div>`;
  const xfader = (w: string) => `<div class="dj-xf" style="--w:${w}"><b style="color:${decks.A.color}">A</b><input type="range" min="0" max="100" value="${Math.round(xf * 100)}" aria-label="Crossfader"><b style="color:${decks.B.color}">B</b></div>`;
  const status = `<div class="dj-note dj-status"></div>`;

  function el(html: string, css = ""): HTMLElement {
    const e = document.createElement("div");
    e.className = "dj";
    if (css) e.style.cssText = css;
    e.innerHTML = html;
    return e;
  }

  // --- layouts ---
  function sideBySide(): void {
    // Deck A | mixer A ┃ fold ┃ mixer B + crossfader | deck B. The mixer plate straddles the fold;
    // every control on it sits at least 18px from the fold edge.
    const P = "min(170px, calc(100cqw - 128px), calc(100cqh - 150px))";
    const A = decks.A;
    const B = decks.B;
    const left = el(`
      <div class="dj-grid" style="grid-template-columns:1fr 80px; grid-template-rows:auto 1fr auto">
        <div class="dj-cell" style="padding:12px 8px 0 12px">${wave(A, "40px")}</div>
        <div class="dj-cell dj-col dj-plate" style="grid-row:1 / span 3; grid-column:2; padding:14px 20px 14px 4px; justify-content:space-between">
          ${knob(A)}${vu(A)}<span class="dj-kl">CH A</span></div>
        <div class="dj-cell" style="padding:0 0 0 6px">${pitch(A, "v", "calc(" + P + " - 10px)")}<div class="dj-cell">${platter(A, P)}</div></div>
        <div class="dj-cell" style="padding:0 8px 14px 12px; justify-content:space-between">${transport(A)}${status}</div>
      </div>`);
    const right = el(`
      <div class="dj-grid" style="grid-template-columns:80px 1fr; grid-template-rows:auto 1fr auto">
        <div class="dj-cell dj-col dj-plate" style="grid-row:1 / span 2; grid-column:1; padding:14px 4px 14px 20px; justify-content:space-between">
          ${knob(B)}${vu(B)}<span class="dj-kl">CH B</span></div>
        <div class="dj-cell" style="grid-column:2; padding:12px 12px 0 8px">${wave(B, "40px")}</div>
        <div class="dj-cell" style="grid-column:2; padding:0 6px 0 0"><div class="dj-cell">${platter(B, P)}</div>${pitch(B, "v", "calc(" + P + " - 10px)")}</div>
        <div class="dj-cell dj-plate" style="grid-column:1 / span 2; padding:8px 12px 14px 20px; justify-content:space-between; background:linear-gradient(90deg, #2a2d32 0 80px, transparent 80px)">
          ${xfader("96px")}${transport(B)}</div>
      </div>`);
    screens.start.append(left);
    screens.end.append(right);
  }

  function table(): void {
    // Watch on top: both waveforms, BPM and the crossfader's position. Touch below: platters and mixer.
    const A = decks.A;
    const B = decks.B;
    const top = el(`
      <div class="dj-grid" style="grid-template-rows:1fr 1fr auto; gap:6px; padding:12px 12px 22px">
        ${[A, B]
          .map(
            (d) => `<div class="dj-cell" style="gap:10px">
          <div class="dj-col dj-cell" style="width:74px; flex:none; align-items:flex-start; gap:4px">
            <span class="dj-kl" style="color:${d.color}; opacity:1">DECK ${d.id}</span><span class="dj-big dj-bpm" data-d="${d.id}">${bpmText(d)}</span><span class="dj-pv" data-d="${d.id}"></span></div>
          ${wave(d, "100%")}</div>`,
          )
          .join("")}
        <div class="dj-cell" style="justify-content:space-between"><span class="dj-kv" data-d="A"></span><div class="dj-xfshow" style="--w:140px"><i></i></div><span class="dj-kv" data-d="B"></span></div>
      </div>`);
    const P = "min(138px, calc(100cqh - 120px), calc((100cqw - 112px) / 2 - 12px))";
    const deck = (d: Deck) => `<div class="dj-cell dj-col" style="gap:8px">${platter(d, P)}${transport(d)}${pitch(d, "h", "88px")}</div>`;
    const bottom = el(`
      <div class="dj-grid" style="grid-template-columns:1fr 108px 1fr; padding:24px 6px 10px">
        ${deck(A)}
        <div class="dj-cell dj-col dj-plate" style="border-radius:10px; gap:10px; padding:8px 0">
          <div class="dj-row" style="gap:4px">${knob(A).replace("FILTER ", "")}${knob(B).replace("FILTER ", "")}</div>
          <div class="dj-row">${vu(A)}${vu(B)}</div>
          ${xfader("62px")}${status}</div>
        ${deck(B)}
      </div>`);
    for (const k of all<HTMLElement>(".dj-knob", bottom)) k.style.setProperty("--kn", "32px");
    screens.start.append(top);
    screens.end.append(bottom);
  }

  function portrait(): void {
    // Open flat and turned tall: deck A above, deck B below. The crossfader leads deck B's controls,
    // just below the fold.
    for (const d of [decks.A, decks.B]) {
      const P = "min(230px, calc(100cqh - 36px), calc(100cqw - 170px))";
      const isB = d.id === "B";
      const host = isB ? screens.end : screens.start;
      host.append(
        el(`<div class="dj-grid" style="grid-template-columns:auto 1fr; padding:${isB ? "22px 12px 14px" : "14px 12px 22px"}; gap:10px">
          <div class="dj-cell">${platter(d, P)}</div>
          <div class="dj-cell dj-col" style="align-items:stretch; gap:9px">
            ${isB ? xfader("100%") : ""}
            ${wave(d, "44px")}
            <div class="dj-row" style="justify-content:space-between">${transport(d)}${vu(d)}</div>
            ${pitch(d, "h", "100%")}
            <div class="dj-row" style="justify-content:center">${knob(d)}</div>
            ${isB ? "" : status}
          </div></div>`),
      );
    }
  }

  function closed(): void {
    // One deck at a time, with the switch at the top left (clear of the camera) and the crossfader below.
    const d = decks[sel];
    const P = "min(196px, calc(100cqh - 200px))";
    screens.outer.append(
      el(`<div class="dj-grid" style="grid-template-rows:auto auto 1fr auto auto; gap:8px; padding:14px 14px 14px">
        <div class="dj-row"><div class="dj-seg" style="--c:${d.color}">
          <button data-sel="A" class="${sel === "A" ? "on" : ""}" style="--c:${decks.A.color}">DECK A</button>
          <button data-sel="B" class="${sel === "B" ? "on" : ""}" style="--c:${decks.B.color}">DECK B</button></div></div>
        ${wave(d, "38px")}
        <div class="dj-cell">${platter(d, P)}</div>
        <div class="dj-row" style="justify-content:space-between">${transport(d)}${pitch(d, "h", "92px")}</div>
        <div class="dj-row" style="justify-content:space-between">${xfader("120px")}<div class="dj-knob" data-d="${d.id}" tabindex="0" role="slider" aria-label="Deck ${d.id} filter" style="--kn:30px"><i></i></div></div>
        ${status}
      </div>`),
    );
  }

  function landscape(): void {
    // Both mini platters for two thumbs, the crossfader between them.
    const P = "min(124px, calc(100cqh - 96px), calc((100cqw - 150px) / 2))";
    const deck = (d: Deck) => `<div class="dj-cell dj-col" style="gap:10px">${platter(d, P)}${transport(d)}</div>`;
    screens.outer.append(
      el(`<div class="dj-grid" style="grid-template-columns:1fr 124px 1fr; padding:16px 10px 12px">
        ${deck(decks.A)}
        <div class="dj-cell dj-col" style="gap:12px">
          <div class="dj-row" style="gap:10px"><span class="dj-bpm" data-d="A" style="color:${decks.A.color}"></span><span class="dj-bpm" data-d="B" style="color:${decks.B.color}"></span></div>
          ${xfader("68px")}
          <div class="dj-row">${vu(decks.A)}${vu(decks.B)}</div>${status}</div>
        ${deck(decks.B)}
      </div>`),
    );
  }

  let current = initial;
  function render(state: DuoState): void {
    current = state;
    pose = state.pose;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.id === "closed") closed();
    else if (pose.id === "closed-landscape") landscape();
    else if (pose.split === "side-by-side") sideBySide();
    else if (pose.id === "table") table();
    else portrait();
    for (const s of [screens.outer, screens.start, screens.end]) wire(s);
    for (const d of Object.values(decks)) syncDeckUI(d);
    syncXfUI();
    syncStatus(decks.A.buf ? "" : "Pressing records…");
    void records.then(() => syncStatus(""));
  }

  raf = requestAnimationFrame(frame);

  return {
    render,
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      for (const d of Object.values(decks)) {
        d.playing = false;
        stopSource(d);
        d.chan?.disconnect();
      }
      if (master && ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      style.remove();
    },
  };
}

export const djDecksExample: Example = {
  id: "dj-decks",
  title: "DJ Decks",
  category: "music",
  summary:
    "Two turntables, one on each half, with the mixer at the fold: scratch either platter, nudge the pitch, sweep a filter and blend the two original 124 BPM loops — a house groove and a breakbeat — on an equal-power crossfader.",
  bestPose: "open",
  poses: {
    closed: "One deck at a time, with a Deck A/B switch, its platter, play, cue, pitch and filter — and the crossfader, so you can still mix.",
    "closed-landscape": "Both decks as mini platters for two thumbs, play and cue under each, the crossfader between them.",
    open: "A deck on each half and a mixer plate straddling the fold. Nothing you touch sits in the fold: each filter knob is on its own channel's half, and the crossfader lives on the right half just beside the fold.",
    "open-portrait": "Decks stacked, A above and B below, with the crossfader at the top of deck B's controls, just below the fold.",
    book: "As open, deck A on the left page and deck B on the right; the split mixer keeps every control clear of the hinge.",
    table: "The waveforms, playheads and BPM stand up on the top half where you can see them; the platters and mixer lie flat under your hands.",
    stand: "Stood up like a card, deck A on one side and deck B on the other — a little booth for two DJs.",
  },
  principle:
    "Nothing interactive sits in the fold (HIG checklist §6, 'Displacement': move high-priority custom controls clear of the fold, and move related elements together): the mixer is split so each channel's controls stay with their deck and the crossfader moves just beside the fold. In table pose, the waveforms you watch go up top and the platters you touch go on the stable bottom half ('Destination follows purpose').",
  create,
};
