/**
 * E-ink Reader — a paper-like book for the Duo.
 *
 * Open it like a paperback and you get two facing pages with the fold as the
 * gutter; close it and it is a one-page pocket reader; set it down in table
 * pose and the standing half is the page while the flat half becomes a set of
 * big, easy page-turn controls. The text is the opening of Thoreau's "Walden"
 * (1854), public domain.
 *
 * The reading position is a *word*, not a page number. Every pose has a
 * different page size, so the book is re-paginated for each one, and the page
 * shown is whichever contains that word — so closing, opening and changing
 * the type size never lose your place (HIG, "Displays, poses, and continuity").
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

type Block = { h?: boolean; text: string };

/** Walden, "Economy", opening paragraphs (lightly abridged, public domain). */
const WALDEN: Block[] = [
  { h: true, text: "Economy" },
  {
    text: "When I wrote the following pages, or rather the bulk of them, I lived alone, in the woods, a mile from any neighbor, in a house which I had built myself, on the shore of Walden Pond, in Concord, Massachusetts, and earned my living by the labor of my hands only. I lived there two years and two months. At present I am a sojourner in civilized life again.",
  },
  {
    text: "I should not obtrude my affairs so much on the notice of my readers if very particular inquiries had not been made by my townsmen concerning my mode of life, which some would call impertinent, though they do not appear to me at all impertinent, but, considering the circumstances, very natural and pertinent. Some have asked what I got to eat; if I did not feel lonesome; if I was not afraid; and the like. Others have been curious to learn what portion of my income I devoted to charitable purposes; and some, who have large families, how many poor children I maintained. I will therefore ask those of my readers who feel no particular interest in me to pardon me if I undertake to answer some of these questions in this book. In most books, the I, or first person, is omitted; in this it will be retained; that, in respect to egotism, is the main difference. We commonly do not remember that it is, after all, always the first person that is speaking. I should not talk so much about myself if there were anybody else whom I knew as well. Unfortunately, I am confined to this theme by the narrowness of my experience.",
  },
  {
    text: "Moreover, I, on my side, require of every writer, first or last, a simple and sincere account of his own life, and not merely what he has heard of other men’s lives; some such account as he would send to his kindred from a distant land; for if he has lived sincerely, it must have been in a distant land to me. Perhaps these pages are more particularly addressed to poor students. As for the rest of my readers, they will accept such portions as apply to them. I trust that none will stretch the seams in putting on the coat, for it may do good service to him whom it fits.",
  },
  {
    text: "I would fain say something, not so much concerning the Chinese and Sandwich Islanders as you who read these pages, who are said to live in New England; something about your condition, especially your outward condition or circumstances in this world, in this town, what it is, whether it is necessary that it be as bad as it is, whether it cannot be improved as well as not. I have travelled a good deal in Concord; and everywhere, in shops, and offices, and fields, the inhabitants have appeared to me to be doing penance in a thousand remarkable ways.",
  },
  {
    text: "The twelve labors of Hercules were trifling in comparison with those which my neighbors have undertaken; for they were only twelve, and had an end; but I could never see that these men slew or captured any monster or finished any labor. They have no friend Iolas to burn with a hot iron the root of the hydra’s head, but as soon as one head is crushed, two spring up.",
  },
  {
    text: "I see young men, my townsmen, whose misfortune it is to have inherited farms, houses, barns, cattle, and farming tools; for these are more easily acquired than got rid of. Better if they had been born in the open pasture and suckled by a wolf, that they might have seen with clearer eyes what field they were called to labor in. Who made them serfs of the soil? Why should they eat their sixty acres, when man is condemned to eat only his peck of dirt? Why should they begin digging their graves as soon as they are born? They have got to live a man’s life, pushing all these things before them, and get on as well as they can.",
  },
  {
    text: "How many a poor immortal soul have I met well-nigh crushed and smothered under its load, creeping down the road of life, pushing before it a barn seventy-five feet by forty, its Augean stables never cleansed, and one hundred acres of land, tillage, mowing, pasture, and wood-lot! The portionless, who struggle with no such unnecessary inherited encumbrances, find it labor enough to subdue and cultivate a few cubic feet of flesh.",
  },
  {
    text: "But men labor under a mistake. The better part of the man is soon plowed into the soil for compost. By a seeming fate, commonly called necessity, they are employed, as it says in an old book, laying up treasures which moth and rust will corrupt and thieves break through and steal. It is a fool’s life, as they will find when they get to the end of it, if not before.",
  },
  {
    text: "Most men, even in this comparatively free country, through mere ignorance and mistake, are so occupied with the factitious cares and superfluously coarse labors of life that its finer fruits cannot be plucked by them. Their fingers, from excessive toil, are too clumsy and tremble too much for that. Actually, the laboring man has not leisure for a true integrity day by day; he cannot afford to sustain the manliest relations to men; his labor would be depreciated in the market. He has no time to be anything but a machine.",
  },
  {
    text: "The finest qualities of our nature, like the bloom on fruits, can be preserved only by the most delicate handling. Yet we do not treat ourselves nor one another thus tenderly.",
  },
  {
    text: "The mass of men lead lives of quiet desperation. What is called resignation is confirmed desperation. From the desperate city you go into the desperate country, and have to console yourself with the bravery of minks and muskrats. A stereotyped but unconscious despair is concealed even under what are called the games and amusements of mankind. There is no play in them, for this comes after work. But it is a characteristic of wisdom not to do desperate things.",
  },
];

