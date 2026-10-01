/**
 * Watch Above, Play Below — the "flex mode" pattern.
 *
 * Set the Duo down half-folded and the standing top half is a screen while
 * the flat bottom half is a remote: scrubber, play, skip, speed, chapters and
 * a comment thread you can tap to jump to. The HIG's destination-follows-
 * purpose rule, as a video player.
 *
 * The "video" is a procedural landscape drawn on a canvas — a day at a
 * mountain lake, dawn to night, looping — so no media file is needed. Because
 * it is drawn rather than decoded, it fills whatever shape it is given; the
 * explorer never letterboxes it (the HIG prefers changing aspect ratio).
 *
 * When fully open, the video does not straddle the middle: it takes one half
 * and the controls take the other, so nothing important is ever in the fold
 * when the phone is bent even slightly.
 *
 * The playback position is state: it keeps running across every pose change.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

const DURATION = 96; // seconds, looping
const CHAPTERS = [
  { at: 0, name: "Dawn" },
  { at: 21, name: "Morning" },
  { at: 46, name: "Golden hour" },
  { at: 68, name: "Nightfall" },
];
const COMMENTS = [
  { at: 4, who: "early_bird", text: "that first light catching the ridge" },
  { at: 13, who: "mirrorlake", text: "the fog lifting off the water is unreal" },
  { at: 26, who: "kestrel", text: "dawn to blue sky in one slow fade, love it" },
  { at: 37, who: "pinecone", text: "birds right on cue" },
  { at: 50, who: "table_pose_fan", text: "golden hour hits different propped up on my desk" },
  { at: 61, who: "loonsong", text: "that orange on the lake…" },
  { at: 74, who: "nightowl", text: "stars coming out one by one" },
  { at: 88, who: "sleepy", text: "looping this to fall asleep tonight" },
];

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, f: number): RGB => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const css = (c: RGB, a = 1) => `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0} / ${a})`;
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** Sky colours through the day: [phase, top, horizon]. */
const SKY: [number, RGB, RGB][] = [
  [0, hex("#27345f"), hex("#f19a74")],
  [0.2, hex("#3b86d8"), hex("#bfe2fa")],
  [0.45, hex("#5e8fd0"), hex("#f6d9a0")],
  [0.6, hex("#6a4f96"), hex("#ff9e5e")],
  [0.74, hex("#0a0f2c"), hex("#2a2f5e")],
  [0.94, hex("#0b1233"), hex("#3a3566")],
  [1, hex("#27345f"), hex("#f19a74")],
];

function skyAt(ph: number): [RGB, RGB] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [p0, t0, b0] = SKY[i]!;
    const [p1, t1, b1] = SKY[i + 1]!;
    if (ph >= p0 && ph <= p1) {
      const f = (ph - p0) / (p1 - p0);
      const e = f * f * (3 - 2 * f);
      return [mix(t0, t1, e), mix(b0, b1, e)];
    }
  }
  return [SKY[0]![1], SKY[0]![2]];
}

const ridge = (x: number, seed: number, rough: number) =>
  Math.sin(x * 0.006 + seed) * 0.5 + Math.sin(x * 0.013 + seed * 2.1) * 0.28 * rough + Math.sin(x * 0.031 + seed * 3.7) * 0.12 * rough + Math.sin(x * 0.07 + seed) * 0.05 * rough;

const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1), y: r(2) * 0.55, s: 0.4 + r(3) * 1.1, tw: r(4) * 6.28 };
});

