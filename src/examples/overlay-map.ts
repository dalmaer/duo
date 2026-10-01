/**
 * Overlay Map — Apple's overlay arrangement, shown plainly.
 *
 * The HIG names two arrangement views. A split divides the space; an overlay
 * "layers the views; while partially folded they occupy separate sides,
 * otherwise the primary overlays the secondary." A map with a place sheet on
 * top is the canonical overlay: the map (secondary) is background that can be
 * partly hidden, the sheet (primary) floats over it.
 *
 * So: open flat, one continuous map runs under the fold (each half draws the
 * same full-size map, offset, from the same camera) and the sheet floats over
 * it. Partly folded, the sheet takes its own half and the map the other —
 * nothing straddles the fold. Closed, the sheet is a bottom sheet you drag up;
 * closed landscape, a trailing side panel. The selected place, the route and
 * whether the sheet is collapsed live here, not in the screens.
 *
 * Larkhaven, its streets and its places are invented for this example.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

// ---------------------------------------------------------------- the town

const WORLD = { w: 960, h: 820 } as const;
const AVES = [120, 300, 480, 660, 840];
const STREETS = [110, 260, 420, 580, 720];
const HOME = { x: 660, y: 720 };
const TOWN_CENTRE = { x: 480, y: 420 };
/** World units per CSS pixel: how far the map is zoomed out. */
const SCALE = 1.2;

type Kind = "cafe" | "books" | "bakery" | "park" | "library" | "food" | "market" | "museum" | "lookout" | "cinema";

interface Place {
  id: string;
  name: string;
  kind: Kind;
  kindLabel: string;
  x: number;
  y: number;
  hours: string;
  open: string;
  rating: number;
  reviews: number;
  address: string;
  blurb: string;
}

const KIND_COLOR: Record<Kind, string> = {
  cafe: "#c26a3d",
  books: "#6a5acd",
  bakery: "#c98a17",
  park: "#3f9a5b",
  library: "#3f74b5",
  food: "#b8433f",
  market: "#21928f",
  museum: "#8a5a9e",
  lookout: "#5d7f3a",
  cinema: "#c2416e",
};
const KIND_GLYPH: Record<Kind, string> = {
  cafe: "C", books: "B", bakery: "b", park: "P", library: "L", food: "R", market: "M", museum: "Mu", lookout: "V", cinema: "F",
};

const PLACES: Place[] = [
  { id: "fern", name: "Fern & Kettle", kind: "cafe", kindLabel: "Café", x: 390, y: 110, hours: "7 AM – 6 PM", open: "Open · closes 6 PM", rating: 4.7, reviews: 312, address: "14 Lantern St", blurb: "Pour-overs, a window bench and a cat who tolerates you." },
  { id: "tide", name: "Tidewater Books", kind: "books", kindLabel: "Bookshop", x: 660, y: 340, hours: "10 AM – 8 PM", open: "Open · closes 8 PM", rating: 4.8, reviews: 188, address: "3 Wharf Ave", blurb: "Secondhand maps, sea stories, and a ladder you're allowed to climb." },
  { id: "mill", name: "Old Mill Bakery", kind: "bakery", kindLabel: "Bakery", x: 120, y: 500, hours: "6 AM – 2 PM", open: "Open · closes 2 PM", rating: 4.6, reviews: 421, address: "88 Millrace Rd", blurb: "Rye loaves from a stone oven; the cardamom knots sell out by ten." },
  { id: "heron", name: "Heron Boathouse", kind: "park", kindLabel: "Park · boats", x: 480, y: 350, hours: "9 AM – sunset", open: "Open · until sunset", rating: 4.5, reviews: 96, address: "Heron Park, east gate", blurb: "Rowing boats by the hour on the park pond. Herons not included." },
  { id: "lib", name: "Larkhaven Library", kind: "library", kindLabel: "Library", x: 210, y: 260, hours: "9 AM – 7 PM", open: "Open · closes 7 PM", rating: 4.9, reviews: 154, address: "1 Commons Sq", blurb: "A reading room under a glass roof, and a very good local-history shelf." },
  { id: "copper", name: "Copper Lantern", kind: "food", kindLabel: "Restaurant", x: 750, y: 580, hours: "5 PM – 11 PM", open: "Opens 5 PM", rating: 4.4, reviews: 507, address: "22 Ferry St", blurb: "Grilled fish and river views from the upstairs terrace." },
  { id: "gull", name: "Gull Street Market", kind: "market", kindLabel: "Market", x: 840, y: 180, hours: "Sat–Sun 8 AM – 3 PM", open: "Open weekends", rating: 4.3, reviews: 233, address: "Gull St & Quay Ave", blurb: "Forty stalls of produce, smoked fish and old cameras." },
  { id: "clock", name: "Museum of Clocks", kind: "museum", kindLabel: "Museum", x: 570, y: 420, hours: "10 AM – 5 PM", open: "Open · closes 5 PM", rating: 4.6, reviews: 141, address: "9 Escapement Ln", blurb: "Four hundred clocks, all wound; arrive at noon for the chorus." },
  { id: "pine", name: "Pine Hill Lookout", kind: "lookout", kindLabel: "Viewpoint", x: 120, y: 170, hours: "Always open", open: "Open 24 hours", rating: 4.8, reviews: 76, address: "Top of Pine Hill Rd", blurb: "The whole town and the river mouth from one bench." },
  { id: "salt", name: "Saltbox Cinema", kind: "cinema", kindLabel: "Cinema", x: 300, y: 650, hours: "2 PM – midnight", open: "Opens 2 PM", rating: 4.5, reviews: 268, address: "40 Harbour Rd", blurb: "One screen, velvet seats, a double bill every Friday." },
];
const byId = (id: string | null) => PLACES.find((p) => p.id === id) ?? null;

