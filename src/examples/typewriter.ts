/**
 * Typewriter — paper on the standing half, keys on the flat half.
 *
 * In table pose the top leaf is the carriage: a sheet wound round a black
 * platen, the line you are typing sitting on the roller and the page feeding
 * up as you go. The bottom leaf lies flat as the keyboard: round keys in
 * staggered rows that travel when struck, shift, a space bar, a backspace that
 * only moves the carriage back (so the next letter strikes over the last, as
 * on the real thing) and a return lever. A bell rings near the end of the
 * line. When the page is full — or whenever you like — tear it off onto the
 * stack.
 *
 * Every strike is kept as state (row, column, character, and the small wobble
 * it was struck with), never as DOM, so the page redraws identically in every
 * pose. Closed, the outer display shows the page so far, read-only.
 *
 * Sounds are synthesized: the clack is a filtered noise burst, the bell a sine.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import type { Pose } from "../core/poses.ts";
import { burst, now, ready, running, tone } from "../lib/audio.ts";

const COLS = 40;
const LINES = 24;
/** Margins, in character cells. */
const SIDE = 3;
const TOP = 2;
/** The bell rings when the carriage reaches this column. */
const BELL = COLS - 7;

interface Strike {
  row: number;
  col: number;
  ch: string;
  /** Offset in cells, rotation in degrees, ink 0–1. */
  dx: number;
  dy: number;
  r: number;
  ink: number;
}
interface Page {
  strikes: Strike[];
}

const ROWS: [string, string][] = [
  ["1234567890-", "!@#$%^&*()_"],
  ["qwertyuiop", "QWERTYUIOP"],
  ["asdfghjkl;", "ASDFGHJKL:"],
  ["zxcvbnm,.?", "ZXCVBNM,./"],
];

/** Every machine has its quirks: a few typebars are bent, and always strike the same way. */
function quirk(ch: string): { dx: number; dy: number; r: number } {
  const c = ch.toLowerCase().charCodeAt(0);
  const h = (c * 2654435761) >>> 0;
  if (h % 7 === 0) return { dx: 0, dy: -0.09, r: 0 }; // rides high
  if (h % 11 === 0) return { dx: 0.06, dy: 0.05, r: 2.5 }; // leans
  if (h % 13 === 0) return { dx: -0.05, dy: 0, r: -2 };
  return { dx: 0, dy: 0, r: 0 };
}

