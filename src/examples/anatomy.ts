/**
 * Anatomy Layers — fold to peel.
 *
 * Old encyclopedias drew the body on clear acetate plates: skin on the top
 * sheet, muscles beneath, then vessels, then bone, so turning each plate
 * peeled a layer away. Here the plates are a hand, and the hinge turns them.
 * Flat, the plates lie stacked and only skin shows; fold the Duo and they fan
 * apart across the two halves — the upper plates lift toward the first half,
 * the deeper ones stay on the second — with captions on leader lines.
 *
 * The angle only drives that separation effect; which half holds what is set
 * by the pose (HIG checklist §9: the hinge is for interactions and effects,
 * never layout). The plate you're on and the structure you tapped live here,
 * so every pose change keeps them.
 *
 * The illustration is drawn for this example: stylised, not to scale.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

// ---------------------------------------------------------------- the hand

interface Finger {
  x: number;
  y: number;
  /** Degrees from straight up, clockwise. */
  a: number;
  len: number;
  w: number;
  /** Bone segments as fractions of the finger's length. */
  segs: number[];
}

const FINGERS: Finger[] = [
  { x: 104, y: 272, a: -55, len: 92, w: 34, segs: [0.56, 0.44] }, // thumb
  { x: 113, y: 184, a: -9, len: 104, w: 29, segs: [0.46, 0.3, 0.24] },
  { x: 144, y: 178, a: -2, len: 118, w: 30, segs: [0.46, 0.3, 0.24] },
  { x: 174, y: 182, a: 5, len: 108, w: 28, segs: [0.46, 0.3, 0.24] },
  { x: 201, y: 196, a: 13, len: 84, w: 24, segs: [0.46, 0.3, 0.24] },
];
/** Where each metacarpal starts, at the wrist. */
const CARPAL_ROOT = [[124, 300], [132, 292], [146, 290], [160, 292], [174, 296]] as const;

const rad = (d: number) => (d * Math.PI) / 180;
/** A point `d` along a finger's axis from its base, `side` across it. */
function along(f: Finger, d: number, side = 0): [number, number] {
  const s = Math.sin(rad(f.a)), c = Math.cos(rad(f.a));
  return [f.x + d * s + side * c, f.y - d * c + side * s];
}
const inFinger = (f: Finger, body: string) => `<g transform="translate(${f.x} ${f.y}) rotate(${f.a})">${body}</g>`;
const P = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

const PALM = "M112 318 C 100 300 92 285 88 262 C 84 235 88 200 96 180 L 214 186 C 222 220 218 262 206 290 C 200 305 192 314 188 318 Z";
const FOREARM = "M112 316 L 114 404 L 186 404 L 188 316 Z";
const SILHOUETTE =
  `<path d="${PALM}"/><path d="${FOREARM}"/>` +
  FINGERS.map((f) => inFinger(f, `<rect x="${-f.w / 2}" y="${-f.len}" width="${f.w}" height="${f.len + 24}" rx="${f.w / 2}"/>`)).join("");

type LayerId = "skin" | "muscle" | "vessel" | "bone";
interface Structure {
  name: string;
  fn: string;
}
interface Layer {
  id: LayerId;
  name: string;
  plate: string;
  color: string;
  /** A point on this plate the caption's leader line reaches for. */
  key: [number, number];
  caption: string;
  structures: Record<string, Structure>;
  art(): string;
}

const s = (id: string, body: string) => `<g data-an="s" data-arg="${id}" class="an-st">${body}</g>`;

