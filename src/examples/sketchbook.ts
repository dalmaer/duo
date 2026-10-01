/**
 * Sketchbook — draw on the flat half, look up at what you're copying.
 *
 * In table pose the bottom leaf lies on the desk like a sheet of paper and the
 * standing top leaf becomes an easel: the subject you are copying, with your
 * own lines laid over it so you can check proportions. Open, one page is the
 * paper and the other holds the subject and the tools; closed, it is a pocket
 * sketchbook with a gallery of your pages.
 *
 * The drawing is kept as a list of vector strokes in a square "paper" space
 * (0–1000 on each axis), never as pixels, so it redraws crisply at any size in
 * any pose — and nothing is lost when you fold.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

type Stroke = { c: string; w: number; p: number[] };

const COLORS = [
  { name: "Ink", hex: "#23211d" },
  { name: "Vermilion", hex: "#d8432e" },
  { name: "Ochre", hex: "#e9a23a" },
  { name: "Sap green", hex: "#3c8d4f" },
  { name: "Cobalt", hex: "#2d6cd3" },
  { name: "Violet", hex: "#8a52c9" },
] as const;
const SIZES = [{ name: "Fine", w: 7 }, { name: "Bold", w: 20 }] as const;

/** Things to copy, drawn simply enough to be copied. viewBox 0 0 100 100. */
const SUBJECTS = [
  {
    name: "Pear",
    svg: `<ellipse cx="52" cy="90" rx="26" ry="3.5" fill="#000" opacity=".12"/>
      <path d="M50 22c-7 0-9 7-9 14 0 8-4 11-10 19-6 9-6 20 1 27 9 9 27 9 36 0 7-7 7-18 1-27-6-8-10-11-10-19 0-7-2-14-9-14z" fill="#b9cf5b" stroke="#4f5a22" stroke-width="1.6"/>
      <path d="M40 60c-4 6-4 14 0 19" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>
      <path d="M62 64c2 8-1 15-7 19" fill="none" stroke="#7f9531" stroke-width="3" stroke-linecap="round" opacity=".6"/>
      <path d="M50 23c0-5 1-9 4-13" fill="none" stroke="#5a3d22" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M54 15c6-6 14-6 18-3-5 5-12 6-18 3z" fill="#5f9a3c" stroke="#35591f" stroke-width="1.2"/>`,
  },
  {
    name: "Mug",
    svg: `<ellipse cx="48" cy="88" rx="30" ry="4" fill="#000" opacity=".12"/>
      <path d="M71 44c12 0 14 20 1 22" fill="none" stroke="#2c4f7a" stroke-width="5"/>
      <path d="M24 38h48v38c0 6-5 11-11 11H35c-6 0-11-5-11-11z" fill="#4f86c6" stroke="#2c4f7a" stroke-width="1.6"/>
      <ellipse cx="48" cy="38" rx="24" ry="5" fill="#7a4b2a" stroke="#2c4f7a" stroke-width="1.6"/>
      <path d="M30 48v24" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
      <path d="M40 28c-4-5 4-8 0-14M50 29c-4-5 4-9 0-16M60 28c-4-5 4-8 0-13" fill="none" stroke="#9aa3ad" stroke-width="1.8" stroke-linecap="round"/>`,
  },
  {
    name: "Cactus",
    svg: `<ellipse cx="50" cy="92" rx="24" ry="3" fill="#000" opacity=".12"/>
      <path d="M44 70V26c0-8 12-8 12 0v44z" fill="#5aa05a" stroke="#2e5e30" stroke-width="1.6"/>
      <path d="M44 52H36c-5 0-7-3-7-7V36c0-5 8-5 8 0v8h7M56 46h7v-12c0-5 8-5 8 0v12c0 5-3 8-8 8h-7" fill="#5aa05a" stroke="#2e5e30" stroke-width="1.6"/>
      <path d="M50 24v44" stroke="#2e5e30" stroke-width="1" opacity=".5"/>
      <circle cx="50" cy="20" r="3.4" fill="#ef6f8a" stroke="#a33b54" stroke-width="1"/>
      <path d="M32 68h36l-4 22H36z" fill="#d27a4b" stroke="#7d3e1e" stroke-width="1.6"/>
      <rect x="30" y="66" width="40" height="6" rx="1.5" fill="#e08c5b" stroke="#7d3e1e" stroke-width="1.6"/>`,
  },
  {
    name: "Fish",
    svg: `<path d="M20 50c14-20 44-22 58 0-14 22-44 20-58 0z" fill="#f0a045" stroke="#8a4a14" stroke-width="1.6"/>
      <path d="M78 50l14-12v24z" fill="#f28a3a" stroke="#8a4a14" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M44 34c6-10 16-10 20-4" fill="#f28a3a" stroke="#8a4a14" stroke-width="1.4"/>
      <path d="M40 44c4 4 4 8 0 12M52 42c4 5 4 11 0 16" fill="none" stroke="#8a4a14" stroke-width="1.2" opacity=".6"/>
      <circle cx="30" cy="47" r="3.2" fill="#fff" stroke="#3a2410" stroke-width="1"/><circle cx="30.6" cy="47" r="1.5" fill="#1b120a"/>
      <circle cx="12" cy="40" r="2" fill="none" stroke="#7fb0d8" stroke-width="1"/><circle cx="8" cy="32" r="1.3" fill="none" stroke="#7fb0d8" stroke-width="1"/>`,
  },
] as const;