const WORDS = WALDEN.map((b) => b.text.split(/\s+/));
/** Global index of each block's first word. */
const BLOCK_START: number[] = [];
let TOTAL = 0;
for (const w of WORDS) {
  BLOCK_START.push(TOTAL);
  TOTAL += w.length;
}

const FONT_SIZES = [13.5, 15, 17] as const;

type Page = { start: number; end: number };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** The HTML for the words [start, end), with paragraph continuations marked. */
function pageHTML(start: number, end: number): string {
  let html = "";
  WALDEN.forEach((b, i) => {
    const b0 = BLOCK_START[i]!;
    const b1 = b0 + WORDS[i]!.length;
    const s = Math.max(start, b0);
    const e = Math.min(end, b1);
    if (s >= e) return;
    const words = WORDS[i]!.slice(s - b0, e - b0).join(" ");
    if (b.h) {
      html += `<h2 class="rd-h"><small>Chapter I</small>${esc(words)}</h2>`;
      return;
    }
    const cls = [s > b0 ? "rd-cont" : "", i === 1 && s === b0 ? "rd-first" : "", e < b1 ? "rd-split" : ""].filter(Boolean).join(" ");
    html += `<p class="${cls}">${esc(words)}</p>`;
  });
  return html;
}

/** Hatched lines for the engraving, clipped by the vignette. */
function hatch(y0: number, y1: number, step: number, x0 = 20, x1 = 220, w = 0.5): string {
  let s = "";
  for (let y = y0; y <= y1; y += step) s += `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke-width="${w}"/>`;
  return s;
}

function pine(x: number, base: number, h: number): string {
  const tiers = 4;
  let p = "";
  for (let i = 0; i < tiers; i++) {
    const top = base - h + (i * h) / tiers;
    const bot = top + h / tiers + 6;
    const wdt = 4 + i * 3.4;
    p += `<path d="M${x} ${top} L${x - wdt} ${bot} L${x + wdt} ${bot} Z"/>`;
  }
  return `<g>${p}<rect x="${x - 0.8}" y="${base - 2}" width="1.6" height="5"/></g>`;
}

