/**
 * Etch-a-sketch — knobs on the flat half, the grey screen standing on top,
 * and closing the phone shakes it clean.
 *
 * The drawing toy is one continuous line: a stylus behind the glass scrapes
 * powder off as two knobs move it, the left one across and the right one up
 * and down. In table pose the standing half is the screen and the flat half
 * holds the two big white knobs; turn them by dragging in a circle (both at
 * once, for diagonals and curves), or use the arrow keys.
 *
 * The pose is the mechanic: going from any open pose to a closed one is the
 * shake. The outer display shows the frame rattling and the powder settling
 * down over the drawing until it is gone, so the next time you open it the
 * screen is blank. There is a Shake button too.
 *
 * The line is kept as a list of points in a 1200 × 800 drawing space, never as
 * pixels, so it redraws at any size and survives every pose change.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, now, ready, running, tone } from "../lib/audio.ts";

/** Drawing space. 3:2, like the toy's screen. */
const W = 1200;
const H = 800;
/** Drawing units per radian of knob turn: a full turn moves the stylus about a third of the width. */
const UNITS_PER_RAD = 64;
const SHAKE_MS = 1500;

type Axis = "x" | "y";
/** One canvas and the part of the drawing space it shows. */
interface View {
  cv: HTMLCanvasElement;
  x0: number;
  x1: number;
}

