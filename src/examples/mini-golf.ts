/**
 * Mini-golf — putt on the flat half, and the ball rolls up onto the standing
 * half where the hole is.
 *
 * One course is laid across both halves of the inner display in one shared
 * coordinate space; each half draws its own slice, so a ball that crosses the
 * fold leaves one screen and arrives on the other. In table pose the tee lies
 * flat under your hand and the green stands up in front of you, like the
 * ramp at the end of a real mini-golf lane.
 *
 * Holes are in course coordinates — `a` along the lane from the tee end (0)
 * to the green end (600), `c` across it (0–380) — so the ball keeps its exact
 * place whichever way the pose lays the lane out. The fold sits at a = 300;
 * no tee or cup is ever placed within its margin.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, note, now, ready, tone } from "../lib/audio.ts";

type P = [number, number];
interface Slope {
  r: [number, number, number, number]; // a0, c0, a1, c1
  f: P; // push, course units/s²
}
interface Course {
  name: string;
  par: number;
  /** Outline, closed. */
  bounds: P[];
  /** Extra walls: closed polygons (bumpers) or open polylines (baffles). */
  walls: { pts: P[]; closed: boolean }[];
  tee: P;
  cup: P;
  slopes: Slope[];
  water: [number, number, number, number][];
  windmill?: { at: P; r: number; w: number };
  mover?: { a: number; c0: number; c1: number; ha: number; hc: number; period: number };
  /** Course extent, for practice holes that are smaller than the lane. */
  size: P;
}

const LANE: P = [600, 380];
const FOLD = 300;

const rect = (a0: number, c0: number, a1: number, c1: number): P[] => [
  [a0, c0],
  [a1, c0],
  [a1, c1],
  [a0, c1],
];

const HOLES: Course[] = [
  {
    name: "First Putt", par: 2, size: LANE,
    bounds: rect(14, 100, 586, 280),
    walls: [{ pts: [[400, 190], [420, 168], [440, 190], [420, 212]], closed: true }],
    tee: [60, 190], cup: [530, 190], slopes: [], water: [],
  },
  {
    name: "Dogleg", par: 3, size: LANE,
    bounds: [[14, 20], [586, 20], [586, 360], [330, 360], [330, 160], [14, 160]],
    walls: [{ pts: [[470, 110], [470, 250]], closed: false }],
    tee: [60, 90], cup: [530, 310],
    slopes: [{ r: [330, 200, 586, 260], f: [-70, 0] }], water: [],
  },
  {
    name: "Windmill", par: 3, size: LANE,
    bounds: rect(14, 80, 586, 300),
    walls: [
      { pts: [[370, 80], [420, 158]], closed: false },
      { pts: [[370, 300], [420, 222]], closed: false },
    ],
    tee: [60, 190], cup: [535, 190], slopes: [], water: [],
    windmill: { at: [420, 190], r: 62, w: 1.3 },
  },
  {
    name: "The Pond", par: 3, size: LANE,
    bounds: rect(14, 30, 586, 350),
    walls: [{ pts: rect(250, 285, 262, 297), closed: true }],
    tee: [60, 300], cup: [520, 100], slopes: [],
    water: [[180, 30, 420, 245], [470, 190, 586, 235]],
  },
  {
    name: "Hill Climb", par: 3, size: LANE,
    bounds: rect(14, 100, 586, 280),
    walls: [{ pts: [[480, 100], [480, 160]], closed: false }],
    tee: [60, 190], cup: [530, 240],
    slopes: [
      { r: [230, 100, 400, 280], f: [-180, 0] },
      { r: [420, 100, 586, 190], f: [0, -90] },
    ],
    water: [],
  },
  {
    name: "Sliding Gate", par: 3, size: LANE,
    bounds: rect(14, 50, 586, 330),
    walls: [
      { pts: [[140, 50], [140, 215]], closed: false },
      { pts: [[225, 330], [225, 165]], closed: false },
    ],
    tee: [70, 110], cup: [535, 190], slopes: [], water: [],
    mover: { a: 450, c0: 95, c1: 285, ha: 10, hc: 42, period: 3.2 },
  },
];

/** The one small hole on the outer display. */
const PRACTICE: Course = {
  name: "Practice", par: 2, size: [280, 180],
  bounds: rect(10, 14, 270, 166),
  walls: [{ pts: [[150, 90], [162, 78], [174, 90], [162, 102]], closed: true }],
  tee: [40, 90], cup: [238, 90],
  slopes: [{ r: [90, 14, 130, 166], f: [0, 70] }],
  water: [],
};

