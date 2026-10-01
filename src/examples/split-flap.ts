/**
 * Split-flap — a station board whose flaps fall over the real fold.
 *
 * A split-flap (Solari-style) display is two half-cards per character hinged
 * across the middle; to change, the top half falls forward over the hinge
 * and becomes the bottom half of the next character. The Duo has a real
 * hinge, so in table pose (and open-portrait) the giant characters are built
 * *across* it: the top half of every flap is on the standing screen, the
 * bottom half on the flat one, and a falling flap leaves one screen and
 * lands on the other.
 *
 * Opened side by side the fold runs top to bottom instead, so the board
 * becomes a departures board across both pages with a gap at the fold —
 * rows continue across it, but no single character is ever split by it
 * (HIG checklist §6, "Audit centered layouts and custom splits").
 *
 * Three modes — clock, departures, message — and the mode, the message and
 * the board position are all state that survives every pose.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, ready, running, tone } from "../lib/audio.ts";

/** The order the flaps come round in, as on a real drum. */
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-'!?/&";
const STEP_MS = 64;

type Mode = "clock" | "departures" | "message";

// --- an original fictional rail network ---
const DESTS = [
  "SALTMERE", "BRIGHTFEN", "OAKHAVEN", "MOSSGATE", "TIDEWICK", "ELDERMOOR", "CINDERBAY", "FERNLOW",
  "AMBERLEA", "STARHOLM", "NORTHWISP", "QUILLBY", "LARKSPUR", "HOLLYCOMBE", "WRENFORD", "GLASSWATER",
];
const NETWORK = "LANTERNPORT CENTRAL";

type Departure = { time: string; dest: string; plat: string; status: string };

const pad2 = (n: number) => String(n).padStart(2, "0");

/** The k-th train of the day after `epoch`: deterministic, so the board is the same in every pose. */
function departure(k: number, baseMinutes: number): Departure {
  const mins = baseMinutes + k * 4 + ((k * 7) % 3);
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const dest = DESTS[(k * 5 + 3) % DESTS.length]!;
  const plat = `${"ABC"[k % 3]}${((k * 3) % 12) + 1}`;
  const status = k % 7 === 3 ? "DELAYED" : k % 11 === 6 ? "CANCELLED" : "ON TIME";
  return { time: `${pad2(h)}:${pad2(m)}`, dest, plat, status };
}