const LAYERS: Layer[] = [
  {
    id: "skin",
    name: "Skin",
    plate: "I",
    color: "#d99a73",
    key: [144, 240],
    caption: "Skin",
    structures: {
      epidermis: { name: "Skin (epidermis)", fn: "A waterproof, self-renewing wrap packed with touch sensors — densest at the fingertips." },
      creases: { name: "Flexion creases", fn: "Lines where skin is tethered to the tissue beneath, so it folds neatly when you grip." },
      ridges: { name: "Fingerprint ridges", fn: "Friction ridges that improve grip and set up vibrations that help you feel texture." },
    },
    art: () =>
      s("epidermis", `<g fill="url(#an-skin)">${SILHOUETTE}</g>`) +
      s(
        "creases",
        `<g fill="none" stroke="#a9694c" stroke-width="2" stroke-linecap="round">
          <path d="M207 228 C 182 218 150 220 116 238"/><path d="M204 252 C 176 242 140 246 112 262"/>
          <path d="M118 236 C 126 262 132 292 142 314"/><path d="M118 326 C 140 320 162 320 184 326"/>
          <path d="M120 336 C 140 331 162 331 182 336"/></g><path d="M100 230 L210 220 L210 260 L104 274Z" fill="transparent"/>`,
      ) +
      s(
        "ridges",
        FINGERS.map((f) => {
          const r = f.w * 0.36;
          return inFinger(
            f,
            `<g transform="translate(0 ${-f.len + f.w * 0.62})"><ellipse rx="${r}" ry="${r * 1.25}" fill="#e7ad86"/>` +
              [0.25, 0.5, 0.75].map((k) => `<ellipse rx="${r * k}" ry="${r * 1.25 * k}" fill="none" stroke="#a9694c" stroke-width="1.1"/>`).join("") +
              `</g>`,
          );
        }).join(""),
      ),
  },
  {
    id: "muscle",
    name: "Muscles & tendons",
    plate: "II",
    color: "#c4554d",
    key: [112, 262],
    caption: "Muscles & tendons",
    structures: {
      flexors: { name: "Forearm flexors", fn: "Muscles up in the forearm that do the heavy pulling when you make a fist." },
      tendons: { name: "Flexor tendons", fn: "Cords that carry the forearm muscles' pull down to the finger bones to curl them." },
      retinaculum: { name: "Flexor retinaculum", fn: "A tough band across the wrist that holds the tendons down; the carpal tunnel runs under it." },
      thenar: { name: "Thenar muscles", fn: "The ball of the thumb: they swing the thumb across the palm to meet each finger." },
      hypothenar: { name: "Hypothenar muscles", fn: "Move the little finger and pad the outer edge of the palm." },
      lumbricals: { name: "Lumbricals", fn: "Small slender muscles that bend the knuckles while straightening the fingers." },
    },
    art: () => {
      const tendon = (f: Finger, i: number) => {
        const from: [number, number] = [136 + i * 7, 330];
        const mid = along(f, -30);
        const tip = along(f, f.len * 0.84);
        return `<path d="M${P(from)} Q ${P(mid)} ${P(along(f, 0))} L ${P(tip)}"/>`;
      };
      const lum = FINGERS.slice(1).map((f) => {
        const [x, y] = along(f, -28, -f.w * 0.42);
        return `<ellipse cx="${x}" cy="${y}" rx="4" ry="15" transform="rotate(${f.a} ${x} ${y})"/>`;
      });
      return (
        s("flexors", `<path d="M116 404 C 118 370 126 340 134 322 L 166 322 C 174 340 182 370 184 404Z" fill="#c4554d"/><path d="M130 400 C 132 370 138 345 144 326 M150 402 L 150 326 M170 400 C 168 370 162 345 156 326" stroke="#9e3d37" stroke-width="1.4" fill="none"/>`) +
        s("thenar", `<ellipse cx="110" cy="262" rx="21" ry="36" transform="rotate(28 110 262)" fill="#d0645a"/><path d="M98 240 Q 110 262 120 290" stroke="#a9443d" stroke-width="1.2" fill="none"/>`) +
        s("hypothenar", `<ellipse cx="198" cy="258" rx="13" ry="36" transform="rotate(-6 198 258)" fill="#d0645a"/>`) +
        s("lumbricals", `<g fill="#d6776c">${lum.join("")}</g>`) +
        s("tendons", `<g fill="none" stroke="#f1e2c2" stroke-width="5" stroke-linecap="round">${FINGERS.map(tendon).join("")}</g>`) +
        s("retinaculum", `<rect x="114" y="300" width="74" height="17" rx="7" fill="#ece3d0" stroke="#bfae8c" stroke-width="1.2"/>`)
      );
    },
  },
  {
    id: "vessel",
    name: "Vessels & nerves",
    plate: "III",
    color: "#c9343b",
    key: [180, 300],
    caption: "Vessels & nerves",
    structures: {
      radial: { name: "Radial artery", fn: "Runs down the thumb side of the wrist — it's the pulse you feel there." },
      ulnar: { name: "Ulnar artery", fn: "The little-finger-side artery that feeds most of the palm." },
      arch: { name: "Palmar arch", fn: "A loop joining the two arteries, so the hand still gets blood if one is pinched." },
      digital: { name: "Digital arteries", fn: "Run up the sides of every finger; why fingertips flush warm and bleed readily." },
      veins: { name: "Superficial veins", fn: "Carry blood back toward the heart; some show blue through the skin of your wrist." },
      median: { name: "Median nerve", fn: "Gives feeling to the thumb side of the palm — squeezed in the carpal tunnel, it tingles." },
    },
    art: () => {
      const dig = FINGERS.map((f) => {
        const a = along(f, -20, f.w * 0.2), b = along(f, f.len * 0.82, f.w * 0.2);
        return `<path d="M${P(a)} L ${P(b)}"/>`;
      });
      const nerve = FINGERS.slice(0, 3).map((f) => `<path d="M148 268 Q ${P(along(f, -16))} ${P(along(f, f.len * 0.7, -f.w * 0.15))}"/>`);
      return (
        s("veins", `<g fill="none" stroke="#3d6fd1" stroke-width="3.2" stroke-linecap="round"><path d="M136 404 C 138 372 128 344 132 316 C 134 300 126 290 118 284"/><path d="M164 404 C 160 372 172 346 168 320 C 166 306 176 296 186 290"/></g>`) +
        s("median", `<g fill="none" stroke="#e1b12c" stroke-width="3" stroke-linecap="round"><path d="M150 404 L 150 312 C 150 296 149 282 148 268"/>${nerve.join("")}</g>`) +
        s("radial", `<path d="M126 404 C 124 362 122 332 118 312 C 113 292 106 282 98 268" fill="none" stroke="#c9343b" stroke-width="4.2" stroke-linecap="round"/>`) +
        s("ulnar", `<path d="M178 404 C 180 362 182 330 183 306 C 184 296 182 288 178 280" fill="none" stroke="#c9343b" stroke-width="4.2" stroke-linecap="round"/>`) +
        s("arch", `<path d="M178 280 C 170 248 132 238 108 254" fill="none" stroke="#d8474e" stroke-width="3.6" stroke-linecap="round"/>`) +
        s("digital", `<g fill="none" stroke="#d8474e" stroke-width="2.2" stroke-linecap="round">${dig.join("")}</g>`)
      );
    },
  },
  {
    id: "bone",
    name: "Bones",
    plate: "IV",
    color: "#b8ab8a",
    key: [146, 220],
    caption: "Bones",
    structures: {
      phalanges: { name: "Phalanges", fn: "Fourteen finger bones — three in each finger, two in the thumb — hinged at the knuckles." },
      metacarpals: { name: "Metacarpals", fn: "Five long bones that make the palm; their heads are the knuckles of a fist." },
      carpals: { name: "Carpals", fn: "Eight pebble-like wrist bones that let the hand tilt and twist on the forearm." },
      radius: { name: "Radius", fn: "The thumb-side forearm bone; it rolls around the ulna to turn your palm up or down." },
      ulna: { name: "Ulna", fn: "The little-finger-side forearm bone, the hinge of the elbow." },
    },
    art: () => {
      const bone = `fill="#f2ead6" stroke="#a89a78" stroke-width="1.3"`;
      const phal = FINGERS.map((f) => {
        const usable = f.len - f.w * 0.3;
        let d0 = 4;
        const bw = f.w * 0.44;
        return inFinger(
          f,
          f.segs
            .map((k, i) => {
              const L = usable * k;
              const w = bw * (1 - i * 0.12);
              const r = `<rect x="${-w / 2}" y="${-(d0 + L - 3)}" width="${w}" height="${L - 3}" rx="${w / 2.2}" ${bone}/>`;
              d0 += L;
              return r;
            })
            .join(""),
        );
      });
      const meta = FINGERS.map((f, i) => {
        const [x0, y0] = CARPAL_ROOT[i]!;
        const [x1, y1] = along(f, i === 0 ? -6 : -4);
        return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#a89a78" stroke-width="${i === 0 ? 12 : 10.5}" stroke-linecap="round"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#f2ead6" stroke-width="${i === 0 ? 9.5 : 8}" stroke-linecap="round"/>`;
      });
      const carp = [[126, 304, 7], [140, 300, 7], [154, 300, 7], [168, 304, 7], [130, 316, 8], [144, 314, 7], [157, 314, 7], [170, 316, 7]]
        .map(([x, y, r]: number[]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r! * 0.8}" ${bone}/>`);
      return (
        s("radius", `<path d="M116 322 Q 130 314 144 324 L 140 404 L 122 404 Z" ${bone}/>`) +
        s("ulna", `<path d="M160 326 Q 172 318 184 326 L 178 404 L 164 404 Z" ${bone}/>`) +
        s("carpals", carp.join("")) +
        s("metacarpals", meta.join("")) +
        s("phalanges", phal.join(""))
      );
    },
  },
];

const STRUCTURE_LAYER: Record<string, number> = {};
LAYERS.forEach((l, i) => Object.keys(l.structures).forEach((k) => (STRUCTURE_LAYER[k] = i)));

function plateSvg(l: Layer, i: number): string {
  const ghost = i === 0 ? "" : `<g fill="#6b5a44" opacity=".1" pointer-events="none">${SILHOUETTE}</g>`;
  const [kx, ky] = l.key;
  return `<svg viewBox="0 0 300 400" aria-label="${l.name}">
    <defs><linearGradient id="an-skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0bf9b"/><stop offset="1" stop-color="#d6936b"/></linearGradient></defs>
    ${ghost}${l.art()}
    <g class="an-lead" pointer-events="none"><line x1="${kx}" y1="${ky}" x2="150" y2="398" stroke="#3b3226" stroke-width="2.4"/><circle cx="${kx}" cy="${ky}" r="6" fill="#3b3226"/><circle cx="${kx}" cy="${ky}" r="2.5" fill="#f3ecdc"/></g>
  </svg>`;
}

// ---------------------------------------------------------------- style

const FONT = `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
const CSS = `
.an { position:absolute; inset:0; overflow:hidden; color:#3b3226; font:13px/1.35 ${FONT};
  background: radial-gradient(120% 90% at 50% 40%, #f7f1e3, #e9dfc8); }
.an-stage { position:absolute; left:0; top:0; width:100%; height:100%; }
.an-sheet { position:absolute; aspect-ratio:3/4; transform-origin:50% 50%; pointer-events:none;
  border-radius:10px; background:rgb(255 255 255 / .16); border:1px solid rgb(90 70 40 / .28);
  transition: left .45s cubic-bezier(.2,.8,.2,1), top .45s cubic-bezier(.2,.8,.2,1), transform .45s cubic-bezier(.2,.8,.2,1), opacity .35s ease, box-shadow .45s; }
.an-quick .an-sheet { transition: left .1s linear, top .1s linear, transform .1s linear, opacity .1s linear, box-shadow .1s; }
.an-sheet svg { display:block; width:100%; height:100%; overflow:hidden; border-radius:10px; }
.an-sheet.is-live .an-st { pointer-events:visiblePainted; cursor:pointer; }
.an-sheet.is-cur { border-color:#8a5a2b; border-width:2px; }
.an-st.is-on { filter: drop-shadow(0 0 2px #ffcf3f) drop-shadow(0 0 4px #ffb800); }
.an-lead { opacity:var(--lead, 0); }
.an-tab { position:absolute; left:8px; top:6px; font-size:9px; letter-spacing:.14em; text-transform:uppercase; opacity:var(--tab, 0); }
.an-cap { position:absolute; left:50%; top:calc(100% + 4px); transform:translateX(-50%); white-space:nowrap; font-size:19px; font-style:italic; font-weight:600; opacity:var(--lead, 0); }
.an-card { position:absolute; z-index:20; padding:9px 11px; border-radius:10px; background:#fffaf0; border:1px solid #d6c7a4; box-shadow:0 2px 10px rgb(60 40 10 / .15); }
.an-card b { display:block; font-size:14px; }
.an-card i { display:block; font-size:10px; letter-spacing:.12em; text-transform:uppercase; font-style:normal; color:#8a5a2b; margin-bottom:2px; }
.an-card p { margin:3px 0 0; font-size:12px; }
.an-card.is-empty { color:#7a6a52; font-style:italic; font-size:12px; }
.an-x { float:right; border:0; background:none; font:16px/1 ${FONT}; color:#7a6a52; cursor:pointer; padding:0 0 4px 8px; }
.an-chips { position:absolute; z-index:20; display:flex; gap:6px; }
.an-chips.is-grid { display:grid; grid-template-columns:1fr 1fr; }
.an-chip { flex:1; min-width:0; min-height:36px; padding:5px 6px; border:1px solid #cdbb94; border-radius:9px; background:#fffaf0; color:#3b3226; font:600 11px/1.15 ${FONT}; cursor:pointer; }
.an-chip.is-on { background:#3b3226; color:#f7f1e3; border-color:#3b3226; }
.an-chip small { display:block; font-weight:400; opacity:.7; font-size:9px; letter-spacing:.1em; }
.an-ctl { position:absolute; inset:0; padding:14px 16px 12px; display:grid; gap:8px; align-content:start; overflow:auto; }
@container (min-aspect-ratio: 1/1) { .an-ctl { grid-template-columns:1fr 1fr; } .an-ctl h2, .an-ctl .an-hintline { grid-column:1 / -1; } }
.an-ctl h2 { margin:0; font-size:18px; }
.an-ctl .an-card { position:relative; }
.an-slider { display:grid; gap:4px; font-size:11px; }
.an-slider input { width:100%; accent-color:#8a5a2b; }
.an-slider .an-ticks { display:flex; justify-content:space-between; font-size:9px; letter-spacing:.06em; color:#7a6a52; }
.an-rows { display:grid; gap:4px; }
.an-row { display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid #d6c7a4; border-radius:8px; background:#fffaf0; color:inherit; font:12px/1.2 ${FONT}; text-align:left; cursor:pointer; }
.an-row.is-on { border-color:#3b3226; box-shadow:inset 0 0 0 1px #3b3226; }
.an-row.is-peeled { opacity:.55; text-decoration:line-through; }
.an-sw { flex:none; width:12px; height:12px; border-radius:3px; }
.an-hintline { font-size:12px; font-style:italic; color:#8a5a2b; }
.an-read { position:absolute; z-index:3; font-size:12px; }
.an-read b { font-size:22px; font-variant-numeric:tabular-nums; }
.an-big { position:absolute; z-index:2; pointer-events:none; text-align:center; font-style:italic; font-size:20px; color:#8a5a2b; }
.an-big small { display:block; font-size:12px; color:#7a6a52; margin-top:4px; }
`;

// ---------------------------------------------------------------- example

type Mode = "closed" | "closedL" | "flat" | "fanH" | "fanV";
function modeFor(st: DuoState): Mode {
  const id = st.pose.id;
  if (id === "closed") return "closed";
  if (id === "closed-landscape") return "closedL";
  if (!st.pose.adjustable) return "flat";
  return st.pose.split === "stacked" ? "fanV" : "fanH";
}

/** How far apart the plates are: 0 when flat, 1 once folded to 60° or tighter. */
const peelOf = (st: DuoState) => (st.pose.adjustable ? Math.max(0, Math.min(1, (180 - st.hinge) / 120)) : 0);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let layer = 0; // the topmost plate still in place (flat), or the plate shown (closed)
  let sel: string | null = null;
  let current = initial;

  // --- what the last render drew, for in-place updates ---
  let copies: HTMLElement[][] = [];
  let cards: HTMLElement[] = [];
  let reads: HTMLElement[] = [];
  let bigs: HTMLElement[] = [];
  let slider: HTMLInputElement | null = null;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const onClick = (ev: Event) => {
    const t = (ev.target as Element).closest<HTMLElement | SVGElement>("[data-an]");
    if (!t) return;
    const a = t.dataset.an, arg = t.dataset.arg ?? "";
    if (a === "s") sel = arg;
    else if (a === "layer") layer = Number(arg);
    else if (a === "clear") sel = null;
    refresh();
  };
  for (const el of [screens.outer, screens.start, screens.end]) el.addEventListener("click", onClick);

  function root(quick = false): HTMLElement {
    const r = document.createElement("div");
    r.className = "an" + (quick ? " an-quick" : "");
    return r;
  }
  function plates(): HTMLElement[] {
    return LAYERS.map((l, i) => {
      const d = document.createElement("div");
      d.className = "an-sheet";
      d.style.zIndex = String(10 - i);
      d.innerHTML = `${plateSvg(l, i)}<div class="an-tab">Plate ${l.plate} · ${l.name}</div><div class="an-cap">${l.caption}</div>`;
      return d;
    });
  }
  function card(pos: string): HTMLElement {
    const c = document.createElement("div");
    c.className = "an-card";
    if (pos) c.style.cssText = pos;
    cards.push(c);
    return c;
  }
  function chips(pos: string, vertical = false, grid = false): HTMLElement {
    const c = document.createElement("div");
    c.className = "an-chips" + (grid ? " is-grid" : "");
    c.style.cssText = pos + (vertical ? ";flex-direction:column" : "");
    c.innerHTML = LAYERS.map((l, i) => `<button class="an-chip" data-an="layer" data-arg="${i}"><small>${l.plate}</small>${l.name.split(" ")[0]}</button>`).join("");
    return c;
  }

  function render(st: DuoState): void {
    current = st;
    const mode = modeFor(st);
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    copies = [];
    cards = [];
    reads = [];
    bigs = [];
    slider = null;

    if (mode === "closed" || mode === "closedL") {
      const r = root();
      const ps = plates();
      r.append(...ps);
      copies.push(ps);
      if (mode === "closed") {
        r.append(card("left:10px;right:10px;bottom:56px"), chips("left:10px;right:10px;bottom:10px"));
      } else {
        // Landscape: the picker moves to the trailing edge, like a vertical bar.
        r.append(card("left:calc(25% + 31cqh + 6px);right:82px;top:12px;max-height:calc(100% - 24px);overflow:auto"), chips("right:10px;top:46px;bottom:10px;width:64px", true));
      }
      screens.outer.append(r);
    } else if (mode === "flat") {
      const a = root(), b = root();
      const ps = plates();
      a.append(...ps);
      copies.push(ps);
      const ctl = document.createElement("div");
      ctl.className = "an-ctl";
      ctl.innerHTML = `<h2>The hand, in layers</h2>`;
      const sl = document.createElement("label");
      sl.className = "an-slider";
      sl.innerHTML = `<span>Peel back the plates</span><input type="range" min="0" max="3" step="1" aria-label="Plates peeled"><span class="an-ticks">${LAYERS.map((l) => `<span>${l.plate}</span>`).join("")}</span>`;
      slider = sl.querySelector("input")!;
      slider.addEventListener("input", () => {
        layer = Number(slider!.value);
        refresh();
      });
      const rows = document.createElement("div");
      rows.className = "an-rows";
      rows.innerHTML = LAYERS.map((l, i) => `<button class="an-row" data-an="layer" data-arg="${i}"><span class="an-sw" style="background:${l.color}"></span>Plate ${l.plate} · ${l.name}</button>`).join("");
      const left = document.createElement("div");
      left.style.cssText = "display:grid;gap:10px;align-content:start";
      left.append(sl, rows);
      const hint = document.createElement("div");
      hint.className = "an-hintline";
      hint.textContent = "Fold to peel — in book, stand or table pose the hinge fans the plates apart.";
      ctl.append(hint, left, card(""));
      b.append(ctl);
      screens.start.append(a);
      screens.end.append(b);
    } else {
      // Partly folded: one stage spans both halves; each half draws all of it, offset.
      const side = mode === "fanH";
      const halves = [root(true), root(true)];
      halves.forEach((h, k) => {
        const stage = document.createElement("div");
        stage.className = "an-stage";
        stage.style.cssText = side ? `width:200%;left:${-k * 100}%` : `height:200%;top:${-k * 100}%`;
        const ps = plates();
        stage.append(...ps);
        copies.push(ps);
        h.append(stage);
      });
      const a = halves[0]!, b = halves[1]!;
      const big = document.createElement("div");
      big.className = "an-big";
      big.innerHTML = `Fold to peel<small>close the hinge and the plates fan apart</small>`;
      big.style.cssText = side ? "left:16px;right:28px;top:38%" : "left:12px;width:58%;top:34%";
      bigs.push(big);
      a.append(big);
      const read = document.createElement("div");
      read.className = "an-read";
      reads.push(read);
      if (side) {
        a.append(card("left:10px;right:26px;bottom:10px"));
        read.style.cssText = "left:26px;right:10px;bottom:12px";
        b.append(read);
      } else {
        // Table: the card stands up top to read; the plate picker lies flat under your thumb.
        a.append(card("right:10px;top:10px;width:31%;max-height:calc(100% - 40px);overflow:auto"));
        read.style.cssText = "right:10px;top:28px;width:31%";
        b.append(read, chips("right:10px;bottom:10px;width:31%", false, true));
      }
      screens.start.append(a);
      screens.end.append(b);
    }
    refresh();
  }

  /** Lay the plates out for the mode, the hinge and the state — in place, so they animate. */
  function place(): void {
    const mode = modeFor(current);
    const t = peelOf(current);
    for (const ps of copies)
      ps.forEach((el, i) => {
        let x = 50, y = 50, h = 80, sc = 1, rot = 0, op = 1, live = true, lead = 0;
        if (mode === "closed" || mode === "closedL") {
          [x, y, h] = mode === "closed" ? [50, 33, 60] : [25, 50, 82];
          const on = i === layer;
          op = on ? 1 : 0;
          live = on;
          sc = on ? 1 : 0.94;
        } else if (mode === "flat") {
          [x, y, h] = [50, 50, 88];
          if (i < layer) {
            x = -18;
            rot = -12;
            op = 0.22;
            live = false;
          }
        } else if (mode === "fanH") {
          const tx = [12.5, 37.5, 62.5, 87.5][i]!;
          x = lerp(75, tx, t);
          y = 41;
          h = 70;
          sc = lerp(1, 0.6, t);
          rot = [-5, 3, -2, 0][i]! * t;
          lead = Math.max(0, Math.min(1, (t - 0.5) * 3));
        } else {
          const [tx, ty] = [[18, 25], [50, 25], [18, 75], [50, 75]][i] as [number, number];
          x = lerp(32, tx, t);
          y = lerp(75, ty, t);
          h = 40;
          sc = lerp(1, 0.55, t);
          rot = [-4, 3, -2, 0][i]! * t;
          lead = Math.max(0, Math.min(1, (t - 0.5) * 3));
        }
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.style.height = `${h}%`;
        el.style.opacity = String(op);
        el.style.transform = `translate(-50%, -50%) scale(${sc.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
        el.style.boxShadow = `0 ${(2 + 10 * t).toFixed(1)}px ${(4 + 18 * t).toFixed(1)}px rgb(60 40 10 / ${(0.1 + 0.18 * t).toFixed(2)})`;
        el.style.setProperty("--lead", lead.toFixed(2));
        const tab = mode === "fanH" || mode === "fanV" ? (i === 0 ? Math.max(0, 1 - t * 5) : 0) : i === layer ? 1 : 0;
        el.style.setProperty("--tab", tab.toFixed(2));
        el.classList.toggle("is-live", live);
        el.classList.toggle("is-cur", i === layer && (mode === "fanH" || mode === "fanV"));
      });
    for (const b of bigs) b.style.opacity = String(Math.max(0, 1 - t * 4));
    const apart = Math.round(t * 3);
    for (const r of reads)
      r.innerHTML = `<b>${current.hinge}°</b><br>${t < 0.12 ? "Fold further to peel the plates apart." : apart >= 3 ? "All four plates fanned out. Open flat to restack them." : "Fold further to separate the deeper plates."}`;
  }

  function refresh(): void {
    place();
    for (const ps of copies)
      for (const el of ps) for (const g of el.querySelectorAll<SVGElement>(".an-st")) g.classList.toggle("is-on", g.dataset.arg === sel);
    const mode = modeFor(current);
    for (const c of cards) {
      if (!sel) {
        c.className = "an-card is-empty";
        c.textContent = mode === "flat" || mode === "closed" || mode === "closedL" ? "Tap any part of the hand to name it." : "Tap any structure on any plate to name it.";
        continue;
      }
      const li = STRUCTURE_LAYER[sel] ?? 0;
      const L = LAYERS[li]!;
      const st = L.structures[sel]!;
      const hidden = (mode === "flat" && li < layer) || ((mode === "closed" || mode === "closedL") && li !== layer);
      c.className = "an-card";
      c.innerHTML = `<button class="an-x" data-an="clear" aria-label="Clear">×</button><i>Plate ${L.plate} · ${L.name}</i><b>${st.name}</b><p>${st.fn}</p>${hidden ? `<p style="font-style:italic;color:#8a5a2b">On plate ${L.plate}, not the one showing.</p>` : ""}`;
    }
    for (const root of [screens.outer, screens.start, screens.end]) {
      for (const b of root.querySelectorAll<HTMLElement>(".an-chip, .an-row")) {
        const i = Number(b.dataset.arg);
        b.classList.toggle("is-on", i === layer);
        if (b.classList.contains("an-row")) b.classList.toggle("is-peeled", mode === "flat" && i < layer);
      }
    }
    if (slider) slider.value = String(layer);
  }

  return {
    render,
    hinge(st: DuoState) {
      current = st;
      place();
    },
    destroy() {
      for (const el of [screens.outer, screens.start, screens.end]) el.removeEventListener("click", onClick);
      style.remove();
    },
  };
}

export const anatomyExample: Example = {
  id: "anatomy",
  title: "Anatomy Layers",
  category: "learning",
  summary:
    "A hand drawn on clear plates, like the acetate overlays in an old encyclopedia — skin, muscles and tendons, vessels and nerves, bones. Fold the Duo and the plates peel apart across the two halves; tap anything to name it.",
  bestPose: "book",
  poses: {
    closed: "One plate at a time, full size, with a picker for the four layers along the bottom; tap a structure for its name and job.",
    "closed-landscape": "The same single plate, with the layer picker moved to a column on the trailing edge.",
    open: "The plates lie stacked on the left page so only skin shows; on the right, a slider peels them back one by one, with the layer list, the label card and the hint to fold.",
    "open-portrait": "Stacked plates on the top half, the peel slider and label card below.",
    book: "Folding peels: as the hinge closes, the upper plates lift and slide onto the left page while the deeper ones stay on the right, fanned out with captions on leader lines.",
    table: "The plates fan upward — skin and muscle rise onto the standing half, vessels and bone stay on the flat half — with the label card up top and the layer picker under your thumb.",
    stand: "Stood like a card, the plates fan across both pages as in book pose; close it further to spread them wider.",
  },
  principle:
    "The hinge drives an effect, not the layout: Apple says to use hinge angle 'for interactions and effects only, never for layout' (HIG checklist §9, 'Hinge'), so the pose decides which half holds what and the angle only peels the plates apart. The chosen plate and structure persist across every pose (HIG, 'Displays, poses, and continuity').",
  create,
};