const BALL_R = 5;
const CUP_R = 9;
const MAX_SPEED = 760;
const PULL = 130; // drag length for full power

interface Ball {
  a: number;
  c: number;
  va: number;
  vc: number;
  moving: boolean;
  sunk: boolean;
  /** Where the last shot was played from, for water. */
  from: P;
  still: number;
}

const newBall = (course: Course): Ball => ({ a: course.tee[0], c: course.tee[1], va: 0, vc: 0, moving: false, sunk: false, from: course.tee, still: 0 });

/** How a course maps onto a drawing surface. */
interface Mapping {
  toW: (a: number, c: number) => P;
  toC: (x: number, y: number) => P;
}
interface View {
  canvas: HTMLCanvasElement;
  course: () => Course;
  ball: () => Ball;
  map: Mapping;
  slice: [number, number, number, number];
  align: P;
  /** Last transform, for pointer → world. */
  s: number;
  ox: number;
  oy: number;
  practice: boolean;
}

const CSS = `
.mg { position:absolute; inset:0; overflow:hidden; background:#173a1c; color:#f2fff0; font:12px/1.3 system-ui,-apple-system,sans-serif; }
.mg canvas { position:absolute; inset:0; width:100%; height:100%; display:block; touch-action:none; cursor:crosshair; }
.mg-hud { position:absolute; pointer-events:none; display:flex; flex-direction:column; gap:3px; z-index:2; text-shadow:0 1px 2px rgb(0 0 0 / .6); }
.mg-kicker { font:800 9px/1 system-ui; letter-spacing:.18em; text-transform:uppercase; color:#bfe9b0; }
.mg-big { font:800 15px/1.1 system-ui; }
.mg-power { width:110px; height:7px; border-radius:4px; background:rgb(0 0 0 / .4); overflow:hidden; }
.mg-power i { display:block; height:100%; width:0; background:linear-gradient(90deg,#7be27b,#ffd23f 60%,#ff5a3c); }
.mg-card { position:absolute; pointer-events:none; z-index:2; background:rgb(10 30 14 / .72); border-radius:10px; padding:6px 8px; font-size:10px; }
.mg-card table { border-collapse:collapse; font-variant-numeric:tabular-nums; }
.mg-card td, .mg-card th { padding:1px 4px; text-align:center; }
.mg-card th { color:#9fd18e; font-weight:700; text-align:left; }
.mg-card td.now { box-shadow: inset 0 -2px 0 #ffd23f; }
.mg-card td.u { color:#7be27b; } .mg-card td.o { color:#ffb199; }
.mg-result { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); z-index:3; background:rgb(10 30 14 / .88); border-radius:16px; padding:14px 18px; text-align:center; display:flex; flex-direction:column; gap:6px; align-items:center; box-shadow:0 8px 24px rgb(0 0 0 / .45); }
.mg-result b { font:900 22px/1 system-ui; color:#ffd23f; }
.mg-btn { all:unset; cursor:pointer; padding:8px 16px; border-radius:999px; background:#ffd23f; color:#2a2300; font:800 13px/1 system-ui; }
.mg-btn:active { transform:scale(.97); }
.mg-closed { position:absolute; inset:0; display:flex; box-sizing:border-box; padding:12px; gap:10px; background:#173a1c; }
.mg-closed.col { flex-direction:column; }
.mg-closed .pane { position:relative; flex:1; border-radius:12px; overflow:hidden; min-height:0; }
.mg-closed .mg-card { position:static; background:rgb(0 0 0 / .25); }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let current = initial;
  let hole = 0;
  let scores: (number | null)[] = HOLES.map(() => null);
  let strokes = 0;
  let ball = newBall(HOLES[0]!);
  let practice = newBall(PRACTICE);
  let practiceStrokes = 0;
  let practiceBest: number | null = null;
  let clock = 0;
  let toast = "";
  let toastUntil = 0;
  let aim: { view: View; from: P; to: P } | null = null;

  let views: View[] = [];
  let powerEl: HTMLElement | null = null;
  let statusEl: HTMLElement | null = null;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const course = () => HOLES[hole]!;
  const sound = (fn: () => void) => ready().then(fn).catch(() => {});
  const total = () => scores.reduce<number>((n, s) => n + (s ?? 0), 0);
  const parSoFar = () => HOLES.reduce((n, h, i) => n + (scores[i] != null ? h.par : 0), 0);
  const roundOver = () => scores.every((s) => s != null);

  // ---------- geometry ----------

  function segments(cs: Course, t: number): { a: P; b: P; kick?: P }[] {
    const segs: { a: P; b: P; kick?: P }[] = [];
    const poly = (pts: P[], closed: boolean) => {
      for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) segs.push({ a: pts[i]!, b: pts[(i + 1) % pts.length]! });
    };
    poly(cs.bounds, true);
    for (const w of cs.walls) poly(w.pts, w.closed);
    if (cs.windmill) {
      const { at, r, w } = cs.windmill;
      for (let k = 0; k < 4; k++) {
        const th = t * w + (k * Math.PI) / 2;
        const d: P = [Math.cos(th), Math.sin(th)];
        segs.push({
          a: [at[0] + d[0] * 12, at[1] + d[1] * 12],
          b: [at[0] + d[0] * r, at[1] + d[1] * r],
          kick: [-d[1] * w * r * 0.6, d[0] * w * r * 0.6],
        });
      }
    }
    if (cs.mover) poly(moverRect(cs, t), true);
    return segs;
  }

  function moverRect(cs: Course, t: number): P[] {
    const m = cs.mover!;
    const c = m.c0 + (m.c1 - m.c0) * (0.5 - 0.5 * Math.cos((t / m.period) * Math.PI * 2));
    return rect(m.a - m.ha, c - m.hc, m.a + m.ha, c + m.hc);
  }

  const inRect = (r: [number, number, number, number], a: number, c: number) => a >= r[0] && a <= r[2] && c >= r[1] && c <= r[3];

  /** Advance one ball. Returns what happened, for sound and scoring. */
  function step(cs: Course, b: Ball, dt: number): "sunk" | "water" | null {
    if (!b.moving) return null;
    const speed0 = Math.hypot(b.va, b.vc);
    const n = Math.min(16, Math.ceil((speed0 * dt) / 2.5) + 1);
    const h = dt / n;
    let onSlope = false;
    for (let k = 0; k < n; k++) {
      const t = clock + k * h;
      onSlope = false;
      for (const s of cs.slopes) {
        if (inRect(s.r, b.a, b.c)) {
          b.va += s.f[0] * h;
          b.vc += s.f[1] * h;
          onSlope = true;
        }
      }
      const sp = Math.hypot(b.va, b.vc);
      if (sp > 0) {
        const dec = 48 + sp * 0.85;
        const ns = Math.max(0, sp - dec * h);
        b.va *= ns / sp;
        b.vc *= ns / sp;
      }
      b.a += b.va * h;
      b.c += b.vc * h;
      for (const seg of segments(cs, t)) {
        const [ax, ay] = seg.a;
        const [bx, by] = seg.b;
        const dx = bx - ax;
        const dy = by - ay;
        const L2 = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((b.a - ax) * dx + (b.c - ay) * dy) / L2));
        const qx = ax + u * dx;
        const qy = ay + u * dy;
        let nx = b.a - qx;
        let ny = b.c - qy;
        const d = Math.hypot(nx, ny);
        const R = BALL_R + 2;
        if (d < R) {
          if (d < 1e-6) {
            nx = -dy;
            ny = dx;
          }
          const nl = Math.hypot(nx, ny) || 1;
          nx /= nl;
          ny /= nl;
          b.a = qx + nx * R;
          b.c = qy + ny * R;
          const vn = b.va * nx + b.vc * ny;
          if (vn < 0) {
            b.va -= 1.72 * vn * nx;
            b.vc -= 1.72 * vn * ny;
            if (Math.abs(vn) > 60) sound(() => burst(0.03, Math.min(0.4, Math.abs(vn) / 900), 1800, 2));
          }
          if (seg.kick) {
            b.va += seg.kick[0] * 0.5;
            b.vc += seg.kick[1] * 0.5;
          }
        }
      }
      for (const w of cs.water) {
        if (inRect(w, b.a, b.c)) {
          b.a = b.from[0];
          b.c = b.from[1];
          b.va = b.vc = 0;
          b.moving = false;
          return "water";
        }
      }
      const da = cs.cup[0] - b.a;
      const dc = cs.cup[1] - b.c;
      const dcup = Math.hypot(da, dc);
      const v = Math.hypot(b.va, b.vc);
      if (dcup < CUP_R) {
        if (v < 330) {
          b.a = cs.cup[0];
          b.c = cs.cup[1];
          b.va = b.vc = 0;
          b.moving = false;
          b.sunk = true;
          return "sunk";
        }
        // Too fast: it lips out, bent toward the cup.
        b.va += da * 6 * h * 60;
        b.vc += dc * 6 * h * 60;
      } else if (dcup < CUP_R + 6 && v < 120) {
        b.va += (da / dcup) * 400 * h;
        b.vc += (dc / dcup) * 400 * h;
      }
    }
    const v = Math.hypot(b.va, b.vc);
    b.still = v < (onSlope ? 10 : 5) ? b.still + dt : 0;
    if (b.still > (onSlope ? 0.6 : 0.05)) {
      b.va = b.vc = 0;
      b.moving = false;
      b.still = 0;
    }
    return null;
  }

  // ---------- shots ----------

  function shoot(v: View, from: P, to: P): void {
    const [fa, fc] = v.map.toC(...from);
    const [ta, tc] = v.map.toC(...to);
    const da = fa - ta;
    const dc = fc - tc;
    const len = Math.hypot(da, dc);
    const power = Math.min(1, len / PULL);
    if (power < 0.04) return;
    const b = v.ball();
    b.from = [b.a, b.c];
    b.va = (da / len) * power * MAX_SPEED;
    b.vc = (dc / len) * power * MAX_SPEED;
    b.moving = true;
    b.still = 0;
    if (v.practice) practiceStrokes++;
    else strokes++;
    sound(() => {
      tone(320 + power * 200, 180, 0.08, 0.35, "triangle");
      burst(0.04, 0.3 * power + 0.1, 2400, 1.5);
    });
    refreshHud();
  }

  function sinkSound(): void {
    sound(() => {
      tone(500, 160, 0.12, 0.4, "sine");
      burst(0.08, 0.35, 700, 1);
      [76, 79, 84].forEach((m, i) => note(m, 0.16, 0.18, "triangle", now() + 0.18 + i * 0.1));
    });
  }

  function verdict(s: number, par: number): string {
    if (s === 1) return "Hole in one!";
    const d = s - par;
    return d <= -2 ? "Eagle!" : d === -1 ? "Birdie!" : d === 0 ? "Par" : d === 1 ? "Bogey" : `${d} over`;
  }

  function nextHole(): void {
    if (roundOver()) {
      scores = HOLES.map(() => null);
      hole = 0;
    } else hole = Math.min(HOLES.length - 1, hole + 1);
    strokes = 0;
    ball = newBall(course());
    render(current);
  }

  function say(msg: string): void {
    toast = msg;
    toastUntil = clock + 2;
    refreshHud();
  }

  // ---------- input ----------

  function bindView(v: View): void {
    const c = v.canvas;
    const world = (e: PointerEvent): P => [(e.offsetX - v.ox) / v.s + v.slice[0], (e.offsetY - v.oy) / v.s + v.slice[1]];
    c.addEventListener("pointerdown", (e) => {
      sound(() => {});
      const b = v.ball();
      if (b.moving || b.sunk) return;
      c.setPointerCapture(e.pointerId);
      const p = world(e);
      aim = { view: v, from: p, to: p };
    });
    c.addEventListener("pointermove", (e) => {
      if (aim?.view !== v) return;
      aim.to = world(e);
      refreshHud();
    });
    c.addEventListener("pointerup", (e) => {
      if (aim?.view !== v) return;
      aim.to = world(e);
      const a = aim;
      aim = null;
      shoot(v, a.from, a.to);
    });
    c.addEventListener("pointercancel", () => (aim = null));
  }

  // ---------- drawing ----------

  function fit(cv: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    return cv.getContext("2d");
  }

  function drawView(v: View): void {
    const ctx = fit(v.canvas);
    if (!ctx) return;
    const cw = v.canvas.clientWidth;
    const ch = v.canvas.clientHeight;
    const dpr = v.canvas.width / cw;
    const [sx, sy, sw, sh] = v.slice;
    v.s = Math.min(cw / sw, ch / sh);
    v.ox = (cw - sw * v.s) * v.align[0];
    v.oy = (ch - sh * v.s) * v.align[1];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#173a1c";
    ctx.fillRect(0, 0, v.canvas.width, v.canvas.height);
    ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * (v.ox - sx * v.s), dpr * (v.oy - sy * v.s));
    drawCourse(ctx, v.course(), v.map, v.ball(), aim?.view === v ? aim : null);
  }

  function drawCourse(ctx: CanvasRenderingContext2D, cs: Course, m: Mapping, b: Ball, aiming: { from: P; to: P } | null): void {
    const W = (p: P) => m.toW(p[0], p[1]);
    const path = (pts: P[], closed = true) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const [x, y] = W(p);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      if (closed) ctx.closePath();
    };
    const rectPts = (r: [number, number, number, number]) => rect(r[0], r[1], r[2], r[3]);
    // rough grass texture outside
    ctx.fillStyle = "#1d4722";
    for (let k = 0; k < 60; k++) {
      const [x, y] = W([((k * 97) % cs.size[0]) + 3, ((k * 61) % cs.size[1]) + 3]);
      ctx.fillRect(x, y, 2, 2);
    }
    // the green
    path(cs.bounds);
    ctx.save();
    ctx.fillStyle = "#3fae4f";
    ctx.fill();
    ctx.clip();
    // mowing stripes, across the lane
    ctx.fillStyle = "rgb(255 255 255 / .05)";
    for (let a = 0; a < cs.size[0]; a += 40) path(rect(a, 0, a + 20, cs.size[1])), ctx.fill();
    // slopes: a gradient falling the way they push, with drifting chevrons
    for (const s of cs.slopes) {
      const [x0, y0] = W([s.r[0], s.r[1]]);
      const [x1, y1] = W([s.r[2], s.r[3]]);
      const [cx, cy] = W([(s.r[0] + s.r[2]) / 2, (s.r[1] + s.r[3]) / 2]);
      const [fx, fy] = (() => {
        const [px, py] = W([(s.r[0] + s.r[2]) / 2 + s.f[0], (s.r[1] + s.r[3]) / 2 + s.f[1]]);
        const l = Math.hypot(px - cx, py - cy) || 1;
        return [(px - cx) / l, (py - cy) / l];
      })();
      const half = Math.abs(fx) * Math.abs(x1 - x0) / 2 + Math.abs(fy) * Math.abs(y1 - y0) / 2;
      const g = ctx.createLinearGradient(cx - fx * half, cy - fy * half, cx + fx * half, cy + fy * half);
      g.addColorStop(0, "rgb(190 255 160 / .35)");
      g.addColorStop(1, "rgb(0 40 0 / .35)");
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.clip();
      ctx.strokeStyle = "rgb(255 255 255 / .45)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const px = -fy;
      const py = fx;
      const span = Math.hypot(x1 - x0, y1 - y0);
      const drift = ((clock * 24) % 36) - 18;
      for (let u = -span; u <= span; u += 36) {
        for (let w = -span; w <= span; w += 46) {
          const ax = cx + fx * (u + drift) + px * w;
          const ay = cy + fy * (u + drift) + py * w;
          ctx.beginPath();
          ctx.moveTo(ax - fx * 6 + px * 7, ay - fy * 6 + py * 7);
          ctx.lineTo(ax, ay);
          ctx.lineTo(ax - fx * 6 - px * 7, ay - fy * 6 - py * 7);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // water
    for (const w of cs.water) {
      path(rectPts(w));
      ctx.fillStyle = "#2f7fbf";
      ctx.fill();
      ctx.strokeStyle = "#1d5a8a";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = "rgb(255 255 255 / .35)";
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 6; k++) {
        const a = w[0] + ((k * 53 + clock * 8) % (w[2] - w[0] - 20)) + 10;
        const c = w[1] + ((k * 37) % (w[3] - w[1] - 16)) + 8;
        const [x, y] = W([a, c]);
        ctx.beginPath();
        ctx.arc(x, y, 5 + Math.sin(clock * 2 + k) * 1.5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    }
    // tee mat
    {
      const [x, y] = W(cs.tee);
      ctx.fillStyle = "#2c7a3a";
      ctx.fillRect(x - 14, y - 14, 28, 28);
      ctx.strokeStyle = "rgb(255 255 255 / .35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 14, y - 14, 28, 28);
    }
    // cup
    {
      const [x, y] = W(cs.cup);
      ctx.fillStyle = "rgb(0 0 0 / .2)";
      ctx.beginPath();
      ctx.arc(x, y, CUP_R + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0b1a0d";
      ctx.beginPath();
      ctx.arc(x, y, CUP_R, 0, Math.PI * 2);
      ctx.fill();
      if (!b.sunk) {
        ctx.strokeStyle = "#eee";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 2, y - 30);
        ctx.stroke();
        ctx.fillStyle = "#ff5a3c";
        ctx.beginPath();
        const wave = Math.sin(clock * 4) * 2;
        ctx.moveTo(x + 2, y - 30);
        ctx.lineTo(x + 18, y - 25 + wave);
        ctx.lineTo(x + 2, y - 20);
        ctx.fill();
      }
    }
    ctx.restore();
    // walls
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const wall = (pts: P[], closed: boolean) => {
      path(pts, closed);
      ctx.strokeStyle = "#5e3b1d";
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = "#a8743f";
      ctx.lineWidth = 3.5;
      ctx.stroke();
    };
    wall(cs.bounds, true);
    for (const w of cs.walls) {
      if (w.closed) {
        path(w.pts);
        ctx.fillStyle = "#8a5a2e";
        ctx.fill();
      }
      wall(w.pts, w.closed);
    }
    if (cs.mover) {
      const pts = moverRect(cs, clock);
      path(pts);
      ctx.fillStyle = "#d9a04a";
      ctx.fill();
      ctx.strokeStyle = "#6b4a1a";
      ctx.lineWidth = 2;
      ctx.stroke();
      const m = cs.mover;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgb(255 255 255 / .3)";
      path([[m.a, m.c0], [m.a, m.c1]], false);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (cs.windmill) {
      const { at, r, w } = cs.windmill;
      const [hx, hy] = W(at);
      ctx.fillStyle = "#c94a3a";
      ctx.beginPath();
      ctx.arc(hx, hy, 12, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 4; k++) {
        const th = clock * w + (k * Math.PI) / 2;
        const p0 = W([at[0] + Math.cos(th) * 12, at[1] + Math.sin(th) * 12]);
        const p1 = W([at[0] + Math.cos(th) * r, at[1] + Math.sin(th) * r]);
        ctx.strokeStyle = "#5e3b1d";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(...p0);
        ctx.lineTo(...p1);
        ctx.stroke();
        ctx.strokeStyle = k % 2 ? "#f4efe6" : "#e5584a";
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      ctx.fillStyle = "#f4efe6";
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // aim
    if (aiming && !b.moving && !b.sunk) {
      const [fa, fc] = m.toC(...aiming.from);
      const [ta, tc] = m.toC(...aiming.to);
      const da = fa - ta;
      const dc = fc - tc;
      const len = Math.hypot(da, dc) || 1;
      const power = Math.min(1, len / PULL);
      const [bx, by] = W([b.a, b.c]);
      const [ex, ey] = W([b.a + (da / len) * (30 + power * 120), b.c + (dc / len) * (30 + power * 120)]);
      const [rx, ry] = W([b.a - (da / len) * power * 40, b.c - (dc / len) * power * 40]);
      ctx.strokeStyle = "rgb(255 255 255 / .5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = power > 0.8 ? "#ff8a6a" : power > 0.5 ? "#ffd23f" : "#c8ffb8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(bx, by, 14, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // ball
    if (!b.sunk) {
      const [x, y] = W([b.a, b.c]);
      ctx.fillStyle = "rgb(0 0 0 / .3)";
      ctx.beginPath();
      ctx.arc(x + 1.5, y + 2, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgb(0 0 0 / .12)";
      ctx.beginPath();
      ctx.arc(x + 1.2, y + 1.2, BALL_R * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- loop ----------

  let raf = 0;
  let last = 0;
  function loop(ts: number): void {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.04, (ts - last) / 1000) : 0.016;
    last = ts;
    clock += dt;
    const main = step(course(), ball, dt);
    if (main === "water") {
      strokes++;
      sound(() => burst(0.35, 0.5, 600, 0.4));
      say("Splash! +1 stroke, back where you played from");
    } else if (main === "sunk") {
      scores[hole] = strokes;
      sinkSound();
      render(current);
    }
    const pr = step(PRACTICE, practice, dt);
    if (pr === "water") practiceStrokes++;
    else if (pr === "sunk") {
      practiceBest = practiceBest == null ? practiceStrokes : Math.min(practiceBest, practiceStrokes);
      sinkSound();
      render(current);
    }
    for (const v of views) if (v.canvas.isConnected) drawView(v);
    if (toast && clock > toastUntil) {
      toast = "";
      refreshHud();
    }
  }
  raf = requestAnimationFrame(loop);

  // ---------- layout ----------

  function status(): string {
    const cs = course();
    if (toast) return toast;
    if (ball.sunk) return `${verdict(strokes, cs.par)} in ${strokes}`;
    return strokes ? `Stroke ${strokes}` : current.pose.display === "inner" ? "Drag back to aim, let go to putt" : "";
  }

  function refreshHud(): void {
    if (statusEl) statusEl.textContent = status();
    if (powerEl) {
      let p = 0;
      if (aim) {
        const [fa, fc] = aim.view.map.toC(...aim.from);
        const [ta, tc] = aim.view.map.toC(...aim.to);
        p = Math.min(1, Math.hypot(fa - ta, fc - tc) / PULL);
      }
      powerEl.style.width = `${p * 100}%`;
    }
  }

  function scorecard(): string {
    const cell = (i: number) => {
      const s = scores[i];
      const par = HOLES[i]!.par;
      const cls = s == null ? (i === hole ? "now" : "") : s < par ? "u" : s > par ? "o" : "";
      return `<td class="${cls}${i === hole && s != null ? " now" : ""}">${s ?? (i === hole && strokes ? `(${strokes})` : "·")}</td>`;
    };
    const diff = total() - parSoFar();
    return `<table>
      <tr><th>Hole</th>${HOLES.map((_, i) => `<td>${i + 1}</td>`).join("")}<td>Tot</td></tr>
      <tr><th>Par</th>${HOLES.map((h) => `<td>${h.par}</td>`).join("")}<td>${HOLES.reduce((n, h) => n + h.par, 0)}</td></tr>
      <tr><th>You</th>${HOLES.map((_, i) => cell(i)).join("")}<td>${total() || "·"}${parSoFar() ? ` <small>(${diff > 0 ? "+" : ""}${diff || "E"})</small>` : ""}</td></tr>
    </table>`;
  }

  function hud(): HTMLElement {
    const h = document.createElement("div");
    h.className = "mg-hud";
    const cs = course();
    h.innerHTML = `<span class="mg-kicker">Hole ${hole + 1} of ${HOLES.length} · par ${cs.par}</span><span class="mg-big">${cs.name}</span><span class="mg-status"></span><div class="mg-power"><i></i></div>`;
    statusEl = h.querySelector(".mg-status");
    powerEl = h.querySelector(".mg-power i");
    return h;
  }

  function resultCard(): HTMLElement | null {
    if (!ball.sunk) return null;
    const r = document.createElement("div");
    r.className = "mg-result";
    const cs = course();
    const over = roundOver();
    const diff = total() - parSoFar();
    r.innerHTML = `<b>${verdict(strokes, cs.par)}</b><span>${cs.name}: ${strokes} ${strokes === 1 ? "stroke" : "strokes"} (par ${cs.par})</span>${
      over ? `<span>Round: <strong>${total()}</strong> · ${diff === 0 ? "even par" : `${diff > 0 ? "+" : ""}${diff}`}</span>` : ""
    }`;
    const btn = document.createElement("button");
    btn.className = "mg-btn";
    btn.textContent = over ? "Play again" : "Next hole";
    btn.onclick = nextHole;
    r.append(btn);
    return r;
  }

  function surface(host: HTMLElement, v: Omit<View, "canvas" | "s" | "ox" | "oy">): View {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", v.practice ? "Practice hole: drag back to putt" : "The course: drag back from anywhere to putt");
    host.append(canvas);
    const view: View = { ...v, canvas, s: 1, ox: 0, oy: 0 };
    bindView(view);
    views.push(view);
    return view;
  }

  function wrap(): HTMLElement {
    const d = document.createElement("div");
    d.className = "mg";
    return d;
  }

  function render(s: DuoState): void {
    current = s;
    aim = null;
    views = [];
    statusEl = powerEl = null;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();

    if (pose.display === "outer") {
      const landscape = pose.id === "closed-landscape";
      const root = document.createElement("div");
      root.className = `mg-closed${landscape ? "" : " col"}`;
      const info = document.createElement("div");
      info.style.cssText = `display:flex;flex-direction:column;gap:6px;${landscape ? "width:46%;justify-content:center" : ""}`;
      info.innerHTML = `<span class="mg-kicker">Mini-golf · hole ${hole + 1}${ball.sunk ? " done" : ""}</span>
        <div class="mg-big">${roundOver() ? `Round: ${total()}` : `${course().name}, par ${course().par}`}</div>
        <div class="mg-card">${scorecard()}</div>
        <span class="mg-kicker" style="color:#e9f7e4;letter-spacing:.06em;text-transform:none;font-weight:600;font-size:10.5px;line-height:1.3">Open and set it down like a laptop to play the course across both halves. Meanwhile, practise:</span>
        <span class="mg-kicker">Practice · ${practiceStrokes} ${practiceStrokes === 1 ? "stroke" : "strokes"}${practiceBest != null ? ` · best ${practiceBest}` : ""}</span>`;
      const pane = document.createElement("div");
      pane.className = "pane";
      surface(pane, {
        course: () => PRACTICE,
        ball: () => practice,
        practice: true,
        map: landscape ? { toW: (a, c) => [c, 280 - a], toC: (x, y) => [280 - y, x] } : { toW: (a, c) => [a, c], toC: (x, y) => [x, y] },
        slice: landscape ? [0, 0, 180, 280] : [0, 0, 280, 180],
        align: [0.5, 0.5],
      });
      if (practice.sunk) {
        const again = document.createElement("button");
        again.className = "mg-btn";
        again.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3";
        again.textContent = `In! Again`;
        again.onclick = () => {
          practice = newBall(PRACTICE);
          practiceStrokes = 0;
          render(current);
        };
        pane.append(again);
      }
      root.append(info, pane);
      screens.outer.append(root);
      return;
    }

    const a = wrap();
    const b = wrap();
    const lane = { course, ball: () => ball, practice: false };
    if (pose.split === "stacked") {
      // Green stands on top (start); the tee lies flat below (end).
      const map: Mapping = { toW: (ca, cc) => [cc, LANE[0] - ca], toC: (x, y) => [LANE[0] - y, x] };
      surface(a, { ...lane, map, slice: [0, 0, LANE[1], FOLD], align: [0.5, 1] });
      surface(b, { ...lane, map, slice: [0, FOLD, LANE[1], FOLD], align: [0.5, 0] });
      const card = document.createElement("div");
      card.className = "mg-card";
      card.style.cssText = "left:10px;top:8px";
      card.innerHTML = scorecard();
      a.append(card);
      // Keep the status clear of the tee: on the side of the lane it isn't.
      const h = hud();
      h.style.cssText = course().tee[1] < LANE[1] / 2 ? "right:12px;bottom:10px;align-items:flex-end;text-align:right" : "left:12px;bottom:10px";
      b.append(h);
    } else {
      // The lane runs left to right: tee on the left page, green on the right.
      const map: Mapping = { toW: (ca, cc) => [ca, cc], toC: (x, y) => [x, y] };
      surface(a, { ...lane, map, slice: [0, 0, FOLD, LANE[1]], align: [1, 0.5] });
      surface(b, { ...lane, map, slice: [FOLD, 0, FOLD, LANE[1]], align: [0, 0.5] });
      const h = hud();
      h.style.cssText = course().tee[1] < LANE[1] / 2 ? "left:12px;bottom:10px" : "left:12px;top:10px";
      a.append(h);
      const card = document.createElement("div");
      card.className = "mg-card";
      card.style.cssText = "right:10px;bottom:8px";
      card.innerHTML = scorecard();
      b.append(card);
    }
    const r = resultCard();
    if (r) b.append(r);
    screens.start.append(a);
    screens.end.append(b);
    refreshHud();
  }

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      style.remove();
    },
  };
}

export const miniGolfExample: Example = {
  id: "mini-golf",
  title: "Mini-golf",
  category: "games",
  summary:
    "Six holes laid across both halves as one course: putt on the flat half and the ball rolls over the fold and up onto the standing half, where the cup is. Drag back to aim, mind the slopes, the windmill, the sliding gate and the pond.",
  bestPose: "table",
  poses: {
    closed: "Your scorecard, and a single small practice hole you can putt on with one thumb.",
    "closed-landscape": "The practice hole turned sideways beside the scorecard.",
    open: "The lane runs left to right across both pages, tee on the left, cup on the right; the ball rolls straight across the seam.",
    "open-portrait": "The same course as table pose, lying flat: tee at the bottom, green at the top.",
    book: "Tee on the left page, green on the right, the ball crossing the fold between them.",
    table:
      "One continuous course: the tee lies flat under your hand, the green stands up in front of you, and a putt rolls over the fold onto the standing half like the ramp at the end of a lane.",
    stand: "Stood on its edge, the lane runs left to right across both pages, for a quick hole on the table.",
  },
  principle:
    "Destination follows purpose: in table pose the green you watch stands up and the tee you putt from lies on the stable bottom half (HIG checklist §6). The course is one piece of content laid across both halves — like scrolling content it need not avoid the fold, but the tee and cup, the parts you aim at, are kept clear of it (checklist §6, Displacement).",
  create,
};