const CSS = `
.sk { position:absolute; inset:0; display:flex; background:#1e1d1b; color:#f3efe6; font:12px/1.2 system-ui, -apple-system, sans-serif; }
.sk-col { flex-direction:column; }
.sk-desk { position:relative; flex:1; min-width:0; min-height:0; container-type:size; display:grid; place-items:center;
  background: radial-gradient(120% 100% at 50% 30%, #4a4035, #2b2520); }
.sk-paper { position:relative; width:calc(min(100cqw, 100cqh) - 18px); aspect-ratio:1; background:#fbf8f1; border-radius:3px;
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.5) inset, 0 8px 22px rgb(0 0 0 / 0.45), 0 1px 3px rgb(0 0 0 / 0.4); overflow:hidden; }
.sk-paper::before { content:""; position:absolute; inset:0; pointer-events:none;
  background-image: radial-gradient(circle, rgb(80 70 55 / 0.14) 0.8px, transparent 1.2px); background-size: 6% 6%; background-position: 3% 3%; }
.sk-paper canvas { position:absolute; inset:0; width:100%; height:100%; touch-action:none; cursor:crosshair; }
.sk-empty[hidden] { display:none; }
.sk-empty { position:absolute; inset:0; display:grid; place-items:center; color:rgb(60 50 40 / 0.35); font:italic 13px Georgia, serif; pointer-events:none; text-align:center; padding:0 12%; }
.sk-ref { position:relative; flex:1; min-width:0; min-height:0; container-type:size; display:grid; place-items:center;
  background: linear-gradient(180deg, #2b2926, #1c1b19); }
.sk-easel { position:relative; width:calc(min(100cqw, 100cqh) - 20px); aspect-ratio:1; border-radius:6px; overflow:hidden;
  background: radial-gradient(90% 80% at 50% 40%, #fffdf7, #efe8da); box-shadow: 0 6px 20px rgb(0 0 0 / 0.5); }
.sk-easel svg, .sk-easel canvas { position:absolute; inset:0; width:100%; height:100%; }
.sk-easel svg { transition: opacity 0.25s; }
.sk-easel.over svg { opacity:0.35; }
.sk-easel canvas { pointer-events:none; }
.sk-easel .cap { position:absolute; left:8px; top:7px; font:600 10px system-ui; letter-spacing:0.08em; text-transform:uppercase; color:rgb(40 34 26 / 0.55); }
.sk-side { display:flex; flex-direction:column; gap:10px; padding:12px 10px; box-sizing:border-box; }
.sk-side h4 { margin:0; font:600 10px system-ui; letter-spacing:0.12em; text-transform:uppercase; color:#b4aa99; }
.sk-subjects { display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; }
.sk-subjects.sk-row4 { grid-template-columns:repeat(4, 1fr); }
.sk-subj { position:relative; aspect-ratio:1; border:0; padding:0; border-radius:8px; background:#f6f1e6; cursor:pointer; overflow:hidden; box-shadow:0 0 0 2px transparent; }
.sk-subj svg, .sk-subj canvas { position:absolute; inset:8%; width:84%; height:84%; }
.sk-subj svg { opacity:0.3; }
.sk-subj.sel { box-shadow:0 0 0 2px #f3efe6, 0 0 0 4px #e9a23a; }
.sk-subj span { position:absolute; left:0; right:0; bottom:2px; font:600 8px system-ui; color:rgb(40 34 26 / 0.7); text-align:center; }
.sk-btn { border:0; border-radius:9px; background:#34312c; color:#f3efe6; font:600 11px system-ui; padding:7px 9px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; }
.sk-btn:active { background:#4a463f; }
.sk-btn.on { background:#e9a23a; color:#1e1d1b; }
.sk-btn:disabled { opacity:0.35; }
.sk-btn svg { width:15px; height:15px; }
.sk-tools { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:center; }
.sk-colors { display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; }
.sk-row .sk-colors { grid-template-columns:repeat(6, 1fr); }
.sk-sw { width:26px; height:26px; border-radius:50%; border:2px solid rgb(255 255 255 / 0.15); cursor:pointer; padding:0; }
.sk-sw.sel { border-color:#f3efe6; box-shadow:0 0 0 2px #1e1d1b inset; transform:scale(1.1); }
.sk-sizes { display:flex; gap:6px; }
.sk-size { width:32px; height:32px; border-radius:9px; border:0; background:#34312c; display:grid; place-items:center; cursor:pointer; padding:0; }
.sk-size.sel { background:#f3efe6; }
.sk-size i { display:block; border-radius:50%; background:#8d867a; }
.sk-size.sel i { background:#1e1d1b; }
.sk-acts { display:flex; gap:6px; }
.sk-row { padding:8px 8px 10px; }
.sk-row .sk-sw { width:22px; height:22px; }
.sk-row .sk-size { width:28px; height:28px; }
.sk-row .sk-btn { padding:6px 7px; }
.sk-panel { width:96px; flex:none; padding:10px 8px; flex-direction:column; flex-wrap:nowrap; gap:12px; background:#252320; }
.sk-panel .sk-acts { flex-direction:column; width:100%; }
.sk-strip { display:flex; gap:8px; align-items:center; }
.sk-strip .sk-subjects { flex:1; }
.sk-strip .sk-subj { aspect-ratio:1.25; }
.sk-strip .sk-btn { align-self:stretch; width:40px; padding:0; }
.sk-hint { font-size:10px; color:#8d867a; text-align:center; }
.sk-gallery { display:flex; gap:6px; padding:8px 10px 2px; }
.sk-gallery .sk-subj { flex:1; }
.sk-title { display:flex; align-items:baseline; gap:6px; padding:10px 12px 0; }
.sk-title b { font:600 15px Georgia, serif; }
.sk-title span { color:#b4aa99; font-size:11px; }
`;