const CSS = `
.tw { position:absolute; inset:0; overflow:hidden; font:600 10px/1.2 system-ui, sans-serif; color:#e9e2d4; }
.tw-desk { background: radial-gradient(130% 100% at 50% 0%, #3a3f3a, #1d201d 70%); }
.tw-sheet { position:absolute; left:0; top:0; background:#fbf7ec; border-radius:1px;
  background-image: linear-gradient(90deg, rgb(0 0 0 / 0.04), transparent 6%, transparent 94%, rgb(0 0 0 / 0.04));
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.45); transition: transform 0.16s ease-out; will-change: transform; }
.tw-sheet.cr { transition: transform 0.38s cubic-bezier(.3,.8,.3,1); }
.tw-sheet.tear { transition: transform 0.45s ease-in, opacity 0.45s ease-in; opacity:0; }
.tw-ch { position:absolute; display:block; text-align:center; font-family:"Courier New", Courier, "Nimbus Mono PS", ui-monospace, monospace; font-weight:700;
  color:#1f1c1a; text-shadow: 0 0 0.6px rgb(20 18 16 / 0.7), 0.3px 0.2px 0.5px rgb(20 18 16 / 0.35); pointer-events:none; }
.tw-platen { position:absolute; left:0; right:0; z-index:2; border-radius:10px;
  background: linear-gradient(180deg, #4a4a4a, #111 30%, #050505 60%, #2a2a2a); box-shadow: 0 -2px 6px rgb(0 0 0 / 0.5); }
.tw-platen::before, .tw-platen::after { content:""; position:absolute; top:-4px; bottom:-4px; width:20px; border-radius:6px;
  background: linear-gradient(90deg, #8e9296, #e8ebee 45%, #6d7175); }
.tw-platen::before { left:2px; } .tw-platen::after { right:2px; }
.tw-body { position:absolute; left:0; right:0; bottom:0; z-index:1; background: linear-gradient(180deg, #2c3530, #1a201c); box-shadow: 0 -1px 0 rgb(255 255 255 / 0.06); }
.tw-guide { position:absolute; z-index:3; width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-bottom:7px solid #d94a3a;
  transition: left 0.16s ease-out; }
.tw-guide.cr { transition: left 0.38s cubic-bezier(.3,.8,.3,1); }
.tw-guide.hit { filter: brightness(1.8); }
.tw-stack { position:absolute; right:12px; top:12px; width:34px; height:42px; z-index:4; pointer-events:none; }
.tw-stack i { position:absolute; inset:0; background:#f4efe2; border-radius:1px; box-shadow: 0 1px 2px rgb(0 0 0 / 0.5); }
.tw-stack b { position:absolute; right:-6px; bottom:-6px; min-width:16px; height:16px; border-radius:8px; background:#d94a3a; color:#fff; font:800 9px/16px system-ui; text-align:center; padding:0 3px; }
.tw-bar { position:absolute; left:0; right:0; z-index:4; width:max-content; max-width:calc(100% - 28px); margin:0 auto; text-align:center; font:500 10px/1.3 system-ui;
  color:rgb(233 226 212 / 0.85); pointer-events:none; padding:4px 10px; border-radius:999px; background:rgb(22 27 24 / 0.82); }
.tw-bar b { color:#f2c35c; font-weight:700; }

.tw-keys { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:calc(var(--k) * 0.16);
  background:
    radial-gradient(120% 80% at 50% 0%, rgb(255 255 255 / 0.08), transparent 60%),
    linear-gradient(180deg, #2f3a33, #1e2621); }
.tw-plate { display:flex; align-items:center; gap:10px; width:calc(var(--k) * 11.6); }
.tw-plate span { font:italic 800 11px/1 Georgia, serif; letter-spacing:0.28em; color:#cfb37a; }
.tw-plate .grow { flex:1; height:1px; background:linear-gradient(90deg, rgb(207 179 122 / 0.5), transparent); }
.tw-row { display:flex; gap:calc(var(--k) * 0.14); }
.tw-key { position:relative; width:var(--k); height:var(--k); border:0; padding:0; background:none; cursor:pointer; touch-action:none; }
.tw-key .stem { position:absolute; left:50%; top:50%; width:4px; height:calc(var(--k) * 0.6); margin-left:-2px; background:linear-gradient(90deg,#555,#bbb,#555); border-radius:2px; }
.tw-key .cap { position:absolute; inset:0; border-radius:50%; display:grid; place-items:center;
  background: radial-gradient(circle at 50% 40%, #2b2b2b, #0e0e0e 70%);
  box-shadow: 0 0 0 2px #c9ccd0, 0 0 0 3px #6c7075, 0 4px 0 2px #0a0d0b, 0 6px 8px rgb(0 0 0 / 0.5);
  color:#f2eee4; font:700 calc(var(--k) * 0.4)/1 "Courier New", ui-monospace, monospace; transition: transform 0.06s, box-shadow 0.06s; }
.tw-key.down .cap { transform: translateY(4px); box-shadow: 0 0 0 2px #c9ccd0, 0 0 0 3px #6c7075, 0 0 0 2px #0a0d0b, 0 2px 3px rgb(0 0 0 / 0.5); transition:none; }
.tw-key.wide { width:calc(var(--k) * 1.7); }
.tw-key.wide .cap { border-radius:calc(var(--k) * 0.5); font:800 calc(var(--k) * 0.24)/1 system-ui; letter-spacing:0.08em; }
.tw-key.on .cap { color:#f2c35c; box-shadow: 0 0 0 2px #f2c35c, 0 0 0 3px #6c7075, 0 4px 0 2px #0a0d0b; }
.tw-space { width:calc(var(--k) * 5.4); height:calc(var(--k) * 0.62); align-self:center; }
.tw-space .cap { border-radius:6px; background:linear-gradient(180deg,#d9dcdf,#9a9ea3); color:#333; }
.tw-lever { width:calc(var(--k) * 2.2); }
.tw-lever .cap { border-radius:6px calc(var(--k) * 0.5) calc(var(--k) * 0.5) 6px; background:linear-gradient(180deg,#eef0f2,#9da2a7 60%,#c7cacd); color:#222; }
.tw-tear { border:0; border-radius:999px; padding:5px 10px; font:800 9px/1 system-ui; letter-spacing:0.12em; cursor:pointer; color:#1e2621; background:#cfb37a; box-shadow: 0 2px 0 #6e5c34; }
.tw-tear:active { transform:translateY(1px); box-shadow:none; }
.tw-tear:disabled { opacity:0.35; cursor:default; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let page: Page = { strikes: [] };
  const torn: Page[] = [];
  let row = 0;
  let col = 0;
  let shift = false;
  let lock = false;
  let lastShiftTap = 0;
  let pose: Pose = initial.pose;
  const timers = new Set<number>();

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  /** A sheet on screen, with the measurements it was laid out with. */
  interface Sheet {
    el: HTMLElement;
    cw: number;
    lh: number;
    place(cr?: boolean): void;
  }
  let sheets: Sheet[] = [];

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const all = <T extends Element = HTMLElement>(sel: string): T[] =>
    [screens.outer, screens.start, screens.end].flatMap((s) => [...s.querySelectorAll<T>(sel)]);
  const canType = () => pose.display === "inner";

  // --- sound ---
  function clack(soft = false): void {
    if (!running()) return;
    burst(0.028, soft ? 0.2 : 0.55, 2400 + Math.random() * 600, 0.8);
    burst(0.05, soft ? 0.1 : 0.3, 850, 1.3);
    tone(190, 80, 0.045, soft ? 0.08 : 0.22, "sine");
  }
  function ding(): void {
    if (!running()) return;
    tone(2093, 2093, 1.4, 0.2, "sine");
    tone(5650, 5650, 0.5, 0.04, "sine");
  }
  function zip(): void {
    if (!running()) return;
    const t = now();
    for (let i = 0; i < 3; i++) burst(0.02, 0.35, 3200, 2, t + i * 0.04); // the ratchet
    burst(0.34, 0.16, 2600, 0.4, t, "highpass"); // the carriage running back
    burst(0.05, 0.45, 1200, 1, t + 0.34); // and hitting the stop
  }
  function rip(): void {
    if (!running()) return;
    const t = now();
    for (let i = 0; i < 9; i++) burst(0.05, 0.22, 1800 + i * 500, 0.7, t + i * 0.035, "highpass");
  }

  // --- typing ---
  function strike(ch: string): void {
    if (!canType()) return;
    const c = Math.min(col, COLS - 1); // past the margin the carriage jams and letters pile up
    const q = quirk(ch);
    const wild = Math.random() < 0.05;
    const s: Strike = {
      row,
      col: c,
      ch,
      dx: q.dx + (Math.random() - 0.5) * 0.08,
      dy: q.dy + (Math.random() - 0.5) * 0.1 + (wild ? (Math.random() < 0.5 ? -0.16 : 0.16) : 0),
      r: q.r + (wild ? (Math.random() - 0.5) * 7 : (Math.random() - 0.5) * 1.6),
      // Ink varies strike to strike; capitals, struck with the shift held, land a touch harder.
      ink: Math.min(1, 0.68 + Math.random() * 0.34 + (/[A-Z]/.test(ch) ? 0.05 : 0)),
    };
    page.strikes.push(s);
    for (const sh of sheets) sh.el.append(glyph(s, sh.cw, sh.lh));
    if (col < COLS) col++;
    clack();
    if (col === BELL) ding();
    if (shift && !lock) {
      shift = false;
      syncShift();
    }
    flashGuide();
    advance();
  }

  function space(): void {
    if (!canType()) return;
    if (col < COLS) col++;
    clack(true);
    if (col === BELL) ding();
    advance();
  }

  function back(): void {
    if (!canType()) return;
    if (col > 0) col--;
    clack(true);
    advance();
  }

  function carriageReturn(): void {
    if (!canType()) return;
    col = 0;
    row++;
    zip();
    if (row >= LINES) {
      later(() => tear(), 420);
      advance(true);
      return;
    }
    advance(true);
  }

  function tear(): void {
    if (!page.strikes.length) {
      row = 0;
      col = 0;
      advance(true);
      return;
    }
    rip();
    for (const sh of sheets) {
      sh.el.classList.add("tear");
      sh.el.style.transform += " translateY(-110%) rotate(-4deg)";
    }
    torn.push(page);
    page = { strikes: [] };
    row = 0;
    col = 0;
    later(() => render(current), 460);
  }

  function advance(cr = false): void {
    for (const sh of sheets) sh.place(cr);
    syncBar();
  }

  function flashGuide(): void {
    for (const g of all(".tw-guide")) {
      g.classList.add("hit");
      later(() => g.classList.remove("hit"), 70);
    }
  }

  // --- drawing the page ---
  function glyph(s: Strike, cw: number, lh: number): HTMLElement {
    const e = document.createElement("span");
    e.className = "tw-ch";
    e.textContent = s.ch;
    e.style.cssText = `left:${(SIDE + s.col) * cw}px; top:${(TOP + s.row) * lh}px; width:${cw}px; height:${lh}px; font-size:${cw / 0.6}px; line-height:${lh}px;
      opacity:${s.ink.toFixed(2)}; transform:translate(${(s.dx * cw).toFixed(2)}px, ${(s.dy * lh).toFixed(2)}px) rotate(${s.r.toFixed(1)}deg)`;
    return e;
  }

  /**
   * A sheet in `host`. `feed`: wound round a platen, current line on the roller,
   * carriage creeping left as you type. `page`: the whole sheet, read-only.
   * `wide`: the sheet across the width, scrolled so the latest line shows.
   */
  function sheet(host: HTMLElement, mode: "feed" | "page" | "wide", reserveBottom: number): void {
    const vw = host.clientWidth || pose.points.width;
    const vh = host.clientHeight || pose.points.height;
    let cw: number;
    let lh: number;
    if (mode === "page") {
      cw = Math.min((vw - 28) / (COLS + SIDE * 2), (vh - reserveBottom - 24) / ((TOP + LINES + 1) * 1.8));
    } else cw = Math.min(10, (vw - (mode === "feed" ? 34 : 20)) / (COLS + SIDE * 2));
    lh = cw * 1.8;
    const pw = cw * (COLS + SIDE * 2);
    const ph = lh * (TOP + LINES + 1);
    const el = document.createElement("div");
    el.className = "tw-sheet";
    el.style.width = `${pw}px`;
    el.style.height = `${ph}px`;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "The typed page");
    for (const s of page.strikes) el.append(glyph(s, cw, lh));
    host.append(el);

    let guide: HTMLElement | null = null;
    const typeY = vh - reserveBottom;
    if (mode === "feed") {
      const platen = document.createElement("div");
      platen.className = "tw-platen";
      platen.style.cssText = `top:${typeY + lh * 0.55}px; height:${Math.max(26, lh * 2.4)}px; left:6px; right:6px`;
      guide = document.createElement("div");
      guide.className = "tw-guide";
      guide.style.top = `${typeY + lh * 0.55 - 7}px`;
      const body = document.createElement("div");
      body.className = "tw-body";
      body.style.top = `${typeY + lh * 0.55 + Math.max(26, lh * 2.4) - 8}px`;
      host.append(platen, guide, body);
    }

    const place = (cr = false) => {
      el.classList.toggle("cr", cr);
      guide?.classList.toggle("cr", cr);
      let x = (vw - pw) / 2;
      let y: number;
      if (mode === "page") {
        y = Math.max(12, (vh - reserveBottom - ph) / 2);
      } else {
        // The line being typed sits on the roller: the page feeds up as you go.
        y = typeY - (TOP + row + 0.5) * lh;
        if (mode === "wide") y = Math.min(12, y);
        if (mode === "feed") x += (0.5 - col / COLS) * pw * 0.3; // the carriage creeps left
      }
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (guide) guide.style.left = `${x + (SIDE + Math.min(col, COLS - 1) + 0.5) * cw - 5}px`;
    };
    place();
    sheets.push({ el, cw, lh, place });
  }

  function syncBar(): void {
    const left = COLS - col;
    for (const b of all(".tw-bar.status")) {
      b.innerHTML = canType()
        ? `Line ${row + 1}/${LINES} · ${left <= 7 ? `<b>${left} to the margin</b>` : `col ${col + 1}`}${torn.length ? ` · ${torn.length} torn off` : ""}`
        : `${page.strikes.length ? "The page so far." : "A blank sheet."} <b>Open to type.</b>${torn.length ? ` ${torn.length} torn off.` : ""}`;
    }
    for (const t of all<HTMLButtonElement>(".tw-tear")) t.disabled = !page.strikes.length;
  }

  function stack(host: HTMLElement): void {
    if (!torn.length) return;
    const s = document.createElement("div");
    s.className = "tw-stack";
    s.innerHTML = `${torn
      .slice(-3)
      .map((_, i) => `<i style="transform:rotate(${(i - 1) * 4}deg) translate(${i * 2}px, ${i * -2}px)"></i>`)
      .join("")}<b>${torn.length}</b>`;
    host.append(s);
  }

  // --- the keyboard ---
  function syncShift(): void {
    for (const k of all(".tw-key.shift")) k.classList.toggle("on", shift || lock);
    for (const k of all<HTMLElement>(".tw-key[data-i]")) {
      const [r, i] = k.dataset.i!.split(",").map(Number);
      k.querySelector(".cap")!.textContent = ROWS[r!]![shift || lock ? 1 : 0][i!]!.toUpperCase();
    }
  }

  function press(k: HTMLElement): void {
    k.classList.add("down");
    later(() => k.classList.remove("down"), 90);
  }

  function key(cls: string, label: string, aria: string, act: () => void, data = ""): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = `tw-key ${cls}`;
    b.setAttribute("aria-label", aria);
    if (data) b.dataset.i = data;
    b.innerHTML = `<i class="cap">${label}</i>`;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      press(b);
      if (!running()) ready().catch(() => {});
      act();
    });
    return b;
  }

  function keyboard(host: HTMLElement, topPad: number, sidePad: number): void {
    const root = document.createElement("div");
    root.className = "tw tw-keys";
    root.style.setProperty("--k", `min(calc((100cqw - ${sidePad + 24}px) / 12.8), calc((100cqh - ${topPad + 60}px) / 6.4))`);
    root.style.paddingLeft = `${sidePad}px`;
    root.style.paddingTop = `${topPad}px`;
    const plate = document.createElement("div");
    plate.className = "tw-plate";
    plate.innerHTML = `<span>SCRIBE · 40</span><i class="grow"></i>`;
    const tearB = document.createElement("button");
    tearB.className = "tw-tear";
    tearB.textContent = "TEAR OFF";
    tearB.addEventListener("pointerdown", () => {
      ready().catch(() => {});
      tear();
    });
    plate.append(tearB);
    root.append(plate);
    ROWS.forEach(([lo, hi], r) => {
      const line = document.createElement("div");
      line.className = "tw-row";
      line.style.marginLeft = `calc(var(--k) * ${[0, 0.5, 0.8, 1.2][r]})`;
      [...lo].forEach((ch, i) => {
        line.append(key("", (shift || lock ? hi[i]! : ch).toUpperCase(), `Key ${ch}`, () => strike(shift || lock ? hi[i]! : ch), `${r},${i}`));
      });
      root.append(line);
    });
    const last = document.createElement("div");
    last.className = "tw-row";
    const sh = key("wide shift", "SHIFT", "Shift (tap twice to lock)", () => {
      const t = performance.now();
      if (lock) {
        lock = false;
        shift = false;
      } else if (shift && t - lastShiftTap < 350) lock = true;
      else shift = !shift;
      lastShiftTap = t;
      syncShift();
    });
    sh.classList.toggle("on", shift || lock);
    last.append(
      sh,
      key("tw-space", "", "Space bar", space),
      key("wide", "← BACK", "Backspace: carriage back one space", back),
      key("tw-lever", "RETURN ⏎", "Carriage return lever", carriageReturn),
    );
    root.append(last);
    host.append(root);
  }

  // --- the physical keyboard ---
  function typing(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }
  function onKey(e: KeyboardEvent): void {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || !canType()) return;
    let act: (() => void) | null = null;
    let target: HTMLElement | undefined;
    if (e.key === "Enter") {
      act = carriageReturn;
      target = all(".tw-lever")[0];
    } else if (e.key === "Backspace") {
      act = back;
    } else if (e.key === " ") {
      act = space;
      target = all(".tw-space")[0];
    } else if (e.key.length === 1) {
      const ch = e.key;
      act = () => strike(ch);
      const low = ch.toLowerCase();
      target = all<HTMLElement>(".tw-key[data-i]").find((k) => {
        const [r, i] = k.dataset.i!.split(",").map(Number);
        return ROWS[r!]![0][i!] === low || ROWS[r!]![1][i!] === ch;
      });
    }
    if (!act) return;
    e.preventDefault();
    if (target) press(target);
    if (!running()) ready().catch(() => {});
    act();
  }
  window.addEventListener("keydown", onKey);

  // --- layout ---
  function desk(host: HTMLElement): HTMLElement {
    const d = document.createElement("div");
    d.className = "tw tw-desk";
    host.append(d);
    return d;
  }
  function bar(host: HTMLElement, css: string): void {
    const b = document.createElement("div");
    b.className = "tw-bar status";
    b.style.cssText = css;
    host.append(b);
  }

  let current = initial;
  function render(state: DuoState): void {
    current = state;
    pose = state.pose;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    sheets = [];
    if (pose.id === "closed") {
      const d = desk(screens.outer);
      sheet(d, "page", 46);
      bar(d, "bottom:14px");
      stack(d);
    } else if (pose.id === "closed-landscape") {
      const d = desk(screens.outer);
      sheet(d, "wide", 40);
      bar(d, "bottom:12px");
      stack(d);
    } else {
      // Paper on the start half (standing in table, left when open), keys on the end half.
      // The keyboard keeps clear of the fold: a top pad when stacked, a left pad when side by side.
      const d = desk(screens.start);
      const stacked = pose.split === "stacked";
      sheet(d, "feed", stacked ? 70 : 96);
      bar(d, stacked ? "bottom:20px" : "bottom:28px");
      stack(d);
      keyboard(screens.end, stacked ? 22 : 8, stacked ? 0 : 18);
    }
    syncBar();
  }

  return {
    render,
    destroy() {
      window.removeEventListener("keydown", onKey);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      style.remove();
    },
  };
}

export const typewriterExample: Example = {
  id: "typewriter",
  title: "Typewriter",
  category: "retro",
  summary:
    "A portable typewriter, folded the way one sits on a desk: the sheet wound round the platen on the standing half, round keys on the flat half. The bell rings near the margin, the return lever feeds the page up, and full pages tear off onto a stack.",
  bestPose: "table",
  poses: {
    closed: "The page so far, whole and read-only, with how many you have torn off — open it to type.",
    "closed-landscape": "The page across the width, scrolled to the latest lines, read-only.",
    open: "Paper and platen on the left page, the keyboard on the right; everything types, and your keyboard does too.",
    "open-portrait": "The table layout lying flat: paper above, keys below.",
    book: "Paper left, keys right, the keyboard inset from the fold so no key sits in it.",
    table: "The sheet stands up on the top half and feeds up line by line as you type on the round keys lying flat below — watch on top, touch on the bottom.",
    stand: "Stood up like a card: paper on one side, keys on the other, for typing a note to leave on the table.",
  },
  principle:
    "Table pose is the destination Apple gives this split: at-a-distance content (the page) up top, tappable controls (the keys) on the stable bottom half (HIG checklist §6, 'Destination follows purpose') — and the page is state, so it is the same page in every pose (Continuity checks).",
  create,
};
