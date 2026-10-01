/**
 * Fishing — the hinge is the reel.
 *
 * Hold the Duo like a book: the left page is the rod, the right page the lake
 * in cross-section. Flick on the rod page to cast and the lure flies over the
 * fold into the water. When something bites, reel by working the hinge back
 * and forth — every degree the halves move winds in line. Reel too hard and
 * the tension snaps it; too slowly and the fish runs off with it.
 *
 * On a desktop the hinge is a slider, and a flat phone has no hinge to work,
 * so the rod page also has a crank you can wind in circles. Both reel the
 * same line. The hinge is input here, never layout (HIG checklist §9).
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, note, now, ready, tone } from "../lib/audio.ts";

type SpeciesId = "perchlet" | "zipfin" | "mudwhisker" | "ribbon" | "lantern";

interface Species {
  id: SpeciesId;
  name: string;
  body: string;
  belly: string;
  fin: string;
  /** Length on screen, px. */
  size: number;
  /** Preferred depth, 0 surface – 1 bed. */
  depth: number;
  rarity: number;
  /** How hard it pulls at time t, 0..1. */
  pull: (t: number) => number;
  /** Metres per second it takes at full pull. */
  speed: number;
  /** Reel speed (m/s) that, alone, would take the line to breaking point. */
  maxReel: number;
  weight: [number, number];
  fight: string;
}

const SPECIES: Record<SpeciesId, Species> = {
  perchlet: {
    id: "perchlet", name: "Sunny perchlet", body: "#f2b13b", belly: "#ffe7a3", fin: "#e06a2c", size: 30, depth: 0.3, rarity: 5,
    pull: (t) => 0.32 + 0.1 * Math.sin(t * 2), speed: 1.1, maxReel: 3.6, weight: [0.1, 0.5], fight: "steady and gentle",
  },
  zipfin: {
    id: "zipfin", name: "Striped zipfin", body: "#5fb7d8", belly: "#dff6ff", fin: "#2a6f9a", size: 40, depth: 0.45, rarity: 3,
    pull: (t) => (Math.sin(t * 1.4) > 0.55 ? 0.95 : 0.22), speed: 2.3, maxReel: 3.0, weight: [0.4, 1.6], fight: "sudden runs",
  },
  mudwhisker: {
    id: "mudwhisker", name: "Mudwhisker", body: "#7d6a4f", belly: "#c9b78f", fin: "#4f4130", size: 54, depth: 0.82, rarity: 2,
    pull: (t) => 0.62 + 0.14 * Math.sin(t * 0.7), speed: 1.2, maxReel: 2.3, weight: [1.5, 6], fight: "a heavy, constant drag",
  },
  ribbon: {
    id: "ribbon", name: "Ribbon eel", body: "#8a7fd6", belly: "#d9d3ff", fin: "#5a4fb0", size: 56, depth: 0.65, rarity: 2,
    pull: (t) => 0.5 + 0.42 * Math.sin(t * 3.4), speed: 1.7, maxReel: 2.8, weight: [0.3, 1.2], fight: "a zigzag thrash",
  },
  lantern: {
    id: "lantern", name: "Lantern pike", body: "#2f5d58", belly: "#9fe0c8", fin: "#ffd66b", size: 66, depth: 0.55, rarity: 0.8,
    pull: (t) => 0.5 + (Math.sin(t * 0.9) > 0.3 ? 0.42 : 0), speed: 2.6, maxReel: 2.4, weight: [3, 9], fight: "long, strong surges",
  },
};
const SPECIES_LIST = Object.values(SPECIES);

type Phase = "ready" | "flying" | "waiting" | "hooked" | "landed" | "snapped" | "lost";

interface Swimmer {
  sp: Species;
  x: number; // 0..1 across the lake
  y: number; // 0..1 depth
  dir: 1 | -1;
  speed: number;
  phase: number;
  /** Heading for the lure. */
  chasing?: boolean;
}

interface Catch {
  sp: SpeciesId;
  kg: number;
  at: number;
}

const MAX_DIST = 40; // metres shown across the lake
const CRANK_M_PER_REV = 1.0;
const HINGE_M_PER_DEG = 0.025;