const COVER = `
<svg class="rd-cover" viewBox="0 0 240 330" preserveAspectRatio="xMidYMid meet" aria-label="Walden; or, Life in the Woods — title page">
  <defs>
    <clipPath id="rd-vig"><ellipse cx="120" cy="178" rx="78" ry="46"/></clipPath>
  </defs>
  <g fill="none" stroke="currentColor">
    <rect x="6" y="6" width="228" height="318" stroke-width="1.6"/>
    <rect x="10" y="10" width="220" height="310" stroke-width="0.5"/>
  </g>
  <g fill="currentColor" text-anchor="middle" font-family="'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif">
    <text x="120" y="52" font-size="34" letter-spacing="6" font-weight="600">WALDEN;</text>
    <text x="120" y="70" font-size="10" font-style="italic">or,</text>
    <text x="120" y="88" font-size="13" letter-spacing="3">LIFE IN THE WOODS.</text>
    <text x="120" y="108" font-size="7" letter-spacing="1.5">BY HENRY D. THOREAU,</text>
    <text x="120" y="118" font-size="5" letter-spacing="0.6" font-style="italic">author of “a week on the concord and merrimack rivers.”</text>
  </g>
  <g stroke="currentColor" fill="currentColor">
    <g clip-path="url(#rd-vig)">
      <g stroke-opacity="0.55">${hatch(132, 176, 2.6, 20, 220, 0.35)}</g>
      <path d="M40 176 Q70 160 96 168 T150 162 T210 172 L210 180 L40 180 Z" fill-opacity="0.55" stroke="none"/>
      <g stroke-opacity="0.9">${hatch(181, 226, 1.7, 20, 220, 0.55)}</g>
      <g stroke="none">
        ${pine(58, 180, 34)}${pine(70, 181, 26)}${pine(168, 179, 30)}${pine(180, 181, 40)}${pine(194, 180, 24)}
        <rect x="112" y="166" width="18" height="12" fill-opacity="0.9"/>
        <path d="M109 167 L121 158 L133 167 Z"/>
        <rect x="126" y="156" width="3" height="6"/>
      </g>
      <g fill="none" stroke-opacity="0.5" stroke-width="0.4">
        <path d="M86 196 q10 -3 20 0 t20 0"/><path d="M110 206 q12 -3 24 0 t24 0"/><path d="M70 212 q8 -2 16 0 t16 0"/>
      </g>
    </g>
    <ellipse cx="120" cy="178" rx="78" ry="46" fill="none" stroke-width="1"/>
    <ellipse cx="120" cy="178" rx="81" ry="49" fill="none" stroke-width="0.4"/>
  </g>
  <g fill="currentColor" text-anchor="middle" font-family="'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif" font-style="italic" font-size="5.6">
    <text x="120" y="244">I do not propose to write an ode to dejection, but to brag</text>
    <text x="120" y="252">as lustily as chanticleer in the morning, standing on his</text>
    <text x="120" y="260">roost, if only to wake my neighbors up.</text>
  </g>
  <g fill="currentColor" text-anchor="middle" font-family="'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif">
    <line x1="96" y1="274" x2="144" y2="274" stroke="currentColor" stroke-width="0.5"/>
    <text x="120" y="292" font-size="8" letter-spacing="2">BOSTON:</text>
    <text x="120" y="302" font-size="6.5" letter-spacing="1.4">TICKNOR AND FIELDS.</text>
    <text x="120" y="312" font-size="6" letter-spacing="2">M DCCC LIV.</text>
  </g>
</svg>`;

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0 0.07  0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CSS = `
.rd-page { position:absolute; inset:0; display:flex; flex-direction:column; padding:14px 20px 10px; box-sizing:border-box;
  background:${GRAIN}, radial-gradient(120% 90% at 50% 40%, #efece4, #e2ded3); color:#1e1d1b; cursor:default; touch-action:pan-y; }
.rd-page.rd-left { padding-right:24px; box-shadow: inset -14px 0 18px -14px rgb(0 0 0 / 0.28); }
.rd-page.rd-right { padding-left:24px; box-shadow: inset 14px 0 18px -14px rgb(0 0 0 / 0.28); }
.rd-page.rd-top { box-shadow: inset 0 -14px 18px -14px rgb(0 0 0 / 0.25); }
.rd-page.rd-bottom { box-shadow: inset 0 14px 18px -14px rgb(0 0 0 / 0.25); }
.rd-head, .rd-foot { display:flex; justify-content:space-between; font:500 8.5px/1 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif; letter-spacing:0.22em; text-transform:uppercase; color:#55524b; }
.rd-head { padding-bottom:8px; border-bottom:0.5px solid #b9b4a8; margin-bottom:10px; }
.rd-foot { padding-top:8px; justify-content:center; letter-spacing:0.1em; font-size:10px; }
.rd-page.rd-isCover .rd-head, .rd-page.rd-isCover .rd-foot { visibility:hidden; }
.rd-body { position:relative; flex:1; min-height:0; }
.rd-text { position:absolute; inset:0; overflow:hidden; font-family:'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif;
  font-size:var(--rd-fs, 15px); line-height:1.46; text-align:justify; hyphens:auto; -webkit-hyphens:auto; font-kerning:normal; text-rendering:optimizeLegibility; }
.rd-text p { margin:0; text-indent:1.4em; }
.rd-text p.rd-cont, .rd-text p.rd-first { text-indent:0; }
.rd-text p.rd-split { text-align-last:justify; }
.rd-text p.rd-first::first-letter { float:left; font-size:3.2em; line-height:0.82; padding:0.06em 0.08em 0 0; font-weight:600; }
.rd-h { margin:0.6em 0 1.1em; text-align:center; font-weight:500; font-size:1.55em; letter-spacing:0.12em; text-transform:uppercase; }
.rd-h small { display:block; font-size:0.42em; letter-spacing:0.3em; color:#6a665d; margin-bottom:0.5em; font-style:italic; text-transform:none; }
.rd-measure { visibility:hidden; pointer-events:none; }
.rd-cover { position:absolute; inset:-4px -8px; width:calc(100% + 16px); height:calc(100% + 8px); color:#1e1d1b; }
.rd-end { position:absolute; inset:0; display:grid; place-items:center; text-align:center; font:italic 13px/1.5 'Iowan Old Style',Palatino,Georgia,serif; color:#6a665d; }
.rd-end b { display:block; font-style:normal; font-size:20px; letter-spacing:0.4em; color:#1e1d1b; margin-bottom:6px; }
.rd-flash { position:absolute; inset:0; pointer-events:none; opacity:0; z-index:3; }
.rd-flash.go { animation: rd-flash 0.42s steps(1, end); }
@keyframes rd-flash { 0% { opacity:1; background:#111; } 22% { opacity:1; background:#f4f1ea; } 44% { opacity:1; background:#111; } 66% { opacity:0.6; background:#f4f1ea; } 100% { opacity:0; } }
.rd-ctl { position:absolute; inset:0; display:grid; grid-template-rows:auto 1fr auto; gap:10px; padding:14px 16px 12px; box-sizing:border-box;
  background:${GRAIN}, #e6e2d8; color:#1e1d1b; font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif; }
.rd-prog { display:grid; gap:6px; }
.rd-prog .lbl { display:flex; justify-content:space-between; font-size:11px; letter-spacing:0.08em; color:#4a473f; }
.rd-track { position:relative; height:14px; border:1px solid #1e1d1b; border-radius:8px; cursor:pointer; overflow:hidden; background:#f1eee7; }
.rd-track i { position:absolute; left:0; top:0; bottom:0; background:repeating-linear-gradient(135deg, #1e1d1b 0 2px, #6b675e 2px 4px); }
.rd-turns { display:grid; grid-template-columns:1fr 1.5fr; gap:10px; min-height:0; }
.rd-turns button, .rd-fs button { border:1.5px solid #1e1d1b; border-radius:12px; background:#f4f1ea; color:#1e1d1b; font:500 16px 'Iowan Old Style',Palatino,Georgia,serif; cursor:pointer; letter-spacing:0.04em; }
.rd-turns button:active, .rd-fs button:active { background:#1e1d1b; color:#f4f1ea; }
.rd-turns button:disabled { opacity:0.35; }
.rd-turns button span { display:block; font-size:30px; line-height:1; margin-bottom:4px; }
.rd-fs { display:flex; align-items:center; gap:8px; font-size:11px; letter-spacing:0.08em; color:#4a473f; }
.rd-fs button { width:42px; height:30px; border-radius:9px; padding:0; }
.rd-fs button.on { background:#1e1d1b; color:#f4f1ea; }
.rd-fs .sp { flex:1; }
`;