/** Along the street from home to the place's avenue, up the avenue, then along to the door. */
function routeFor(p: Place): { d: string; minutes: number; metres: number } {
  const onAvenue = AVES.includes(p.x);
  const ax = onAvenue ? p.x : AVES.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a));
  const len = Math.abs(HOME.x - ax) + Math.abs(HOME.y - p.y) + Math.abs(ax - p.x);
  const metres = Math.round((len * 1.3) / 10) * 10;
  return { d: `M${HOME.x} ${HOME.y} H${ax} V${p.y} H${p.x}`, minutes: Math.max(1, Math.round(metres / 80)), metres };
}

const BASE_MAP = (() => {
  const out: string[] = [];
  out.push(`<rect x="-200" y="-200" width="${WORLD.w + 400}" height="${WORLD.h + 400}" fill="#ebe6d8"/>`);
  // Blocks between the roads.
  const xs = [-200, ...AVES, WORLD.w + 200];
  const ys = [-200, ...STREETS, WORLD.h + 200];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < ys.length - 1; j++) {
      if (xs[i] === 300 && ys[j] === 260) continue; // the park
      const x = xs[i]! + 17, y = ys[j]! + 17, w = xs[i + 1]! - xs[i]! - 34, h = ys[j + 1]! - ys[j]! - 34;
      const tone = (i * 7 + j * 3) % 3 === 0 ? "#ddd5c2" : "#e2dccb";
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${tone}"/>`);
    }
  // Sea in the south-west corner.
  out.push(`<path d="M-200 600 C 40 610 90 700 170 760 C 230 800 250 900 260 1020 L-200 1020Z" fill="#9cc7e0"/>`);
  out.push(`<path d="M-200 600 C 40 610 90 700 170 760 C 230 800 250 900 260 1020" fill="none" stroke="#c8e0ec" stroke-width="8"/>`);
  // Heron Park, with its pond.
  out.push(`<rect x="317" y="277" width="146" height="126" rx="14" fill="#b9d9a2"/>`);
  out.push(`<ellipse cx="400" cy="345" rx="40" ry="24" fill="#9cc7e0"/>`);
  for (const [tx, ty] of [[338, 296], [356, 384], [446, 300], [440, 388], [334, 344], [372, 300]])
    out.push(`<circle cx="${tx}" cy="${ty}" r="9" fill="#86bd73"/><circle cx="${tx! - 2}" cy="${ty! - 2}" r="4" fill="#9fcd8b"/>`);
  // The river.
  const river = "M1100 20 C 880 80 760 180 760 300 C 760 420 870 470 870 560 C 870 660 760 720 700 1000";
  out.push(`<path d="${river}" fill="none" stroke="#9cc7e0" stroke-width="54" stroke-linecap="round"/>`);
  out.push(`<path d="${river}" fill="none" stroke="#b4d6e8" stroke-width="18" stroke-linecap="round" opacity="0.6"/>`);
  // Roads: casing, then surface. Streets cross the river as bridges.
  for (const x of AVES) out.push(`<line x1="${x}" y1="-200" x2="${x}" y2="${WORLD.h + 200}" stroke="#cfc6b0" stroke-width="26"/>`);
  for (const y of STREETS) out.push(`<line x1="-200" y1="${y}" x2="${WORLD.w + 200}" y2="${y}" stroke="#cfc6b0" stroke-width="24"/>`);
  for (const x of AVES) out.push(`<line x1="${x}" y1="-200" x2="${x}" y2="${WORLD.h + 200}" stroke="#fffdf7" stroke-width="20"/>`);
  for (const y of STREETS) out.push(`<line x1="-200" y1="${y}" x2="${WORLD.w + 200}" y2="${y}" stroke="#fffdf7" stroke-width="18"/>`);
  const label = (x: number, y: number, t: string, rot = 0) =>
    `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-size="11" font-weight="600" fill="#9a907a" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.5">${t}</text>`;
  out.push(label(560, 111, "LANTERN ST"), label(220, 421, "HERON ST"), label(560, 721, "HARBOUR RD"), label(200, 581, "MILLRACE RD"));
  out.push(label(301, 200, "COMMONS AVE", -90), label(661, 160, "WHARF AVE", -90), label(841, 400, "QUAY AVE", -90));
  out.push(`<text x="390" y="390" font-size="12" font-style="italic" fill="#4f7d43" text-anchor="middle">Heron Park</text>`);
  out.push(`<text x="800" y="260" font-size="13" font-style="italic" fill="#5b8eaa" text-anchor="middle" transform="rotate(60 800 260)">River Lark</text>`);
  out.push(`<text x="40" y="720" font-size="13" font-style="italic" fill="#5b8eaa">Larkhaven Bay</text>`);
  return out.join("");
})();

