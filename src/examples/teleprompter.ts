/**
 * Teleprompter — presenter mode on one phone.
 *
 * Stand the Duo on the lectern. Inside, facing you, are your speaker notes
 * rolling past a reading line, the slide you are on, the one coming next, a
 * clock and the controls. On the outer display, facing the room, is the
 * current slide, large. That second view is Apple's `sceneAccessory` (HIG
 * checklist §9, phase 12): the system can switch it off, so everything the
 * presenter needs — including what the room is seeing — stays inside too.
 *
 * The deck is six slides drawn in HTML and CSS, written for this example.
 * Slides are fluid rather than 16:9, so the same slide fills a portrait
 * outer display (standing) and a landscape one (the back of the standing half
 * in table pose); the thumbnails inside take the shape of whatever the room
 * actually sees.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { note, ready } from "../lib/audio.ts";

interface Slide {
  kicker: string;
  title: string;
  dark: boolean;
  art: string;
  notes: string[];
}

const SLIDES: Slide[] = [
  {
    kicker: "A short talk",
    title: "Why phones should fold",
    dark: true,
    art: `<div class="tp-a1"><i></i><i></i></div>`,
    notes: [
      "Good evening. I want to convince you of one thing in six slides: that a phone should fold.",
      "Not because it is new — because it is useful. Keep your phones in your pockets for this one. You'll see why.",
    ],
  },
  {
    kicker: "The problem",
    title: "Screens grew. Pockets didn't.",
    dark: false,
    art: `<div class="tp-a2"><span class="tp-pocket">pocket</span>
      <b style="height:34%"><em>’07</em></b><b style="height:42%"><em>’12</em></b><b style="height:62%"><em>’15</em></b><b style="height:84%"><em>’20</em></b><b class="tp-folded" style="height:52%"><em>fold</em></b></div>`,
    notes: [
      "Every year the screen got bigger. Three and a half inches, then four, then nearly seven.",
      "Our pockets stayed exactly the same size. For a while, the pocket lost. A fold is the first idea that makes the screen bigger and the phone smaller at the same time.",
    ],
  },
  {
    kicker: "The surprise",
    title: "A fold is a stand",
    dark: true,
    art: `<div class="tp-a3"><i></i><i></i><span>hands free</span></div>`,
    notes: [
      "Here's the part people miss. A fold isn't only a way to carry a bigger screen. It is a stand.",
      "Half open, the phone stands up on its own and your hands are free. That is how I'm reading these notes right now — the phone is standing on the lectern in front of me.",
    ],
  },
  {
    kicker: "The pattern",
    title: "Two halves, two jobs",
    dark: false,
    art: `<div class="tp-a4"><div class="tp-top">watch</div><div class="tp-bottom">touch</div></div>`,
    notes: [
      "Once it stands, the two halves can do different jobs.",
      "The half that stands up is for watching: a video, a recipe, these notes. The half that lies flat is for touching: controls, a keyboard, a game. Watch on top, touch below.",
    ],
  },
  {
    kicker: "The bonus",
    title: "Both sides at once",
    dark: true,
    art: `<div class="tp-a5"><b>you</b><i></i><b>them</b></div>`,
    notes: [
      "And the outside still has a screen. While I read my notes on the inside, you are looking at this slide on the back of the very same phone.",
      "Two people, two views, one device: translators, cameras, quiz shows — anything where someone sits across from you.",
    ],
  },
  {
    kicker: "Thank you",
    title: "Questions?",
    dark: false,
    art: `<div class="tp-a6">?</div>`,
    notes: [
      "So: a fold makes the phone smaller, gives it a stand, splits its jobs, and lets it face two ways.",
      "Thank you. I'd love your questions — and yes, you can come and turn it around.",
    ],
  },
];

/** Where each slide's notes begin, as a fraction of the script, when no script is on screen to measure. */
const SECTION_FRAC: number[] = (() => {
  const lens = SLIDES.map((s) => s.notes.join(" ").length + 60);
  const total = lens.reduce((a, b) => a + b, 0);
  let acc = 0;
  return lens.map((l) => {
    const f = acc / total;
    acc += l;
    return f;
  });
})();

const SPEEDS = [14, 22, 32, 44, 58]; // px per second at the reading line