const CSS = `
.es { position:absolute; inset:0; overflow:hidden; color:#fbe7d8; font:700 10px/1.2 system-ui, sans-serif;
  background:
    radial-gradient(120% 90% at 30% 10%, rgb(255 255 255 / 0.16), transparent 55%),
    linear-gradient(165deg, #db3a2f, #b5221c 55%, #8e1713);
  box-shadow: inset 0 0 0 3px rgb(0 0 0 / 0.12), inset 0 2px 0 rgb(255 255 255 / 0.25); }
.es-mark { position:absolute; left:0; right:0; text-align:center; font:italic 800 11px/1 Georgia, serif; letter-spacing:0.22em; color:#f2c35c;
  text-shadow: 0 1px 0 rgb(0 0 0 / 0.35); pointer-events:none; }
.es-screen { position:absolute; overflow:hidden; border-radius:7px; background:#c6c6bd;
  box-shadow: 0 0 0 4px #e6e3dc, 0 0 0 6px #9c9a93, inset 0 3px 8px rgb(0 0 0 / 0.35); }
.es-screen canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
.es-screen.l { border-radius:7px 0 0 7px; box-shadow: -4px 0 0 0 #e6e3dc, 0 -4px 0 0 #e6e3dc, 0 4px 0 0 #e6e3dc, inset 0 3px 8px rgb(0 0 0 / 0.35); }
.es-screen.r { border-radius:0 7px 7px 0; box-shadow: 4px 0 0 0 #e6e3dc, 0 -4px 0 0 #e6e3dc, 0 4px 0 0 #e6e3dc, inset 0 3px 8px rgb(0 0 0 / 0.35); }
.es-knob { position:absolute; width:var(--k); height:var(--k); border-radius:50%; border:0; padding:0; cursor:grab; touch-action:none;
  background: radial-gradient(circle at 35% 30%, #ffffff, #e9e7e1 55%, #c9c6bd);
  box-shadow: 0 6px 0 #a7a49b, 0 10px 18px rgb(0 0 0 / 0.45), inset 0 -3px 6px rgb(0 0 0 / 0.12); }
.es-knob:active { cursor:grabbing; }
.es-knob[disabled] { cursor:default; opacity:0.55; box-shadow: 0 4px 0 #a7a49b; }
.es-cap { position:absolute; inset:9%; border-radius:50%; pointer-events:none;
  background: repeating-conic-gradient(#f7f6f2 0 5deg, #d9d6ce 5deg 10deg);
  box-shadow: inset 0 0 0 2px rgb(0 0 0 / 0.05); }
.es-cap::before { content:""; position:absolute; inset:22%; border-radius:50%; background: radial-gradient(circle at 40% 35%, #fff, #ebe9e3); box-shadow: 0 1px 2px rgb(0 0 0 / 0.2); }
.es-cap::after { content:""; position:absolute; left:50%; top:6%; width:5px; height:18%; margin-left:-2.5px; border-radius:3px; background:#b5221c; }
.es-klabel { position:absolute; left:0; right:0; bottom:calc(-1 * 14px - 6px); text-align:center; font:700 8.5px/1 system-ui; letter-spacing:0.14em; color:rgb(255 235 220 / 0.75); pointer-events:none; }
.es-btn { position:absolute; border:0; border-radius:999px; padding:7px 13px; cursor:pointer; font:800 10px/1 system-ui; letter-spacing:0.12em;
  color:#8e1713; background:#f6e9dc; box-shadow: 0 3px 0 #6f100d; }
.es-btn:active { transform:translateY(2px); box-shadow: 0 1px 0 #6f100d; }
.es-hint { position:absolute; left:0; right:0; text-align:center; font:500 9.5px/1.35 system-ui; color:rgb(255 236 224 / 0.78); pointer-events:none; padding:0 12px; }
.es-shaking { animation: es-shake 0.16s linear 9; }
@keyframes es-shake {
  0% { transform: translate(0,0) rotate(0); }
  25% { transform: translate(-7px, 3px) rotate(-1.6deg); }
  50% { transform: translate(5px, -4px) rotate(1.2deg); }
  75% { transform: translate(-4px, -2px) rotate(-0.8deg); }
  100% { transform: translate(0,0) rotate(0); } }
@media (prefers-reduced-motion: reduce) { .es-shaking { animation:none; } }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let sx = W / 2;
  let sy = H / 2;
  /** The line: flat [x, y, x, y, …]. It always ends at the stylus. */
  let pts: number[] = [sx, sy];
  const turn: Record<Axis, number> = { x: 0, y: 0 };
  let shakeAt = 0; // performance.now() of the current shake, or 0
  let shakeFrom = 0; // length of the line when the shake began: only that much is erased
  let shookOnClose = false;
  let prevDisplay = initial.pose.display;
  let pose = initial.pose;
  let raf = 0;
  let dirty = false;

  let views: View[] = [];

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const all = <T extends Element = HTMLElement>(sel: string): T[] =>
    [screens.outer, screens.start, screens.end].flatMap((s) => [...s.querySelectorAll<T>(sel)]);

  // --- drawing ---
  function move(dx: number, dy: number): void {
    const nx = Math.min(W - 6, Math.max(6, sx + dx));
    const ny = Math.min(H - 6, Math.max(6, sy + dy));
    if (nx === sx && ny === sy) return;
    const n = pts.length;
    // A knob only moves one axis, so consecutive moves along the same line merge into one segment.
    if (n >= 4) {
      const px = pts[n - 4]!;
      const py = pts[n - 3]!;
      const sameX = px === sx && sx === nx && Math.sign(sy - py) === Math.sign(ny - sy);
      const sameY = py === sy && sy === ny && Math.sign(sx - px) === Math.sign(nx - sx);
      if (sameX || sameY) {
        pts[n - 2] = nx;
        pts[n - 1] = ny;
      } else pts.push(nx, ny);
    } else pts.push(nx, ny);
    sx = nx;
    sy = ny;
    if (shookOnClose) shookOnClose = false;
    schedule();
  }

  function schedule(): void {
    if (dirty) return;
    dirty = true;
    requestAnimationFrame(() => {
      dirty = false;
      draw();
      updateHints();
    });
  }

  function size(v: View): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    v.cv.width = Math.max(1, Math.round(v.cv.clientWidth * dpr));
    v.cv.height = Math.max(1, Math.round(v.cv.clientHeight * dpr));
  }

  function line(g: CanvasRenderingContext2D, from: number, to: number): void {
    if (to - from < 2) return;
    g.beginPath();
    g.moveTo(pts[from]!, pts[from + 1]!);
    for (let i = from + 2; i < to; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
    if (to - from === 2) g.lineTo(pts[from]! + 0.01, pts[from + 1]!);
    g.stroke();
  }

  function draw(): void {
    const t = shakeAt ? Math.min(1, (performance.now() - shakeAt) / SHAKE_MS) : 0;
    for (const v of views) {
      const g = v.cv.getContext("2d");
      if (!g) continue;
      const k = v.cv.height / H;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, v.cv.width, v.cv.height);
      g.setTransform(k, 0, 0, k, -v.x0 * k, 0);
      // The line: graphite where the powder has been scraped away.
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "#45453f";
      g.lineWidth = 4.2;
      const split = t > 0 ? shakeFrom : pts.length;
      g.globalAlpha = 1 - t * 0.55;
      line(g, 0, split);
      g.globalAlpha = 1;
      if (t > 0) {
        // Powder settling: a grey front falls from the top, ragged at its edge, covering the line.
        const front = t * (H + 160) - 80;
        g.fillStyle = "#c6c6bd";
        g.beginPath();
        g.moveTo(v.x0 - 10, -10);
        for (let x = v.x0 - 10; x <= v.x1 + 20; x += 20) {
          const wob = Math.sin(x * 0.031 + t * 9) * 26 + Math.sin(x * 0.11) * 12;
          g.lineTo(x, front + wob);
        }
        g.lineTo(v.x1 + 20, -10);
        g.closePath();
        g.fill();
        // Specks of powder still drifting below the front.
        g.fillStyle = "rgb(150 150 142 / 0.55)";
        for (let i = 0; i < 70; i++) {
          const x = ((i * 977) % W) + Math.sin(i + t * 20) * 8;
          if (x < v.x0 - 4 || x > v.x1 + 4) continue;
          const y = front + 30 + (((i * 613) % 240) * (1 - t * 0.6));
          g.fillRect(x, y, 3, 3);
        }
      }
      // Anything drawn while it shakes sits on top of the settling powder.
      if (t > 0 && split < pts.length) line(g, split - 2, pts.length);
      // The stylus.
      g.fillStyle = "#2c2c28";
      g.beginPath();
      g.arc(sx, sy, 5.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  // --- the shake ---
  function shake(): void {
    if (shakeAt) return;
    shakeAt = performance.now();
    shakeFrom = pts.length;
    for (const f of all(".es-shakes")) f.classList.add("es-shaking");
    rattle();
    tick();
  }

  /** Aluminium powder and little beads rattling inside the case, scheduled on the audio clock. */
  function rattle(): void {
    if (!running()) return;
    const t = now();
    for (let i = 0; i < 12; i++) {
      burst(0.07, 0.22, 2600 + Math.random() * 2400, 0.9, t + i * 0.115);
      burst(0.04, 0.12, 6500, 1.2, t + i * 0.115 + 0.02);
    }
    tone(140, 90, 0.08, 0.15, "sine", t);
  }

  function tick(): void {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      draw();
      if (performance.now() - shakeAt < SHAKE_MS) tick();
      else finishShake();
    });
  }

  function finishShake(): void {
    shakeAt = 0;
    // Erase what was there when the shake began; anything drawn during it survives.
    pts = pts.slice(Math.max(0, shakeFrom - 2));
    for (const f of all(".es-shakes")) f.classList.remove("es-shaking");
    draw();
    updateHints();
  }

  // --- knobs ---
  function knob(axis: Axis, px: number, label: string, live: boolean): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = "es-knob";
    b.style.setProperty("--k", `${px}px`);
    b.setAttribute("aria-label", axis === "x" ? "Left knob: across" : "Right knob: up and down");
    b.innerHTML = `<i class="es-cap" data-k="${axis}" style="transform:rotate(${turn[axis]}rad)"></i>${label ? `<span class="es-klabel">${label}</span>` : ""}`;
    if (!live) {
      b.disabled = true;
      return b;
    }
    let last: number | null = null;
    let pid = -1;
    const angle = (e: PointerEvent) => Math.atan2(e.offsetY - b.clientHeight / 2, e.offsetX - b.clientWidth / 2);
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      pid = e.pointerId;
      b.setPointerCapture(e.pointerId);
      last = angle(e);
    });
    b.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pid || last === null) return;
      const a = angle(e);
      let d = a - last;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      last = a;
      // Ignore the jump you get when the finger crosses the very centre.
      if (Math.abs(d) > 1.2) return;
      turnKnob(axis, d);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      last = null;
      pid = -1;
    };
    b.addEventListener("pointerup", end);
    b.addEventListener("pointercancel", end);
    return b;
  }

  /** Clockwise on the left knob moves right; clockwise on the right knob moves up — as on the toy. */
  function turnKnob(axis: Axis, rad: number): void {
    turn[axis] += rad;
    for (const c of all(`.es-cap[data-k="${axis}"]`)) c.style.transform = `rotate(${turn[axis]}rad)`;
    if (axis === "x") move(rad * UNITS_PER_RAD, 0);
    else move(0, -rad * UNITS_PER_RAD);
  }

  function shakeButton(css: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = "es-btn";
    b.textContent = "SHAKE";
    b.style.cssText = css;
    b.addEventListener("pointerdown", () => {
      // Unlock audio for next time; shake now (the first shake may be silent while it starts).
      const fresh = !running();
      shake();
      if (fresh) ready().then(rattle).catch(() => {});
    });
    return b;
  }

  // --- keyboard ---
  function typing(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }
  const ARROWS: Record<string, [Axis, number]> = { ArrowLeft: ["x", -1], ArrowRight: ["x", 1], ArrowUp: ["y", 1], ArrowDown: ["y", -1] };
  function onKey(e: KeyboardEvent): void {
    const a = ARROWS[e.key];
    if (!a || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (pose.id === "closed" || !views.length) return; // closed portrait is read-only
    e.preventDefault();
    turnKnob(a[0], a[1] * (e.shiftKey ? 0.4 : 0.12));
  }
  window.addEventListener("keydown", onKey);

  // --- layout ---
  function el(cls: string, css = "", html = ""): HTMLElement {
    const e = document.createElement("div");
    e.className = cls;
    if (css) e.style.cssText = css;
    if (html) e.innerHTML = html;
    return e;
  }

  function screen(css: string, x0: number, x1: number, side = ""): HTMLElement {
    const s = el(`es-screen ${side}`, css);
    const cv = document.createElement("canvas");
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", "The drawing");
    s.append(cv);
    views.push({ cv, x0, x1 });
    return s;
  }

  function hint(): string {
    if (shakeAt || shookOnClose) return "Shaken clean. Open it to draw again.";
    if (pose.id === "closed") return pts.length > 2 ? "Your drawing, read-only. Open it to keep going." : "A blank screen. Open it to draw.";
    if (pose.display === "outer") return pts.length > 2 ? "Shake to start again." : "Turn the knobs — or use the arrow keys.";
    return pts.length > 2 ? "Close the phone to shake it clean." : "Turn the knobs — or use the arrow keys.";
  }

  function updateHints(): void {
    for (const h of all(".es-hint.live")) h.textContent = hint();
  }

  function render(state: DuoState): void {
    const p = state.pose;
    const closing = prevDisplay === "inner" && p.display === "outer";
    prevDisplay = p.display;
    pose = p;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    views = [];

    if (p.id === "closed") {
      // Read-only: the frame and its screen, knobs shown but resting.
      const f = el("es es-shakes");
      f.append(el("es-mark", "top:20px", "SKETCH · SHAKE · SKETCH"));
      f.append(screen("left:20px; right:20px; top:42px; aspect-ratio:3/2", 0, W));
      f.append(el("es-hint live", "top:calc(42px + (100cqw - 40px) / 1.5 + 22px)", ""));
      f.append(el("es-hint", "bottom:96px; opacity:.6", "Open the phone and set it down: the knobs are on the bottom half."));
      const kl = knob("x", 62, "", false);
      kl.style.cssText += "left:22px; bottom:20px";
      const kr = knob("y", 62, "", false);
      kr.style.cssText += "right:22px; bottom:20px";
      f.append(kl, kr);
      screens.outer.append(f);
    } else if (p.id === "closed-landscape") {
      // The classic toy: landscape screen, knobs in the bottom corners. Playable.
      const f = el("es es-shakes");
      f.append(el("es-mark", "top:9px", "SKETCH · SHAKE · SKETCH"));
      f.append(screen("left:50%; top:26px; height:calc(100cqh - 112px); aspect-ratio:3/2; transform:translateX(-50%)", 0, W));
      const kl = knob("x", 66, "", true);
      kl.style.cssText += "left:14px; bottom:14px";
      const kr = knob("y", 66, "", true);
      kr.style.cssText += "right:14px; bottom:14px";
      f.append(kl, kr, shakeButton("left:50%; bottom:40px; transform:translateX(-50%)"), el("es-hint live", "bottom:16px"));
      screens.outer.append(f);
    } else if (p.split === "stacked") {
      // Table (and open-portrait, lying flat): screen stands on top, knobs lie below.
      const top = el("es es-shakes");
      top.append(el("es-mark", "top:9px", "SKETCH · SHAKE · SKETCH"));
      top.append(screen("left:50%; top:26px; height:calc(100cqh - 46px); max-width:calc(100cqw - 36px); aspect-ratio:3/2; transform:translateX(-50%)", 0, W));
      screens.start.append(top);
      const base = el("es");
      const k = "min(118px, calc(100cqh - 112px))";
      const kl = knob("x", 0, "ACROSS", true);
      kl.style.cssText += `--k:${k}; left:28px; top:calc(50% - ${k} / 2 + 4px)`;
      const kr = knob("y", 0, "UP · DOWN", true);
      kr.style.cssText += `--k:${k}; right:28px; top:calc(50% - ${k} / 2 + 4px)`;
      base.append(kl, kr, shakeButton("left:50%; top:calc(50% - 14px); transform:translateX(-50%)"), el("es-hint live", "bottom:12px"));
      screens.end.append(base);
    } else {
      // Open, book, stand: one screen across both halves (display only, so it may cross the fold),
      // knobs in the outer bottom corners, well clear of it.
      const hs = "min(calc(100cqh - 132px), calc((100cqw - 26px) / 0.75))";
      const left = el("es es-shakes");
      left.append(el("es-mark", "top:12px; text-align:right; padding-right:8px", "SKETCH · SHAKE"));
      left.append(screen(`right:0; top:32px; height:${hs}; width:calc(${hs} * 0.75)`, 0, W / 2, "l"));
      const kl = knob("x", 88, "", true);
      kl.style.cssText += "left:20px; bottom:20px";
      left.append(kl, el("es-hint live", "bottom:34px; left:112px; right:28px; text-align:left; padding:0"));
      const right = el("es es-shakes");
      right.append(el("es-mark", "top:12px; text-align:left; padding-left:8px", "· SKETCH"));
      right.append(screen(`left:0; top:32px; height:${hs}; width:calc(${hs} * 0.75)`, W / 2, W, "r"));
      const kr = knob("y", 88, "", true);
      kr.style.cssText += "right:20px; bottom:20px";
      right.append(kr, shakeButton("right:126px; bottom:48px"));
      screens.start.append(left);
      screens.end.append(right);
    }
    for (const v of views) size(v);
    if (closing && pts.length > 2) {
      shookOnClose = true;
      shake();
    } else if (shakeAt) {
      for (const f of all(".es-shakes")) f.classList.add("es-shaking");
    }
    updateHints();
    draw();
  }

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      style.remove();
    },
  };
}

export const etchSketchExample: Example = {
  id: "etch-sketch",
  title: "Etch-a-sketch",
  category: "retro",
  summary:
    "The red drawing toy, refolded: set the Duo down and the grey screen stands on top while the two white knobs lie flat beneath your fingers — and closing the phone is the shake that wipes it clean.",
  bestPose: "table",
  poses: {
    closed:
      "The frame and the drawing, read-only. Arrive here by closing the phone and you watch it shake and the powder settle over the line until the screen is blank.",
    "closed-landscape":
      "The classic toy on its side: landscape screen, knobs in the two bottom corners and a Shake button between them. Fully playable; closing from an open pose shakes it clean here too.",
    open: "One screen across both halves with the knobs in the outer bottom corners, like the toy itself. The screen is only a display, so it may cross the fold; the knobs and button stay well clear.",
    "open-portrait": "The table layout lying flat: screen above, knobs below.",
    book: "As open: the drawing across the two pages, knobs at the outer corners, nothing to touch near the fold.",
    table:
      "The screen stands up on the top half; the two big knobs lie on the flat bottom half — left across, right up and down, both at once for curves. Arrow keys work too.",
    stand: "Stood up like a card, the drawing faces you across both pages for showing off — the knobs still turn at the outer corners.",
  },
  principle:
    "Table pose puts what you watch on top and what you touch on the stable bottom half (HIG checklist §6, 'Destination follows purpose'); the line itself lives in the example, so every pose redraws the same drawing — and the one deliberate loss, the shake, happens only when you close it, where you can see it (Continuity checks).",
  create,
};