// ---------------------------------------------------------------- style

const CSS = `
.om { position:absolute; inset:0; overflow:hidden; background:#ebe6d8; font:12px/1.3 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; color:#1c1c1e; }
.om-wrap { position:absolute; left:0; top:0; width:100%; height:100%; }
.om-plane { position:absolute; inset:0; transform-origin:50% 75%; transition:transform .12s linear; }
.om-plane svg { display:block; width:100%; height:100%; }
.om-pin { cursor:pointer; }
.om-pin .om-hit { fill:transparent; }
.om-pin:hover circle.om-dot { filter:brightness(1.1); }
.om-route { fill:none; stroke:#0a84ff; stroke-width:9; stroke-linecap:round; stroke-linejoin:round; }
.om-route-case { fill:none; stroke:#fff; stroke-width:15; stroke-linecap:round; stroke-linejoin:round; }
.om-route.is-fresh, .om-route-case.is-fresh { stroke-dasharray:1; stroke-dashoffset:1; animation:om-draw .9s ease-out forwards; }
@keyframes om-draw { to { stroke-dashoffset:0; } }
.om-btn { position:absolute; z-index:3; display:flex; align-items:center; gap:5px; padding:6px 10px; border:0; border-radius:999px; background:rgb(255 255 255 / .92); color:#1c1c1e; font:600 11px/1 -apple-system, system-ui, sans-serif; box-shadow:0 1px 4px rgb(0 0 0 / .2); cursor:pointer; }
.om-btn.is-on { background:#ff9f0a; color:#fff; }
.om-sheet { position:absolute; z-index:2; display:flex; flex-direction:column; overflow:hidden; background:rgb(250 250 252 / .96); box-shadow:0 6px 24px rgb(0 0 0 / .22); border-radius:16px; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
.om-sheet.is-card { right:12px; top:12px; bottom:12px; width:230px; }
.om-sheet.is-card.is-collapsed { bottom:auto; }
.om-sheet.is-bottom { left:8px; right:8px; bottom:8px; height:64%; transition:height .25s ease; }
.om-sheet.is-bottom.is-collapsed { height:62px; }
.om-sheet.is-bottom.is-dragging { transition:none; }
.om-sheet.is-side { right:0; top:0; bottom:0; width:178px; border-radius:16px 0 0 16px; padding-top:40px; }
.om-sheet.is-side.is-collapsed { width:46px; }
.om-sheet.is-pane { inset:0; border-radius:0; box-shadow:none; background:#f7f7f9; }
.om-sheet.is-pane.fold-start { padding-left:18px; }
.om-sheet.is-pane.fold-top { padding-top:18px; }
.om-arr .om-sheet.is-pane { padding-bottom:34px; }
.om-arr .om-sheet.is-card:not(.is-collapsed) { bottom:44px; }
.om-sheet.is-bottom.is-short:not(.is-collapsed) { height:56%; }
.om-grab { flex:none; padding:7px 12px 6px; touch-action:none; cursor:grab; }
.om-grab::before { content:""; display:block; width:36px; height:5px; border-radius:3px; background:#c7c7cc; margin:0 auto 7px; }
.om-is-pane-head::before { display:none; }
.om-head { display:flex; align-items:center; gap:6px; }
.om-title { flex:1; min-width:0; font-weight:700; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.om-sub { color:#6e6e73; font-size:11px; }
.om-ico { flex:none; width:28px; height:28px; border:0; border-radius:50%; background:#e5e5ea; color:#3a3a3c; font:700 13px/1 -apple-system, system-ui, sans-serif; cursor:pointer; display:grid; place-items:center; }
.om-body { flex:1; min-height:0; overflow:auto; padding:0 12px 12px; }
.om-row { display:flex; align-items:center; gap:9px; width:100%; padding:8px 4px; border:0; border-bottom:1px solid #e5e5ea; background:none; text-align:left; color:inherit; font:inherit; cursor:pointer; }
.om-row.is-sel { background:#e9f2ff; border-radius:8px; }
.om-row .om-badge, .om-badge { flex:none; width:26px; height:26px; border-radius:50%; color:#fff; font:700 11px/26px -apple-system, system-ui, sans-serif; text-align:center; }
.om-row b { display:block; font-size:13px; }
.om-row span { color:#6e6e73; font-size:11px; }
.om-illus { display:block; width:100%; height:auto; border-radius:12px; margin:2px 0 8px; }
.om-stars { color:#ff9f0a; letter-spacing:1px; }
.om-facts { display:grid; grid-template-columns:auto 1fr; gap:3px 10px; margin:8px 0; font-size:12px; }
.om-facts dt { color:#6e6e73; }
.om-facts dd { margin:0; }
.om-open { color:#248a3d; font-weight:600; }
.om-go { width:100%; padding:10px; border:0; border-radius:12px; background:#0a84ff; color:#fff; font:600 14px/1 -apple-system, system-ui, sans-serif; cursor:pointer; }
.om-go.is-on { background:#e5e5ea; color:#0a84ff; }
.om-walk { margin-top:6px; color:#0a84ff; font-weight:600; font-size:12px; text-align:center; }
.om-vert { writing-mode:vertical-rl; font-weight:700; font-size:13px; margin:10px auto; color:#3a3a3c; }
.om-sec { position:absolute; inset:3px; z-index:1; pointer-events:none; border:2px dashed #0a84ff; border-radius:16px; }
.om-tag { position:absolute; z-index:4; pointer-events:none; padding:3px 7px; border-radius:6px; font:700 10px/1.2 -apple-system, system-ui, sans-serif; color:#fff; max-width:180px; }
.om-tag.is-sec { background:#0a84ff; }
.om-tag.is-pri { background:#ff9f0a; }
.om-arr .om-sheet { outline:3px solid #ff9f0a; outline-offset:-3px; }
.om-hint { position:absolute; z-index:3; pointer-events:none; padding:4px 8px; border-radius:8px; background:rgb(0 0 0 / .55); color:#fff; font-size:10px; }
@keyframes om-to-side { from { transform:scale(.78, .92); border-radius:16px; opacity:.6; } }
@keyframes om-to-bottom { from { transform:scale(.96, .6); border-radius:16px; opacity:.6; } }
@keyframes om-to-float { from { transform:scale(1.25, 1.06); opacity:.4; } }
@keyframes om-map-settle { from { transform:scale(1.06); opacity:.7; } }
.om-anim-side { transform-origin:right center; animation:om-to-side .45s cubic-bezier(.2,.8,.2,1); }
.om-anim-bottom { transform-origin:center bottom; animation:om-to-bottom .45s cubic-bezier(.2,.8,.2,1); }
.om-anim-float { transform-origin:right center; animation:om-to-float .45s cubic-bezier(.2,.8,.2,1); }
.om-anim-map { animation:om-map-settle .45s ease-out; }
`;

