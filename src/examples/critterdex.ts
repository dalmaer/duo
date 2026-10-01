/**
 * Critterdex — a red clamshell field guide to creatures that do not exist.
 *
 * Closed, the Duo is the device's lid: the big blue lens, three status lights
 * and a little screen that scans for whatever is nearby. Open it like a book
 * and it becomes the whole handheld: the left page is the viewer, with the
 * creature on a green-tinted screen and a d-pad to browse; the right page is
 * the data panel, where the entry types itself out beside stat bars and a
 * blue keypad. Stood up in table pose, the art stands on the top half and the
 * data and controls lie flat beneath your thumbs.
 *
 * Every creature, name and drawing here is original to this explorer.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import type { Pose } from "../core/poses.ts";
import { note, ready, running, tone } from "../lib/audio.ts";
import { CRITTERS, TYPE_COLOR, type Critter } from "./critterdex-data.ts";

const STAT_NAMES = ["VIG", "POW", "GRD", "SPD"];

const CSS = `
.cd { position:absolute; inset:0; color:#fff; font:600 11px/1.25 system-ui, sans-serif; overflow:hidden; }
.cd-shell { background:
  radial-gradient(ellipse at 20% -10%, rgb(255 140 140 / .55), transparent 55%),
  linear-gradient(160deg, #e4252f 0%, #cc1a24 55%, #a3121b 100%);
  box-shadow: inset 0 0 0 2px rgb(0 0 0 / .18), inset 0 2px 0 rgb(255 255 255 / .25); }
.cd-shell::before { content:""; position:absolute; inset:0; pointer-events:none; background: repeating-linear-gradient(135deg, rgb(255 255 255 / .018) 0 2px, transparent 2px 5px); }
.cd-step { position:absolute; left:0; right:0; width:100%; height:26px; pointer-events:none; }
.cd-hinge { position:absolute; top:0; bottom:0; width:14px; pointer-events:none; z-index:2;
  background: linear-gradient(90deg, #7d0d14, #d8323b 35%, #ff7a80 50%, #b5161f 70%, #6a0a10),
  repeating-linear-gradient(180deg, transparent 0 60px, rgb(0 0 0 / .6) 60px 62px); background-blend-mode: multiply; }
.cd-hinge::after { content:""; position:absolute; inset:0; background: repeating-linear-gradient(180deg, transparent 0 22%, rgb(0 0 0 / .55) 22% 23%, transparent 23% 77%, rgb(0 0 0 / .55) 77% 78%, transparent 78%); }
.cd-hinge.h { width:auto; height:14px; left:0; right:0; top:auto; bottom:auto;
  background: linear-gradient(180deg, #7d0d14, #d8323b 35%, #ff7a80 50%, #b5161f 70%, #6a0a10); }
.cd-hinge.h::after { background: repeating-linear-gradient(90deg, transparent 0 22%, rgb(0 0 0 / .55) 22% 23%, transparent 23% 77%, rgb(0 0 0 / .55) 77% 78%, transparent 78%); }

.cd-lens { position:relative; flex:none; border-radius:50%; background: radial-gradient(circle at 50% 50%, #fff 0 64%, #d9d9d9 66% 70%, #1d1b24 71% 100%); box-shadow: 0 3px 6px rgb(0 0 0 / .4); }
.cd-lens i { position:absolute; inset:14%; border-radius:50%; background: radial-gradient(circle at 34% 30%, #e6f7ff 0 8%, #6fd0ff 14%, #1d8fe0 45%, #0b4fa3 80%, #06306a); box-shadow: inset 0 -4px 8px rgb(0 0 0 / .45), 0 0 0 2px #1d1b24; }
.cd-lens i::after { content:""; position:absolute; left:18%; top:14%; width:30%; height:22%; border-radius:50%; background: rgb(255 255 255 / .75); filter: blur(1px); transform: rotate(-30deg); }
.cd-lens.pulse i { animation: cd-pulse .35s ease-in-out infinite alternate; }
@keyframes cd-pulse { to { filter: brightness(1.6) saturate(1.3); box-shadow: inset 0 -4px 8px rgb(0 0 0 / .45), 0 0 0 2px #1d1b24, 0 0 22px #6fd0ff; } }
.cd-leds { display:flex; gap:7px; align-items:center; }
.cd-leds i { width:11px; height:11px; border-radius:50%; box-shadow: 0 0 0 1.5px #1d1b24, inset 0 -2px 3px rgb(0 0 0 / .35); }
.cd-leds i:nth-child(1) { background: radial-gradient(circle at 35% 30%, #ffb3b3, #ff2b2b 60%); }
.cd-leds i:nth-child(2) { background: radial-gradient(circle at 35% 30%, #fff4b3, #ffd21f 60%); }
.cd-leds i:nth-child(3) { background: radial-gradient(circle at 35% 30%, #c8ffc0, #3bd13b 60%); }
.cd-leds.blink i { animation: cd-blink .45s steps(2) infinite; }
.cd-leds.blink i:nth-child(2) { animation-delay:.15s; } .cd-leds.blink i:nth-child(3) { animation-delay:.3s; }
@keyframes cd-blink { 50% { filter: brightness(.4); } }
.cd-top { display:flex; align-items:flex-start; gap:12px; padding:12px 16px 0; height:74px; box-sizing:border-box; }
.cd-brand { font:900 italic 10px/1 "Avenir Next", system-ui; letter-spacing:.2em; color:rgb(255 255 255 / .8); text-shadow:0 1px 0 rgb(0 0 0 / .35); }

.cd-bezel { position:relative; background: linear-gradient(180deg,#f1f1f1,#d4d4d4); border-radius:8px 8px 8px 30px; padding:18px 16px 16px; box-shadow: 0 2px 0 rgb(0 0 0 / .25), inset 0 -2px 0 rgb(0 0 0 / .08); }
.cd-bezel::before { content:""; position:absolute; top:7px; left:50%; width:28px; height:5px; margin-left:-14px; background: radial-gradient(circle, #e0262f 0 2.5px, transparent 3px) 0 0 / 14px 5px repeat-x; }
.cd-bezel .dot { position:absolute; left:14px; bottom:4px; width:9px; height:9px; border-radius:50%; background:#e0262f; box-shadow:0 0 0 1.5px #1d1b24; }
.cd-bezel .grille { position:absolute; right:16px; bottom:5px; width:34px; height:8px; background: repeating-linear-gradient(180deg, #1d1b24 0 1.5px, transparent 1.5px 3px); }
.cd-screen { position:relative; height:100%; border-radius:3px; overflow:hidden; color:#15311a;
  background: radial-gradient(ellipse at 50% 40%, #d7f5c8, #9fd88f 70%, #82c476); box-shadow: inset 0 0 0 2px #1d1b24, inset 0 3px 8px rgb(0 0 0 / .3); }
.cd-screen::after { content:""; position:absolute; inset:0; pointer-events:none; background: repeating-linear-gradient(180deg, rgb(0 40 0 / .07) 0 1px, transparent 1px 3px); }
.cd-screen svg.art { position:absolute; left:50%; top:52%; height:78%; aspect-ratio:1; transform:translate(-50%,-50%); filter: drop-shadow(0 3px 0 rgb(0 50 0 / .2)); }
.cd-screen.scan svg.art { filter: brightness(0) opacity(.75); animation: cd-shimmer .25s infinite alternate; }
@keyframes cd-shimmer { to { transform:translate(-50%,-50%) scale(1.03); } }
.cd-screen .tag { position:absolute; left:6px; top:5px; font:800 11px/1 ui-monospace, "SF Mono", monospace; letter-spacing:.04em; z-index:1; }
.cd-screen .tag b { display:block; font-size:13px; letter-spacing:.02em; margin-top:2px; }
.cd-screen .found { position:absolute; left:0; right:0; bottom:6px; text-align:center; font:800 10px/1 ui-monospace, monospace; letter-spacing:.14em; z-index:1; animation: cd-blink .5s steps(2) 4; }
.cd-radar { position:absolute; left:50%; top:54%; width:62%; aspect-ratio:1; transform:translate(-50%,-50%); border-radius:50%;
  background: repeating-radial-gradient(circle, transparent 0 18%, rgb(21 49 26 / .35) 18% 19%), linear-gradient(90deg, transparent 49.5%, rgb(21 49 26 / .3) 49.5% 50.5%, transparent 50.5%), linear-gradient(0deg, transparent 49.5%, rgb(21 49 26 / .3) 49.5% 50.5%, transparent 50.5%); }
.cd-radar::after { content:""; position:absolute; inset:0; border-radius:50%; background: conic-gradient(from 0deg, rgb(21 49 26 / .55), transparent 25%); animation: cd-spin 1.1s linear infinite; }
@keyframes cd-spin { to { transform: rotate(360deg); } }

.cd-data { position:relative; background:#0c1412; border-radius:6px; box-shadow: 0 0 0 3px #1d1b24, 0 0 0 5px rgb(255 255 255 / .12), inset 0 0 18px rgb(80 255 180 / .08); padding:9px 11px; color:#bff7dc; display:flex; flex-direction:column; gap:5px; overflow:hidden; font:500 10.5px/1.35 ui-monospace, "SF Mono", Menlo, monospace; }
.cd-data::after { content:""; position:absolute; inset:0; pointer-events:none; background: repeating-linear-gradient(180deg, rgb(0 0 0 / .18) 0 1px, transparent 1px 3px); }
.cd-data h4 { margin:0; display:flex; align-items:baseline; gap:6px; font:800 14px/1 ui-monospace, monospace; color:#fff; }
.cd-data h4 small { font-size:10px; color:#6fe0b0; font-weight:600; }
.cd-data .kind { font-size:9.5px; color:#7fb9a0; }
.cd-chips { display:flex; gap:4px; flex-wrap:wrap; }
.cd-chip { font:800 9px/1 system-ui; letter-spacing:.08em; text-transform:uppercase; padding:3px 7px; border-radius:999px; color:#fff; text-shadow:0 1px 0 rgb(0 0 0 / .3); }
.cd-hw { display:flex; gap:12px; font-size:10px; color:#9fd8bf; }
.cd-hw b { color:#fff; font-weight:700; }
.cd-entry { flex:1; min-height:0; overflow-y:auto; scrollbar-width:none; color:#dfffee; }
.cd-entry::-webkit-scrollbar { display:none; }
.cd-stats.two { grid-template-columns: auto 1fr auto auto 1fr auto; }
.cd-entry::after { content:"▌"; animation: cd-blink .8s steps(2) infinite; color:#6fe0b0; }
.cd-entry.done::after { content:""; }
.cd-stats { display:grid; grid-template-columns: auto 1fr auto; gap:3px 6px; align-items:center; font-size:9px; }
.cd-stats span { color:#7fb9a0; }
.cd-stats em { font-style:normal; color:#fff; text-align:right; min-width:18px; }
.cd-bar { height:6px; background:#1f302a; border-radius:3px; overflow:hidden; }
.cd-bar i { display:block; height:100%; border-radius:3px; background: linear-gradient(90deg,#3bd18a,#b8ff6a); animation: cd-grow .6s ease-out both; }
@keyframes cd-grow { from { width:0 !important; } }
.cd-scanning { color:#6fe0b0; text-align:center; margin:auto; letter-spacing:.2em; animation: cd-blink .5s steps(2) infinite; }

.cd-pad { position:relative; width:78px; height:78px; flex:none; }
.cd-pad button { position:absolute; border:0; padding:0; background:#232028; cursor:pointer; box-shadow: 0 3px 0 #0d0c10, inset 0 1px 0 rgb(255 255 255 / .12); color:rgb(255 255 255 / .35); font-size:9px; }
.cd-pad button:active { transform: translateY(2px); box-shadow: 0 1px 0 #0d0c10; }
.cd-pad .u, .cd-pad .d { left:33%; width:34%; height:36%; }
.cd-pad .l, .cd-pad .r { top:33%; height:34%; width:36%; }
.cd-pad .u { top:0; border-radius:4px 4px 0 0; } .cd-pad .d { bottom:0; border-radius:0 0 4px 4px; }
.cd-pad .l { left:0; border-radius:4px 0 0 4px; } .cd-pad .r { right:0; border-radius:0 4px 4px 0; }
.cd-pad::after { content:""; position:absolute; left:33%; top:33%; width:34%; height:34%; background:#232028; border-radius:50%; box-shadow: inset 0 0 0 5px #232028, inset 0 0 0 8px #1a181d; pointer-events:none; }
.cd-round { width:30px; height:30px; border-radius:50%; border:0; cursor:pointer; background: radial-gradient(circle at 35% 30%, #4a4652, #1d1b24); box-shadow: 0 3px 0 #0d0c10; }
.cd-round:active { transform:translateY(2px); box-shadow:0 1px 0 #0d0c10; }
.cd-pills { display:flex; gap:6px; }
.cd-pills i { width:26px; height:6px; border-radius:3px; box-shadow: 0 0 0 1.5px #1d1b24; }
.cd-minigreen { background:#7fcf6f; color:#153015; border-radius:3px; box-shadow: 0 0 0 2px #1d1b24, inset 0 2px 4px rgb(0 0 0 / .25); font:800 12px/1 ui-monospace, monospace; padding:6px 8px; letter-spacing:.04em; }

.cd-keys { display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; }
.cd-key { border:0; border-radius:3px; height:24px; cursor:pointer; color:#dbeeff; font:800 11px/1 ui-monospace, monospace;
  background: linear-gradient(180deg,#39a7f0,#1f7fd1); box-shadow: 0 0 0 1.5px #0b2f55, 0 3px 0 #0b2f55; }
.cd-key:active { transform:translateY(2px); box-shadow: 0 0 0 1.5px #0b2f55, 0 1px 0 #0b2f55; }
.cd-key.on { background: linear-gradient(180deg,#8fd4ff,#46a9f2); color:#0b2f55; }
.cd-key.unseen { color:rgb(219 238 255 / .45); }
.cd-wide { display:flex; gap:8px; }
.cd-wide button { flex:1; border:0; border-radius:4px; height:22px; cursor:pointer; background: linear-gradient(180deg,#fafafa,#d6d6d6); color:#3a3a3a; font:800 9px/1 system-ui; letter-spacing:.15em; box-shadow: 0 0 0 1.5px #1d1b24, 0 3px 0 #1d1b24; }
.cd-wide button:active { transform:translateY(2px); box-shadow: 0 0 0 1.5px #1d1b24, 0 1px 0 #1d1b24; }
.cd-scan { border:0; border-radius:999px; cursor:pointer; font:900 11px/1 system-ui; letter-spacing:.18em; color:#3a2a00; padding:10px 18px;
  background: radial-gradient(circle at 40% 30%, #fff3a0, #ffd21f 55%, #e0a800); box-shadow: 0 0 0 2px #1d1b24, 0 4px 0 #1d1b24, 0 6px 10px rgb(0 0 0 / .3); }
.cd-scan:active { transform: translateY(3px); box-shadow: 0 0 0 2px #1d1b24, 0 1px 0 #1d1b24; }
.cd-scan:disabled { filter:saturate(.3) brightness(.9); }
.cd-hint { font:500 10px/1.3 system-ui; color:rgb(255 255 255 / .75); text-align:center; }
.cd-seen { font:800 9px/1 ui-monospace, monospace; letter-spacing:.12em; color:rgb(255 255 255 / .8); }
`;

function art(c: Critter): string {
  return `<svg class="art" viewBox="0 0 100 100" aria-hidden="true">${c.art}</svg>`;
}

const num = (i: number) => `#${String(i + 1).padStart(3, "0")}`;

/** The lid's raised step, drawn as a bevelled line. */
function step(top: string, flip = false): string {
  const d = flip ? "M0 6 H48 L62 20 H100" : "M0 20 H46 L60 6 H100";
  return `<svg class="cd-step" style="top:${top}" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="rgb(0 0 0 / .35)" stroke-width="2.4" vector-effect="non-scaling-stroke"/>
    <path d="${d}" transform="translate(0 2.4)" fill="none" stroke="rgb(255 255 255 / .22)" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
}

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let index = 0;
  const seen = new Set<number>([0]);
  let typed = 0;
  let scanning = false;
  let justFound = false;
  let cur = initial;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const all = <T extends Element = HTMLElement>(sel: string): T[] =>
    [screens.outer, screens.start, screens.end].flatMap((s) => [...s.querySelectorAll<T>(sel)]);

  // --- sound ---
  function sfx(fn: () => void): void {
    if (running()) fn();
    else ready().then(fn).catch(() => {});
  }
  const blip = () => note(88, 0.05, 0.08, "square");

  // --- actions ---
  function go(i: number): void {
    if (scanning) return;
    index = (i + CRITTERS.length) % CRITTERS.length;
    seen.add(index);
    typed = 0;
    sfx(blip);
    render(cur);
  }

  function scan(): void {
    if (scanning) return;
    scanning = true;
    justFound = false;
    sfx(() => {
      tone(500, 1500, 0.22, 0.06, "sine");
      for (let k = 1; k < 4; k++) setTimeout(() => tone(500, 1500, 0.22, 0.06, "sine"), k * 330);
    });
    render(cur);
    setTimeout(() => {
      let next = index;
      while (next === index) next = Math.floor(Math.random() * CRITTERS.length);
      index = next;
      seen.add(index);
      typed = 0;
      scanning = false;
      justFound = true;
      sfx(() => [76, 79, 84, 88].forEach((m, k) => setTimeout(() => note(m, 0.09, 0.12, "square"), k * 70)));
      render(cur);
      setTimeout(() => {
        justFound = false;
        for (const f of all(".cd-screen .found")) f.remove();
      }, 2200);
    }, 1400);
  }

  // --- the typewriter, which keeps going across poses ---
  const typer = window.setInterval(() => {
    const entry = CRITTERS[index]!.entry;
    if (scanning || typed >= entry.length) return;
    typed++;
    for (const e of all(".cd-entry")) {
      e.textContent = entry.slice(0, typed);
      e.classList.toggle("done", typed >= entry.length);
      e.scrollTop = e.scrollHeight;
    }
    if (typed % 4 === 0 && running()) note(96, 0.015, 0.025, "square");
  }, 26);

  // --- pieces ---
  function lens(px: number): string {
    return `<div class="cd-lens ${scanning ? "pulse" : ""}" style="width:${px}px;height:${px}px"><i></i></div>`;
  }
  const leds = () => `<div class="cd-leds ${scanning ? "blink" : ""}"><i></i><i></i><i></i></div>`;

  function viewer(big = true): string {
    const c = CRITTERS[index]!;
    const body = scanning
      ? `<div class="cd-radar"></div><div class="tag">SCANNING…</div>${art(c)}`
      : `<div class="tag">${num(index)}<b>${c.name.toUpperCase()}</b></div>${art(c)}${justFound ? `<div class="found">CREATURE DETECTED</div>` : ""}`;
    return `<div class="cd-screen ${scanning ? "scan" : ""} ${big ? "" : "small"}">${body}</div>`;
  }

  function data(two = false): string {
    const c = CRITTERS[index]!;
    if (scanning) return `<div class="cd-data"><div class="cd-scanning">ANALYZING…</div></div>`;
    const entry = c.entry.slice(0, typed);
    return `<div class="cd-data">
      <h4>${c.name}<small>${num(index)}</small></h4>
      <div class="kind">the ${c.kind} creature</div>
      <div class="cd-chips">${c.types.map((t) => `<span class="cd-chip" style="background:${TYPE_COLOR[t]}">${t}</span>`).join("")}</div>
      <div class="cd-hw"><span>HT <b>${c.height}</b></span><span>WT <b>${c.weight}</b></span></div>
      <div class="cd-entry ${typed >= c.entry.length ? "done" : ""}">${entry}</div>
      <div class="cd-stats ${two ? "two" : ""}">${c.stats.map((v, k) => `<span>${STAT_NAMES[k]}</span><div class="cd-bar"><i style="width:${v}%"></i></div><em>${v}</em>`).join("")}</div>
    </div>`;
  }

  const dpad = () => `<div class="cd-pad"><button class="u" data-go="-1" aria-label="Previous">▲</button><button class="l" data-go="-1" aria-label="Previous">◀</button><button class="r" data-go="1" aria-label="Next">▶</button><button class="d" data-go="1" aria-label="Next">▼</button></div>`;

  function keypad(): string {
    const keys = CRITTERS.map(
      (_, i) => `<button class="cd-key ${i === index ? "on" : ""} ${seen.has(i) ? "" : "unseen"}" data-to="${i}" aria-label="Creature ${i + 1}">${i + 1}</button>`,
    ).join("");
    return `<div class="cd-keys">${keys}<button class="cd-key" data-scan aria-label="Scan">?</button><button class="cd-key" data-retype aria-label="Read again">↺</button></div>`;
  }

  const wide = () => `<div class="cd-wide"><button data-go="-1">◀ PREV</button><button data-go="1">NEXT ▶</button></div>`;
  const seenText = () => `<span class="cd-seen">SEEN ${seen.size}/${CRITTERS.length}</span>`;

  function wire(root: HTMLElement): void {
    for (const b of root.querySelectorAll<HTMLElement>("[data-go]")) b.onclick = () => go(index + Number(b.dataset.go));
    for (const b of root.querySelectorAll<HTMLElement>("[data-to]")) b.onclick = () => go(Number(b.dataset.to));
    for (const b of root.querySelectorAll<HTMLElement>("[data-scan]")) b.onclick = scan;
    for (const b of root.querySelectorAll<HTMLElement>("[data-retype]"))
      b.onclick = () => {
        typed = 0;
        sfx(blip);
        render(cur);
      };
  }

  function el(html: string, css = ""): HTMLElement {
    const root = document.createElement("div");
    root.className = "cd cd-shell";
    if (css) root.style.cssText = css;
    root.innerHTML = html;
    wire(root);
    return root;
  }

  // --- the views ---
  function lid(p: Pose): HTMLElement {
    const scanBtn = `<button class="cd-scan" data-scan ${scanning ? "disabled" : ""}>${scanning ? "SCANNING" : "SCAN"}</button>`;
    if (p.id === "closed-landscape") {
      return el(
        `${step("20%", true)}<i class="cd-hinge h" style="top:0"></i>
        <div style="position:absolute;inset:22px 14px 14px;display:grid;grid-template-columns:118px 1fr;gap:14px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;justify-content:space-between">
            ${lens(78)}${leds()}${scanBtn}<span class="cd-brand">CRITTERDEX</span>
          </div>
          <div class="cd-bezel" style="height:100%;box-sizing:border-box">${viewer(false)}<i class="dot"></i><i class="grille"></i></div>
        </div>`,
      );
    }
    return el(
      `<i class="cd-hinge" style="left:0"></i>
      <div class="cd-top" style="padding-left:24px">${lens(62)}<div style="display:flex;flex-direction:column;gap:10px;padding-top:4px">${leds()}<span class="cd-brand">CRITTERDEX</span></div></div>
      ${step("64px")}
      <div style="position:absolute;left:26px;right:14px;top:96px;bottom:74px" class="cd-bezel">${viewer(false)}<i class="dot"></i><i class="grille"></i></div>
      <div style="position:absolute;left:26px;right:14px;bottom:14px;display:flex;align-items:center;gap:10px;justify-content:space-between">
        <button class="cd-round" data-go="-1" aria-label="Previous"></button>${scanBtn}<button class="cd-round" data-go="1" aria-label="Next"></button>
      </div>
      <div class="cd-hint" style="position:absolute;left:26px;right:14px;bottom:52px">${seenText()} · open for the full entry</div>`,
    );
  }

  /** The left page of the open device: the viewer and d-pad. */
  function viewerPage(hinge: "right" | "none"): HTMLElement {
    return el(
      `${hinge === "right" ? `<i class="cd-hinge" style="right:0"></i>` : ""}
      <div class="cd-top">${lens(54)}<div style="padding-top:4px">${leds()}</div></div>
      ${step("62px")}
      <div class="cd-bezel" style="position:absolute;left:18px;right:26px;top:88px;bottom:96px">${viewer()}<i class="dot"></i><i class="grille"></i></div>
      <div style="position:absolute;left:18px;right:26px;bottom:12px;height:78px;display:flex;align-items:center;gap:10px">
        <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start">
          <button class="cd-round" data-scan aria-label="Scan"></button>
          <div class="cd-pills"><i style="background:#e0262f"></i><i style="background:#2b8fe0"></i></div>
        </div>
        <div class="cd-minigreen" style="margin:0 auto">${num(index)}</div>
        ${dpad()}
      </div>`,
    );
  }

  /** The right page: the data panel and keypad, under the notched lid. */
  function dataPage(hinge: "left" | "none"): HTMLElement {
    const root = el(
      `${hinge === "left" ? `<i class="cd-hinge" style="left:0"></i>` : ""}
      <div style="position:absolute;left:0;right:0;top:0;height:44px;background:#000;clip-path:polygon(0 0,100% 0,100% 10%,62% 10%,48% 100%,0 100%)"></div>
      <div style="position:absolute;right:14px;top:12px">${seenText()}</div>
      ${step("30px", true)}
      <div style="position:absolute;left:26px;right:16px;top:54px;bottom:100px;display:flex">${data(true)}</div>
      <div style="position:absolute;left:26px;right:16px;bottom:12px;display:flex;flex-direction:column;gap:10px">${keypad()}${wide()}</div>`,
    );
    root.querySelector<HTMLElement>(".cd-data")!.style.flex = "1";
    return root;
  }

  /** Table / open-portrait top: the viewer, wide. */
  function viewerWide(): HTMLElement {
    return el(
      `<i class="cd-hinge h" style="bottom:0"></i>
      <div style="position:absolute;inset:14px 16px 24px;display:grid;grid-template-columns:96px 1fr;gap:14px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          ${lens(76)}${leds()}<span class="cd-brand">CRITTERDEX</span>
          <button class="cd-scan" data-scan style="padding:8px 14px" ${scanning ? "disabled" : ""}>SCAN</button>
        </div>
        <div class="cd-bezel" style="height:100%;box-sizing:border-box">${viewer()}<i class="dot"></i><i class="grille"></i></div>
      </div>`,
    );
  }

  /** Table / open-portrait bottom: data on the left, controls under the right thumb. */
  function controlsWide(): HTMLElement {
    const root = el(
      `<i class="cd-hinge h" style="top:0"></i>
      <div style="position:absolute;inset:24px 14px 14px;display:grid;grid-template-columns:1.25fr 1fr;gap:14px">
        <div style="display:flex;min-height:0">${data()}</div>
        <div style="display:flex;flex-direction:column;gap:9px;justify-content:space-between">
          <div style="display:flex;align-items:center;justify-content:space-between">${seenText()}${dpad()}</div>
          ${keypad()}${wide()}
        </div>
      </div>`,
    );
    root.querySelector<HTMLElement>(".cd-data")!.style.flex = "1";
    return root;
  }

  function render(state: DuoState): void {
    cur = state;
    const { pose } = state;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.display === "outer") {
      screens.outer.append(lid(pose));
    } else if (pose.split === "side-by-side") {
      screens.start.append(viewerPage(pose.id === "book" ? "right" : "none"));
      screens.end.append(dataPage(pose.id === "book" ? "left" : "none"));
    } else {
      screens.start.append(viewerWide());
      screens.end.append(controlsWide());
    }
  }

  return {
    render,
    destroy() {
      clearInterval(typer);
      style.remove();
    },
  };
}

export const critterdexExample: Example = {
  id: "critterdex",
  title: "Critterdex",
  category: "retro",
  summary:
    "A red clamshell field guide to eight invented creatures. Closed, it is the lid — big blue lens, status lights and a scanner; opened like a book, the left page shows the creature and the right page types out its entry beside stats and a keypad.",
  bestPose: "book",
  poses: {
    closed: "The red lid: blue lens, three status lights and a little screen — tap SCAN and it detects a random creature.",
    "closed-landscape": "The lid on its side, lens and scan button on the left and a bigger scanner screen on the right.",
    open: "The whole handheld laid flat: creature viewer and d-pad on the left page, data panel and keypad on the right.",
    "open-portrait": "Viewer on top, data and controls below — the table layout, lying flat.",
    book: "Held like the real thing: the left page shows the creature on its green screen, the right page types out its entry beside stat bars and a blue keypad.",
    table: "Stood up, the creature and scanner face you on the top half while the entry, d-pad and keypad lie flat under your thumbs.",
    stand: "Stood open like a field guide propped on a rock: creature on the left, its entry on the right.",
  },
  principle:
    "Book pose gives two facing pages with distinct jobs — picture on one, reading on the other — and the entry keeps typing where it left off through every fold, so continuity across poses is never broken.",
  credits: [{ who: "@javilosana", url: "https://x.com/javilosana/status/2104946938659623313", what: "the red handheld creature-encyclopedia app that went viral" }],
  create,
};