const CSS = `
.sf { position:absolute; inset:0; background:#141416; color:#f3f1ea; font-family: ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", sans-serif; display:flex; flex-direction:column; overflow:hidden; --sf-sheen:0.10; }
.sf-row { display:flex; justify-content:center; gap:var(--sf-gap, 3px); }
.sf-cell { display:flex; flex-direction:column; gap:var(--sf-split, 1.5px); }
.sf-h { position:relative; width:var(--w); height:calc(var(--h) / 2); perspective:calc(var(--h) * 4); }
.sf-t { perspective-origin:50% 100%; }
.sf-b { perspective-origin:50% 0%; }
.sf-h > b { position:absolute; inset:0; overflow:hidden; background:linear-gradient(#2a2a2e, #222226); backface-visibility:hidden; }
.sf-t > b { border-radius:calc(var(--w) * 0.08) calc(var(--w) * 0.08) 1px 1px; transform-origin:50% 100%; }
.sf-b > b { border-radius:1px 1px calc(var(--w) * 0.08) calc(var(--w) * 0.08); transform-origin:50% 0%; background:linear-gradient(#1e1e22, #1a1a1d); }
.sf-t > b::after { content:""; position:absolute; inset:0; background:linear-gradient(rgb(255 255 255 / var(--sf-sheen)), transparent 70%); pointer-events:none; }
.sf-h > b > span { position:absolute; left:0; right:0; height:var(--h); line-height:var(--h); text-align:center; font-weight:700; font-size:min(calc(var(--h) * 0.74), calc(var(--w) * 1.15)); color:var(--sf-ink, #f3f1ea); font-variant-numeric:tabular-nums; transform:scaleY(var(--sf-stretch, 1.15)); }
.sf-t > b > span { top:0; }
.sf-b > b > span { top:calc(var(--h) / -2); }
.sf-h > b.sf-f { z-index:2; }
.sf-t > b.sf-f.falling { filter:brightness(0.82); }
.sf-b > b.sf-f.falling { filter:brightness(1.15); }
.sf-amber { --sf-ink:#ffc94a; }
.sf-red { --sf-ink:#ff7a6a; }
.sf-green { --sf-ink:#8ee08e; }
.sf-lbl { font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:#8d8a80; }
.sf-head { min-height:38px; box-sizing:border-box; display:flex; justify-content:space-between; align-items:center; padding:10px 14px 6px; }
.sf-title { font-size:11px; font-weight:700; letter-spacing:0.2em; color:#ffc94a; }
.sf-controls { display:flex; gap:6px; align-items:center; justify-content:center; padding:8px 8px 12px; flex-wrap:wrap; }
.sf-seg { display:flex; background:#26262a; border-radius:999px; padding:2px; }
.sf-seg button, .sf-btn { border:0; background:transparent; color:#cfccc2; font:600 11px system-ui; padding:6px 10px; border-radius:999px; cursor:pointer; }
.sf-seg button.on { background:#f3f1ea; color:#141416; }
.sf-btn { background:#26262a; display:flex; align-items:center; gap:5px; }
.sf-btn.on { background:#ffc94a; color:#141416; }
.sf-btn svg { width:14px; height:14px; }
.sf-input { display:flex; gap:6px; padding:4px 12px; justify-content:center; }
.sf-input input { flex:1; min-width:0; max-width:240px; background:#0c0c0e; color:#f3f1ea; border:1px solid #3a3a40; border-radius:8px; padding:7px 9px; font:600 13px ui-monospace, monospace; text-transform:uppercase; letter-spacing:0.08em; }
.sf-input button { border:0; border-radius:8px; background:#ffc94a; color:#141416; font:700 12px system-ui; padding:0 12px; cursor:pointer; }
.sf-grow { flex:1; }
.sf-giant-t, .sf-giant-b { --sf-stretch:1.7; }
.sf-giant-t { display:flex; align-items:flex-end; justify-content:center; }
.sf-giant-b { display:flex; align-items:flex-start; justify-content:center; }
.sf-board { display:flex; flex-direction:column; gap:5px; padding:0 10px; }
.sf-cols { display:flex; gap:10px; padding:0 10px 4px; }
.sf-colon { display:flex; flex-direction:column; justify-content:center; gap:calc(var(--h) * 0.18); padding:0 2px; }
.sf-colon i { width:calc(var(--h) * 0.07); height:calc(var(--h) * 0.07); border-radius:50%; background:#f3f1ea; opacity:0.85; }
.sf-date { text-align:center; font-size:11px; letter-spacing:0.2em; color:#8d8a80; padding:4px; }
.sf-note { text-align:center; font-size:10.5px; color:#8d8a80; padding:2px 10px; }
`;

const SPEAKER_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>`;
const SPEAKER_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>`;

/** Wrap text into at most `rows` lines of `width`, word by word. */
export function wrap(text: string, width: number, rows: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let w of words) {
    while (w.length > width) {
      if (line) lines.push(line), (line = "");
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!line) line = w;
    else if (line.length + 1 + w.length <= width) line += " " + w;
    else lines.push(line), (line = w);
  }
  if (line) lines.push(line);
  while (lines.length < rows) lines.push("");
  return lines.slice(0, rows);
}

/** Keep only characters the drum has. */
const clean = (s: string) =>
  s
    .toUpperCase()
    .split("")
    .map((c) => (DRUM.includes(c) ? c : " "))
    .join("");

type Cell = {
  t: HTMLElement;
  b: HTMLElement;
  /** top static (next), top flap (current), bottom static (current), bottom flap (next) */
  ts: HTMLElement;
  tf: HTMLElement;
  bs: HTMLElement;
  bf: HTMLElement;
  cur: string;
  target: string;
  next: string;
  t0: number;
  wait: number;
};

function half(kind: "t" | "b"): { el: HTMLElement; s: HTMLElement; f: HTMLElement } {
  const el = document.createElement("div");
  el.className = `sf-h sf-${kind}`;
  const s = document.createElement("b");
  const f = document.createElement("b");
  f.className = "sf-f";
  s.innerHTML = "<span></span>";
  f.innerHTML = "<span></span>";
  el.append(s, f);
  return { el, s, f };
}

const glyph = (el: HTMLElement, c: string) => {
  (el.firstChild as HTMLElement).textContent = c;
};