const CSS = `
.tp { position:absolute; inset:0; display:flex; flex-direction:column; background:#14131c; color:#f4efe6; font:13px/1.35 ui-sans-serif,system-ui; }
.tp-pad-s { padding-right:16px; } .tp-pad-e { padding-left:16px; }
.tp-pad-t { padding-bottom:16px; } .tp-pad-b { padding-top:16px; }
.tp-bar { flex:none; display:flex; align-items:center; gap:10px; padding:9px 12px 7px; font:600 11.5px ui-monospace,monospace; color:#b9b3a8; }
.tp-bar .tp-rec { color:#ff6b4a; }
.tp-bar .tp-sp { margin-left:auto; }
.tp-roll { position:relative; flex:1; overflow:hidden; mask-image:linear-gradient(transparent, #000 14%, #000 80%, transparent); -webkit-mask-image:linear-gradient(transparent, #000 14%, #000 80%, transparent); }
.tp-script { position:absolute; left:0; right:0; top:0; padding:0 16px 60cqh; will-change:transform; }
.tp-script section { padding:0 0 22px; opacity:.42; transition:opacity .3s; }
.tp-script section.tp-cur { opacity:1; }
.tp-script h4 { margin:0 0 6px; font:700 10.5px ui-monospace,monospace; letter-spacing:.1em; text-transform:uppercase; color:#ff6b4a; }
.tp-script p { margin:0 0 .6em; font-size:clamp(17px, 7cqw, 27px); line-height:1.32; font-weight:550; }
.tp-guide { position:absolute; left:0; right:0; top:30%; height:0; border-top:1px dashed rgb(255 107 74 / .5); pointer-events:none; }
.tp-guide::before { content:""; position:absolute; left:3px; top:-6px; border:6px solid transparent; border-left:8px solid #ff6b4a; }
.tp-hint { flex:none; text-align:center; font-size:10.5px; color:#8f897f; padding:4px 10px 9px; }

.tp-stage { position:absolute; inset:0; container-type:size; overflow:hidden; }
.tp-thumb { position:relative; container-type:size; border-radius:8px; overflow:hidden; box-shadow:0 0 0 1px rgb(255 255 255 / .12); }
.tp-s { position:absolute; inset:0; display:flex; flex-direction:column; gap:3cqmin; padding:8cqmin 8cqmin 12cqmin; background:#f4efe6; color:#1d1b2e; font-family:ui-sans-serif,system-ui; overflow:hidden; }
.tp-s.tp-dark { background:#1d1b2e; color:#f4efe6; }
.tp-s .tp-k { font:700 4cqmin/1 ui-monospace,monospace; letter-spacing:.14em; text-transform:uppercase; color:#ff6b4a; }
.tp-s h2 { margin:0; font-size:11cqmin; line-height:1.02; font-weight:800; letter-spacing:-.02em; }
.tp-s .tp-art { flex:1; min-height:0; position:relative; display:flex; align-items:center; justify-content:center; }
.tp-s .tp-no { position:absolute; right:5cqmin; bottom:4cqmin; font:600 3.4cqmin ui-monospace,monospace; opacity:.45; }
.tp-a1 { position:relative; width:44cqmin; height:36cqmin; }
.tp-a1 i { position:absolute; bottom:0; width:20cqmin; height:32cqmin; border-radius:3cqmin; background:#ff6b4a; }
.tp-a1 i:first-child { left:1cqmin; transform:skewY(10deg); background:#ff8f73; }
.tp-a1 i:last-child { right:1cqmin; transform:skewY(-10deg); }
.tp-a2 { position:relative; display:flex; align-items:flex-end; gap:3cqmin; width:100%; height:100%; max-height:52cqmin; border-bottom:.6cqmin solid currentColor; }
.tp-a2 b { position:relative; flex:1; background:#1d1b2e; border-radius:1.5cqmin 1.5cqmin 0 0; }
.tp-a2 b.tp-folded { background:linear-gradient(#ff6b4a 0 49%, #f4efe6 49% 51%, #ff6b4a 51%); }
.tp-a2 em { position:absolute; left:0; right:0; bottom:-6cqmin; text-align:center; font:600 3.6cqmin ui-monospace,monospace; font-style:normal; }
.tp-pocket { position:absolute; left:-2cqmin; right:-2cqmin; bottom:60%; border-top:.5cqmin dashed #ff6b4a; font:700 3.4cqmin ui-monospace,monospace; color:#ff6b4a; text-align:right; }
.tp-a3 { position:relative; width:46cqmin; height:30cqmin; border-bottom:.6cqmin solid currentColor; }
.tp-a3 i { position:absolute; left:calc(50% - 2cqmin); top:0; width:4cqmin; height:34cqmin; border-radius:1.5cqmin; background:#ff6b4a; transform-origin:50% 0; transform:rotate(28deg); }
.tp-a3 i:last-of-type { transform:rotate(-28deg); background:#ff8f73; }
.tp-a3 span { position:absolute; left:0; right:0; bottom:-7cqmin; text-align:center; font:600 3.6cqmin ui-monospace,monospace; opacity:.7; }
.tp-a4 { display:flex; flex-direction:column; align-items:center; gap:1cqmin; }
.tp-a4 div { display:flex; align-items:center; justify-content:center; width:46cqmin; font:700 5cqmin ui-sans-serif,system-ui; border-radius:2cqmin; }
.tp-a4 .tp-top { height:24cqmin; background:#1d1b2e; color:#f4efe6; }
.tp-a4 .tp-bottom { height:22cqmin; background:#ff6b4a; color:#fff; transform:perspective(40cqmin) rotateX(48deg); transform-origin:50% 0; }
.tp-a5 { display:flex; align-items:center; gap:5cqmin; }
.tp-a5 b { width:17cqmin; height:17cqmin; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#f4efe6; color:#1d1b2e; font:700 4.4cqmin system-ui; }
.tp-a5 b:last-child { background:#ff6b4a; color:#fff; }
.tp-a5 i { width:3cqmin; height:26cqmin; border-radius:1cqmin; background:linear-gradient(90deg,#f4efe6 50%,#ff6b4a 50%); }
.tp-a6 { width:34cqmin; height:34cqmin; border-radius:50%; background:#ff6b4a; color:#fff; display:flex; align-items:center; justify-content:center; font:800 24cqmin/1 ui-sans-serif,system-ui; }

.tp-ctl { position:absolute; inset:0; display:flex; flex-direction:column; gap:8px; padding:10px 12px; background:#1c1b26; color:#f4efe6; font:13px/1.3 ui-sans-serif,system-ui; }
.tp-ctl.tp-wide { display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto 1fr; column-gap:12px; }
.tp-thumbs { display:flex; gap:10px; align-items:flex-end; }
.tp-wide .tp-thumbs { grid-row:1 / span 2; flex-direction:column; align-items:stretch; justify-content:center; }
.tp-tl { display:flex; flex-direction:column; gap:4px; font:600 10px ui-monospace,monospace; color:#b9b3a8; text-transform:uppercase; letter-spacing:.08em; }
.tp-tl.tp-next { opacity:.7; }
.tp-tl .tp-on { color:#ff6b4a; }
.tp-time { display:flex; align-items:baseline; gap:8px; font:700 26px ui-monospace,monospace; }
.tp-time small { font:600 11px ui-monospace,monospace; color:#b9b3a8; }
.tp-btns { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:auto; }
.tp-btn { all:unset; box-sizing:border-box; text-align:center; cursor:pointer; padding:10px 6px; border-radius:11px; background:#2c2a39; color:#f4efe6; font:650 13px system-ui; }
.tp-btn:active { background:#3d3a4f; }
.tp-btn.tp-go { background:#ff6b4a; color:#fff; }
.tp-btn.tp-due { animation:tp-pulse 1s ease-in-out infinite; }
@keyframes tp-pulse { 50% { box-shadow:0 0 0 4px rgb(255 107 74 / .45); } }
.tp-speed { grid-column:1 / -1; display:flex; align-items:center; gap:7px; }
.tp-speed .tp-btn { flex:none; width:38px; padding:7px 0; }
.tp-speed span { flex:1; text-align:center; font:600 11.5px ui-monospace,monospace; color:#b9b3a8; }
.tp-mini { flex:none; display:flex; gap:6px; padding:6px 10px 10px; }
.tp-mini .tp-btn { flex:1; padding:8px 4px; font-size:12px; }
.tp-chip { position:absolute; right:8px; top:8px; z-index:2; padding:3px 8px; border-radius:999px; background:rgb(20 19 28 / .7); color:#f4efe6; font:600 10.5px ui-monospace,monospace; pointer-events:none; }
.tp-tap { position:absolute; inset:0; z-index:1; cursor:pointer; }
.tp-dots { position:absolute; left:0; right:0; bottom:6px; display:flex; justify-content:center; gap:5px; z-index:2; pointer-events:none; }
.tp-dots i { width:5px; height:5px; border-radius:50%; background:rgb(128 128 128 / .45); }
.tp-dots i.tp-on { background:#ff6b4a; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  let state = initial;
  let slide = 0;
  /** Position of the reading line in the script, 0..1 — a fraction so it survives reflow between poses. */
  let progress = 0;
  let playing = false;
  let speed = 2; // index into SPEEDS
  let timerAcc = 0;
  let timerSince: number | null = null;

  /** Live references into the current render, for the animation loop. */
  let rolls: { roll: HTMLElement; script: HTMLElement }[] = [];
  let clocks: HTMLElement[] = [];
  let dues: HTMLElement[] = [];
  let playBtns: HTMLElement[] = [];

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const el = (html: string): HTMLElement => {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild as HTMLElement;
  };

  const elapsed = (): number => timerAcc + (timerSince === null ? 0 : performance.now() - timerSince);
  const mmss = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  const clockNow = (): string => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  function blip(midi: number): void {
    ready()
      .then(() => note(midi, 0.06, 0.06, "sine"))
      .catch(() => {});
  }

  function slideEl(i: number): HTMLElement {
    const s = SLIDES[i]!;
    return el(`<div class="tp-s${s.dark ? " tp-dark" : ""}">
      <div class="tp-k">${s.kicker}</div><h2>${s.title}</h2>
      <div class="tp-art">${s.art}</div><div class="tp-no">${i + 1} / ${SLIDES.length}</div></div>`);
  }

  /** The shape the room sees: the outer display, portrait unless the fold runs across. */
  const roomAspect = (): string => (state.pose.split === "stacked" ? "380 / 300" : "300 / 380");

  function thumb(i: number, width: number): HTMLElement {
    const t = el(`<div class="tp-thumb" style="width:${width}px; aspect-ratio:${roomAspect()}"></div>`);
    t.append(slideEl(i));
    return t;
  }

  function go(to: number): void {
    const next = Math.max(0, Math.min(SLIDES.length - 1, to));
    if (next === slide) return;
    slide = next;
    progress = sectionStart(slide);
    blip(next > 0 ? 76 : 72);
    render(state);
  }

  function sectionStart(i: number): number {
    const live = rolls[0];
    if (live) {
      const sec = live.script.querySelectorAll("section")[i] as HTMLElement | undefined;
      const h = live.script.scrollHeight;
      if (sec && h) return sec.offsetTop / h;
    }
    return SECTION_FRAC[i] ?? 0;
  }

  function togglePlay(): void {
    playing = !playing;
    if (playing && timerSince === null) timerSince = performance.now();
    blip(playing ? 79 : 74);
    render(state);
  }

  function reset(): void {
    playing = false;
    timerAcc = 0;
    timerSince = null;
    slide = 0;
    progress = 0;
    render(state);
  }

  /** Speaker notes on a roll, past a reading line. */
  function prompter(hint?: string): HTMLElement {
    const root = el(`<div class="tp">
      <div class="tp-bar"><span class="tp-rec">●</span><span data-clock="elapsed">${mmss(elapsed())}</span><span data-clock="now">${clockNow()}</span><span class="tp-sp">${slide + 1}/${SLIDES.length}</span></div>
      <div class="tp-roll"><div class="tp-script"></div><div class="tp-guide"></div></div>
      ${hint ? `<div class="tp-hint">${hint}</div>` : ""}</div>`);
    const script = root.querySelector<HTMLElement>(".tp-script")!;
    SLIDES.forEach((s, i) => {
      const sec = el(`<section class="${i === slide ? "tp-cur" : ""}"><h4>${i + 1} · ${s.title}</h4>${s.notes.map((n) => `<p>${n}</p>`).join("")}</section>`);
      script.append(sec);
    });
    rolls.push({ roll: root.querySelector<HTMLElement>(".tp-roll")!, script });
    clocks.push(...root.querySelectorAll<HTMLElement>("[data-clock]"));
    return root;
  }

  /** The presenter's controls: what the room sees, what's next, the clock, the buttons. */
  function controls(wide: boolean): HTMLElement {
    const root = el(`<div class="tp-ctl${wide ? " tp-wide" : ""}">
      <div class="tp-thumbs"></div>
      <div class="tp-time"><span data-clock="elapsed">${mmss(elapsed())}</span><small data-clock="now">${clockNow()}</small></div>
      <div class="tp-btns">
        <button class="tp-btn" data-a="prev">◀ Back</button>
        <button class="tp-btn tp-go" data-a="next">Next ▶</button>
        <button class="tp-btn" data-a="play">${playing ? "❚❚ Pause notes" : "▶ Roll notes"}</button>
        <button class="tp-btn" data-a="reset">↺ Reset</button>
        <div class="tp-speed"><button class="tp-btn" data-a="slower" aria-label="Slower">−</button><span>speed ${speed + 1}</span><button class="tp-btn" data-a="faster" aria-label="Faster">+</button></div>
      </div></div>`);
    const thumbs = root.querySelector(".tp-thumbs")!;
    const w = wide ? 132 : 112;
    const now = el(`<div class="tp-tl"><span>${state.accessory ? `<b class="tp-on">● Room sees</b>` : "Now · room display off"}</span></div>`);
    now.append(thumb(slide, w));
    thumbs.append(now);
    const nx = el(`<div class="tp-tl tp-next"><span>${slide < SLIDES.length - 1 ? "Next" : "End of deck"}</span></div>`);
    if (slide < SLIDES.length - 1) nx.append(thumb(slide + 1, wide ? 96 : 84));
    thumbs.append(nx);
    wire(root);
    clocks.push(...root.querySelectorAll<HTMLElement>("[data-clock]"));
    return root;
  }

  /** A compact strip of controls under the notes, for poses where the other half shows the slide. */
  function mini(): HTMLElement {
    const root = el(`<div class="tp-mini">
      <button class="tp-btn" data-a="prev">◀</button>
      <button class="tp-btn" data-a="play">${playing ? "❚❚" : "▶ Roll"}</button>
      <button class="tp-btn" data-a="slower">−</button><button class="tp-btn" data-a="faster">+</button>
      <button class="tp-btn tp-go" data-a="next">Next ▶</button></div>`);
    wire(root);
    return root;
  }

  function wire(root: HTMLElement): void {
    for (const b of root.querySelectorAll<HTMLElement>("[data-a]")) {
      const a = b.dataset.a;
      if (a === "next") dues.push(b);
      if (a === "play") playBtns.push(b);
      b.onclick = () => {
        if (a === "prev") go(slide - 1);
        else if (a === "next") go(slide + 1);
        else if (a === "play") togglePlay();
        else if (a === "reset") reset();
        else if (a === "slower" || a === "faster") {
          speed = Math.max(0, Math.min(SPEEDS.length - 1, speed + (a === "faster" ? 1 : -1)));
          render(state);
        }
      };
    }
  }

  /** The current slide filling a display, optionally tap-to-advance. */
  function stage(tappable: boolean, chip = false): HTMLElement {
    const root = el(`<div class="tp-stage"></div>`);
    root.append(slideEl(slide));
    const dots = el(`<div class="tp-dots">${SLIDES.map((_, i) => `<i class="${i === slide ? "tp-on" : ""}"></i>`).join("")}</div>`);
    root.append(dots);
    if (chip) {
      const c = el(`<div class="tp-chip"><span data-clock="elapsed">${mmss(elapsed())}</span></div>`);
      clocks.push(c.querySelector<HTMLElement>("[data-clock]")!);
      root.append(c);
    }
    if (tappable) {
      const tap = el(`<div class="tp-tap" role="button" aria-label="Tap right to advance, left to go back"></div>`);
      tap.onclick = (e) => {
        const r = tap.getBoundingClientRect();
        go((e as MouseEvent).clientX - r.left < r.width / 3 ? slide - 1 : slide + 1);
      };
      root.append(tap);
    }
    return root;
  }

  /** Closed: notes alone. Swipe sideways to change slide, tap to roll or pause. */
  function swipeNotes(): HTMLElement {
    const root = prompter("Swipe to change slide · tap to roll or pause");
    let x0 = 0;
    let y0 = 0;
    root.addEventListener("pointerdown", (e) => {
      x0 = e.clientX;
      y0 = e.clientY;
    });
    root.addEventListener("pointerup", (e) => {
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? slide + 1 : slide - 1);
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) togglePlay();
    });
    return root;
  }

  function render(next: DuoState): void {
    state = next;
    rolls = [];
    clocks = [];
    dues = [];
    playBtns = [];
    const { pose, accessory } = next;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.id === "closed") {
      screens.outer.append(swipeNotes());
    } else if (pose.id === "closed-landscape") {
      screens.outer.append(stage(true, true));
    } else if (pose.id === "open") {
      // Flat in your hands, the outer display faces the floor: show the slide inside.
      screens.start.append(stage(true));
      const notes = prompter();
      notes.append(mini());
      screens.end.append(notes);
    } else {
      const stacked = pose.split === "stacked";
      const p = prompter();
      p.classList.add(stacked ? "tp-pad-t" : "tp-pad-s");
      screens.start.append(p);
      const c = controls(stacked);
      c.classList.add(stacked ? "tp-pad-b" : "tp-pad-e");
      screens.end.append(c);
    }
    if (accessory && pose.display === "inner") screens.outer.append(stage(false));
    paint();
  }

  /** Move the rolls, tick the clocks, nudge the Next button when the notes run into the next slide. */
  function paint(): void {
    let reading = slide;
    for (const { roll, script } of rolls) {
      const h = script.scrollHeight - roll.clientHeight * 0.6;
      const guide = roll.clientHeight * 0.3;
      script.style.transform = `translateY(${guide - progress * script.scrollHeight}px)`;
      if (h > 0 && rolls[0]?.script === script) {
        const y = progress * script.scrollHeight;
        script.querySelectorAll("section").forEach((s, i) => {
          if ((s as HTMLElement).offsetTop <= y + 4) reading = i;
        });
      }
    }
    for (const d of dues) d.classList.toggle("tp-due", reading > slide);
    const e = mmss(elapsed());
    const n = clockNow();
    for (const c of clocks) {
      const v = c.dataset.clock === "now" ? n : e;
      if (c.textContent !== v) c.textContent = v;
    }
  }

  let last = performance.now();
  let raf = 0;
  const loop = (t: number): void => {
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (playing) {
      const script = rolls[0]?.script;
      const h = script?.scrollHeight || 2000;
      // The tail padding is 60% of the roll; stop when the last line reaches the reading line.
      const end = script ? 1 - (rolls[0]!.roll.clientHeight * 0.6) / h : 1;
      progress = Math.min(end, progress + (SPEEDS[speed]! * dt) / h);
      if (progress >= end) {
        playing = false;
        render(state);
      }
    }
    paint();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  render(initial);

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      style.remove();
    },
  };
}

export const teleprompterExample: Example = {
  id: "teleprompter",
  title: "Teleprompter",
  category: "productivity",
  summary:
    "Presenter mode on one phone. Stand it on the lectern: your notes roll past a reading line inside, with the clock, what's next and the controls — and the room sees the current slide, large, on the outer display.",
  bestPose: "stand",
  accessory: "The current slide, large, for the room — while your notes and controls stay inside.",
  poses: {
    closed: "Notes only, rolling past a reading line: swipe sideways to change slide, tap to roll or pause.",
    "closed-landscape": "The current slide, full screen: tap the right of it to advance, the left to go back.",
    open: "Held flat, the outer display faces the floor, so the slide and your notes sit side by side inside.",
    "open-portrait": "Notes above, controls and slide thumbnails below; the slide is lit on the back for anyone behind it.",
    book: "Held like a clipboard: notes on the left page, controls on the right, and the slide on the back for the room.",
    table: "Notes stand up facing you as a teleprompter, the controls lie flat, and the slide is on the back of the standing half.",
    stand: "Stood on the lectern: notes left, controls right, and the current slide on the outer display facing the room.",
  },
  principle:
    "The outer display shows the room the slide while the presenter works inside — Apple's scene accessory. The system can switch it off, so the presenter always sees what the room sees, and the deck runs one-way without it (HIG checklist §9, 'Scene accessories').",
  create,
};