function create(screens: Screens, _state: DuoState): Instance {
  // --- state, which outlives every render ---
  /** The first word of the current page, or -1 for the title page. */
  let anchor = -1;
  let font = 1;
  let dead = false;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const cache = new Map<string, Page[]>();
  let pages: Page[] = [];
  let mode: "single" | "spread" | "table" = "single";
  /** The page elements on screen: one (single/table) or two (spread). */
  let views: HTMLElement[] = [];
  let ctl: HTMLElement | null = null;

  const pageCount = () => pages.length; // text pages; index 0 is the title page
  const current = () => (anchor < 0 ? 0 : 1 + Math.max(0, pages.findIndex((p) => anchor >= p.start && anchor < p.end)));
  const setIndex = (i: number) => {
    anchor = i <= 0 ? -1 : pages[Math.min(i, pageCount()) - 1]!.start;
  };

  function shell(cls: string): HTMLElement {
    const el = document.createElement("div");
    el.className = `rd-page ${cls}`;
    el.innerHTML = `<div class="rd-head"><span>Walden</span><span>Economy</span></div><div class="rd-body"></div><div class="rd-foot"></div><i class="rd-flash"></i>`;
    return el;
  }

  /** Split the book into pages that fit this body at this font size. */
  function paginate(body: HTMLElement): Page[] {
    const key = `${body.clientWidth}x${body.clientHeight}@${font}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const m = document.createElement("div");
    m.className = "rd-text rd-measure";
    body.append(m);
    const fits = (s: number, e: number) => {
      m.innerHTML = pageHTML(s, e);
      return m.scrollHeight <= m.clientHeight + 1;
    };
    const out: Page[] = [];
    let pos = 0;
    while (pos < TOTAL && out.length < 400) {
      let lo = pos + 1;
      let hi = Math.min(TOTAL, pos + 500);
      if (fits(pos, hi)) lo = hi;
      else {
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (fits(pos, mid)) lo = mid;
          else hi = mid;
        }
      }
      // Never leave a chapter heading alone at the foot of a page.
      const hb = WALDEN.findIndex((b, i) => b.h && BLOCK_START[i]! + WORDS[i]!.length === lo);
      if (hb >= 0 && lo < TOTAL && BLOCK_START[hb]! > pos) lo = BLOCK_START[hb]!;
      out.push({ start: pos, end: lo });
      pos = lo;
    }
    m.remove();
    cache.set(key, out);
    return out;
  }

  function fill(el: HTMLElement, index: number): void {
    const body = el.querySelector<HTMLElement>(".rd-body")!;
    const foot = el.querySelector<HTMLElement>(".rd-foot")!;
    el.classList.toggle("rd-isCover", index === 0 || index > pageCount());
    if (index === 0) {
      body.innerHTML = COVER;
    } else if (index > pageCount()) {
      body.innerHTML = `<div class="rd-end"><div><b>❦</b>End of the sample.<br>The pond is still there.</div></div>`;
    } else {
      const p = pages[index - 1]!;
      body.innerHTML = `<div class="rd-text">${pageHTML(p.start, p.end)}</div>`;
      foot.textContent = String(index);
    }
  }

  function show(flash: boolean): void {
    const cur = current();
    if (mode === "spread") {
      const left = cur - (cur % 2);
      views.forEach((v, i) => fill(v, left + i));
    } else if (views[0]) fill(views[0], cur);
    if (flash) {
      for (const v of views) {
        const f = v.querySelector<HTMLElement>(".rd-flash")!;
        f.classList.remove("go");
        void f.offsetWidth;
        f.classList.add("go");
      }
    }
    updateControls();
  }

  function turn(dir: 1 | -1): void {
    const cur = current();
    const step = mode === "spread" ? 2 : 1;
    const base = mode === "spread" ? cur - (cur % 2) : cur;
    const next = base + dir * step;
    if (next < 0 || next > pageCount()) return;
    setIndex(next);
    show(true);
  }

  /** Tap an edge to turn, or swipe; in a spread the left page goes back, the right page forward. */
  function bindTurns(el: HTMLElement, side: "single" | "back" | "forward"): void {
    let x0 = 0;
    let y0 = 0;
    el.addEventListener("pointerdown", (e) => {
      x0 = e.clientX;
      y0 = e.clientY;
    });
    el.addEventListener("pointerup", (e) => {
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) return turn(dx < 0 ? 1 : -1);
      if (Math.abs(dy) > 30) return;
      if (side === "back") return turn(-1);
      if (side === "forward") return turn(1);
      const r = el.getBoundingClientRect();
      const f = (e.clientX - r.left) / r.width;
      if (f < 0.35) turn(-1);
      else if (f > 0.55) turn(1);
    });
  }

  function controls(): HTMLElement {
    const el = document.createElement("div");
    el.className = "rd-ctl";
    el.innerHTML = `
      <div class="rd-prog"><div class="lbl"><span class="pg"></span><span class="pc"></span></div><div class="rd-track" role="slider" aria-label="Reading progress"><i></i></div></div>
      <div class="rd-turns"><button class="prev" aria-label="Previous page"><span>‹</span>Back</button><button class="next" aria-label="Next page"><span>›</span>Turn the page</button></div>
      <div class="rd-fs"><span>Type</span>${FONT_SIZES.map((_, i) => `<button data-fs="${i}" style="font-size:${12 + i * 4}px" aria-label="Type size ${i + 1}">Aa</button>`).join("")}<span class="sp"></span><span>Walden · Economy</span></div>`;
    el.querySelector<HTMLButtonElement>(".prev")!.onclick = () => turn(-1);
    el.querySelector<HTMLButtonElement>(".next")!.onclick = () => turn(1);
    el.querySelector<HTMLElement>(".rd-track")!.onclick = (e) => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      setIndex(Math.round(f * pageCount()));
      show(true);
    };
    el.querySelectorAll<HTMLButtonElement>("[data-fs]").forEach((b) => {
      b.onclick = () => {
        font = Number(b.dataset.fs);
        relayout(true);
      };
    });
    return el;
  }

  function updateControls(): void {
    if (!ctl) return;
    const cur = current();
    const n = pageCount();
    ctl.querySelector(".pg")!.textContent = cur === 0 ? "Title page" : `Page ${cur} of ${n}`;
    ctl.querySelector(".pc")!.textContent = `${Math.round((cur / n) * 100)}%`;
    ctl.querySelector<HTMLElement>(".rd-track i")!.style.width = `${(cur / n) * 100}%`;
    ctl.querySelector<HTMLButtonElement>(".prev")!.disabled = cur === 0;
    ctl.querySelector<HTMLButtonElement>(".next")!.disabled = cur >= n;
    ctl.querySelectorAll<HTMLButtonElement>("[data-fs]").forEach((b) => b.classList.toggle("on", Number(b.dataset.fs) === font));
  }

  function relayout(flash: boolean): void {
    for (const v of views) v.style.setProperty("--rd-fs", `${FONT_SIZES[font]}px`);
    const body = views[0]?.querySelector<HTMLElement>(".rd-body");
    if (body) pages = paginate(body);
    show(flash);
  }

  function render(state: DuoState): void {
    if (dead) return;
    const { pose } = state;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    views = [];
    ctl = null;
    if (pose.display === "outer") {
      mode = "single";
      const p = shell("rd-single");
      bindTurns(p, "single");
      screens.outer.append(p);
      views = [p];
    } else if (pose.id === "table") {
      mode = "table";
      const p = shell("rd-top");
      bindTurns(p, "single");
      screens.start.append(p);
      ctl = controls();
      screens.end.append(ctl);
      views = [p];
    } else {
      mode = "spread";
      const stacked = pose.split === "stacked";
      const a = shell(stacked ? "rd-top" : "rd-left");
      const b = shell(stacked ? "rd-bottom" : "rd-right");
      bindTurns(a, "back");
      bindTurns(b, "forward");
      screens.start.append(a);
      screens.end.append(b);
      views = [a, b];
    }
    relayout(false);
  }

  return {
    render,
    destroy() {
      dead = true;
      style.remove();
    },
  };
}

export const readerExample: Example = {
  id: "reader",
  title: "E-ink Reader",
  category: "productivity",
  summary:
    "A calm, paper-like reader: warm grain, serif type and the little black-white flash of an e-ink refresh. Open it like a paperback for two facing pages; close it for a pocket book. The text is the opening of Thoreau's Walden (1854).",
  bestPose: "book",
  poses: {
    closed: "A single page at a time, with the engraved title page at the start; tap the edges or swipe to turn.",
    "closed-landscape": "The same single page, re-set wider — you land on the page that holds the word you were reading.",
    open: "A two-page spread with page numbers; the left page turns back and the right page turns forward.",
    "open-portrait": "Two pages stacked, top then bottom, still showing the spread that holds your place.",
    book: "Held like a paperback, the fold becomes the gutter between two facing pages.",
    table: "The standing half is the page; the flat half has big page-turn buttons, a progress bar you can tap to jump, and type size.",
  },
  principle:
    "Your place is a word, not a page, so every pose re-paginates yet shows the same passage — Apple's continuity rule to preserve element state as the device opens, closes and folds (HIG, 'Displays, poses, and continuity').",
  credits: [{ who: "@MiruDaws", url: "https://x.com/MiruDaws/status/2104637597645742208", what: "a paper-like e-ink reader for iPhone Duo, built with Rork" }],
  create,
};