const ICON_UNDO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>`;
const ICON_CLEAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`;
const ICON_EYE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;

const subjectSVG = (i: number) => `<svg viewBox="0 0 100 100" aria-hidden="true">${SUBJECTS[i]!.svg}</svg>`;

/** Draw a list of strokes into a square of side `s` pixels. */
function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[], s: number): void {
  const k = s / 1000;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const st of strokes) {
    const p = st.p;
    ctx.strokeStyle = ctx.fillStyle = st.c;
    ctx.lineWidth = Math.max(1, st.w * k);
    if (p.length <= 2) {
      ctx.beginPath();
      ctx.arc(p[0]! * k, p[1]! * k, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(p[0]! * k, p[1]! * k);
    for (let i = 2; i < p.length - 2; i += 2) {
      const mx = ((p[i]! + p[i + 2]!) / 2) * k;
      const my = ((p[i + 1]! + p[i + 3]!) / 2) * k;
      ctx.quadraticCurveTo(p[i]! * k, p[i + 1]! * k, mx, my);
    }
    ctx.lineTo(p[p.length - 2]! * k, p[p.length - 1]! * k);
    ctx.stroke();
  }
}

type View = { canvas: HTMLCanvasElement; subject: () => number; surface: boolean };

function create(screens: Screens, _state: DuoState): Instance {
  // --- state, which outlives every render ---
  const drawings: Stroke[][] = SUBJECTS.map(() => []);
  const history: { subject: number; strokes: Stroke[] }[] = [];
  let subject = 0;
  let color = 0;
  let size = 0;
  let overlay = true;
  let dead = false;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  let views: View[] = [];
  let raf = 0;
  let active: { stroke: Stroke; view: View } | null = null;

  function fit(c: HTMLCanvasElement): number {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const s = Math.round(c.clientWidth * dpr);
    if (c.width !== s || c.height !== s) c.width = c.height = s;
    return s;
  }

  function repaint(v: View): void {
    const s = fit(v.canvas);
    const ctx = v.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, s, s);
    paint(ctx, drawings[v.subject()]!, s);
  }

  function repaintAll(): void {
    cancelAnimationFrame(raf);
    raf = 0;
    for (const v of views) repaint(v);
    syncChrome();
  }

  function schedule(): void {
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      for (const v of views) if (v !== active?.view) repaint(v);
    });
  }

  function remember(): void {
    history.push({ subject, strokes: drawings[subject]!.slice() });
    if (history.length > 200) history.shift();
  }

  /** Controls whose look depends on state, updated in place. */
  function syncChrome(): void {
    for (const root of [screens.outer, screens.start, screens.end]) {
      root.querySelectorAll<HTMLElement>("[data-sk-color]").forEach((b) => b.classList.toggle("sel", Number(b.dataset.skColor) === color));
      root.querySelectorAll<HTMLElement>("[data-sk-size]").forEach((b) => b.classList.toggle("sel", Number(b.dataset.skSize) === size));
      root.querySelectorAll<HTMLElement>("[data-sk-subject]").forEach((b) => b.classList.toggle("sel", Number(b.dataset.skSubject) === subject));
      root.querySelectorAll<HTMLButtonElement>("[data-sk-undo]").forEach((b) => (b.disabled = history.length === 0));
      root.querySelectorAll<HTMLButtonElement>("[data-sk-clear]").forEach((b) => (b.disabled = drawings[subject]!.length === 0));
      root.querySelectorAll<HTMLElement>("[data-sk-overlay]").forEach((b) => b.classList.toggle("on", overlay));
      root.querySelectorAll<HTMLElement>(".sk-easel").forEach((e) => e.classList.toggle("over", overlay));
      root.querySelectorAll<HTMLElement>(".sk-easel canvas").forEach((c) => (c.hidden = !overlay));
      root.querySelectorAll<HTMLElement>(".sk-empty").forEach((e) => {
        e.hidden = drawings[subject]!.length > 0;
        e.textContent = `Draw the ${SUBJECTS[subject]!.name.toLowerCase()}.`;
      });
      root.querySelectorAll<HTMLElement>("[data-sk-name]").forEach((e) => (e.textContent = SUBJECTS[subject]!.name));
    }
  }

  function setSubject(i: number): void {
    subject = i;
    for (const root of [screens.outer, screens.start, screens.end]) {
      root.querySelectorAll<HTMLElement>(".sk-easel svg").forEach((s) => (s.outerHTML = subjectSVG(subject)));
    }
    repaintAll();
  }

  // --- building blocks ---

  function paper(): HTMLElement {
    const desk = document.createElement("div");
    desk.className = "sk-desk";
    desk.innerHTML = `<div class="sk-paper"><div class="sk-empty"></div><canvas aria-label="Drawing surface"></canvas></div>`;
    const c = desk.querySelector("canvas")!;
    const v: View = { canvas: c, subject: () => subject, surface: true };
    views.push(v);
    const at = (e: PointerEvent) => {
      const w = c.clientWidth || 1;
      return [Math.round((e.offsetX / w) * 1000), Math.round((e.offsetY / w) * 1000)] as const;
    };
    c.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      remember();
      const [x, y] = at(e);
      const stroke: Stroke = { c: COLORS[color]!.hex, w: SIZES[size]!.w, p: [x, y] };
      drawings[subject] = [...drawings[subject]!, stroke];
      active = { stroke, view: v };
      repaint(v);
      syncChrome();
      schedule();
    });
    c.addEventListener("pointermove", (e) => {
      if (!active || active.view !== v) return;
      const [x, y] = at(e);
      const p = active.stroke.p;
      if (Math.hypot(x - p[p.length - 2]!, y - p[p.length - 1]!) < 3) return;
      // Draw the new segment straight away; the smoothed stroke replaces it on release.
      const s = fit(c);
      const k = s / 1000;
      const ctx = c.getContext("2d")!;
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.strokeStyle = active.stroke.c;
      ctx.lineWidth = Math.max(1, active.stroke.w * k);
      ctx.beginPath();
      ctx.moveTo(p[p.length - 2]! * k, p[p.length - 1]! * k);
      ctx.lineTo(x * k, y * k);
      ctx.stroke();
      p.push(x, y);
      schedule();
    });
    const end = () => {
      if (!active) return;
      active = null;
      repaintAll();
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    return desk;
  }

  function easel(): HTMLElement {
    const ref = document.createElement("div");
    ref.className = "sk-ref";
    ref.innerHTML = `<div class="sk-easel">${subjectSVG(subject)}<canvas></canvas><span class="cap">Copy this · <span data-sk-name></span></span></div>`;
    views.push({ canvas: ref.querySelector("canvas")!, subject: () => subject, surface: false });
    return ref;
  }

  function subjects(cls = ""): HTMLElement {
    const g = document.createElement("div");
    g.className = `sk-subjects ${cls}`;
    SUBJECTS.forEach((s, i) => {
      const b = document.createElement("button");
      b.className = "sk-subj";
      b.dataset.skSubject = String(i);
      b.setAttribute("aria-label", `Page ${i + 1}: ${s.name}`);
      b.innerHTML = `${subjectSVG(i)}<canvas></canvas><span>${s.name}</span>`;
      b.onclick = () => setSubject(i);
      views.push({ canvas: b.querySelector("canvas")!, subject: () => i, surface: false });
      g.append(b);
    });
    return g;
  }

  function tools(variant: "sk-row" | "sk-panel" | "sk-block"): HTMLElement {
    const t = document.createElement("div");
    t.className = `sk-tools ${variant}`;
    t.innerHTML = `
      <div class="sk-colors">${COLORS.map((c, i) => `<button class="sk-sw" data-sk-color="${i}" style="background:${c.hex}" aria-label="${c.name}"></button>`).join("")}</div>
      <div class="sk-sizes">${SIZES.map((s, i) => `<button class="sk-size" data-sk-size="${i}" aria-label="${s.name} brush"><i style="width:${i ? 12 : 5}px;height:${i ? 12 : 5}px"></i></button>`).join("")}</div>
      <div class="sk-acts">
        <button class="sk-btn" data-sk-undo aria-label="Undo">${ICON_UNDO}${variant === "sk-row" ? "" : "Undo"}</button>
        <button class="sk-btn" data-sk-clear aria-label="Clear page">${ICON_CLEAR}${variant === "sk-row" ? "" : "Clear"}</button>
      </div>`;
    t.querySelectorAll<HTMLElement>("[data-sk-color]").forEach((b) => (b.onclick = () => ((color = Number(b.dataset.skColor)), syncChrome())));
    t.querySelectorAll<HTMLElement>("[data-sk-size]").forEach((b) => (b.onclick = () => ((size = Number(b.dataset.skSize)), syncChrome())));
    t.querySelector<HTMLElement>("[data-sk-undo]")!.onclick = () => {
      const last = history.pop();
      if (!last) return;
      drawings[last.subject] = last.strokes;
      if (last.subject !== subject) setSubject(last.subject);
      else repaintAll();
    };
    t.querySelector<HTMLElement>("[data-sk-clear]")!.onclick = () => {
      if (!drawings[subject]!.length) return;
      remember();
      drawings[subject] = [];
      repaintAll();
    };
    return t;
  }

  function overlayButton(iconOnly = false): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = "sk-btn";
    b.dataset.skOverlay = "";
    b.setAttribute("aria-label", "Overlay my lines on the subject");
    b.innerHTML = iconOnly ? ICON_EYE : `${ICON_EYE}Overlay my lines`;
    b.onclick = () => {
      overlay = !overlay;
      syncChrome();
    };
    return b;
  }

  function el(cls: string, ...kids: HTMLElement[]): HTMLElement {
    const d = document.createElement("div");
    d.className = cls;
    d.append(...kids);
    return d;
  }

  function side(...kids: (HTMLElement | string)[]): HTMLElement {
    const s = el("sk-side");
    for (const k of kids) {
      if (typeof k === "string") s.insertAdjacentHTML("beforeend", k);
      else s.append(k);
    }
    return s;
  }

  function render(state: DuoState): void {
    if (dead) return;
    const { pose } = state;
    active = null;
    views = [];
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();

    if (pose.id === "closed") {
      // Pocket sketchbook: the gallery of pages on top, paper, then a tool row.
      const title = el("sk-title");
      title.innerHTML = `<b>Sketchbook</b><span>4 pages · copying the <span data-sk-name></span></span>`;
      const gallery = subjects();
      gallery.className = "sk-gallery";
      screens.outer.append(el("sk sk-col", title, gallery, paper(), tools("sk-row")));
    } else if (pose.id === "closed-landscape") {
      const panel = side(subjects("sk-row4"), tools("sk-block"));
      panel.style.width = "150px";
      screens.outer.append(el("sk", paper(), panel));
    } else if (pose.split === "side-by-side") {
      // Open / book: subject and tools on the left page, paper on the right.
      const strip = el("sk-strip", subjects("sk-row4"), overlayButton(true));
      const left = el("sk sk-col", easel(), side(strip, tools("sk-row")));
      (left.lastElementChild as HTMLElement).style.padding = "4px 8px 10px";
      screens.start.append(left);
      screens.end.append(el("sk", paper()));
    } else {
      // Table / open-portrait: the easel stands up top; paper and tools lie flat below.
      const top = el("sk", easel(), side(`<h4>Copy</h4>`, subjects(), overlayButton()));
      (top.lastElementChild as HTMLElement).style.width = "120px";
      screens.start.append(top);
      screens.end.append(el("sk", paper(), tools("sk-panel")));
    }
    repaintAll();
  }

  return {
    render,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      style.remove();
    },
  };
}