const CSS = `
.fi { position:absolute; inset:0; overflow:hidden; color:#eaf6ff; font:12px/1.3 system-ui,-apple-system,sans-serif; }
.fi canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
.fi-rod { display:flex; box-sizing:border-box; gap:8px; background: linear-gradient(180deg, #24321f, #142012); }
.fi-rod.col { flex-direction:column; padding:10px 22px 12px 12px; }
.fi-rod.row { flex-direction:row; padding:22px 12px 10px 12px; }
.fi-main { flex:1; display:flex; flex-direction:column; gap:8px; min-width:0; min-height:0; }
.fi-head { display:flex; flex-direction:column; gap:5px; }
.fi-kicker { font:800 9px/1 system-ui; letter-spacing:.18em; text-transform:uppercase; color:#a9d18e; }
.fi-msg { font:700 14px/1.2 system-ui; min-height:17px; }
.fi-meter { position:relative; height:10px; border-radius:6px; background: linear-gradient(90deg, #2f6d3a 0 55%, #b8932b 55% 82%, #a53a2a 82%); box-shadow: inset 0 0 0 1px rgb(255 255 255 / .15); overflow:hidden; }
.fi-meter i { position:absolute; top:-2px; bottom:-2px; width:4px; margin-left:-2px; border-radius:2px; background:#fff; box-shadow:0 0 6px #fff; }
.fi-meters { display:grid; grid-template-columns:auto 1fr auto; gap:4px 8px; align-items:center; font-size:10px; color:#c6dcbc; }
.fi-meters b { font-variant-numeric:tabular-nums; color:#fff; font-size:11px; }
.fi-cast { position:relative; flex:1; min-height:70px; border-radius:14px; background: radial-gradient(120% 100% at 0% 100%, rgb(255 255 255 / .07), transparent 60%); box-shadow: inset 0 0 0 1px rgb(255 255 255 / .1); touch-action:none; cursor:grab; overflow:hidden; }
.fi-cast > * { pointer-events:none; }
.fi-cast svg { position:absolute; inset:0; width:100%; height:100%; }
.fi-cast .hint { position:absolute; left:10px; right:10px; bottom:8px; font-size:10.5px; color:#c6dcbc; text-align:center; }
.fi-cast.hot { box-shadow: inset 0 0 0 2px #ffd66b; }
.fi-reel { position:relative; flex:none; display:flex; flex-direction:column; align-items:center; gap:4px; }
.fi-crank { position:relative; width:118px; height:118px; border-radius:50%; touch-action:none; cursor:grab; background: radial-gradient(circle at 40% 35%, #8c99a3, #46525b 60%, #2a3238); box-shadow: 0 4px 12px rgb(0 0 0 / .5), inset 0 0 0 4px #1d2328; }
.fi-crank > * { pointer-events:none; }
.fi-crank svg { position:absolute; inset:0; width:100%; height:100%; }
.fi-crank.live { box-shadow: 0 0 0 3px #ffd66b, 0 4px 12px rgb(0 0 0 / .5), inset 0 0 0 4px #1d2328; }
.fi-reel small { font-size:9.5px; color:#c6dcbc; text-align:center; max-width:140px; line-height:1.25; }
.fi-card { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:rgb(8 24 36 / .82); border-radius:16px; padding:12px 16px; text-align:center; box-shadow:0 8px 24px rgb(0 0 0 / .4); display:flex; flex-direction:column; align-items:center; gap:4px; pointer-events:none; min-width:150px; }
.fi-card b { font:800 16px/1.1 system-ui; }
.fi-card span { font-size:11px; color:#b9d4e6; }
.fi-card canvas { position:relative; width:110px; height:46px; }
.fi-log { position:absolute; inset:0; box-sizing:border-box; display:flex; flex-direction:column; gap:8px; padding:14px; background: linear-gradient(180deg, #13283a, #0a1622); }
.fi-log.wide { flex-direction:row; padding:12px 14px 12px 12px; }
.fi-tank { position:relative; flex:none; border-radius:12px; overflow:hidden; box-shadow: inset 0 0 0 3px #4b6b80, 0 4px 14px rgb(0 0 0 / .4); }
.fi-list { flex:1; min-height:0; overflow:auto; display:flex; flex-direction:column; gap:3px; }
.fi-list table { width:100%; border-collapse:collapse; font-size:11px; }
.fi-list td, .fi-list th { padding:4px 6px; text-align:left; white-space:nowrap; }
.fi-list th { font:800 9px/1 system-ui; letter-spacing:.14em; text-transform:uppercase; color:#7fa7c4; }
.fi-list tr:nth-child(even) td { background:rgb(255 255 255 / .04); }
.fi-list td.n { text-align:right; font-variant-numeric:tabular-nums; }
.fi-list i { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; }
.fi-empty { color:#9fb7c9; font-size:11.5px; padding:6px 2px; }
.fi-title { font:800 18px/1.1 system-ui; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let current = initial;
  let phase: Phase = "ready";
  let dist = 0; // metres of line out
  let castDist = 0;
  let flyT = 0;
  let lureDepth = 0; // 0..1
  let targetDepth = 0.5;
  let hooked: Species | null = null;
  let fightT = 0;
  let tension = 0;
  let reelVel = 0;
  let pendingReel = 0;
  let biteIn = 0;
  let message = "Flick toward the lake to cast";
  let lastCatch: Catch | null = null;
  const catches: Catch[] = [];
  let lastHinge = initial.hinge;
  let crankAngle = 0;
  let clickAcc = 0;
  let splashT = -1;
  let clock = 0;
  const swimmers: Swimmer[] = [];
  for (let k = 0; k < 6; k++) swimmers.push(spawn());
  const tank: { sp: Species; x: number; y: number; dir: 1 | -1; phase: number }[] = [];

  // --- render-time references, rebuilt on each render ---
  let lake: HTMLCanvasElement | null = null;
  let aquarium: HTMLCanvasElement | null = null;
  let tensionEl: HTMLElement | null = null;
  let lineEl: HTMLElement | null = null;
  let msgEl: HTMLElement | null = null;
  let crankEl: HTMLElement | null = null;
  let castEl: HTMLElement | null = null;
  let cardEl: HTMLElement | null = null;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  function pickSpecies(): Species {
    const total = SPECIES_LIST.reduce((n, s) => n + s.rarity, 0);
    let r = Math.random() * total;
    for (const s of SPECIES_LIST) if ((r -= s.rarity) <= 0) return s;
    return SPECIES.perchlet;
  }

  function spawn(): Swimmer {
    const sp = pickSpecies();
    return {
      sp,
      x: Math.random(),
      y: Math.min(0.92, Math.max(0.12, sp.depth + (Math.random() - 0.5) * 0.3)),
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: 0.03 + Math.random() * 0.04,
      phase: Math.random() * 6,
    };
  }

  const sound = (fn: () => void) => ready().then(fn).catch(() => {});
  const lureX = () => 0.06 + 0.88 * Math.min(1, dist / MAX_DIST);

  // ---------- input ----------

  function cast(power: number): void {
    if (phase === "flying" || phase === "hooked") return;
    if (power < 0.08) {
      message = "Flick faster, toward the lake";
      return;
    }
    castDist = 8 + power * 28;
    dist = castDist;
    flyT = 0;
    lureDepth = 0;
    targetDepth = 0.3 + Math.random() * 0.5;
    hooked = null;
    tension = 0;
    reelVel = 0;
    pendingReel = 0;
    phase = "flying";
    message = `Cast ${castDist.toFixed(1)} m…`;
    sound(() => burst(0.35, 0.35, 1400, 0.4, undefined, "highpass"));
    render(current);
  }

  /** Line wound in, from the hinge or the crank. */
  function reel(m: number): void {
    if (phase !== "hooked" && phase !== "waiting") return;
    pendingReel += m;
    clickAcc += m;
    if (clickAcc > 0.12) {
      clickAcc = 0;
      sound(() => burst(0.012, 0.12, 4200, 2));
    }
  }

  function bindCast(el: HTMLElement): void {
    let samples: { x: number; y: number; t: number }[] = [];
    el.addEventListener("pointerdown", (e) => {
      sound(() => {});
      el.setPointerCapture(e.pointerId);
      samples = [{ x: e.offsetX, y: e.offsetY, t: e.timeStamp }];
      el.classList.add("hot");
    });
    el.addEventListener("pointermove", (e) => {
      if (!samples.length) return;
      samples.push({ x: e.offsetX, y: e.offsetY, t: e.timeStamp });
      if (samples.length > 24) samples.shift();
    });
    const end = (e: PointerEvent) => {
      if (!samples.length) return;
      samples.push({ x: e.offsetX, y: e.offsetY, t: e.timeStamp });
      el.classList.remove("hot");
      const last = samples[samples.length - 1]!;
      let first = samples.find((s) => last.t - s.t <= 120) ?? samples[0]!;
      if (first === last) first = samples[Math.max(0, samples.length - 2)]!;
      const dt = Math.max(16, last.t - first.t) / 1000;
      // Toward the lake: right when it is beside the rod, up when it stands above.
      const toward = current.pose.split === "stacked" || current.pose.display === "outer" ? first.y - last.y : last.x - first.x;
      samples = [];
      cast(Math.min(1, Math.max(0, toward / dt / 1400)));
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", () => {
      samples = [];
      el.classList.remove("hot");
    });
  }

  function bindCrank(el: HTMLElement): void {
    let prev: number | null = null;
    const angle = (e: PointerEvent) => Math.atan2(e.offsetY - el.clientHeight / 2, e.offsetX - el.clientWidth / 2);
    el.addEventListener("pointerdown", (e) => {
      sound(() => {});
      el.setPointerCapture(e.pointerId);
      prev = angle(e);
    });
    el.addEventListener("pointermove", (e) => {
      if (prev === null) return;
      const a = angle(e);
      let d = a - prev;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      prev = a;
      crankAngle += d;
      reel((Math.abs(d) / (Math.PI * 2)) * CRANK_M_PER_REV);
      drawCrank();
    });
    const up = () => (prev = null);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  // ---------- simulation ----------

  function tick(dt: number): void {
    clock += dt;
    for (const s of swimmers) {
      if (s.chasing) continue;
      s.x += s.dir * s.speed * dt;
      s.phase += dt * 3;
      if (s.x < -0.1 || s.x > 1.1) s.dir = (s.dir * -1) as 1 | -1;
    }
    for (const f of tank) {
      f.x += f.dir * 0.05 * dt;
      f.phase += dt * 3;
      if (f.x < 0.08 || f.x > 0.92) f.dir = (f.dir * -1) as 1 | -1;
    }

    if (phase === "flying") {
      flyT += dt / 0.8;
      if (flyT >= 1) {
        phase = "waiting";
        splashT = clock;
        biteIn = 1.5 + Math.random() * 4;
        message = "Wait for a bite…";
        sound(() => burst(0.25, 0.4, 900, 0.5));
        syncCard();
      }
    } else if (phase === "waiting") {
      lureDepth += (targetDepth - lureDepth) * Math.min(1, dt * 1.2);
      // Winding while you wait drags the lure home.
      dist = Math.max(0, dist - pendingReel);
      pendingReel = 0;
      if (dist <= 0.5) {
        phase = "ready";
        message = "Reeled in empty. Cast again";
        syncCard();
      }
      biteIn -= dt;
      const lx = lureX();
      let chaser = swimmers.find((s) => s.chasing);
      if (!chaser && biteIn < 1.4) {
        chaser = swimmers.reduce((a, b) => (Math.abs(a.y - lureDepth) < Math.abs(b.y - lureDepth) ? a : b));
        chaser.chasing = true;
      }
      if (chaser) {
        chaser.dir = lx > chaser.x ? 1 : -1;
        chaser.x += (lx - chaser.x) * Math.min(1, dt * 1.6);
        chaser.y += (lureDepth - chaser.y) * Math.min(1, dt * 1.6);
        chaser.phase += dt * 6;
        if (biteIn <= 0) {
          hooked = chaser.sp;
          swimmers.splice(swimmers.indexOf(chaser), 1);
          swimmers.push(spawn());
          phase = "hooked";
          fightT = 0;
          tension = 0.3;
          message = "Fish on! Reel!";
          sound(() => {
            note(76, 0.08, 0.25, "square");
            note(83, 0.12, 0.25, "square", now() + 0.09);
          });
        }
      }
    } else if (phase === "hooked" && hooked) {
      fightT += dt;
      const reeled = pendingReel;
      pendingReel = 0;
      reelVel += (reeled / dt - reelVel) * Math.min(1, dt * 5);
      const p = Math.max(0, Math.min(1, hooked.pull(fightT)));
      const target = p * 0.55 + (reelVel / hooked.maxReel) * 0.6;
      tension += (target - tension) * Math.min(1, dt * 2.5);
      // A taut line is drag: the harder you hold it, the slower the fish takes line.
      dist += p * hooked.speed * dt * (1 - 0.5 * Math.min(1, tension)) - reeled;
      lureDepth += (hooked.depth + Math.sin(fightT * 2.3) * 0.12 - lureDepth) * Math.min(1, dt * 2);
      if (tension >= 1) {
        phase = "snapped";
        message = `Snap! The ${hooked.name.toLowerCase()} broke the line`;
        sound(() => {
          burst(0.08, 0.9, 5000, 1.5);
          tone(1800, 200, 0.2, 0.3, "sawtooth");
        });
        syncCard();
      } else if (dist >= Math.min(MAX_DIST, castDist + 10)) {
        phase = "lost";
        message = `It got away — reel faster`;
        sound(() => tone(400, 150, 0.4, 0.2, "triangle"));
        syncCard();
      } else if (dist <= 0.6) {
        const [lo, hi] = hooked.weight;
        const c: Catch = { sp: hooked.id, kg: Math.round((lo + Math.random() * (hi - lo)) * 100) / 100, at: Date.now() };
        catches.unshift(c);
        lastCatch = c;
        tank.push({ sp: hooked, x: 0.2 + Math.random() * 0.6, y: 0.25 + Math.random() * 0.5, dir: 1, phase: 0 });
        if (tank.length > 10) tank.shift();
        phase = "landed";
        dist = 0;
        tension = 0;
        message = "Landed! Flick to cast again";
        sound(() => [72, 76, 79, 84].forEach((m, i) => note(m, 0.14, 0.2, "triangle", now() + i * 0.09)));
        render(current);
      } else {
        message = tension > 0.82 ? "Easy! The line's straining" : dist > castDist + 4 ? "It's running — reel faster" : "Reel!";
      }
    } else {
      pendingReel = 0;
      tension *= Math.exp(-dt * 3);
      reelVel = 0;
    }
  }

  // ---------- drawing ----------

  function drawFish(ctx: CanvasRenderingContext2D, sp: Species, x: number, y: number, dir: number, wiggle: number, scale = 1): void {
    const L = sp.size * scale;
    const H = sp.id === "ribbon" ? L * 0.2 : sp.id === "mudwhisker" ? L * 0.34 : L * 0.42;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const tail = Math.sin(wiggle) * 0.25;
    // tail
    ctx.fillStyle = sp.fin;
    ctx.beginPath();
    ctx.moveTo(-L * 0.4, 0);
    ctx.lineTo(-L * 0.62, -H * 0.55 + tail * H);
    ctx.lineTo(-L * 0.62, H * 0.55 + tail * H);
    ctx.closePath();
    ctx.fill();
    if (sp.id === "ribbon") {
      ctx.strokeStyle = sp.body;
      ctx.lineWidth = H;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const px = -L * 0.45 + (k / 10) * L * 0.9;
        const py = Math.sin(wiggle + k * 0.7) * H * 0.5;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(L * 0.38, Math.sin(wiggle + 7) * H * 0.5 - 1, 1.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    // dorsal fin
    ctx.beginPath();
    ctx.moveTo(-L * 0.15, -H * 0.4);
    ctx.quadraticCurveTo(0, -H * 0.95, L * 0.15, -H * 0.42);
    ctx.fill();
    // body
    const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
    g.addColorStop(0, sp.body);
    g.addColorStop(1, sp.belly);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, L * 0.45, H / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // markings
    ctx.save();
    ctx.clip();
    if (sp.id === "zipfin") {
      ctx.fillStyle = "rgb(20 60 90 / .55)";
      for (let k = -2; k <= 2; k++) ctx.fillRect(k * L * 0.14 - 2, -H, 4 * scale, H * 2);
    } else if (sp.id === "perchlet") {
      ctx.fillStyle = "rgb(224 106 44 / .6)";
      for (let k = -1; k <= 1; k++) ctx.fillRect(k * L * 0.18 - 3, -H, 6 * scale, H * 0.8);
    } else if (sp.id === "lantern") {
      ctx.fillStyle = "#ffe9a0";
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.arc(-L * 0.3 + k * L * 0.12, (k % 2 ? -1 : 1) * H * 0.12, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sp.id === "mudwhisker") {
      ctx.fillStyle = "rgb(40 30 20 / .35)";
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.arc(-L * 0.3 + k * L * 0.1, -H * 0.15 + (k % 3) * 3, 2.4 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(L * 0.28, -H * 0.1, Math.max(2, H * 0.14), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(L * 0.3, -H * 0.1, Math.max(1.2, H * 0.08), 0, Math.PI * 2);
    ctx.fill();
    if (sp.id === "mudwhisker") {
      ctx.strokeStyle = sp.fin;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(L * 0.42, H * 0.05);
      ctx.quadraticCurveTo(L * 0.6, H * 0.2 + Math.sin(wiggle) * 3, L * 0.62, H * 0.5);
      ctx.moveTo(L * 0.42, H * 0.1);
      ctx.quadraticCurveTo(L * 0.52, H * 0.4, L * 0.48, H * 0.7);
      ctx.stroke();
    }
    if (sp.id === "lantern") {
      ctx.strokeStyle = sp.fin;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(L * 0.2, -H * 0.45);
      ctx.quadraticCurveTo(L * 0.45, -H * 1.1, L * 0.55, -H * 0.7);
      ctx.stroke();
      ctx.fillStyle = "#ffe48a";
      ctx.shadowColor = "#ffd66b";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(L * 0.55, -H * 0.7, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function fit(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawLake(c: HTMLCanvasElement): void {
    const ctx = fit(c);
    if (!ctx) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const top = Math.round(h * 0.24);
    const bed = h - 26;
    const t = clock;
    // sky
    let g = ctx.createLinearGradient(0, 0, 0, top);
    g.addColorStop(0, "#ffd9a8");
    g.addColorStop(1, "#bfe3f0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, top);
    ctx.fillStyle = "#fff3c9";
    ctx.beginPath();
    ctx.arc(w * 0.78, top * 0.42, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6f9a6a";
    ctx.beginPath();
    ctx.moveTo(0, top);
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, top - 10 - Math.sin(x * 0.03) * 6 - Math.sin(x * 0.011) * 8);
    ctx.lineTo(w + 20, top);
    ctx.fill();
    // water
    g = ctx.createLinearGradient(0, top, 0, h);
    g.addColorStop(0, "#3c8fb3");
    g.addColorStop(0.6, "#1d5a7a");
    g.addColorStop(1, "#103a52");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, top);
    for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, top + Math.sin(x * 0.06 + t * 2) * 1.6);
    ctx.lineTo(w + 8, h);
    ctx.lineTo(0, h);
    ctx.fill();
    // light shafts
    ctx.fillStyle = "rgb(255 255 255 / .05)";
    for (let k = 0; k < 4; k++) {
      const x0 = ((k * 0.27 + 0.1) * w + Math.sin(t * 0.3 + k) * 10) | 0;
      ctx.beginPath();
      ctx.moveTo(x0, top);
      ctx.lineTo(x0 + 28, top);
      ctx.lineTo(x0 + 70, bed);
      ctx.lineTo(x0 + 20, bed);
      ctx.fill();
    }
    // bed and weeds
    ctx.fillStyle = "#c2a56b";
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 16; x += 16) ctx.lineTo(x, bed + Math.sin(x * 0.05) * 4);
    ctx.lineTo(w + 16, h);
    ctx.fill();
    ctx.strokeStyle = "#3f7d4a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let k = 0; k < 9; k++) {
      const x = (k * 0.113 + 0.04) * w;
      const len = 40 + ((k * 37) % 50);
      ctx.beginPath();
      ctx.moveTo(x, bed + 2);
      ctx.quadraticCurveTo(x + Math.sin(t * 1.2 + k) * 10, bed - len / 2, x + Math.sin(t * 1.2 + k + 1) * 14, bed - len);
      ctx.stroke();
    }
    ctx.fillStyle = "#8d7a55";
    for (let k = 0; k < 12; k++) {
      ctx.beginPath();
      ctx.ellipse(((k * 71) % 97) / 97 * w, bed + 8 + (k % 3) * 4, 4 + (k % 4), 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const Y = (d: number) => top + 8 + d * (bed - top - 22);
    const X = (x: number) => x * w;
    for (const s of swimmers) drawFish(ctx, s.sp, X(s.x), Y(s.y), s.dir, s.phase, 0.9);

    // line and lure
    const ox = 0;
    const oy = top - 34;
    if (phase === "flying" || phase === "waiting" || phase === "hooked") {
      const lx = X(lureX());
      let px: number;
      let py: number;
      if (phase === "flying") {
        px = ox + (lx - ox) * flyT;
        py = oy + (top - oy) * flyT - Math.sin(flyT * Math.PI) * top * 0.9;
      } else {
        px = lx + (phase === "hooked" ? Math.sin(fightT * 7) * 3 : 0);
        py = Y(lureDepth) + Math.sin(t * 2) * 1.5;
      }
      const taut = phase === "hooked" ? tension : 0.15;
      ctx.strokeStyle = phase === "hooked" && tension > 0.82 ? "#ff8a7a" : "rgb(255 255 255 / .85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      const sag = (1 - Math.min(1, taut)) * 40;
      ctx.quadraticCurveTo((ox + px) / 2, Math.max(oy, py) + sag - (phase === "flying" ? 40 : 0), px, py);
      ctx.stroke();
      if (phase === "hooked" && hooked) {
        drawFish(ctx, hooked, px + hooked.size * 0.42, py, 1, fightT * 14, 1);
        ctx.strokeStyle = "rgb(255 255 255 / .5)";
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(px + Math.sin(fightT * 5 + k) * 20, top + 2, 4 + ((fightT * 20 + k * 6) % 14), Math.PI, 0);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "#ff5a3c";
        ctx.beginPath();
        ctx.ellipse(px, py, 5, 3.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffe36b";
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
    }
    if (splashT >= 0 && clock - splashT < 0.9) {
      const k = (clock - splashT) / 0.9;
      ctx.strokeStyle = `rgb(255 255 255 / ${1 - k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(X(lureX()), top + 1, 6 + k * 30, 2 + k * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // distance ruler
    ctx.fillStyle = "rgb(255 255 255 / .55)";
    ctx.font = "600 9px system-ui";
    for (const m of [10, 20, 30]) {
      const x = X(0.06 + 0.88 * (m / MAX_DIST));
      ctx.fillRect(x, bed + 14, 1, 5);
      ctx.fillText(`${m} m`, x + 3, bed + 20);
    }
  }

  function drawTank(c: HTMLCanvasElement): void {
    const ctx = fit(c);
    if (!ctx) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#5ab3d6");
    g.addColorStop(1, "#1d5a7a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c2a56b";
    ctx.fillRect(0, h - 10, w, 10);
    ctx.strokeStyle = "#3f7d4a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const x of [0.12, 0.85, 0.9]) {
      ctx.beginPath();
      ctx.moveTo(x * w, h - 8);
      ctx.quadraticCurveTo(x * w + Math.sin(clock + x * 9) * 6, h - 30, x * w + Math.sin(clock + x * 9 + 1) * 8, h - 52);
      ctx.stroke();
    }
    ctx.fillStyle = "rgb(255 255 255 / .5)";
    for (let k = 0; k < 5; k++) {
      const y = h - ((clock * 30 + k * 37) % h);
      ctx.beginPath();
      ctx.arc(w * 0.82 + Math.sin(y * 0.1) * 3, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const scale = Math.min(1, h / 140);
    for (const f of tank) drawFish(ctx, f.sp, f.x * w, 12 + f.y * (h - 34), f.dir, f.phase, 0.7 * scale);
    if (!tank.length) {
      ctx.fillStyle = "rgb(255 255 255 / .75)";
      ctx.font = "600 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Your aquarium is empty", w / 2, h / 2);
      ctx.textAlign = "start";
    }
  }

  function drawCrank(): void {
    const handle = crankEl?.querySelector<SVGGElement>(".arm");
    if (handle) handle.setAttribute("transform", `rotate(${(crankAngle * 180) / Math.PI} 60 60)`);
  }

  function updateHud(): void {
    if (tensionEl) tensionEl.style.left = `${Math.min(100, Math.max(0, tension * 100))}%`;
    if (lineEl) lineEl.textContent = phase === "hooked" || phase === "waiting" || phase === "flying" ? `${dist.toFixed(1)} m` : "—";
    if (msgEl && msgEl.textContent !== message) msgEl.textContent = message;
    crankEl?.classList.toggle("live", phase === "hooked");
    if (castEl) {
      const hint = castEl.querySelector(".hint");
      const want = phase === "hooked" ? "Fish on — reel it in" : phase === "waiting" ? "Flick again to recast" : castHint();
      if (hint && hint.textContent !== want) hint.textContent = want;
    }
  }

  let raf = 0;
  let last = 0;
  function loop(ts: number): void {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    tick(dt);
    if (lake?.isConnected) drawLake(lake);
    if (aquarium?.isConnected) drawTank(aquarium);
    updateHud();
  }
  raf = requestAnimationFrame(loop);

  // ---------- layout ----------

  const castHint = () => (current.pose.split === "stacked" ? "Flick up toward the lake to cast ↑" : "Flick right toward the lake to cast →");

  function reelHint(): string {
    if (current.pose.adjustable) return "Reel: swing the hinge back and forth (the slider, on a desktop) — or crank this in circles";
    return "Reel: crank in circles. Fold into book or table to reel with the hinge";
  }

  function rodHalf(layout: "col" | "row"): HTMLElement {
    const root = document.createElement("div");
    root.className = `fi fi-rod ${layout}`;
    const main = document.createElement("div");
    main.className = "fi-main";
    const best = catches.reduce<Catch | null>((b, c) => (!b || c.kg > b.kg ? c : b), null);
    main.innerHTML = `
      <div class="fi-head">
        <span class="fi-kicker">${catches.length ? `${catches.length} caught · best ${best!.kg} kg ${SPECIES[best!.sp].name.toLowerCase()}` : "Rod &amp; reel"}</span>
        <div class="fi-msg"></div>
        <div class="fi-meters">
          <span>Tension</span><div class="fi-meter"><i></i></div><b></b>
        </div>
      </div>`;
    msgEl = main.querySelector(".fi-msg");
    tensionEl = main.querySelector(".fi-meter i");
    lineEl = main.querySelector(".fi-meters b");
    const castPad = document.createElement("div");
    castPad.className = "fi-cast";
    castPad.setAttribute("aria-label", "Casting area: flick toward the lake");
    // The rod, drawn from the near corner toward the lake.
    const up = layout === "row";
    castPad.innerHTML = up
      ? `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><line x1="40" y1="118" x2="150" y2="6" stroke="#6b4a2a" stroke-width="5" stroke-linecap="round"/><line x1="95" y1="62" x2="150" y2="6" stroke="#2d2d2d" stroke-width="2.4" stroke-linecap="round"/><circle cx="62" cy="96" r="8" fill="#9aa6af"/><path d="M150 6 Q160 40 168 2" stroke="#fff" stroke-opacity=".6" fill="none"/></svg><div class="hint"></div>`
      : `<svg viewBox="0 0 120 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><line x1="8" y1="190" x2="112" y2="30" stroke="#6b4a2a" stroke-width="5" stroke-linecap="round"/><line x1="60" y1="110" x2="112" y2="30" stroke="#2d2d2d" stroke-width="2.4" stroke-linecap="round"/><circle cx="30" cy="156" r="8" fill="#9aa6af"/><path d="M112 30 Q118 60 120 40" stroke="#fff" stroke-opacity=".6" fill="none"/></svg><div class="hint"></div>`;
    castEl = castPad;
    bindCast(castPad);
    main.append(castPad);

    const reelBox = document.createElement("div");
    reelBox.className = "fi-reel";
    const crank = document.createElement("div");
    crank.className = "fi-crank";
    crank.setAttribute("aria-label", "Reel crank: drag in circles to reel in");
    crank.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="44" fill="none" stroke="#1d2328" stroke-width="2" stroke-dasharray="3 6"/>
      <g class="arm"><rect x="56" y="18" width="8" height="44" rx="4" fill="#d9dee2"/><circle cx="60" cy="20" r="12" fill="#e0b04a" stroke="#7a5a1a" stroke-width="2"/></g>
      <circle cx="60" cy="60" r="10" fill="#d9dee2" stroke="#46525b" stroke-width="2"/></svg>`;
    crankEl = crank;
    bindCrank(crank);
    drawCrank();
    reelBox.append(crank);
    reelBox.insertAdjacentHTML("beforeend", `<small>${reelHint()}</small>`);
    root.append(main, reelBox);
    return root;
  }

  function lakeHalf(): HTMLElement {
    const root = document.createElement("div");
    root.className = "fi";
    lake = document.createElement("canvas");
    lake.setAttribute("aria-label", "The lake, in cross-section");
    root.append(lake);
    cardEl = document.createElement("div");
    cardEl.className = "fi-card";
    root.append(cardEl);
    syncCard();
    return root;
  }

  /** The result card over the lake after a catch, a snap or an escape. */
  function syncCard(): void {
    if (!cardEl) return;
    const show = phase === "landed" || phase === "snapped" || phase === "lost";
    cardEl.hidden = !show;
    cardEl.style.display = show ? "" : "none";
    if (!show) return;
    if (phase === "landed" && lastCatch) {
      const sp = SPECIES[lastCatch.sp];
      cardEl.innerHTML = `<span>Caught!</span><canvas></canvas><b>${sp.name}</b><span>${lastCatch.kg} kg · fights with ${sp.fight}</span>`;
      const c = cardEl.querySelector("canvas")!;
      requestAnimationFrame(() => {
        const ctx = fit(c);
        if (ctx) drawFish(ctx, sp, c.clientWidth / 2 + 6, c.clientHeight / 2 + 4, 1, 0, Math.min(1.4, 90 / sp.size));
      });
    } else if (phase === "snapped") {
      cardEl.innerHTML = `<b>Snap!</b><span>Too much tension — ease off when the meter goes red.</span>`;
    } else {
      cardEl.innerHTML = `<b>It got away</b><span>Too slow — keep reeling while it runs.</span>`;
    }
  }

  function logTable(limit: number): string {
    if (!catches.length) return `<div class="fi-empty">No catches yet. Open the phone, flick to cast, and reel with the hinge.</div>`;
    const rows = catches
      .slice(0, limit)
      .map((c) => {
        const sp = SPECIES[c.sp];
        const t = new Date(c.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        return `<tr><td><i style="background:${sp.body}"></i>${sp.name}</td><td class="n">${c.kg.toFixed(2)} kg</td><td class="n">${t}</td></tr>`;
      })
      .join("");
    return `<table><thead><tr><th>Species</th><th class="n">Weight</th><th class="n">Time</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function catchLog(wide: boolean): HTMLElement {
    const root = document.createElement("div");
    root.className = `fi fi-log${wide ? " wide" : ""}`;
    const tankBox = document.createElement("div");
    tankBox.className = "fi-tank";
    tankBox.style.cssText = wide ? "width:44%;align-self:stretch" : "height:120px";
    aquarium = document.createElement("canvas");
    aquarium.setAttribute("aria-label", "Aquarium of your catches");
    tankBox.append(aquarium);
    const side = document.createElement("div");
    side.style.cssText = "display:flex;flex-direction:column;gap:6px;flex:1;min-width:0;min-height:0";
    const total = catches.reduce((n, c) => n + c.kg, 0);
    side.innerHTML = `<span class="fi-kicker">Catch log</span>
      <div class="fi-title">${catches.length} fish · ${total.toFixed(2)} kg</div>
      <div class="fi-list">${logTable(wide ? 6 : 8)}</div>
      ${phase === "hooked" ? `<div class="fi-empty" style="color:#ffd66b">A fish is still on the line — open up to reel it in.</div>` : ""}`;
    if (wide) root.append(tankBox, side);
    else {
      root.append(side);
      side.insertBefore(tankBox, side.children[2]!);
    }
    return root;
  }

  function render(s: DuoState): void {
    current = s;
    lastHinge = s.hinge;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    lake = aquarium = null;
    tensionEl = lineEl = msgEl = crankEl = castEl = cardEl = null;
    if (pose.display === "outer") {
      screens.outer.append(catchLog(pose.id === "closed-landscape"));
      return;
    }
    if (pose.split === "stacked") {
      // Table: the lake stands up to be watched; rod and reel lie flat under your hands.
      screens.start.append(lakeHalf());
      screens.end.append(rodHalf("row"));
    } else {
      screens.start.append(rodHalf("col"));
      screens.end.append(lakeHalf());
    }
    updateHud();
  }

  return {
    render,
    hinge(s: DuoState) {
      current = s;
      const d = Math.abs(s.hinge - lastHinge);
      lastHinge = s.hinge;
      if (s.pose.adjustable && d > 0 && d < 60) {
        reel(d * HINGE_M_PER_DEG);
        crankAngle += (d * Math.PI) / 45;
        drawCrank();
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      style.remove();
    },
  };
}

export const fishingExample: Example = {
  id: "fishing",
  title: "Fishing",
  category: "games",
  summary:
    "The hinge is the reel. Flick on the rod page to cast across the fold into a lake drawn in cross-section; when a fish bites, work the hinge back and forth to wind in line — too hard snaps it, too slow and it runs. A crank on the rod page reels too, for desktops and flat phones.",
  bestPose: "book",
  poses: {
    closed: "Your catch log — species, weight and time — above a small aquarium where everything you've landed swims.",
    "closed-landscape": "The catch log laid out wide, with the aquarium beside it.",
    open: "Rod on the left, lake on the right; flat, there is no hinge to work, so you reel with the crank.",
    "open-portrait": "The lake on top and the rod below, lying flat; reel with the crank.",
    book: "Rod page left, lake page right: flick to cast over the fold, then open and close the book to reel — every degree the hinge moves winds in line.",
    table: "The lake stands up where you can watch the fight; rod, crank and tension meter lie flat under your hands, and rocking the top half reels.",
    stand: "Stood on its edge like the book layout: rod left, lake right, and the hinge still reels.",
  },
  principle:
    "The hinge is for interaction, never layout (HIG checklist §9): the change in angle is the reel, while the rod and lake keep their places for the pose — and in table pose the lake you watch stands up while the controls lie on the stable half (HIG checklist §6, 'Destination follows purpose').",
  create,
};