/** One frame of the landscape at time t, filling w×h whatever its shape. */
function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const ph = (t % DURATION) / DURATION;
  const [top, hor] = skyAt(ph);
  const night = clamp(1 - Math.abs(ph - 0.84) / 0.14);
  const u = Math.min(w, h);
  const horizon = h * (w > h ? 0.64 : 0.6);

  // Sky
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, css(top));
  g.addColorStop(1, css(hor));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon + 1);

  // Stars
  if (night > 0.01) {
    for (const s of STARS) {
      const a = night * (0.55 + 0.45 * Math.sin(t * 2 + s.tw));
      ctx.fillStyle = `rgb(255 255 240 / ${a})`;
      ctx.fillRect(s.x * w, s.y * horizon, s.s * (u / 300), s.s * (u / 300));
    }
  }

  // Sun by day, moon by night
  let glowX = -1;
  let glowC: RGB = [255, 240, 200];
  if (ph < 0.66) {
    const f = ph / 0.66;
    const x = w * (0.12 + 0.76 * f);
    const y = horizon - Math.sin(Math.PI * f) * horizon * 0.78 + u * 0.03;
    const warm = 1 - Math.sin(Math.PI * f);
    const c = mix(hex("#fff6d8"), hex("#ff8a3d"), warm);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, u * 0.35);
    rg.addColorStop(0, css(c, 0.55));
    rg.addColorStop(1, css(c, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, horizon);
    ctx.fillStyle = css(c);
    ctx.beginPath();
    ctx.arc(x, y, u * 0.055, 0, Math.PI * 2);
    ctx.fill();
    glowX = x;
    glowC = c;
  } else {
    const f = (ph - 0.66) / 0.34;
    const x = w * (0.85 - 0.6 * f);
    const y = horizon * (0.62 - Math.sin(Math.PI * f) * 0.42);
    ctx.fillStyle = `rgb(240 240 255 / ${0.25 + 0.75 * night})`;
    ctx.beginPath();
    ctx.arc(x, y, u * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(top);
    ctx.beginPath();
    ctx.arc(x + u * 0.016, y - u * 0.01, u * 0.036, 0, Math.PI * 2);
    ctx.fill();
    glowX = x;
    glowC = [210, 215, 255];
  }

  // Clouds
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 0.31 + t * (0.004 + i * 0.0015)) % 1.4) * (w + u) - u * 0.4;
    const cy = horizon * (0.18 + i * 0.12);
    ctx.fillStyle = css(mix(hor, [255, 255, 255], 0.55), 0.22 * (1 - night * 0.7));
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(cx + k * u * 0.07, cy + Math.sin(k * 2) * u * 0.012, u * 0.09, u * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mountains, three layers with parallax
  const layers = [
    { base: 0.62, amp: 0.28, speed: 1.5, seed: 1.3, rough: 0.6, col: hex("#5b6a8f"), haze: 0.55 },
    { base: 0.8, amp: 0.26, speed: 4, seed: 4.1, rough: 0.9, col: hex("#34425f"), haze: 0.3 },
    { base: 0.96, amp: 0.2, speed: 9, seed: 7.7, rough: 1, col: hex("#1d2a36"), haze: 0.1 },
  ];
  for (const L of layers) {
    let c = mix(L.col, hor, L.haze);
    c = mix(c, [8, 10, 24], night * 0.7);
    ctx.fillStyle = css(c);
    ctx.beginPath();
    ctx.moveTo(0, horizon + 1);
    for (let x = 0; x <= w + 4; x += 3) {
      const wx = (x / u) * 400 + t * L.speed;
      const y = horizon * L.base - (ridge(wx, L.seed, L.rough) * 0.5 + 0.5) * horizon * L.amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, horizon + 1);
    ctx.closePath();
    ctx.fill();
  }

  // Pines on the near shore
  ctx.fillStyle = css(mix(hex("#12201a"), [2, 4, 10], night * 0.8));
  for (let i = 0; i < 14; i++) {
    const px = ((i * 0.137 + 0.05) % 1) * w;
    const ph2 = u * (0.06 + ((i * 7) % 5) * 0.012);
    ctx.beginPath();
    ctx.moveTo(px, horizon - ph2);
    ctx.lineTo(px - ph2 * 0.28, horizon + 1);
    ctx.lineTo(px + ph2 * 0.28, horizon + 1);
    ctx.fill();
  }

  // Dawn fog
  const fog = clamp((0.16 - ph) / 0.16) + clamp((ph - 0.96) / 0.04);
  if (fog > 0) {
    const fg = ctx.createLinearGradient(0, horizon - u * 0.18, 0, horizon + u * 0.04);
    fg.addColorStop(0, "rgb(255 240 230 / 0)");
    fg.addColorStop(1, `rgb(255 236 225 / ${0.6 * fog})`);
    ctx.fillStyle = fg;
    ctx.fillRect(0, horizon - u * 0.18, w, u * 0.22);
  }

  // Lake with reflection
  const lg = ctx.createLinearGradient(0, horizon, 0, h);
  lg.addColorStop(0, css(mix(hor, [20, 30, 50], 0.35)));
  lg.addColorStop(1, css(mix(top, [5, 8, 18], 0.55)));
  ctx.fillStyle = lg;
  ctx.fillRect(0, horizon, w, h - horizon);
  if (glowX >= 0) {
    for (let i = 0; i < 16; i++) {
      const y = horizon + (i + 1) * ((h - horizon) / 17);
      const len = u * (0.12 - i * 0.004) * (0.7 + 0.3 * Math.sin(t * 3 + i));
      ctx.fillStyle = css(glowC, 0.5 - i * 0.025);
      ctx.fillRect(glowX - len / 2 + Math.sin(t * 2 + i * 1.7) * u * 0.01, y, len, Math.max(1, u * 0.006));
    }
  }
  ctx.strokeStyle = `rgb(255 255 255 / ${0.12 - night * 0.06})`;
  ctx.lineWidth = Math.max(1, u * 0.003);
  for (let i = 0; i < 12; i++) {
    const y = horizon + ((i * 0.083 + (t * 0.01) % 0.083) % 1) * (h - horizon);
    const x = ((i * 0.377 + t * 0.02) % 1) * w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + u * 0.08, y);
    ctx.stroke();
  }

  // Birds crossing in the morning
  if (ph > 0.28 && ph < 0.58) {
    const f = (ph - 0.28) / 0.3;
    ctx.strokeStyle = "rgb(30 30 40 / 0.8)";
    ctx.lineWidth = Math.max(1, u * 0.005);
    for (let b = 0; b < 5; b++) {
      const bx = -u * 0.1 + f * (w + u * 0.3) - b * u * 0.06;
      const by = horizon * (0.3 + Math.sin(f * 6 + b) * 0.03) + (b % 2) * u * 0.035;
      const flap = Math.sin(t * 9 + b) * u * 0.012;
      const s = u * 0.022;
      ctx.beginPath();
      ctx.moveTo(bx - s, by - flap);
      ctx.quadraticCurveTo(bx - s / 2, by - s * 0.4, bx, by);
      ctx.quadraticCurveTo(bx + s / 2, by - s * 0.4, bx + s, by - flap);
      ctx.stroke();
    }
  }

  // Vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, u * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgb(0 0 0 / 0)");
  vg.addColorStop(1, "rgb(0 0 0 / 0.35)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

const fmt = (s: number) => {
  const x = Math.floor(s);
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`;
};

const ICON = {
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/><text x="12" y="15.5" font-size="7" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui">10</text></svg>`,
  fwd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4h-4"/><text x="12" y="15.5" font-size="7" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui">10</text></svg>`,
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/></svg>`,
};

const CSS = `
.vd { position:absolute; inset:0; display:flex; flex-direction:column; background:#0c0d10; color:#f4f4f6; font:12px/1.3 -apple-system, system-ui, sans-serif; }
.vd-video { position:relative; flex:none; background:#000; overflow:hidden; cursor:pointer; }
.vd-video.vd-fill { flex:1; min-height:0; }
.vd-video canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
.vd-bug { position:absolute; left:10px; top:9px; font:700 9px system-ui; letter-spacing:0.14em; color:rgb(255 255 255 / 0.75); text-shadow:0 1px 3px rgb(0 0 0 / 0.6); pointer-events:none; }
.vd-tc { position:absolute; right:10px; top:9px; font:600 10px ui-monospace, SFMono-Regular, Menlo, monospace; color:rgb(255 255 255 / 0.8); background:rgb(0 0 0 / 0.35); padding:2px 5px; border-radius:4px; pointer-events:none; }
.vd-flash { position:absolute; left:50%; top:50%; width:54px; height:54px; margin:-27px; border-radius:50%; background:rgb(0 0 0 / 0.45); color:#fff; display:grid; place-items:center; opacity:0; pointer-events:none; }
.vd-flash svg { width:26px; height:26px; }
.vd-flash.go { animation: vd-flash 0.6s ease-out; }
@keyframes vd-flash { 0% { opacity:1; transform:scale(0.8); } 100% { opacity:0; transform:scale(1.3); } }
.vd-over { position:absolute; left:0; right:0; bottom:0; padding:22px 12px 10px; background:linear-gradient(transparent, rgb(0 0 0 / 0.65)); display:flex; flex-direction:column; gap:6px; }
.vd-info { padding:10px 14px 4px; }
.vd-info h3 { margin:0 0 3px; font:700 15px/1.2 -apple-system, system-ui; }
.vd-info p { margin:0; color:#9a9aa2; font-size:11.5px; }
.vd-scrub { position:relative; height:22px; cursor:pointer; touch-action:none; }
.vd-scrub > * { pointer-events:none; }
.vd-track { position:absolute; left:0; right:0; top:50%; height:4px; margin-top:-2px; border-radius:2px; background:rgb(255 255 255 / 0.2); display:flex; gap:2px; }
.vd-track i { flex:1; background:rgb(255 255 255 / 0.18); border-radius:1px; }
.vd-fillbar { position:absolute; left:0; top:50%; height:4px; margin-top:-2px; border-radius:2px; background:#ff453a; }
.vd-knob { position:absolute; top:50%; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgb(0 0 0 / 0.5); }
.vd-big .vd-scrub { height:34px; }
.vd-big .vd-track, .vd-big .vd-fillbar { height:8px; margin-top:-4px; border-radius:4px; }
.vd-big .vd-knob { width:20px; height:20px; margin:-10px 0 0 -10px; }
.vd-times { display:flex; justify-content:space-between; font:600 10.5px ui-monospace, Menlo, monospace; color:#9a9aa2; }
.vd-times b { color:#f4f4f6; font:600 11px system-ui; }
.vd-ctrls { display:flex; align-items:center; justify-content:center; gap:14px; }
.vd-btn { border:0; background:none; color:#f4f4f6; display:grid; place-items:center; cursor:pointer; padding:0; width:40px; height:40px; border-radius:50%; }
.vd-btn svg { width:26px; height:26px; }
.vd-btn:active { background:rgb(255 255 255 / 0.12); }
.vd-btn.vd-main { width:52px; height:52px; background:#f4f4f6; color:#0c0d10; }
.vd-btn.vd-main svg { width:28px; height:28px; }
.vd-pill { border:0; border-radius:14px; background:#23242a; color:#f4f4f6; font:600 11.5px system-ui; padding:6px 11px; cursor:pointer; display:flex; align-items:center; gap:5px; }
.vd-pill svg { width:13px; height:13px; }
.vd-pill.on { color:#ff453a; }
.vd-panel { padding:12px 14px 0; display:flex; flex-direction:column; gap:10px; }
.vd-panel .vd-ctrls { justify-content:space-between; }
.vd-chaps { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; }
.vd-chaps button { flex:none; border:0; border-radius:10px; background:#1b1c21; color:#c9c9d0; font:600 11px system-ui; padding:6px 9px; cursor:pointer; text-align:left; }
.vd-chaps button small { display:block; font:500 9.5px ui-monospace, Menlo, monospace; color:#7c7c85; }
.vd-chaps button.on { background:#3a1715; color:#ffb3ad; box-shadow: inset 0 0 0 1px #ff453a; }
.vd-comments { flex:1; min-height:0; overflow-y:auto; padding:6px 14px 14px; scrollbar-width:none; }
.vd-comments h4 { margin:4px 0 6px; font:700 11px system-ui; letter-spacing:0.08em; text-transform:uppercase; color:#7c7c85; }
.vd-c { display:grid; grid-template-columns:auto 1fr; gap:2px 8px; padding:6px 8px; border-radius:10px; cursor:pointer; transition:background 0.3s; }
.vd-c .ts { grid-row:1 / 3; font:600 10.5px ui-monospace, Menlo, monospace; color:#ff453a; padding-top:1px; }
.vd-c .who { font-weight:600; font-size:11px; color:#9a9aa2; }
.vd-c .tx { font-size:12.5px; }
.vd-c.now { background:#1d1e24; }
.vd-row { flex-direction:row; }
`;

function create(screens: Screens, _state: DuoState): Instance {
  // --- state, which outlives every render ---
  let t = 6;
  let playing = true;
  let speed = 1;
  let liked = false;
  let dead = false;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  let canvases: HTMLCanvasElement[] = [];
  let lastTick = performance.now();
  let lastBucket = -1;
  let raf = 0;
  let dragging = false;

  const root = () => [screens.outer, screens.start, screens.end];
  const chapterAt = (s: number) => [...CHAPTERS].reverse().find((c) => s >= c.at)!;

  function seek(s: number): void {
    t = ((s % DURATION) + DURATION) % DURATION;
    lastBucket = -1;
    frame(false);
  }

  function toggle(): void {
    playing = !playing;
    for (const r of root()) {
      r.querySelectorAll<HTMLElement>("[data-vd-play]").forEach((b) => {
        b.innerHTML = playing ? ICON.pause : ICON.play;
        b.setAttribute("aria-label", playing ? "Pause" : "Play");
      });
      r.querySelectorAll<HTMLElement>(".vd-flash").forEach((f) => {
        f.innerHTML = playing ? ICON.play : ICON.pause;
        f.classList.remove("go");
        void f.offsetWidth;
        f.classList.add("go");
      });
    }
  }

  function video(fill: boolean): HTMLElement {
    const v = document.createElement("div");
    v.className = `vd-video ${fill ? "vd-fill" : ""}`;
    if (!fill) v.style.aspectRatio = "16 / 9";
    v.innerHTML = `<canvas aria-label="Video: One Day at Mirror Lake"></canvas><span class="vd-bug">SLOW PLANET</span><span class="vd-tc" data-vd-tc></span><div class="vd-flash"></div>`;
    v.onclick = (e) => {
      if ((e.target as HTMLElement).closest(".vd-over")) return;
      toggle();
    };
    canvases.push(v.querySelector("canvas")!);
    return v;
  }

  function scrubber(): HTMLElement {
    const s = document.createElement("div");
    s.className = "vd-scrub";
    s.setAttribute("role", "slider");
    s.setAttribute("aria-label", "Playback position");
    const segs = CHAPTERS.map((c, i) => ((CHAPTERS[i + 1]?.at ?? DURATION) - c.at)).map((len) => `<i style="flex:${len}"></i>`).join("");
    s.innerHTML = `<div class="vd-track">${segs}</div><div class="vd-fillbar" data-vd-fill></div><div class="vd-knob" data-vd-knob></div>`;
    const at = (e: PointerEvent) => seek(clamp(e.offsetX / (s.clientWidth || 1)) * DURATION * 0.9999);
    s.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      s.setPointerCapture(e.pointerId);
      dragging = true;
      at(e);
    });
    s.addEventListener("pointermove", (e) => dragging && at(e));
    const end = () => (dragging = false);
    s.addEventListener("pointerup", end);
    s.addEventListener("pointercancel", end);
    return s;
  }

  function times(): HTMLElement {
    const d = document.createElement("div");
    d.className = "vd-times";
    d.innerHTML = `<span data-vd-now></span><b data-vd-chapname></b><span>${fmt(DURATION)}</span>`;
    return d;
  }

  function controls(extra: boolean): HTMLElement {
    const d = document.createElement("div");
    d.className = "vd-ctrls";
    const btn = (cls: string, html: string, label: string, fn: () => void, attr = "") => {
      const b = document.createElement("button");
      b.className = cls;
      b.innerHTML = html;
      b.setAttribute("aria-label", label);
      if (attr) b.setAttribute(attr, "");
      b.onclick = (e) => {
        e.stopPropagation();
        fn();
      };
      return b;
    };
    const sp = btn("vd-pill", `${speed}×`, "Playback speed", () => {
      speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : speed === 2 ? 0.5 : 1;
      for (const r of root()) r.querySelectorAll<HTMLElement>("[data-vd-speed]").forEach((x) => (x.textContent = `${speed}×`));
    }, "data-vd-speed");
    const like = btn(`vd-pill ${liked ? "on" : ""}`, `${ICON.heart}<span>${liked ? "12.4K" : "12.3K"}</span>`, "Like", () => {
      liked = !liked;
      for (const r of root()) r.querySelectorAll<HTMLElement>("[data-vd-like]").forEach((x) => {
        x.classList.toggle("on", liked);
        x.querySelector("span")!.textContent = liked ? "12.4K" : "12.3K";
      });
    }, "data-vd-like");
    if (extra) d.append(sp);
    d.append(
      btn("vd-btn", ICON.back, "Back 10 seconds", () => seek(t - 10)),
      btn("vd-btn vd-main", playing ? ICON.pause : ICON.play, playing ? "Pause" : "Play", toggle, "data-vd-play"),
      btn("vd-btn", ICON.fwd, "Forward 10 seconds", () => seek(t + 10)),
    );
    if (extra) d.append(like);
    return d;
  }

  function info(): HTMLElement {
    const d = document.createElement("div");
    d.className = "vd-info";
    d.innerHTML = `<h3>One Day at Mirror Lake</h3><p>Slow Planet · 1.2M views · dawn to night in ${fmt(DURATION)}</p>`;
    return d;
  }

  function chapters(): HTMLElement {
    const d = document.createElement("div");
    d.className = "vd-chaps";
    for (const c of CHAPTERS) {
      const b = document.createElement("button");
      b.dataset.vdChap = String(c.at);
      b.innerHTML = `${c.name}<small>${fmt(c.at)}</small>`;
      b.onclick = () => seek(c.at);
      d.append(b);
    }
    return d;
  }

  function comments(): HTMLElement {
    const d = document.createElement("div");
    d.className = "vd-comments";
    d.innerHTML = `<h4>Comments · tap to jump</h4>`;
    for (const c of COMMENTS) {
      const r = document.createElement("div");
      r.className = "vd-c";
      r.dataset.vdAt = String(c.at);
      r.innerHTML = `<span class="ts">${fmt(c.at)}</span><span class="who">@${c.who}</span><span class="tx">${c.text}</span>`;
      r.onclick = () => seek(c.at);
      d.append(r);
    }
    return d;
  }

  function panel(big: boolean): HTMLElement {
    const p = document.createElement("div");
    p.className = `vd-panel ${big ? "vd-big" : ""}`;
    p.append(scrubber(), times(), controls(true), chapters());
    return p;
  }

  function div(cls: string, ...kids: HTMLElement[]): HTMLElement {
    const d = document.createElement("div");
    d.className = cls;
    d.append(...kids);
    return d;
  }

  /** Update everything that moves with time, in whatever is on screen. */
  function frame(advance: boolean): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;
    if (advance && playing && !dragging) t = (t + dt * speed) % DURATION;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of canvases) {
      const w = Math.round(c.clientWidth * dpr);
      const h = Math.round(c.clientHeight * dpr);
      if (!w || !h) continue;
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      drawScene(c.getContext("2d")!, w, h, t);
    }
    const f = t / DURATION;
    const chap = chapterAt(t);
    for (const r of root()) {
      r.querySelectorAll<HTMLElement>("[data-vd-fill]").forEach((e) => (e.style.width = `${f * 100}%`));
      r.querySelectorAll<HTMLElement>("[data-vd-knob]").forEach((e) => (e.style.left = `${f * 100}%`));
      r.querySelectorAll<HTMLElement>("[data-vd-now]").forEach((e) => (e.textContent = fmt(t)));
      r.querySelectorAll<HTMLElement>("[data-vd-tc]").forEach((e) => (e.textContent = `${fmt(t)} / ${fmt(DURATION)}`));
      r.querySelectorAll<HTMLElement>("[data-vd-chapname]").forEach((e) => (e.textContent = chap.name));
    }
    // Comments and chapters only change a few times a minute; touch them when they do.
    const bucket = Math.floor(t / 2);
    if (bucket !== lastBucket) {
      lastBucket = bucket;
      for (const r of root()) {
        r.querySelectorAll<HTMLElement>("[data-vd-chap]").forEach((b) => b.classList.toggle("on", Number(b.dataset.vdChap) === chap.at));
        r.querySelectorAll<HTMLElement>("[data-vd-at]").forEach((c) => {
          const at = Number(c.dataset.vdAt);
          c.classList.toggle("now", t >= at && t < at + 8);
        });
      }
    }
  }

  function loop(): void {
    if (dead) return;
    raf = requestAnimationFrame(loop);
    frame(true);
  }

  function render(state: DuoState): void {
    if (dead) return;
    const { pose } = state;
    canvases = [];
    lastBucket = -1;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();

    if (pose.id === "closed") {
      // A standard phone player.
      const bar = div("vd-panel", scrubber(), times(), controls(true));
      screens.outer.append(div("vd", video(false), info(), bar, comments()));
    } else if (pose.id === "closed-landscape") {
      // Immersive: the picture fills the display; the controls float over its foot.
      const v = video(true);
      const over = div("vd-over", scrubber(), times(), controls(false));
      v.append(over);
      screens.outer.append(div("vd", v));
    } else if (pose.split === "side-by-side") {
      // Open and book: picture on one half, everything else on the other — never across the fold.
      screens.start.append(div("vd", video(true)));
      screens.end.append(div("vd", info(), panel(false), comments()));
    } else {
      // Table and open-portrait: watch above, play below.
      screens.start.append(div("vd", video(true)));
      screens.end.append(div("vd", panel(true), comments()));
    }
    frame(false);
  }

  loop();

  return {
    render,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      style.remove();
    },
  };
}