export const sketchbookExample: Example = {
  id: "sketchbook",
  title: "Sketchbook",
  category: "productivity",
  summary:
    "A sketchbook for copying from life: pick a subject, draw it on the paper, and lay your lines over the original to check them. Each subject is its own page, and every stroke is kept as a vector so the page redraws crisply in any pose.",
  bestPose: "table",
  poses: {
    closed: "A pocket sketchbook: your four pages as a gallery along the top, the current page below, and a compact tool row.",
    "closed-landscape": "The paper on the left, with the pages and the full tool set in a column beside it.",
    open: "Two facing pages: the subject, pages and tools on the left, a full sheet of paper on the right for your drawing hand.",
    "open-portrait": "The same easel-above, paper-below split as table pose, lying flat.",
    book: "Held like an open sketchbook, the subject on one page and your drawing on the other, the fold between them.",
    table: "The flat half is the paper on your desk, with colors, brush sizes, undo and clear beside it; the standing half is the easel showing what you're copying, with your lines laid over it.",
    stand: "Stood up as an easel: the subject on one page, your drawing on the other.",
  },
  principle:
    "In table pose the drawing surface sits on the stable bottom half and the thing you look at stands on top — Apple's destination-follows-purpose rule (HIG checklist §6) — while the strokes, colors and page survive every fold (HIG, 'Displays, poses, and continuity').",
  credits: [{ who: "@MarioSaputra", url: "https://x.com/MarioSaputra/status/2104777486932574454", what: "drawing app idea for iPhone Duo" }],
  create,
};