function create(screens: Screens, state: DuoState): Instance {
  // --- state, which outlives every render ---
  let mode: Mode = "departures";
  let message = "MIND THE GAP BETWEEN THE SCREENS";
  let sound = false;
  let boardK = 0; // first departure on the board
  let chunk = 0; // which slice of the message the giant row shows
  let current = state;
  const baseMinutes = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes() - 1;
  })();

  // Every cell on screen, by the text slot it shows.
  let groups: { key: string; cells: Cell[]; colour?: (s: string) => string }[] = [];
  let raf = 0;
  let lastClick = 0;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  // --- what each slot should read ---

  function now(): Date {
    return new Date();
  }

  function msgChunks(width: number): string[] {
    const lines = wrap(message, width, 12).filter(Boolean);
    return lines.length ? lines : [""];
  }

  function textFor(key: string, n: number): string {
    const d = now();
    let s = "";
    if (key === "hhmm") s = pad2(d.getHours()) + pad2(d.getMinutes());
    else if (key === "hh") s = pad2(d.getHours());
    else if (key === "mm") s = pad2(d.getMinutes());
    else if (key === "ss") s = pad2(d.getSeconds());
    else if (key.startsWith("dep")) {
      // dep<i><field>
      const i = Number(key[3]);
      const field = key.slice(4);
      const dep = departure(boardK + i, baseMinutes);
      const status = i === 0 ? (dep.status === "ON TIME" ? "BOARDING" : dep.status) : dep.status;
      s = field === "t" ? dep.time : field === "d" ? dep.dest : field === "p" ? dep.plat : status;
    } else if (key.startsWith("msgchunk")) {
      const chunks = msgChunks(n);
      s = chunks[chunk % chunks.length] ?? "";
      // centre it
      const padL = Math.floor((n - s.length) / 2);
      s = " ".repeat(Math.max(0, padL)) + s;
    } else if (key.startsWith("msgrow")) {
      // msgrow<i><side><width>: rows of 2·width split at the fold
      const m = /^msgrow(\d+)([LRF])(\d+)$/.exec(key)!;
      const i = Number(m[1]);
      const w = Number(m[3]);
      if (m[2] === "F") s = wrap(message, w, 8)[i] ?? "";
      else {
        // fold-aware: lay words into a left run and a right run per row, never spanning the gap
        const rows = foldRows(w);
        s = rows[i]?.[m[2] === "L" ? 0 : 1] ?? "";
      }
    }
    s = clean(s);
    return (s + " ".repeat(n)).slice(0, n);
  }

  /** Message rows across the fold: each row is a left run and a right run, words never straddling. */
  function foldRows(w: number): [string, string][] {
    const runs = wrap(message, w, 16).filter(Boolean);
    const rows: [string, string][] = [];
    for (let i = 0; i < runs.length; i += 2) rows.push([runs[i]!, runs[i + 1] ?? ""]);
    return rows;
  }

  const statusColour = (s: string) => (s.includes("DELAY") ? "sf-amber" : s.includes("CANCEL") ? "sf-red" : s.includes("BOARD") ? "sf-green" : "");

  // --- cells ---

  function makeCell(c: string, top: HTMLElement, bottom?: HTMLElement): Cell {
    const t = half("t");
    const b = half("b");
    for (const el of [t.s, t.f, b.s, b.f]) glyph(el, c);
    if (bottom) {
      top.append(t.el);
      bottom.append(b.el);
    } else {
      const wrapEl = document.createElement("div");
      wrapEl.className = "sf-cell";
      wrapEl.append(t.el, b.el);
      top.append(wrapEl);
    }
    return { t: t.el, b: b.el, ts: t.s, tf: t.f, bs: b.s, bf: b.f, cur: c, target: c, next: c, t0: 0, wait: 0 };
  }

  /**
   * A run of `n` cells reading slot `key`. With `bottom`, every cell is split:
   * its top half goes into `top`, its bottom half into `bottom` — another screen.
   */
  function run(key: string, n: number, top: HTMLElement, bottom?: HTMLElement, colour?: (s: string) => string): Cell[] {
    const text = textFor(key, n);
    const cells = [...text].map((c) => makeCell(c, top, bottom));
    groups.push({ key, cells, colour });
    if (colour) {
      const cls = colour(text);
      if (cls) top.classList.add(cls), bottom?.classList.add(cls);
    }
    return cells;
  }

  function row(cls = "sf-row"): HTMLElement {
    const r = document.createElement("div");
    r.className = cls;
    return r;
  }

  /** Point every group at its slot's current text; changed cells start to flip, cascading. */
  function update(cascade = 0): void {
    const t = performance.now();
    groups.forEach((g, gi) => {
      const text = textFor(g.key, g.cells.length);
      g.cells.forEach((c, i) => {
        if (c.target === text[i]) return;
        c.target = text[i]!;
        if (!c.t0) c.wait = t + (cascade ? gi * cascade + i * 28 + Math.random() * 40 : i * 18);
      });
    });
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function click(): void {
    if (!sound || !running()) return;
    const t = performance.now();
    if (t - lastClick < 14) return;
    lastClick = t;
    burst(0.016, 0.16, 2600 + Math.random() * 1800, 1.6);
    if (Math.random() < 0.3) tone(180, 120, 0.02, 0.05, "square");
  }

  function setFlap(el: HTMLElement, transform: string, visible: boolean): void {
    el.style.transform = transform;
    el.style.visibility = visible ? "visible" : "hidden";
  }

  /** One frame: advance every flipping cell one sliver. The top flap falls to 90° on one screen; the bottom flap carries on from 90° to 0 on the other. */
  function loop(): void {
    raf = 0;
    const t = performance.now();
    let busy = false;
    for (const g of groups) {
      for (const c of g.cells) {
        if (c.cur === c.target && !c.t0) continue;
        busy = true;
        if (!c.t0) {
          if (t < c.wait) continue;
          const i = DRUM.indexOf(c.cur);
          c.next = DRUM[(i + 1) % DRUM.length]!;
          glyph(c.ts, c.next);
          glyph(c.tf, c.cur);
          glyph(c.bs, c.cur);
          glyph(c.bf, c.next);
          c.tf.classList.add("falling");
          c.bf.classList.add("falling");
          c.t0 = t;
          click();
        }
        const p = Math.min(1, (t - c.t0) / STEP_MS);
        if (p < 0.5) {
          setFlap(c.tf, `rotateX(${(-p * 180).toFixed(1)}deg)`, true);
          setFlap(c.bf, "rotateX(90deg)", false);
        } else if (p < 1) {
          setFlap(c.tf, "rotateX(-90deg)", false);
          setFlap(c.bf, `rotateX(${(90 - (p - 0.5) * 180).toFixed(1)}deg)`, true);
        } else {
          c.cur = c.next;
          c.t0 = 0;
          for (const el of [c.ts, c.tf, c.bs, c.bf]) glyph(el, c.cur);
          setFlap(c.tf, "", true);
          setFlap(c.bf, "", true);
          c.tf.classList.remove("falling");
          c.bf.classList.remove("falling");
          if (c.cur === c.target) {
            // colour follows the settled word
            if (g.colour) {
              const word = g.cells.map((x) => x.target).join("");
              const parentT = c.t.parentElement?.closest(".sf-row") ?? c.t.parentElement;
              const parentB = c.b.parentElement?.closest(".sf-row") ?? c.b.parentElement;
              for (const p of new Set([parentT, parentB])) {
                if (!p) continue;
                p.classList.remove("sf-amber", "sf-red", "sf-green");
                const cls = g.colour(word);
                if (cls) p.classList.add(cls);
              }
            }
          }
        }
      }
    }
    if (busy) raf = requestAnimationFrame(loop);
  }

  // --- controls ---

  function controls(withMessage: boolean): HTMLElement {
    const box = document.createElement("div");
    const bar = row("sf-controls");
    const seg = document.createElement("div");
    seg.className = "sf-seg";
    for (const [m, label] of [["clock", "Clock"], ["departures", "Departures"], ["message", "Message"]] as [Mode, string][]) {
      const b = document.createElement("button");
      b.textContent = label;
      if (m === mode) b.className = "on";
      b.onclick = () => {
        if (mode === m) return;
        mode = m;
        draw();
      };
      seg.append(b);
    }
    bar.append(seg, speaker());
    if (withMessage && mode === "message") {
      const form = document.createElement("form");
      form.className = "sf-input";
      form.innerHTML = `<input maxlength="64" aria-label="Message to flip" placeholder="Type a message"><button>Flip</button>`;
      const input = form.querySelector("input")!;
      input.value = message;
      form.onsubmit = (e) => {
        e.preventDefault();
        message = clean(input.value).trim() || " ";
        chunk = 0;
        update(30);
      };
      box.append(form);
    }
    box.append(bar);
    return box;
  }

  function speaker(): HTMLElement {
    const b = document.createElement("button");
    b.className = `sf-btn ${sound ? "on" : ""}`;
    b.setAttribute("aria-label", sound ? "Sound on" : "Sound off");
    b.innerHTML = `${sound ? SPEAKER_ON : SPEAKER_OFF}<span>${sound ? "Clack" : "Sound"}</span>`;
    b.addEventListener("pointerdown", () => {
      if (sound) return;
      ready()
        .then(() => {
          sound = true;
          b.className = "sf-btn on";
          b.innerHTML = `${SPEAKER_ON}<span>Clack</span>`;
          click();
        })
        .catch(() => {});
    });
    b.onclick = () => {
      if (sound && b.dataset.armed) {
        sound = false;
        b.className = "sf-btn";
        b.innerHTML = `${SPEAKER_OFF}<span>Sound</span>`;
        delete b.dataset.armed;
      } else if (sound) b.dataset.armed = "1";
    };
    if (sound) b.dataset.armed = "1";
    return b;
  }

  function sized(el: HTMLElement, w: string, h: string, gap = "3px"): HTMLElement {
    el.style.setProperty("--w", w);
    el.style.setProperty("--h", h);
    el.style.setProperty("--sf-gap", gap);
    return el;
  }

  function colon(): HTMLElement {
    const c = document.createElement("div");
    c.className = "sf-colon";
    c.innerHTML = "<i></i><i></i>";
    return c;
  }

  function dateLine(): string {
    return now().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
  }

  // --- layouts ---

  /** Fold horizontal: giant characters whose top halves stand on `start` and bottom halves lie on `end`. */
  function stacked(): void {
    const top = document.createElement("div");
    top.className = "sf";
    const bot = document.createElement("div");
    bot.className = "sf";
    screens.start.append(top);
    screens.end.append(bot);

    const head = row("sf-head");
    top.append(head);
    const giantT = row("sf-row sf-giant-t");
    const giantB = row("sf-row sf-giant-b");

    if (mode === "clock") {
      head.innerHTML = `<span class="sf-title">${NETWORK}</span>`;
      const secs = sized(row(), "22px", "34px", "2px");
      run("ss", 2, secs);
      head.append(secs);
      const date = document.createElement("div");
      date.className = "sf-date";
      date.textContent = dateLine();
      top.append(date, Object.assign(document.createElement("div"), { className: "sf-grow" }));
      const cw = "min(20cqw, 80px)";
      sized(giantT, cw, `min(calc(${cw} * 2.1), 70cqh)`, "6px");
      sized(giantB, cw, `min(calc(${cw} * 2.1), 70cqh)`, "6px");
      // H H : M M — the colon dots sit on the top half; the bottom gets a spacer to keep columns aligned.
      const h = run("hh", 2, giantT, giantB);
      void h;
      giantT.append(colon());
      const sp = colon();
      sp.style.visibility = "hidden";
      giantB.append(sp);
      run("mm", 2, giantT, giantB);
      top.append(giantT);
      bot.append(giantB, Object.assign(document.createElement("div"), { className: "sf-grow" }), controls(false));
    } else if (mode === "departures") {
      head.innerHTML = `<span class="sf-title">NEXT DEPARTURE</span><span class="sf-lbl">${NETWORK}</span>`;
      const info = row("sf-cols");
      info.style.justifyContent = "center";
      info.style.gap = "18px";
      const tBox = sized(row(), "17px", "28px", "2px");
      run("dep0t", 5, tBox);
      const pBox = sized(row(), "17px", "28px", "2px");
      run("dep0p", 3, pBox);
      info.append(labelled("Time", tBox), labelled("Platform", pBox));
      info.style.paddingBottom = "10px";
      top.append(Object.assign(document.createElement("div"), { className: "sf-grow" }), info);
      const cw = "min(8.6cqw, 36px)";
      sized(giantT, cw, `calc(${cw} * 3)`, "3px");
      sized(giantB, cw, `calc(${cw} * 3)`, "3px");
      giantT.style.setProperty("--sf-stretch", "2");
      giantB.style.setProperty("--sf-stretch", "2");
      run("dep0d", 10, giantT, giantB);
      top.append(giantT);
      bot.append(giantB);
      const status = sized(row(), "15px", "24px", "2px");
      status.style.marginTop = "8px";
      run("dep0s", 9, status, undefined, statusColour);
      bot.append(status);
      const board = sized(document.createElement("div"), "12px", "18px", "1.5px");
      board.className = "sf-board";
      board.style.marginTop = "8px";
      for (let i = 1; i <= 3; i++) {
        const r = row();
        r.style.setProperty("--sf-gap", "1.5px");
        run(`dep${i}t`, 5, r);
        r.append(Object.assign(document.createElement("i"), { style: "width:8px" }));
        run(`dep${i}d`, 10, r);
        r.append(Object.assign(document.createElement("i"), { style: "width:8px" }));
        run(`dep${i}p`, 3, r);
        board.append(r);
      }
      bot.append(board, Object.assign(document.createElement("div"), { className: "sf-grow" }), controls(false));
    } else {
      const n = 8;
      const chunks = msgChunks(n);
      head.innerHTML = `<span class="sf-title">MESSAGE</span><span class="sf-lbl">${(chunk % chunks.length) + 1} / ${chunks.length}</span>`;
      const full = document.createElement("div");
      full.className = "sf-note";
      full.style.cssText = "font:600 12px ui-monospace,monospace;letter-spacing:0.1em;padding:4px 18px";
      full.textContent = message;
      top.append(full, Object.assign(document.createElement("div"), { className: "sf-grow" }));
      const cw = "min(10.4cqw, 42px)";
      sized(giantT, cw, `calc(${cw} * 2)`, "4px");
      sized(giantB, cw, `calc(${cw} * 2)`, "4px");
      run("msgchunk", n, giantT, giantB);
      top.append(giantT);
      bot.append(giantB, Object.assign(document.createElement("div"), { className: "sf-grow" }), controls(true));
    }
  }

  function labelled(label: string, el: HTMLElement): HTMLElement {
    const box = document.createElement("div");
    box.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px";
    box.innerHTML = `<span class="sf-lbl">${label}</span>`;
    box.append(el);
    return box;
  }

  /** Fold vertical: a board across both pages; rows continue over the fold, characters never do. */
  function sideBySide(): void {
    const L = document.createElement("div");
    L.className = "sf";
    const R = document.createElement("div");
    R.className = "sf";
    screens.start.append(L);
    screens.end.append(R);
    // keep clear of the fold: pad the inner edges
    L.style.paddingRight = "16px";
    R.style.paddingLeft = "16px";

    const hl = row("sf-head");
    const hr = row("sf-head");
    L.append(hl);
    R.append(hr);

    if (mode === "departures") {
      hl.innerHTML = `<span class="sf-title">DEPARTURES</span><span class="sf-lbl">${NETWORK.split(" ")[0]}</span>`;
      hr.innerHTML = `<span class="sf-lbl">${dateLine()}</span>`;
      const clockBox = sized(row(), "11px", "18px", "1.5px");
      run("hh", 2, clockBox);
      clockBox.insertAdjacentHTML("beforeend", `<span style="font:700 12px system-ui;line-height:18px;padding:0 1px">:</span>`);
      run("mm", 2, clockBox);
      hr.append(clockBox);
      const colsL = row("sf-cols");
      colsL.innerHTML = `<span class="sf-lbl" style="width:calc(5 * 16.5px)">Time</span><span class="sf-lbl">Destination</span>`;
      const colsR = row("sf-cols");
      colsR.innerHTML = `<span class="sf-lbl" style="width:calc(3 * 16.5px + 8px)">Plat</span><span class="sf-lbl">Remarks</span>`;
      L.append(colsL);
      R.append(colsR);
      const bl = sized(document.createElement("div"), "min(5cqw, 15px)", "min(8.4cqh, 30px)", "1.5px");
      bl.className = "sf-board";
      const br = sized(document.createElement("div"), "min(5cqw, 15px)", "min(8.4cqh, 30px)", "1.5px");
      br.className = "sf-board";
      for (let i = 0; i < 6; i++) {
        const a = row();
        a.style.justifyContent = "flex-start";
        run(`dep${i}t`, 5, a);
        a.append(Object.assign(document.createElement("i"), { style: "width:6px" }));
        run(`dep${i}d`, 10, a);
        bl.append(a);
        const b = row();
        b.style.justifyContent = "flex-start";
        run(`dep${i}p`, 3, b);
        b.append(Object.assign(document.createElement("i"), { style: "width:6px" }));
        const s = row();
        s.style.cssText = "display:flex;gap:inherit";
        run(`dep${i}s`, 9, s, undefined, statusColour);
        b.append(s);
        br.append(b);
      }
      L.append(bl, Object.assign(document.createElement("div"), { className: "sf-grow" }));
      L.insertAdjacentHTML("beforeend", `<div class="sf-note">Rows run on across the fold; no letter is split by it.</div>`);
      R.append(br, Object.assign(document.createElement("div"), { className: "sf-grow" }), controls(false));
    } else if (mode === "clock") {
      hl.innerHTML = `<span class="sf-title">${NETWORK}</span>`;
      hr.innerHTML = `<span class="sf-lbl">${dateLine()}</span>`;
      const gL = sized(row("sf-row"), "min(36cqw, 100px)", "min(50cqh, 170px)", "6px");
      const gR = sized(row("sf-row"), "min(36cqw, 100px)", "min(50cqh, 170px)", "6px");
      run("hh", 2, gL);
      run("mm", 2, gR);
      gL.style.justifyContent = "flex-end";
      gR.style.justifyContent = "flex-start";
      const sec = sized(row(), "22px", "34px", "2px");
      run("ss", 2, sec);
      L.append(Object.assign(document.createElement("div"), { className: "sf-grow" }), gL, Object.assign(document.createElement("div"), { className: "sf-grow" }));
      L.insertAdjacentHTML("beforeend", `<div class="sf-note">Hours</div>`);
      R.append(Object.assign(document.createElement("div"), { className: "sf-grow" }), gR, Object.assign(document.createElement("div"), { className: "sf-grow" }), labelled("Seconds", sec), controls(false));
    } else {
      hl.innerHTML = `<span class="sf-title">MESSAGE</span>`;
      const w = 9;
      const bl = sized(document.createElement("div"), "min(8cqw, 24px)", "min(11cqh, 40px)", "2px");
      bl.className = "sf-board";
      const br = sized(document.createElement("div"), "min(8cqw, 24px)", "min(11cqh, 40px)", "2px");
      br.className = "sf-board";
      for (let i = 0; i < 5; i++) {
        const a = row();
        a.style.justifyContent = "flex-end";
        run(`msgrow${i}L${w}`, w, a);
        bl.append(a);
        const b = row();
        b.style.justifyContent = "flex-start";
        run(`msgrow${i}R${w}`, w, b);
        br.append(b);
      }
      L.append(Object.assign(document.createElement("div"), { className: "sf-grow" }), bl, Object.assign(document.createElement("div"), { className: "sf-grow" }));
      R.append(Object.assign(document.createElement("div"), { className: "sf-grow" }), br, Object.assign(document.createElement("div"), { className: "sf-grow" }), controls(true));
    }
  }

  /** The outer display: the time in small flaps, plus a glance at the current mode. */
  function closed(): void {
    const o = document.createElement("div");
    o.className = "sf";
    screens.outer.append(o);
    const head = row("sf-head");
    head.innerHTML = `<span class="sf-title">${mode === "departures" ? "DEPARTURES" : mode === "message" ? "MESSAGE" : "CLOCK"}</span>`;
    head.append(speaker());
    o.append(head);
    const clock = sized(row(), "min(15cqw, 46px)", "min(22cqh, 74px)", "3px");
    run("hh", 2, clock);
    clock.append(colon());
    run("mm", 2, clock);
    const sec = sized(row(), "15px", "22px", "1.5px");
    sec.style.marginTop = "6px";
    run("ss", 2, sec);
    o.append(clock, sec);
    const date = document.createElement("div");
    date.className = "sf-date";
    date.textContent = dateLine();
    o.append(date);
    const board = sized(document.createElement("div"), "min(5.4cqw, 15px)", "22px", "1.5px");
    board.className = "sf-board";
    board.style.marginTop = "8px";
    if (mode === "message") {
      for (let i = 0; i < 4; i++) {
        const r = row();
        run(`msgrow${i}F14`, 14, r);
        board.append(r);
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const r = row();
        run(`dep${i}t`, 5, r);
        r.append(Object.assign(document.createElement("i"), { style: "width:6px" }));
        run(`dep${i}d`, 10, r);
        board.append(r);
      }
    }
    o.append(board, Object.assign(document.createElement("div"), { className: "sf-grow" }));
    o.insertAdjacentHTML("beforeend", `<div class="sf-note" style="padding-bottom:10px">Open it and set it down: the flaps fall over the fold.</div>`);
  }

  /** Closed and on its side: one wide clock. */
  function closedLandscape(): void {
    const o = document.createElement("div");
    o.className = "sf";
    o.style.justifyContent = "center";
    screens.outer.append(o);
    const clock = sized(row(), "min(15cqw, 58px)", "min(44cqh, 120px)", "5px");
    run("hh", 2, clock);
    clock.append(colon());
    run("mm", 2, clock);
    const sec = sized(row(), "17px", "26px", "1.5px");
    run("ss", 2, sec);
    const foot = row("sf-controls");
    const date = document.createElement("span");
    date.className = "sf-lbl";
    date.textContent = dateLine();
    foot.append(date, sec, speaker());
    foot.style.gap = "14px";
    o.append(clock, foot);
  }

  function draw(): void {
    const { pose } = current;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    groups = [];
    if (pose.id === "closed") closed();
    else if (pose.id === "closed-landscape") closedLandscape();
    else if (pose.split === "stacked") stacked();
    else sideBySide();
    sheen();
  }

  /** The hinge's one job here: light. The standing flaps catch more of the overhead light the further back they lean. */
  function sheen(): void {
    const { pose, hinge } = current;
    const lean = pose.adjustable ? Math.min(1, Math.max(0, (hinge - 70) / 110)) : 0.5;
    const v = (0.04 + lean * 0.16).toFixed(3);
    for (const el of [screens.start, screens.end, screens.outer]) el.querySelector<HTMLElement>(".sf")?.style.setProperty("--sf-sheen", v);
  }

  // --- time: the clock ticks, the board cascades, the message pages ---
  let lastBoard = performance.now();
  let lastChunk = performance.now();
  const tick = window.setInterval(() => {
    const t = performance.now();
    let cascade = 0;
    if (t - lastBoard > 7000) {
      lastBoard = t;
      boardK++;
      cascade = 45;
    }
    if (t - lastChunk > 4200) {
      lastChunk = t;
      const n = msgChunks(8).length;
      if (n > 1) {
        chunk = (chunk + 1) % n;
        const lbl = screens.start.querySelector(".sf-head .sf-lbl");
        if (mode === "message" && current.pose.split === "stacked" && lbl) lbl.textContent = `${chunk + 1} / ${n}`;
        cascade = cascade || 30;
      }
    }
    update(cascade);
  }, 250);

  return {
    render(s) {
      current = s;
      draw();
    },
    hinge(s) {
      current = s;
      sheen();
    },
    destroy() {
      clearInterval(tick);
      cancelAnimationFrame(raf);
      style.remove();
    },
  };
}