export const videoExample: Example = {
  id: "video",
  title: "Watch Above, Play Below",
  category: "patterns",
  summary:
    "The \"flex mode\" pattern: set the Duo down half-folded and the standing half is the screen while the flat half is the remote — scrubber, skip, speed, chapters and a comment thread you can tap to jump to. The film is a procedural day at a mountain lake, and it keeps playing through every pose change.",
  bestPose: "table",
  poses: {
    closed: "A standard phone player: the picture on top, then the title, scrubber, play controls and comments.",
    "closed-landscape": "Immersive: the picture fills the whole outer display, with the scrubber and controls floating over its foot.",
    open: "The picture takes the left half and the details, controls, chapters and comments take the right — the video never spans the fold.",
    "open-portrait": "The same split as table pose, lying flat: picture on top, remote below.",
    book: "Picture on the left page, the remote on the right, like a tiny standing TV guide.",
    table: "Watch above, play below: the standing half is all picture, and the flat half is a big scrubber with chapters, play controls, speed and timestamped comments.",
    stand: "Stood on the table hands-free: the picture on one half, controls and comments on the other.",
  },
  principle:
    "Table pose puts at-a-distance content up top and tappable controls on the stable bottom half (HIG checklist §6, 'Destination follows purpose'); and when open, the picture sits on one half rather than straddling the middle, because important content should stay clear of the fold (HIG, 'Dynamic layouts and reserved regions').",
  create,
};
