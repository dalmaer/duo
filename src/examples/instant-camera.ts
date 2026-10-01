/**
 * Instant Camera — closed it's a camera, open it develops the print.
 *
 * Closed, the outer display is a chunky instant-camera body: a viewfinder
 * showing a live scene (there is no real camera here, so it's a little
 * animated park, beach or city — or your own camera, only if you ask and
 * allow it), a big red shutter and a film counter. Press the shutter and a
 * print whirrs out of the slot on top.
 *
 * Open the phone and the newest print develops on the inner display: from
 * the grey-green blank, through the warm chemical bloom, to full colour, over
 * about six seconds. Drag it to shake it — it doesn't help, it never did, but
 * it feels right. The other half is the album, with handwritten captions you
 * type yourself.
 *
 * The camera, the album and developing all work in every pose too: the inner
 * display has its own viewfinder and shutter, and the outer display its own
 * album and print view. Prints are canvas snapshots kept in memory.
 *
 * The camera design and every scene are original, drawn here; no brand.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, now, ready, running, tone } from "../lib/audio.ts";

type SceneId = "park" | "beach" | "city" | "live";
type Print = { id: number; url: string; caption: string; scene: SceneId; developStart: number | null; taken: number };

const SCENES: { id: SceneId; label: string }[] = [
  { id: "park", label: "Park" },
  { id: "beach", label: "Beach" },
  { id: "city", label: "City" },
];
const PACK = 10;
const DEVELOP = 6;
const EJECT = 1.7;

const HAND = `"Bradley Hand", "Segoe Print", "Marker Felt", "Comic Sans MS", cursive`;

const CSS = `
.ic { position:absolute; inset:0; box-sizing:border-box; font:12px/1.25 system-ui, -apple-system, sans-serif; color:#2a2522; overflow:hidden; }
.ic button { font:inherit; cursor:pointer; }
.ic-desk { background: radial-gradient(130% 90% at 50% 10%, #4a4038, #1e1915 75%); }
.ic-zone { position:absolute; left:0; right:0; top:0; height:30%; overflow:hidden; }
.ic-zone .ic-print { position:absolute; left:50%; bottom:0; width:34cqw; margin-left:-17cqw; transform: translateY(12%); cursor:pointer; }
.ic-zone .ic-print.ic-out { animation: ic-eject ${EJECT}s steps(14, end) both; }
@keyframes ic-eject { from { transform: translateY(100%); } to { transform: translateY(12%); } }
.ic-body { position:absolute; left:4cqw; right:4cqw; top:30%; bottom:3cqh; border-radius:26px 26px 22px 22px; overflow:hidden;
  background: linear-gradient(180deg, #f4efe4 0 58%, #2f2c2a 58%); box-shadow: 0 10px 24px #0008, inset 0 2px 0 #fff, inset 0 -3px 0 #0005; display:flex; flex-direction:column; align-items:center; }
.ic-slot { width:44%; height:5px; margin-top:6px; border-radius:3px; background:#1d1a18; box-shadow: inset 0 1px 2px #000; flex:none; }
.ic-stripe { position:absolute; left:50%; top:58%; bottom:0; width:30px; margin-left:-15px; display:flex; pointer-events:none; }
.ic-stripe i { flex:1; }
.ic-vf { margin-top:8px; padding:6px; border-radius:16px; background:#1d1a18; box-shadow: inset 0 2px 6px #000, 0 1px 0 #fff; position:relative; flex:none; }
.ic-vf canvas { display:block; width:66cqw; height:38cqw; border-radius:10px; background:#9cc; }
.ic-flash { position:absolute; inset:6px; border-radius:10px; background:#fff; opacity:0; pointer-events:none; }
.ic-flash.ic-go { animation: ic-flash .35s ease-out; }
@keyframes ic-flash { 0% { opacity:1; } 100% { opacity:0; } }
.ic-row { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; width:100%; padding:0 14px; box-sizing:border-box; flex:1; }
.ic-counter { display:flex; flex-direction:column; align-items:center; gap:2px; color:#cfc6b8; font:700 8px system-ui; letter-spacing:0.12em; min-width:44px; }
.ic-counter b { display:grid; place-items:center; width:30px; height:22px; border-radius:6px; background:#111; color:#ff8a3d; font:700 14px ui-monospace, Menlo, monospace; box-shadow: inset 0 1px 3px #000; }
.ic-shutter { width:64px; height:64px; border-radius:50%; border:0; background: radial-gradient(circle at 35% 30%, #ff8a7a, #e0322a 55%, #a3160f); box-shadow: 0 4px 0 #6d0d08, 0 6px 12px #0008, inset 0 2px 0 #fff6; color:#fff; font:800 9px system-ui !important; letter-spacing:0.08em; }
.ic-shutter:active { transform: translateY(3px); box-shadow: 0 1px 0 #6d0d08, 0 2px 6px #0008; }
.ic-shutter[disabled] { filter: grayscale(0.7) brightness(0.8); }
.ic-chips { position:relative; z-index:1; display:flex; gap:5px; padding:0 10px 10px; flex-wrap:wrap; justify-content:center; }
.ic-chip { border:0; border-radius:999px; padding:0 8px; height:26px; background:#4a4643; color:#eee6da; font:700 10.5px system-ui !important; }
.ic-chip.ic-on { background:#f4efe4; color:#2a2522; }
.ic-lens { position:absolute; width:14px; height:14px; border-radius:50%; top:8px; left:12px; background: radial-gradient(circle at 40% 35%, #8ab, #123 60%); box-shadow: 0 0 0 3px #1d1a18; }

.ic-land .ic-zone { top:0; bottom:0; left:0; right:auto; width:20%; height:auto; }
.ic-land .ic-zone .ic-print { left:auto; right:2px; top:50%; bottom:auto; width:17cqw; margin:0; transform: translate(0, -50%); }
.ic-land .ic-zone .ic-print.ic-out { animation-name: ic-eject-x; }
@keyframes ic-eject-x { from { transform: translate(100%, -50%); } to { transform: translate(0, -50%); } }
.ic-land .ic-body { left:20%; right:3cqw; top:4cqh; bottom:4cqh; flex-direction:row; align-items:stretch; background: linear-gradient(90deg, #f4efe4 0 72%, #2f2c2a 72%); border-radius:22px 26px 26px 22px; }
.ic-land .ic-slot { position:absolute; left:6px; top:28%; bottom:28%; width:5px; height:auto; margin:0; }
.ic-land .ic-stripe { left:72%; right:0; top:50%; bottom:auto; width:auto; height:24px; margin:-12px 0 0; flex-direction:column; }
.ic-land .ic-vf { margin:auto 0 auto 16px; }
.ic-land .ic-vf canvas { width:46cqw; height:31cqw; }
.ic-land .ic-side { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:8px 4px; position:relative; z-index:1; }
.ic-land .ic-shutter { width:54px; height:54px; }
.ic-land .ic-chips { padding:0; flex-direction:column; gap:3px; flex-wrap:nowrap; }
.ic-land .ic-chip { height:22px; font-size:9.5px !important; padding:0 6px; }

.ic-print { background:#fbfaf6; padding:6% 6% 0; border-radius:2px; box-shadow: 0 6px 14px #0007, 0 1px 0 #fff inset; box-sizing:border-box; user-select:none; }
.ic-img { position:relative; aspect-ratio:1; overflow:hidden; background:#7d8b78; }
.ic-img img { display:block; width:100%; height:100%; object-fit:cover; }
.ic-fog { position:absolute; inset:0; background: linear-gradient(160deg, #84927d, #6f7c6b); }
.ic-bloom { position:absolute; inset:0; background: radial-gradient(circle at 50% 55%, #ffb36b, #c7a2ff 70%); mix-blend-mode: soft-light; }
.ic-cap { height:22%; min-height:18px; display:flex; align-items:center; justify-content:center; font: 15px ${HAND}; color:#2c3e8f; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:2px 4px; }
.ic-thumb .ic-cap { font-size:9px; min-height:12px; }

.ic-table { background:
  repeating-linear-gradient(95deg, rgb(0 0 0 / 0.07) 0 2px, transparent 2px 13px),
  linear-gradient(180deg, #8a6243, #6c4a31); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; }
.ic-big { width:min(66cqw, 60cqh); touch-action:none; cursor:grab; transition: transform .45s cubic-bezier(.3,1.6,.5,1); }
.ic-big.ic-drag { transition:none; cursor:grabbing; }
.ic-big.ic-new { animation: ic-drop .6s ease-out; }
@keyframes ic-drop { from { transform: translateY(-40px) rotate(-6deg); opacity:0; } }
.ic-status { color:#fbe9d3; font:700 11px system-ui; text-shadow:0 1px 2px #0008; text-align:center; min-height:14px; }
.ic-top { position:absolute; top:10px; left:10px; right:10px; display:flex; gap:6px; z-index:2; align-items:center; }
.ic-pill { border:0; border-radius:999px; height:32px; padding:0 12px; background:rgb(255 255 255 / 0.9); color:#2a2522; font:700 11.5px system-ui !important; box-shadow:0 2px 6px #0004; }
.ic-pill.ic-dark { background:rgb(20 16 12 / 0.7); color:#fbe9d3; }
.ic-grow { flex:1; }

.ic-album { background:#efe6d4; display:flex; flex-direction:column; color:#3a2f26; }
.ic-album h3 { margin:0; font: 22px ${HAND}; color:#3a2f26; padding:12px 14px 4px; display:flex; align-items:baseline; gap:8px; }
.ic-album h3 small { font:600 10px system-ui; color:#8a7a68; }
.ic-grid { flex:1; overflow:auto; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; padding:6px 14px 10px; align-content:start; }
.ic-thumb { border:0; padding:6% 6% 0; transform: rotate(var(--r)); }
.ic-thumb.ic-sel { outline:3px solid #e0322a; outline-offset:2px; }
.ic-empty { grid-column:1 / -1; text-align:center; color:#8a7a68; font: 15px ${HAND}; padding:24px 10px; }
.ic-write { display:flex; gap:6px; padding:8px 14px 12px; border-top:1px dashed #cdbfa6; align-items:center; }
.ic-write input { flex:1; min-width:0; height:36px; border-radius:10px; border:1.5px solid #cdbfa6; background:#fffdf7; padding:0 10px; font: 16px ${HAND}; color:#2c3e8f; outline:none; }
.ic-write input:focus { border-color:#2c3e8f; }
.ic-write span { font:600 10px system-ui; color:#8a7a68; }
.ic-l .ic-top { right:26px; } .ic-r .ic-grid, .ic-r h3, .ic-r .ic-write { padding-left:28px; }
.ic-t .ic-table { padding-bottom:20px; } .ic-b h3 { padding-top:24px; }
.ic-cam { background: linear-gradient(180deg, #f4efe4, #e2dacb); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; }
.ic-cam .ic-vf canvas { width:76cqw; height:44cqw; }
.ic-stacked .ic-cam .ic-vf canvas { width:58cqw; height:36cqw; }
.ic-cam .ic-row { flex:none; justify-content:center; gap:18px; }
.ic-cam .ic-counter { color:#6a6056; }
.ic-cam .ic-chips .ic-chip { background:#d9cfbd; color:#2a2522; }
.ic-cam .ic-chips .ic-chip.ic-on { background:#2a2522; color:#f4efe4; }
.ic-desk > .ic-toast { top:8px; bottom:auto; }
.ic-toast { position:absolute; left:50%; bottom:12px; transform:translateX(-50%); background:#2a2522; color:#fbe9d3; padding:6px 12px; border-radius:999px; font:700 11px system-ui; white-space:nowrap; z-index:5; pointer-events:none; transition:opacity .3s; opacity:0; }
`;

const STRIPE = ["#e8433d", "#f59a2c", "#f6d24a", "#4cb15a", "#3a7fd9"];

// ---------- the scenes, drawn procedurally ----------

function drawScene(g: CanvasRenderingContext2D, id: SceneId, w: number, h: number, t: number, video: HTMLVideoElement | null): void {
  if (id === "live" && video && video.readyState >= 2) {
    const vw = video.videoWidth || w;
    const vh = video.videoHeight || h;
    const s = Math.max(w / vw, h / vh);
    g.drawImage(video, (w - vw * s) / 2, (h - vh * s) / 2, vw * s, vh * s);
    return;
  }
  if (id === "beach") return beach(g, w, h, t);
  if (id === "city") return city(g, w, h, t);
  park(g, w, h, t);
}

function grad(g: CanvasRenderingContext2D, y0: number, y1: number, a: string, b: string): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, a);
  gr.addColorStop(1, b);
  return gr;
}

function cloud(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.beginPath();
  g.arc(x, y, s, 0, Math.PI * 2);
  g.arc(x + s, y - s * 0.4, s * 1.2, 0, Math.PI * 2);
  g.arc(x + s * 2.1, y, s * 0.9, 0, Math.PI * 2);
  g.fill();
}

function park(g: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  g.fillStyle = grad(g, 0, h * 0.7, "#6fc3ff", "#d8f1ff");
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#fff3a8";
  g.beginPath();
  g.arc(w * 0.82, h * 0.2, w * 0.07, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgb(255 255 255 / 0.9)";
  for (let i = 0; i < 3; i++) cloud(g, ((t * (10 + i * 5) + i * w * 0.45) % (w * 1.4)) - w * 0.2, h * (0.14 + i * 0.09), w * 0.04);
  g.fillStyle = "#8fd17a";
  g.beginPath();
  g.ellipse(w * 0.25, h * 0.78, w * 0.6, h * 0.3, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = "#6dbd5c";
  g.beginPath();
  g.ellipse(w * 0.85, h * 0.8, w * 0.55, h * 0.28, 0, Math.PI, 0);
  g.fill();
  g.fillRect(0, h * 0.72, w, h);
  for (const [tx, s] of [[0.14, 1], [0.66, 0.8], [0.9, 1.1]] as const) {
    g.fillStyle = "#7a5233";
    g.fillRect(w * tx - w * 0.01, h * 0.48, w * 0.02, h * 0.22);
    g.fillStyle = "#3f9a45";
    g.beginPath();
    g.arc(w * tx, h * 0.46, w * 0.07 * s, 0, Math.PI * 2);
    g.arc(w * tx - w * 0.04 * s, h * 0.52, w * 0.05 * s, 0, Math.PI * 2);
    g.arc(w * tx + w * 0.04 * s, h * 0.52, w * 0.05 * s, 0, Math.PI * 2);
    g.fill();
  }
  // flowers
  for (let i = 0; i < 12; i++) {
    g.fillStyle = ["#ff6b8a", "#ffd34d", "#ffffff"][i % 3]!;
    g.fillRect(((i * 97) % 100) / 100 * w, h * (0.8 + ((i * 37) % 17) / 100), w * 0.012, w * 0.012);
  }
  // the dog, running back and forth after nothing in particular
  const px = w * (0.5 + 0.34 * Math.sin(t * 0.55));
  const dir = Math.cos(t * 0.55) >= 0 ? 1 : -1;
  const gy = h * 0.86;
  const s = w * 0.05;
  const run = Math.sin(t * 14);
  const hop = Math.abs(Math.sin(t * 7)) * s * 0.25;
  g.save();
  g.translate(px, gy - hop);
  g.scale(dir, 1);
  g.strokeStyle = "#8a5426";
  g.lineWidth = s * 0.28;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(-s * 0.7, -s * 0.3);
  g.lineTo(-s * 0.7 - run * s * 0.35, s * 0.35);
  g.moveTo(s * 0.6, -s * 0.3);
  g.lineTo(s * 0.6 + run * s * 0.35, s * 0.35);
  g.moveTo(-s * 1.0, -s * 0.8);
  g.lineTo(-s * 1.5, -s * 1.2 + Math.sin(t * 20) * s * 0.2);
  g.stroke();
  g.fillStyle = "#c98a4b";
  g.beginPath();
  g.ellipse(0, -s * 0.6, s * 1.1, s * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(s * 1.1, -s * 1.1, s * 0.45, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#8a5426";
  g.beginPath();
  g.ellipse(s * 0.95, -s * 1.15, s * 0.16, s * 0.34, 0.3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#222";
  g.beginPath();
  g.arc(s * 1.25, -s * 1.2, s * 0.07, 0, Math.PI * 2);
  g.arc(s * 1.55, -s * 1.05, s * 0.09, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function beach(g: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  g.fillStyle = grad(g, 0, h * 0.5, "#ff9f6b", "#ffe2a8");
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#fff1b8";
  g.beginPath();
  g.arc(w * 0.3, h * 0.46, w * 0.09, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = grad(g, h * 0.46, h * 0.72, "#3d8fd0", "#2a6fb0");
  g.fillRect(0, h * 0.46, w, h * 0.28);
  g.fillStyle = "rgb(255 240 200 / 0.5)";
  for (let i = 0; i < 6; i++) g.fillRect(w * 0.3 - w * 0.08 + Math.sin(t * 2 + i) * 3, h * (0.48 + i * 0.035), w * 0.16 - i * 6, 2);
  g.strokeStyle = "rgb(255 255 255 / 0.75)";
  g.lineWidth = Math.max(1, w * 0.006);
  for (let row = 0; row < 3; row++) {
    g.beginPath();
    const y = h * (0.56 + row * 0.06);
    for (let x = 0; x <= w; x += 6) g.lineTo(x, y + Math.sin(x * 0.05 + t * 2 + row) * 2);
    g.stroke();
  }
  // sailboat
  const bx = ((t * 6) % (w + 60)) - 30;
  g.fillStyle = "#3a2a2a";
  g.fillRect(bx - 10, h * 0.455, 20, 4);
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(bx, h * 0.455);
  g.lineTo(bx, h * 0.37);
  g.lineTo(bx + 11, h * 0.455);
  g.fill();
  // sand
  g.fillStyle = "#f3d39a";
  g.beginPath();
  g.moveTo(0, h * 0.74);
  for (let x = 0; x <= w; x += 10) g.lineTo(x, h * 0.72 + Math.sin(x * 0.03 + t * 1.5) * 3);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  // umbrella
  const ux = w * 0.72;
  g.strokeStyle = "#6b4428";
  g.lineWidth = Math.max(2, w * 0.012);
  g.beginPath();
  g.moveTo(ux, h * 0.95);
  g.lineTo(ux - w * 0.03, h * 0.62);
  g.stroke();
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? "#fff" : "#e8433d";
    g.beginPath();
    g.moveTo(ux - w * 0.03, h * 0.6);
    g.arc(ux - w * 0.03, h * 0.66, w * 0.15, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
    g.fill();
  }
  // gulls
  g.strokeStyle = "#3a3a3a";
  g.lineWidth = Math.max(1, w * 0.006);
  for (let i = 0; i < 3; i++) {
    const gx = ((t * (14 + i * 4) + i * 90) % (w + 40)) - 20;
    const gy = h * (0.14 + i * 0.07) + Math.sin(t * 2 + i) * 4;
    const f = Math.sin(t * 8 + i) * 3;
    g.beginPath();
    g.moveTo(gx - 7, gy - f);
    g.quadraticCurveTo(gx - 3, gy - 4, gx, gy);
    g.quadraticCurveTo(gx + 3, gy - 4, gx + 7, gy - f);
    g.stroke();
  }
}

function city(g: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  g.fillStyle = grad(g, 0, h, "#0a0f2e", "#3b3a7a");
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#fff";
  for (let i = 0; i < 30; i++) if ((i * 7 + Math.floor(t * 2)) % 9) g.fillRect(((i * 53) % 100) / 100 * w, ((i * 31) % 45) / 100 * h, 1.5, 1.5);
  g.fillStyle = "#fff4d0";
  g.beginPath();
  g.arc(w * 0.8, h * 0.18, w * 0.06, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#0a0f2e";
  g.beginPath();
  g.arc(w * 0.83, h * 0.16, w * 0.055, 0, Math.PI * 2);
  g.fill();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const bw = w / n;
    const bh = h * (0.3 + (((i * 41) % 7) / 7) * 0.35);
    const x = i * bw;
    const y = h * 0.82 - bh;
    g.fillStyle = i % 2 ? "#1d2148" : "#252a58";
    g.fillRect(x, y, bw - 2, bh);
    for (let r = 0; r < Math.floor(bh / 9); r++)
      for (let c = 0; c < 3; c++) {
        const lit = (i * 13 + r * 7 + c * 3 + Math.floor(t / 1.5 + i)) % 5 > 1;
        g.fillStyle = lit ? "#ffd56b" : "#30366a";
        g.fillRect(x + 3 + c * ((bw - 8) / 3), y + 4 + r * 9, (bw - 14) / 3, 4);
      }
  }
  g.fillStyle = "#1a1a24";
  g.fillRect(0, h * 0.82, w, h);
  g.fillStyle = "#ffd56b";
  for (let x = 0; x < w; x += 24) g.fillRect(x + ((t * 30) % 24) * 0, h * 0.9, 10, 2);
  const cx = ((t * w * 0.18) % (w + 80)) - 40;
  g.fillStyle = "rgb(255 240 180 / 0.25)";
  g.beginPath();
  g.moveTo(cx + 18, h * 0.86);
  g.lineTo(cx + 70, h * 0.82);
  g.lineTo(cx + 70, h * 0.94);
  g.fill();
  g.fillStyle = "#e8433d";
  g.fillRect(cx - 18, h * 0.84, 36, 8);
  g.fillRect(cx - 10, h * 0.81, 20, 5);
  g.fillStyle = "#111";
  g.beginPath();
  g.arc(cx - 10, h * 0.885, 3.5, 0, Math.PI * 2);
  g.arc(cx + 10, h * 0.885, 3.5, 0, Math.PI * 2);
  g.fill();
}

// ---------- the example ----------

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let state = initial;
  let lastDisplay = initial.pose.display;
  const prints: Print[] = [];
  let nextId = 1;
  let current: number | null = null;
  let slot: number | null = null;
  let ejectAt = -10;
  let scene: SceneId = "park";
  let film = PACK;
  let outerMode: "camera" | "album" | "view" = "camera";
  let innerMode: "print" | "camera" = "camera";
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let toast = { text: "", until: 0 };
  let shakes = 0;
  const t0 = performance.now();
  const T = () => (performance.now() - t0) / 1000;
  let dead = false;
  let raf = 0;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  // --- per-render references, repainted by the loop ---
  let finders: { g: CanvasRenderingContext2D; w: number; h: number }[] = [];
  let live: { print: Print; img: HTMLElement; fog: HTMLElement; bloom: HTMLElement; status?: HTMLElement }[] = [];
  let toasts: HTMLElement[] = [];

  const byId = (id: number | null) => prints.find((p) => p.id === id) ?? null;
  const progress = (p: Print) => (p.developStart === null ? 0 : Math.max(0, Math.min(1, (T() - p.developStart) / DEVELOP)));
  const say = (s: string, secs = 2.4) => (toast = { text: s, until: T() + secs });

  function sfx(fn: () => void): void {
    void ready()
      .then(fn)
      .catch(() => {});
  }
  const click = () => {
    burst(0.03, 0.6, 4200, 0.8, undefined, "highpass");
    tone(900, 300, 0.05, 0.12, "square");
  };
  const whirr = () => {
    const n = now();
    for (let i = 0; i < 16; i++) {
      tone(118, 124, 0.11, 0.05, "sawtooth", n + 0.08 + i * 0.09);
      burst(0.09, 0.07, 900 + (i % 3) * 120, 2.5, n + 0.08 + i * 0.09);
    }
  };

  function el(tag: string, cls: string, html = ""): HTMLElement {
    const e = document.createElement(tag);
    e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  // --- the camera ---
  function capture(): string {
    const c = document.createElement("canvas");
    c.width = c.height = 360;
    const g = c.getContext("2d")!;
    drawScene(g, scene, 360, 360, T(), video);
    // a little instant-film character: warm cast, soft vignette, grain
    g.fillStyle = "rgb(255 200 140 / 0.08)";
    g.fillRect(0, 0, 360, 360);
    const v = g.createRadialGradient(180, 180, 120, 180, 180, 260);
    v.addColorStop(0, "rgb(0 0 0 / 0)");
    v.addColorStop(1, "rgb(20 10 0 / 0.45)");
    g.fillStyle = v;
    g.fillRect(0, 0, 360, 360);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = Math.random() < 0.5 ? "rgb(255 255 255 / 0.06)" : "rgb(0 0 0 / 0.06)";
      g.fillRect(Math.random() * 360, Math.random() * 360, 1.5, 1.5);
    }
    return c.toDataURL("image/jpeg", 0.82);
  }

  function shoot(): void {
    if (film <= 0) {
      film = PACK;
      say("New film pack loaded · 10 shots");
      if (running()) whirr();
      draw();
      return;
    }
    if (slot !== null && state.pose.display === "outer") {
      // Whatever was in the slot drops into the album, ready to develop.
      slot = null;
    }
    const p: Print = { id: nextId++, url: capture(), caption: "", scene, developStart: null, taken: Date.now() };
    prints.unshift(p);
    film--;
    if (running()) {
      click();
      whirr();
    }
    flash();
    if (state.pose.display === "outer") {
      slot = p.id;
      ejectAt = T();
      outerMode = "camera";
      say("Open the phone to develop it");
    } else {
      current = p.id;
      p.developStart = T();
      innerMode = "print";
    }
    draw();
  }

  function flash(): void {
    for (const f of document.querySelectorAll<HTMLElement>(".ic-flash")) {
      f.classList.remove("ic-go");
      void f.offsetWidth;
      f.classList.add("ic-go");
    }
  }

  async function useCamera(): Promise<void> {
    if (stream) {
      stopCamera();
      scene = "park";
      draw();
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (dead) return void s.getTracks().forEach((tr) => tr.stop());
      stream = s;
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = s;
      await video.play().catch(() => {});
      scene = "live";
      say("Using your camera");
    } catch {
      scene = "park";
      say("No camera — using the scenes instead");
    }
    draw();
  }

  function stopCamera(): void {
    stream?.getTracks().forEach((tr) => tr.stop());
    stream = null;
    video = null;
  }

  // --- pieces ---
  function viewfinder(): HTMLElement {
    const vf = el("div", "ic-vf");
    const c = document.createElement("canvas");
    vf.append(c, el("div", "ic-flash"));
    requestAnimationFrame(() => {
      const r = c.getBoundingClientRect();
      const w = Math.max(80, Math.round(c.offsetWidth || r.width));
      const h = Math.max(50, Math.round(c.offsetHeight || r.height));
      c.width = w * 2;
      c.height = h * 2;
      const g = c.getContext("2d");
      if (g) finders.push({ g, w: c.width, h: c.height });
    });
    return vf;
  }

  function shutter(): HTMLElement {
    const b = el("button", "ic-shutter", film > 0 ? "" : "LOAD") as HTMLButtonElement;
    b.setAttribute("aria-label", film > 0 ? "Shutter" : "Load film");
    b.onpointerdown = () => sfx(() => {});
    b.onclick = () => shoot();
    return b;
  }

  function counter(): HTMLElement {
    return el("div", "ic-counter", `<b>${film}</b>SHOTS`);
  }

  function chips(): HTMLElement {
    const row = el("div", "ic-chips");
    for (const s of SCENES) {
      const b = el("button", `ic-chip ${scene === s.id ? "ic-on" : ""}`, s.label) as HTMLButtonElement;
      b.onclick = () => {
        scene = s.id;
        stopCamera();
        draw();
      };
      row.append(b);
    }
    const cam = el("button", `ic-chip ${scene === "live" ? "ic-on" : ""}`, scene === "live" ? "My cam ✕" : "My cam") as HTMLButtonElement;
    cam.title = "Use my camera (asks permission)";
    cam.onclick = () => void useCamera();
    row.append(cam);
    return row;
  }

  function stripe(): HTMLElement {
    return el("div", "ic-stripe", STRIPE.map((c) => `<i style="background:${c}"></i>`).join(""));
  }

  /** A print, with its develop state wired to the loop. */
  function printEl(p: Print, cls = "", status?: HTMLElement): HTMLElement {
    const card = el("div", `ic-print ${cls}`);
    const img = el("div", "ic-img", `<img alt="" draggable="false" src="${p.url}">`);
    const fog = el("div", "ic-fog");
    const bloom = el("div", "ic-bloom");
    img.append(bloom, fog);
    const cap = el("div", "ic-cap");
    cap.textContent = p.caption;
    card.append(img, cap);
    live.push({ print: p, img: img.firstElementChild as HTMLElement, fog, bloom, status });
    return card;
  }

  function paintDevelop(): void {
    for (const l of live) {
      const p = progress(l.print);
      const e = (a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
      const s = e(0.05, 0.85);
      l.fog.style.opacity = String(1 - e(0.04, 0.7) ** 0.8);
      l.bloom.style.opacity = String(Math.sin(Math.PI * e(0.15, 0.95)) * 0.9);
      l.img.style.filter = `saturate(${0.2 + s * 0.9}) contrast(${0.55 + s * 0.45}) brightness(${0.75 + s * 0.25}) sepia(${(1 - s) * 0.5})`;
      if (l.status) {
        l.status.textContent =
          l.print.developStart === null ? "Undeveloped"
          : p < 1 ? `Developing… ${Math.round(p * 100)}%${shakes > 3 ? " · shaking doesn't help, but go on" : " · drag to shake it"}`
          : "Developed";
      }
    }
  }

  function toastEl(): HTMLElement {
    const e = el("div", "ic-toast");
    toasts.push(e);
    return e;
  }

  function caption(p: Print | null): HTMLElement {
    const row = el("div", "ic-write");
    if (!p) {
      row.innerHTML = `<span>Take a photo, then write on it here.</span>`;
      return row;
    }
    const input = document.createElement("input");
    input.placeholder = "Write a caption…";
    input.maxLength = 28;
    input.value = p.caption;
    input.setAttribute("aria-label", "Caption");
    input.oninput = () => {
      p.caption = input.value;
      for (const c of document.querySelectorAll<HTMLElement>(`[data-ic-cap="${p.id}"]`)) c.textContent = p.caption;
    };
    row.append(input);
    return row;
  }

  /** The big print, which you can drag to shake. */
  function bigPrint(p: Print, status: HTMLElement): HTMLElement {
    const card = printEl(p, `ic-big ${T() - (p.developStart ?? -10) < 0.7 ? "ic-new" : ""}`, status);
    card.querySelector(".ic-cap")!.setAttribute("data-ic-cap", String(p.id));
    let start: { x: number; y: number } | null = null;
    let lastX = 0;
    card.onpointerdown = (e) => {
      start = { x: e.clientX, y: e.clientY };
      lastX = e.clientX;
      card.classList.add("ic-drag");
      card.setPointerCapture(e.pointerId);
      if (p.developStart === null) p.developStart = T();
    };
    card.onpointermove = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.sign(e.clientX - lastX) !== Math.sign(dx) && Math.abs(e.clientX - lastX) > 3) shakes++;
      lastX = e.clientX;
      card.style.transform = `translate(${dx * 0.7}px, ${dy * 0.7}px) rotate(${dx * 0.08}deg)`;
    };
    const end = () => {
      start = null;
      card.classList.remove("ic-drag");
      card.style.transform = "";
    };
    card.onpointerup = end;
    card.onpointercancel = end;
    return card;
  }

  function album(inner: boolean, onPick: (p: Print) => void): HTMLElement {
    const root = el("div", "ic ic-album");
    const h = el("h3", "", `Album <small>${prints.length} print${prints.length === 1 ? "" : "s"} · ${film} shots left</small>`);
    root.append(h);
    const grid = el("div", "ic-grid");
    if (!prints.length) grid.append(el("div", "ic-empty", inner ? "No prints yet. Close the phone and take one —<br>or use the camera on the other half." : "No prints yet. Go take one!"));
    prints.forEach((p, i) => {
      const b = el("button", `ic-print ic-thumb ${p.id === current ? "ic-sel" : ""}`) as HTMLButtonElement;
      b.style.setProperty("--r", `${((i * 37) % 7) - 3}deg`);
      const t = printEl(p);
      b.append(...Array.from(t.childNodes));
      b.querySelector(".ic-cap")!.setAttribute("data-ic-cap", String(p.id));
      b.setAttribute("aria-label", p.caption || `Print ${p.id}`);
      b.onclick = () => onPick(p);
      grid.append(b);
    });
    root.append(grid);
    if (inner) root.append(caption(byId(current)));
    return root;
  }

  // --- poses ---
  function drawOuter(): void {
    const landscape = state.pose.id === "closed-landscape";
    const root = el("div", `ic ic-desk ${landscape ? "ic-land" : ""}`);
    if (outerMode !== "camera") {
      // The album and the print, folded: the same features, smaller.
      if (outerMode === "album") {
        const a = album(false, (p) => {
          current = p.id;
          outerMode = "view";
          draw();
        });
        const back = el("button", "ic-pill", "← Camera") as HTMLButtonElement;
        back.style.cssText = "position:absolute;right:52px;top:10px";
        back.onclick = () => ((outerMode = "camera"), draw());
        a.append(back);
        root.append(a);
      } else {
        const p = byId(current);
        const table = el("div", "ic ic-table");
        const status = el("div", "ic-status");
        if (p) {
          if (p.developStart === null) p.developStart = T();
          const big = bigPrint(p, status);
          big.style.width = landscape ? "min(40cqw, 62cqh)" : "min(62cqw, 52cqh)";
          table.append(big, status);
        }
        const top = el("div", "ic-top");
        const b1 = el("button", "ic-pill ic-dark", "← Album") as HTMLButtonElement;
        b1.onclick = () => ((outerMode = "album"), draw());
        const b2 = el("button", "ic-pill ic-dark", "Camera") as HTMLButtonElement;
        b2.onclick = () => ((outerMode = "camera"), draw());
        top.append(b1, b2);
        table.append(top);
        if (p) {
          const w = caption(p);
          w.style.cssText = "position:absolute;left:0;right:0;bottom:0;border:0";
          table.style.paddingBottom = "40px";
          table.append(w);
        }
        root.append(table);
      }
      root.append(toastEl());
      screens.outer.append(root);
      return;
    }
    // The camera itself.
    const zone = el("div", "ic-zone");
    const sp = byId(slot);
    if (sp) {
      const elapsed = T() - ejectAt;
      const pr = printEl(sp, elapsed < EJECT ? "ic-out" : "");
      if (elapsed < EJECT) pr.style.animationDelay = `${-elapsed}s`;
      pr.title = "Take the print";
      pr.onclick = () => {
        current = sp.id;
        slot = null;
        outerMode = "view";
        draw();
      };
      zone.append(pr);
    }
    const body = el("div", "ic-body");
    body.append(stripe(), el("div", "ic-slot"));
    const albumBtn = el("button", "ic-chip", `Album · ${prints.length}`) as HTMLButtonElement;
    albumBtn.onclick = () => ((outerMode = "album"), draw());
    if (landscape) {
      body.append(viewfinder());
      const side = el("div", "ic-side");
      const c = chips();
      c.prepend(albumBtn);
      side.append(counter(), shutter(), c);
      body.append(side);
    } else {
      body.append(viewfinder());
      const row = el("div", "ic-row");
      row.append(counter(), shutter());
      const c = chips();
      c.prepend(albumBtn);
      body.append(row, c);
    }
    root.append(zone, body, toastEl());
    screens.outer.append(root);
  }

  function printHalf(cls: string): HTMLElement {
    const p = byId(current);
    if (innerMode === "camera" || !p) {
      const cam = el("div", `ic ic-cam ${cls}`);
      cam.append(viewfinder());
      const row = el("div", "ic-row");
      row.append(counter(), shutter());
      cam.append(row, chips());
      if (p) {
        const top = el("div", "ic-top");
        const back = el("button", "ic-pill", "Back to print") as HTMLButtonElement;
        back.onclick = () => ((innerMode = "print"), draw());
        top.append(el("div", "ic-grow"), back);
        cam.append(top);
      }
      cam.append(toastEl());
      return cam;
    }
    if (p.developStart === null) p.developStart = T();
    const root = el("div", `ic ic-table ${cls}`);
    const status = el("div", "ic-status");
    root.append(bigPrint(p, status), status);
    const top = el("div", "ic-top");
    const cam = el("button", "ic-pill ic-dark", "📷 Camera") as HTMLButtonElement;
    cam.onclick = () => ((innerMode = "camera"), draw());
    top.append(cam);
    root.append(top, toastEl());
    return root;
  }

  function drawInner(): void {
    const stacked = state.pose.split === "stacked";
    const [a, b] = stacked ? ["ic-t", "ic-b"] : ["ic-l", "ic-r"];
    const start = printHalf(a);
    if (stacked) start.classList.add("ic-stacked");
    const wrap = el("div", `ic ${stacked ? "ic-stacked" : ""}`);
    wrap.append(start);
    screens.start.append(wrap);
    const al = album(true, (p) => {
      current = p.id;
      innerMode = "print";
      draw();
    });
    al.classList.add(b);
    screens.end.append(al);
  }

  function draw(): void {
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    finders = [];
    live = [];
    toasts = [];
    if (state.pose.display === "outer") drawOuter();
    else drawInner();
    paintDevelop();
  }

  function loop(): void {
    if (dead) return;
    const t = T();
    for (const f of finders) drawScene(f.g, scene, f.w, f.h, t, video);
    paintDevelop();
    for (const e of toasts) {
      const on = t < toast.until;
      e.style.opacity = on ? "1" : "0";
      if (on) e.textContent = toast.text;
    }
    raf = requestAnimationFrame(loop);
  }

  function render(s: DuoState): void {
    if (dead) return;
    state = s;
    // Opening the phone develops the newest print.
    if (lastDisplay === "outer" && s.pose.display === "inner") {
      if (slot !== null) {
        current = slot;
        slot = null;
      }
      const p = byId(current);
      if (p) {
        innerMode = "print";
        if (p.developStart === null) p.developStart = T();
      }
    } else if (lastDisplay === "inner" && s.pose.display === "outer") outerMode = "camera";
    lastDisplay = s.pose.display;
    draw();
  }

  render(initial);
  raf = requestAnimationFrame(loop);

  return {
    render,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      stopCamera();
      style.remove();
    },
  };
}

