/**
 * One shared Web Audio context for every example, and the handful of voices
 * they need.
 *
 * The cajón voices and the Safari unlock are ported from Ritmo
 * (github.com/dalmaer/cajones): iOS mutes "ambient" Web Audio with the silent
 * switch unless the session asks for playback, and a context can only be
 * resumed inside a trusted gesture. Examples call `ready()` from a pointer
 * handler and get a running context or a thrown, human-readable error.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

export function running(): boolean {
  return ctx?.state === "running";
}

export async function ready(): Promise<AudioContext> {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== "playback") session.type = "playback";
  } catch {
    /* Older browsers can still use Web Audio without AudioSession. */
  }
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext({ latencyHint: "interactive" });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -9;
    comp.knee.value = 9;
    comp.ratio.value = 5;
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(comp);
    comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  // Resume before yielding: Safari requires the call inside the gesture.
  if (ctx.state !== "running") await ctx.resume();
  return ctx;
}

function out(): AudioNode {
  if (!ctx || !master) throw new Error("audio not ready");
  return master;
}

export function tone(freq: number, endFreq: number, duration: number, volume: number, type: OscillatorType = "sine", at?: number): void {
  if (!ctx) return;
  const t = at ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + duration * 0.65);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain);
  gain.connect(out());
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function burst(duration: number, volume: number, freq: number, q = 1, at?: number, filterType: BiquadFilterType = "bandpass"): void {
  if (!ctx || !noise) return;
  const t = at ?? ctx.currentTime;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noise;
  filter.type = filterType;
  filter.frequency.value = freq;
  filter.Q.value = q;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out());
  src.start(t);
  src.stop(t + duration + 0.01);
}

/** Cajón strokes, as Ritmo voices them: B bass, s soft slap, S accented slap. */
export type Stroke = "B" | "s" | "S";

export function cajon(stroke: Stroke, volume = 1, at?: number): void {
  if (stroke === "B") {
    tone(125, 54, 0.22, 0.8 * volume, "sine", at);
    tone(198, 155, 0.09, 0.12 * volume, "sine", at);
    burst(0.06, 0.24 * volume, 500, 0.5, at);
  } else if (stroke === "s") {
    tone(230, 145, 0.065, 0.17 * volume, "sine", at);
    burst(0.072, 0.48 * volume, 1900, 0.55, at);
  } else {
    tone(330, 175, 0.095, 0.25 * volume, "sine", at);
    burst(0.14, 0.9 * volume, 2600, 0.6, at);
    burst(0.045, 0.32 * volume, 5200, 0.8, at);
  }
}

/** A short pitched note, for melodies and UI blips. */
export function note(midi: number, duration = 0.2, volume = 0.2, type: OscillatorType = "triangle", at?: number): void {
  const f = 440 * 2 ** ((midi - 69) / 12);
  tone(f, f, duration, volume, type, at);
}

export function now(): number {
  return ctx?.currentTime ?? 0;
}