// ---------------------------------------------------------------- example

type Mode = "closed" | "closedL" | "overlayW" | "overlayT" | "splitH" | "splitV";

function modeFor(s: DuoState): Mode {
  const id = s.pose.id;
  if (id === "closed") return "closed";
  if (id === "closed-landscape") return "closedL";
  if (id === "open") return "overlayW";
  if (id === "open-portrait") return "overlayT";
  return s.pose.split === "stacked" ? "splitV" : "splitH";
}
const isOverlay = (m: Mode) => m === "overlayW" || m === "overlayT" || m === "closed" || m === "closedL";

interface View {
  svg: SVGSVGElement;
  w: number;
  h: number;
  /** The part of this map the primary view does not cover, in px: [x, y, w, h]. */
  free: [number, number, number, number];
}

function illustration(p: Place): string {
  const c = KIND_COLOR[p.kind];
  const roof: Record<Kind, string> = {
    cafe: `<path d="M86 52 h88 l-6 14 h-76z" fill="${c}"/><path d="M92 52 v14 M110 52 v14 M128 52 v14 M146 52 v14 M164 52 v14" stroke="#fff" stroke-width="6" opacity=".8"/>`,
    bakery: `<path d="M86 52 h88 l-6 14 h-76z" fill="${c}"/><circle cx="214" cy="40" r="10" fill="#fff" opacity=".6"/><circle cx="224" cy="30" r="7" fill="#fff" opacity=".5"/>`,
    market: `<path d="M70 58 l20 -14 l20 14z M110 58 l20 -14 l20 14z M150 58 l20 -14 l20 14z" fill="${c}"/>`,
    museum: `<path d="M80 54 L130 30 L180 54z" fill="${c}"/>`,
    library: `<path d="M80 54 L130 34 L180 54z" fill="${c}"/>`,
    park: `<circle cx="60" cy="62" r="20" fill="#5aa06b"/><circle cx="210" cy="58" r="24" fill="#4f9560"/>`,
    lookout: `<path d="M0 100 L70 40 L120 80 L170 30 L260 100z" fill="#7a9a5a"/>`,
    cinema: `<rect x="84" y="44" width="92" height="14" rx="3" fill="${c}"/><path d="M90 51 h80" stroke="#ffe08a" stroke-width="3" stroke-dasharray="3 5"/>`,
    books: `<path d="M84 56 L130 38 L176 56z" fill="${c}"/>`,
    food: `<path d="M84 56 L130 40 L176 56z" fill="${c}"/><circle cx="130" cy="47" r="4" fill="#ffd27a"/>`,
  };
  const building = p.kind === "lookout" || p.kind === "park"
    ? `<rect x="104" y="64" width="52" height="30" rx="3" fill="#f3efe4"/><rect x="124" y="74" width="12" height="20" fill="${c}"/>`
    : `<rect x="90" y="56" width="80" height="44" fill="#f6f1e6"/>` +
      (p.kind === "museum" || p.kind === "library"
        ? [98, 116, 134, 152].map((x) => `<rect x="${x}" y="58" width="8" height="40" fill="#e3dccb"/>`).join("")
        : `<rect x="98" y="66" width="18" height="14" rx="2" fill="#9cc7e0"/><rect x="144" y="66" width="18" height="14" rx="2" fill="#9cc7e0"/><rect x="122" y="74" width="16" height="26" rx="2" fill="${c}"/>`);
  return `<svg class="om-illus" viewBox="0 0 260 110" aria-hidden="true">
    <defs><linearGradient id="om-sky-${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="#fff8ec"/></linearGradient></defs>
    <rect width="260" height="110" fill="url(#om-sky-${p.id})"/>
    <circle cx="214" cy="28" r="12" fill="#ffd27a" opacity=".9"/>
    <rect y="94" width="260" height="16" fill="#cfc6b0"/>
    ${roof[p.kind]}${building}
  </svg>`;
}

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let sel: string | null = "tide";
  let detail = false;
  let route: string | null = null;
  let routeFresh = false;
  let collapsed = false;
  let showArr = false;
  let current = initial;
  let lastMode: Mode | null = null;
  const cam = { ...pointFor(sel) };
  let camFrom = { ...cam };
  let camTo = { ...cam };
  let camT0 = 0;
  let raf = 0;
  let views: View[] = [];

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  function pointFor(id: string | null) {
    const p = byId(id);
    return p ? { x: p.x, y: p.y } : { ...TOWN_CENTRE };
  }

  // --- camera ---
  function applyViews(): void {
    for (const v of views) {
      const vw = v.w * SCALE, vh = v.h * SCALE;
      const [fx, fy, fw, fh] = v.free;
      let x = cam.x - (fx + fw / 2) * SCALE;
      let y = cam.y - (fy + fh / 2) * SCALE;
      const clamp = (val: number, size: number, world: number) =>
        size >= world + 300 ? (world - size) / 2 : Math.min(world + 160 - size, Math.max(-160, val));
      x = clamp(x, vw, WORLD.w);
      y = clamp(y, vh, WORLD.h);
      v.svg.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
    }
  }
  function step(): void {
    const k = Math.min(1, (performance.now() - camT0) / 520);
    const e = 1 - Math.pow(1 - k, 3);
    cam.x = camFrom.x + (camTo.x - camFrom.x) * e;
    cam.y = camFrom.y + (camTo.y - camFrom.y) * e;
    applyViews();
    raf = k < 1 ? requestAnimationFrame(step) : 0;
  }
  function flyTo(p: { x: number; y: number }): void {
    camFrom = { ...cam };
    camTo = { ...p };
    camT0 = performance.now();
    if (!raf) raf = requestAnimationFrame(step);
  }

  // --- actions ---
  function choose(id: string): void {
    sel = id;
    detail = true;
    collapsed = false;
    rerender();
    flyTo(pointFor(id));
  }
  function act(a: string, arg?: string): void {
    if (a === "pin" || a === "row") return choose(arg!);
    if (a === "back") detail = false;
    else if (a === "collapse") collapsed = !collapsed;
    else if (a === "arr") showArr = !showArr;
    else if (a === "go") {
      if (route === sel) route = null;
      else (route = sel), (routeFresh = true);
    }
    rerender();
  }
  const onClick = (ev: Event) => {
    const t = (ev.target as Element).closest<HTMLElement | SVGElement>("[data-om]");
    if (!t) return;
    ev.stopPropagation();
    act(t.dataset.om!, t.dataset.arg);
  };
  for (const el of [screens.outer, screens.start, screens.end]) el.addEventListener("click", onClick);

  // --- drawing ---
  function mapSvg(): SVGSVGElement {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    const parts: string[] = [BASE_MAP];
    const rp = byId(route);
    if (rp) {
      const r = routeFor(rp);
      const fresh = routeFresh ? " is-fresh" : "";
      parts.push(`<path class="om-route-case${fresh}" pathLength="1" d="${r.d}"/><path class="om-route${fresh}" pathLength="1" d="${r.d}"/>`);
    }
    parts.push(`<circle cx="${HOME.x}" cy="${HOME.y}" r="22" fill="#0a84ff" opacity=".18"/><circle cx="${HOME.x}" cy="${HOME.y}" r="10" fill="#0a84ff" stroke="#fff" stroke-width="4"/>`);
    // Unselected pins first, so the selected one sits on top.
    const order = [...PLACES].sort((a, b) => Number(a.id === sel) - Number(b.id === sel));
    for (const p of order) {
      const on = p.id === sel;
      const c = KIND_COLOR[p.kind];
      const r = on ? 20 : 15;
      parts.push(`<g class="om-pin" data-om="pin" data-arg="${p.id}" transform="translate(${p.x} ${p.y})">
        <circle class="om-hit" r="30"/>
        ${on ? `<path d="M0 ${r + 12} L-9 ${r - 4} L9 ${r - 4}Z" fill="${c}"/>` : ""}
        <circle class="om-dot" r="${r}" fill="${c}" stroke="#fff" stroke-width="4"/>
        <text y="1" font-size="${on ? 15 : 12}" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${KIND_GLYPH[p.kind]}</text>
        ${on ? `<g transform="translate(0 ${-r - 20})"><rect x="${-p.name.length * 4.4 - 10}" y="-12" width="${p.name.length * 8.8 + 20}" height="24" rx="12" fill="#fff" stroke="${c}" stroke-width="2"/><text font-size="13" font-weight="700" fill="#1c1c1e" text-anchor="middle" dominant-baseline="middle">${p.name}</text></g>` : ""}
      </g>`);
    }
    svg.innerHTML = parts.join("");
    return svg;
  }

  /**
   * One map view. `span` > 1 draws a map larger than its screen (the whole
   * flat inner display) and `offset` shifts it so this half shows its part.
   */
  function mapLayer(w: number, h: number, free: View["free"], opts: { span?: "x" | "y"; offset?: number; pitch?: boolean } = {}): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "om-wrap";
    if (opts.span === "x") wrap.style.cssText = `width:200%;left:${-(opts.offset ?? 0) * 100}%`;
    if (opts.span === "y") wrap.style.cssText = `height:200%;top:${-(opts.offset ?? 0) * 100}%`;
    const plane = document.createElement("div");
    plane.className = "om-plane";
    if (opts.pitch) plane.dataset.pitch = "1";
    const svg = mapSvg();
    plane.append(svg);
    wrap.append(plane);
    views.push({ svg, w, h, free });
    return wrap;
  }

  function stars(r: number): string {
    const full = Math.round(r);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function sheet(mode: Mode): HTMLElement {
    const el = document.createElement("div");
    const kind = mode === "overlayW" ? "is-card" : mode === "closedL" ? "is-side" : mode === "closed" || mode === "overlayT" ? "is-bottom" : "is-pane";
    el.className = `om-sheet ${kind}`;
    if (mode === "closed") el.classList.add("is-short");
    if (mode === "splitH") el.classList.add("fold-start");
    if (mode === "splitV") el.classList.add("fold-top");
    const canCollapse = isOverlay(mode);
    const isCol = canCollapse && collapsed;
    if (isCol) el.classList.add("is-collapsed");
    const p = detail ? byId(sel) : null;

    // Collapsed side panel: a slim strip with a way back out.
    if (mode === "closedL" && isCol) {
      el.innerHTML = `<button class="om-ico" data-om="collapse" aria-label="Show places" style="margin:4px auto">‹</button><div class="om-vert">${p ? p.name : "Places"}</div>`;
      return el;
    }

    const head = document.createElement("div");
    head.className = "om-grab" + (kind === "is-pane" || kind === "is-side" ? " om-is-pane-head" : "");
    const title = p ? p.name : "Larkhaven";
    const sub = p ? `${p.kindLabel} · ${routeFor(p).minutes} min walk` : `${PLACES.length} places nearby`;
    head.innerHTML = `<div class="om-head">
      ${p && !isCol ? `<button class="om-ico" data-om="back" aria-label="Back to places">‹</button>` : ""}
      <div style="flex:1;min-width:0"><div class="om-title">${title}</div><div class="om-sub">${sub}</div></div>
      ${canCollapse ? `<button class="om-ico" data-om="collapse" aria-label="${isCol ? "Expand" : "Collapse"}">${mode === "closedL" ? "›" : isCol ? "⌃" : "⌄"}</button>` : ""}
    </div>`;
    el.append(head);
    if (kind === "is-bottom") dragToResize(el, head);
    if (isCol) return el;

    const body = document.createElement("div");
    body.className = "om-body";
    if (p) {
      const r = routeFor(p);
      const routed = route === p.id;
      body.innerHTML = `${illustration(p)}
        <div><span class="om-stars">${stars(p.rating)}</span> <b>${p.rating.toFixed(1)}</b> <span class="om-sub">(${p.reviews})</span></div>
        <p style="margin:6px 0">${p.blurb}</p>
        <dl class="om-facts"><dt>Hours</dt><dd>${p.hours}<br><span class="om-open">${p.open}</span></dd><dt>Address</dt><dd>${p.address}</dd></dl>
        <button class="om-go${routed ? " is-on" : ""}" data-om="go">${routed ? "End route" : "Directions"}</button>
        ${routed ? `<div class="om-walk">${r.minutes} min · ${r.metres} m on foot</div>` : ""}`;
    } else {
      body.innerHTML = PLACES.map(
        (q) => `<button class="om-row${q.id === sel ? " is-sel" : ""}" data-om="row" data-arg="${q.id}">
          <span class="om-badge" style="background:${KIND_COLOR[q.kind]}">${KIND_GLYPH[q.kind]}</span>
          <span style="flex:1;min-width:0"><b>${q.name}</b><span>${q.kindLabel} · ★ ${q.rating.toFixed(1)} · ${routeFor(q).minutes} min</span></span>
        </button>`,
      ).join("");
    }
    el.append(body);
    return el;
  }

  /** The bottom sheet's grabber: drag it up or down, or tap it, to expand or collapse. */
  function dragToResize(el: HTMLElement, handle: HTMLElement): void {
    let y0 = 0, h0 = 0, dragging = false, moved = 0;
    handle.addEventListener("pointerdown", (e) => {
      if ((e.target as Element).closest("button")) return;
      dragging = true;
      moved = 0;
      y0 = e.clientY;
      h0 = el.getBoundingClientRect().height / scaleOf(el);
      el.classList.add("is-dragging");
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dy = (e.clientY - y0) / scaleOf(el);
      moved = Math.max(moved, Math.abs(dy));
      const max = (el.parentElement?.clientHeight ?? 380) * 0.82;
      el.style.height = `${Math.max(62, Math.min(max, h0 - dy))}px`;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      if (moved < 6) collapsed = !collapsed;
      else {
        const h = parseFloat(el.style.height);
        const max = (el.parentElement?.clientHeight ?? 380) * (el.classList.contains("is-short") ? 0.56 : 0.64);
        collapsed = h < (62 + max) / 2;
      }
      rerender();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }
  /** The emulator may scale the device; convert screen px to CSS px. */
  function scaleOf(el: HTMLElement): number {
    const r = el.getBoundingClientRect();
    return el.offsetWidth ? r.width / el.offsetWidth || 1 : 1;
  }

  function root(): HTMLElement {
    const r = document.createElement("div");
    r.className = "om" + (showArr ? " om-arr" : "");
    return r;
  }
  function arrButton(pos: string): HTMLElement {
    const b = document.createElement("button");
    b.className = "om-btn" + (showArr ? " is-on" : "");
    b.dataset.om = "arr";
    b.style.cssText = pos;
    b.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><rect x="1" y="1" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="3" width="5" height="7" rx="1" fill="currentColor"/></svg>${showArr ? "Hide arrangement" : "Show arrangement"}`;
    return b;
  }
  function tag(kind: "pri" | "sec", text: string, pos: string): HTMLElement {
    const t = document.createElement("div");
    t.className = `om-tag is-${kind}`;
    t.textContent = text;
    t.style.cssText = pos;
    return t;
  }
  function secOutline(): HTMLElement {
    const d = document.createElement("div");
    d.className = "om-sec";
    return d;
  }

  function render(s: DuoState): void {
    current = s;
    const mode = modeFor(s);
    const changed = lastMode !== null && lastMode !== mode;
    const fromOverlay = lastMode === "overlayW" || lastMode === "overlayT";
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    views = [];
    const col = collapsed;
    let sheetEl: HTMLElement;

    if (mode === "closed" || mode === "closedL") {
      const r = root();
      const w = mode === "closed" ? 300 : 380, h = mode === "closed" ? 380 : 300;
      const free: View["free"] =
        mode === "closed" ? (col ? [0, 40, 300, 270] : [0, 40, 300, 120]) : col ? [0, 0, 330, 300] : [0, 0, 200, 300];
      r.append(mapLayer(w, h, free));
      sheetEl = sheet(mode);
      r.append(sheetEl, arrButton("left:10px;top:10px"));
      if (showArr) {
        r.append(secOutline(), tag("sec", "Secondary · map", "left:10px;top:40px"));
        r.append(tag("pri", mode === "closed" ? "Primary · sheet over the map — drag to collapse" : "Primary · side panel over the map", mode === "closed" ? "left:16px;bottom:calc(8px + " + (col ? "62px" : "56%") + " + 6px)" : `right:${col ? 52 : 184}px;bottom:10px`));
      }
      screens.outer.append(r);
    } else if (mode === "overlayW" || mode === "overlayT") {
      // One continuous map across the flat display: each half draws all of it, offset.
      const span = mode === "overlayW" ? "x" : "y";
      const W = mode === "overlayW" ? 600 : 380, H = mode === "overlayW" ? 380 : 600;
      const free: View["free"] =
        mode === "overlayW" ? (col ? [0, 0, 600, 380] : [0, 0, 358, 380]) : col ? [0, 0, 380, 520] : [0, 0, 380, 400];
      const a = root(), b = root();
      for (const [el, off] of [[a, 0], [b, 1]] as const) {
        const m = mapLayer(W, H, free, { span, offset: off });
        if (showArr) m.append(secOutline());
        el.append(m);
      }
      sheetEl = sheet(mode);
      b.append(sheetEl);
      a.append(arrButton("left:12px;top:12px"));
      if (showArr) {
        a.append(tag("sec", "Secondary · map — spans both halves, under the primary", "left:12px;top:44px"));
        b.append(tag("pri", col ? "Primary · collapsed" : "Primary · place sheet, overlaying the map", mode === "overlayW" ? (col ? "right:16px;top:90px" : "right:14px;bottom:12px") : `left:16px;bottom:calc(8px + ${col ? "62px" : "64%"} + 6px)`));
      }
      if (changed && !fromOverlay) sheetEl.classList.add("om-anim-float");
      screens.start.append(a);
      screens.end.append(b);
    } else {
      // Partly folded: the overlay becomes a split — each view its own side, nothing in the fold.
      const W = mode === "splitH" ? 300 : 380, H = mode === "splitH" ? 380 : 300;
      const a = root(), b = root();
      const m = mapLayer(W, H, [0, 0, W, H], { pitch: true });
      // The map may run into the fold, but its pins may not be tapped there.
      const guard = document.createElement("div");
      guard.style.cssText = `position:absolute;z-index:2;${mode === "splitH" ? "top:0;bottom:0;right:0;width:18px" : "left:0;right:0;bottom:0;height:18px"}`;
      a.append(m, guard, arrButton("left:12px;top:12px"));
      sheetEl = sheet(mode);
      b.append(sheetEl);
      if (showArr) {
        a.append(secOutline(), tag("sec", "Secondary · map — its own side while folded", "left:12px;top:44px"));
        b.append(tag("pri", "Primary · place sheet — its own side while folded", "right:12px;bottom:10px"));
      }
      if (mode === "splitV") {
        const hint = document.createElement("div");
        hint.className = "om-hint";
        hint.style.cssText = "right:10px;bottom:24px";
        hint.textContent = "Fold further to tilt the map";
        a.append(hint);
      }
      if (changed && fromOverlay) {
        sheetEl.classList.add(mode === "splitH" ? "om-anim-side" : "om-anim-bottom");
        m.classList.add("om-anim-map");
      }
      screens.start.append(a);
      screens.end.append(b);
    }
    routeFresh = false;
    lastMode = mode;
    applyViews();
    applyPitch(s);
  }

  /** The hinge as an effect: the more you fold, the more the standing map tilts back, like a 3D map view. */
  function applyPitch(s: DuoState): void {
    const pitch = s.pose.adjustable ? Math.max(0, Math.min(38, (180 - s.hinge) * 0.32)) : 0;
    for (const el of [screens.start, screens.end])
      for (const p of el.querySelectorAll<HTMLElement>(".om-plane[data-pitch]"))
        p.style.transform = pitch ? `perspective(700px) rotateX(${pitch.toFixed(1)}deg) scale(${(1 + pitch / 55).toFixed(3)})` : "";
  }

  const rerender = () => render(current);

  return {
    render,
    hinge(s: DuoState) {
      current = s;
      applyPitch(s);
    },
    destroy() {
      cancelAnimationFrame(raf);
      for (const el of [screens.outer, screens.start, screens.end]) el.removeEventListener("click", onClick);
      style.remove();
    },
  };
}

export const overlayMapExample: Example = {
  id: "overlay-map",
  title: "Overlay Map",
  category: "patterns",
  summary:
    "Apple's overlay arrangement, plainly: a map underneath and a place sheet on top. Flat, the sheet floats over one continuous map; partly folded, they move to separate sides so nothing sits in the fold. Turn on Show arrangement to see which view is which.",
  bestPose: "book",
  poses: {
    closed: "The map fills the outer display with the place sheet as a bottom sheet over it — drag or tap its grabber to collapse it to a peek and back.",
    "closed-landscape": "The sheet becomes a trailing side panel over the map, collapsible to a slim strip so the map gets the whole width.",
    open: "One continuous map runs across both halves and under the fold, with the sheet floating over it as a card on the trailing side; collapse it to a small header.",
    "open-portrait": "The map runs top to bottom across the fold and the sheet overlays its lower part as a bottom sheet you can drag down.",
    book: "Partly folded, the overlay separates: the map takes the left page and the sheet the right, neither covering the other, and the sheet animates into its half.",
    table: "The map stands on the upright half and tilts back like a 3D map as you fold further; the sheet with its list and Directions lies on the flat half under your thumb.",
    stand: "Stood on its edge, map and sheet sit on separate sides like book pose — a hands-free route to glance at.",
  },
  principle:
    "An overlay arrangement layers its views: 'while partially folded they occupy separate sides, otherwise the primary overlays the secondary' (HIG, 'Dynamic layouts and reserved regions'); use overlay where partial obscuring is fine and split where neither view may be hidden (HIG checklist §6, 'Split vs overlay'). The hinge only tilts the map — an effect, never layout (checklist §9).",
  create,
};