export const instantCameraExample: Example = {
  id: "instant-camera",
  title: "Instant Camera",
  category: "retro",
  summary:
    "Closed, it's an instant camera: a viewfinder on a little animated park, beach or city (or your own camera, if you ask), a big red shutter, and a print that whirrs out of the top. Open the phone and the print develops on the inner display — grey-green blank to full colour in six seconds — beside an album you caption by hand.",
  bestPose: "closed",
  poses: {
    closed:
      "The camera body: viewfinder, film counter and shutter, with Park, Beach, City or your own camera. A shot ejects from the top slot; tap it to develop it right there, or open the phone. The album is a tap away too.",
    "closed-landscape": "The camera on its side: a wide viewfinder, the shutter and scene picker in a column, and prints sliding out of the left-hand slot.",
    open: "Opening develops the newest print on the left — drag it to shake it — with the album and its caption field on the right; the left half flips to a viewfinder for more shots.",
    "open-portrait": "The developing print on top, the album and caption below.",
    book: "Print on the left page, album on the right, nothing tappable in the fold.",
    table: "The developing print stands up on the top half to watch; the album and the caption keyboard lie flat below.",
    stand: "Stood on the table like a frame: the print developing on one side, the album on the other.",
  },
  principle:
    "Closing to shoot and opening to develop is the delight, but no feature lives in one pose: the outer display has its own album and develops a print you tap, the inner display has its own viewfinder and shutter — Apple asks you to never tie functionality to a pose and to keep state continuous across them (HIG checklist §8 and Continuity checks).",
  create,
};