export const splitFlapExample: Example = {
  id: "split-flap",
  title: "Split-flap Clock",
  category: "retro",
  summary:
    "A station split-flap board whose flaps fall over the Duo's real fold: in table pose the top half of every giant letter stands on the upper screen and the bottom half lies on the lower, so each falling flap leaves one screen and lands on the other. Clock, departures and your own message, with soft clacks.",
  bestPose: "table",
  poses: {
    closed: "A pocket clock in small flaps, with the next departures (or your message) underneath.",
    "closed-landscape": "One wide clock — hours, minutes and ticking seconds — for a bedside or a desk.",
    open: "A departures board across both pages: time and destination on the left, platform and remarks on the right, with a gap at the fold so no letter is ever split by it.",
    "open-portrait": "The same giant letters as table pose, split across the fold, lying flat.",
    book: "The departures board on two facing pages; rows carry on over the fold, letters never sit on it.",
    table: "Giant flaps built across the hinge: top halves stand on the upright screen, bottom halves lie on the flat one, and every flip falls over the fold. Controls and the message box sit on the flat half.",
    stand: "Stood on its edge like a desk sign: the board across both halves, hands-free, for the room to read.",
  },
  principle:
    "The layout follows the pose and the fold is treated as a division — characters cross it only where the fold is the flap's own hinge, and never sit on it side by side (HIG checklist §6, 'Audit centered layouts and custom splits'); the hinge angle drives only the light on the flaps (§9, 'for interactions and effects only, never for layout').",
  create,
};
