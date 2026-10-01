/**
 * Subject Preview — the person in the photo sees themselves.
 *
 * Apple's own example of a scene accessory (HIG checklist §9,
 * `CameraCaptureAccessory`): stand the Duo up, frame the shot on the inner
 * display, and the outer display — facing whoever you are photographing —
 * shows them a live, mirrored preview, with the self-timer counting down big
 * and a flash when the photo is taken.
 *
 * There is no camera in a web page by default, so the viewfinder shows a
 * drawn scene: a dog in a park, breathing, blinking and wagging. "Use my
 * camera" swaps in getUserMedia, only on a tap and only if you allow it. The
 * webcam plays the rear camera pointed at the subject: the photographer's
 * viewfinder is shown as the camera sees it, the subject's preview is
 * mirrored like a mirror (checklist §9, Camera: mirror the preview when a
 * camera faces the user), and the photo itself is never mirrored. The sign in
 * the scene reads backwards on the subject's side — which is the point.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { burst, note, ready, tone } from "../lib/audio.ts";

const ZOOMS = [1, 2, 3] as const;
const TIMERS = [0, 3, 10] as const;
const MAX_PHOTOS = 12;

const CSS = `
.sp { position:absolute; inset:0; background:#0b0c10; color:#f5f5f7; font:13px/1.3 ui-sans-serif,system-ui; overflow:hidden; }
.sp canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
.sp-grid { position:absolute; inset:0; pointer-events:none;
  background:
    linear-gradient(90deg, transparent calc(33.33% - .5px), rgb(255 255 255 / .45) calc(33.33% - .5px) calc(33.33% + .5px), transparent 0, transparent calc(66.66% - .5px), rgb(255 255 255 / .45) calc(66.66% - .5px) calc(66.66% + .5px), transparent 0),
    linear-gradient(transparent calc(33.33% - .5px), rgb(255 255 255 / .45) calc(33.33% - .5px) calc(33.33% + .5px), transparent 0, transparent calc(66.66% - .5px), rgb(255 255 255 / .45) calc(66.66% - .5px) calc(66.66% + .5px), transparent 0); }
.sp-count { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; font:800 clamp(60px, 46cqmin, 200px)/1 ui-sans-serif,system-ui; color:#fff; text-shadow:0 4px 30px rgb(0 0 0 / .45); }
.sp-count[hidden] { display:none; }
.sp-flash { position:absolute; inset:0; background:#fff; opacity:0; pointer-events:none; }
.sp-top { position:absolute; left:0; right:0; top:0; display:flex; gap:6px; align-items:center; padding:9px 10px; z-index:2; }
.sp-chip { all:unset; cursor:pointer; padding:3px 9px; border-radius:999px; background:rgb(0 0 0 / .45); color:#fff; font:650 11px ui-monospace,monospace; backdrop-filter:blur(6px); }
.sp-chip[aria-pressed="true"] { background:#ffd23f; color:#1a1400; }
.sp-chip.sp-static { cursor:default; }
.sp-label { position:absolute; left:0; right:0; bottom:0; padding:7px 10px 9px; text-align:center; font:600 10.5px ui-sans-serif,system-ui; background:linear-gradient(transparent, rgb(0 0 0 / .55)); color:#fff; pointer-events:none; }
.sp-look { position:absolute; left:0; right:0; top:22px; text-align:center; font:700 11px ui-monospace,monospace; letter-spacing:.12em; color:#fff; text-shadow:0 1px 4px rgb(0 0 0 / .5); pointer-events:none; }
.sp-look::before { content:"↑ "; }
.sp-pad-s { right:16px !important; } .sp-pad-e { left:16px !important; }
.sp-pad-b { top:16px !important; }

.sp-deck { position:absolute; inset:0; display:flex; flex-direction:column; gap:9px; padding:12px; background:#15161c; color:#f5f5f7; font:13px/1.3 ui-sans-serif,system-ui; }
.sp-deck.sp-wide { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr auto; gap:9px 14px; }
.sp-last { position:relative; flex:1; min-height:0; border-radius:12px; background:#24252d center/cover no-repeat; display:flex; align-items:flex-end; justify-content:flex-start; overflow:hidden; }
.sp-wide .sp-last { grid-column:1; grid-row:1; }
.sp-last span { padding:6px 9px; font:600 10.5px ui-monospace,monospace; color:#c7c7cf; }
.sp-last.sp-has span { background:rgb(0 0 0 / .5); color:#fff; border-top-right-radius:8px; }
.sp-strip { display:flex; gap:5px; overflow-x:auto; min-height:42px; }
.sp-wide .sp-strip { grid-column:1; grid-row:2; }
.sp-strip button { all:unset; flex:none; width:42px; height:42px; border-radius:7px; background:#24252d center/cover no-repeat; cursor:pointer; box-shadow:0 0 0 1px rgb(255 255 255 / .1); }
.sp-strip button[aria-current="true"] { box-shadow:0 0 0 2px #ffd23f; }
.sp-strip i { font:500 10.5px system-ui; color:#7d7e88; align-self:center; font-style:normal; }
.sp-ctl { display:flex; flex-direction:column; gap:8px; }
.sp-wide .sp-ctl { grid-column:2; grid-row:1 / span 2; justify-content:center; }
.sp-row { display:flex; align-items:center; gap:6px; font:600 10.5px ui-monospace,monospace; color:#9a9ba5; }
.sp-row > span { width:44px; text-transform:uppercase; letter-spacing:.06em; }
.sp-seg { flex:1; display:flex; background:#24252d; border-radius:9px; padding:2px; }
.sp-seg button { all:unset; flex:1; text-align:center; padding:6px 0; border-radius:7px; cursor:pointer; color:#e7e7ee; font:650 11.5px system-ui; }
.sp-seg button[aria-pressed="true"] { background:#ffd23f; color:#1a1400; }
.sp-shoot { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.sp-btn { all:unset; cursor:pointer; padding:7px 10px; border-radius:9px; background:#24252d; color:#e7e7ee; font:600 11px system-ui; text-align:center; }
.sp-btn.sp-on { background:#ffd23f; color:#1a1400; }
.sp-shutter { all:unset; box-sizing:border-box; cursor:pointer; flex:none; width:66px; height:66px; border-radius:50%; border:4px solid #fff; display:flex; align-items:center; justify-content:center; }
.sp-shutter::after { content:""; width:50px; height:50px; border-radius:50%; background:#fff; transition:transform .1s; }
.sp-shutter:active::after { transform:scale(.88); }
.sp-shutter.sp-armed::after { background:#ff4f4f; border-radius:10px; width:26px; height:26px; }
.sp-note { font:500 10.5px/1.35 system-ui; color:#8b8c96; }
.sp-note.sp-err { color:#ff8a7a; }
.sp-over { position:absolute; z-index:2; display:flex; align-items:center; gap:10px; }
.sp-over.sp-bottom { left:0; right:0; bottom:0; justify-content:space-around; padding:10px 12px 14px; background:linear-gradient(transparent, rgb(0 0 0 / .5)); }
.sp-over.sp-side { top:0; bottom:0; right:0; flex-direction:column; justify-content:space-around; padding:12px 12px; background:linear-gradient(90deg, transparent, rgb(0 0 0 / .5)); }
.sp-mini { width:40px; height:40px; border-radius:8px; background:#24252d center/cover no-repeat; box-shadow:0 0 0 2px rgb(255 255 255 / .7); }
`;

/** A dog in a park, drawn in a 400-unit world centred on the dog. Asymmetric on purpose: a tree on the left, a sign on the right. */
function drawScene(g: CanvasRenderingContext2D, w: number, h: number, t: number, zoom: number): void {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#7fbfee");
  sky.addColorStop(1, "#e2f2fb");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.save();
  g.translate(w / 2, h / 2);
  g.scale((Math.max(w, h) / 400) * zoom, (Math.max(w, h) / 400) * zoom);
  g.translate(0, -10);

  const circle = (x: number, y: number, r: number, fill: string): void => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  };
  const ellipse = (x: number, y: number, rx: number, ry: number, rot: number, fill: string): void => {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  };

  // Sun and drifting clouds.
  circle(-130, -140, 34, "rgba(255,220,110,.35)");
  circle(-130, -140, 24, "#ffd76a");
  for (let i = 0; i < 3; i++) {
    const x = ((t * 7 + i * 190) % 600) - 300;
    const y = -165 + i * 34;
    circle(x, y, 16, "rgba(255,255,255,.92)");
    circle(x + 18, y - 7, 20, "rgba(255,255,255,.92)");
    circle(x + 38, y, 15, "rgba(255,255,255,.92)");
  }
  // Hills and grass.
  g.beginPath();
  g.moveTo(-320, 40);
  g.quadraticCurveTo(-120, -20, 60, 30);
  g.quadraticCurveTo(200, 60, 320, 10);
  g.lineTo(320, 320);
  g.lineTo(-320, 320);
  g.fillStyle = "#a9d68b";
  g.fill();
  g.beginPath();
  g.moveTo(-320, 85);
  g.quadraticCurveTo(0, 60, 320, 90);
  g.lineTo(320, 320);
  g.lineTo(-320, 320);
  g.fillStyle = "#7cbd5c";
  g.fill();

  // A tree on the left, swaying.
  g.save();
  g.translate(-150, 92);
  g.rotate(Math.sin(t * 0.8) * 0.025);
  g.fillStyle = "#8a5a3b";
  g.fillRect(-8, -100, 16, 100);
  circle(0, -125, 44, "#4f9a4a");
  circle(-30, -98, 30, "#57a552");
  circle(30, -100, 32, "#468c42");
  g.restore();

  // A sign on the right: it reads backwards in a mirror.
  g.fillStyle = "#7a5236";
  g.fillRect(136, 10, 8, 82);
  g.fillStyle = "#f3e3c3";
  g.strokeStyle = "#7a5236";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(96, -22, 88, 38, 6);
  g.fill();
  g.stroke();
  g.fillStyle = "#5a3a22";
  g.font = "800 19px ui-sans-serif, system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("PARK →", 140, -2);

  // The dog.
  ellipse(8, 112, 78, 11, 0, "rgba(0,0,0,.14)");
  const wag = Math.sin(t * 9) * 0.45 - 0.5;
  g.save();
  g.translate(58, 72);
  g.rotate(wag);
  g.strokeStyle = "#c48a52";
  g.lineCap = "round";
  g.lineWidth = 13;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(14, -24, 8, -48);
  g.stroke();
  g.restore();
  const breath = 1 + Math.sin(t * 2.4) * 0.025;
  ellipse(14, 66, 56, 40 * breath, 0, "#d9a066");
  ellipse(-14, 72, 22, 30 * breath, 0, "#f2d2a6");
  g.fillStyle = "#d9a066";
  g.beginPath();
  g.roundRect(-36, 78, 19, 32, 8);
  g.roundRect(-8, 80, 19, 30, 8);
  g.fill();
  g.fillStyle = "#f2d2a6";
  g.beginPath();
  g.roundRect(-38, 102, 22, 9, 4);
  g.roundRect(-10, 102, 22, 9, 4);
  g.fill();
  // Collar and tag.
  g.strokeStyle = "#d33f49";
  g.lineWidth = 6;
  g.beginPath();
  g.ellipse(-16, 34, 26, 8, 0, 0, Math.PI);
  g.stroke();
  circle(-12, 46, 5, "#ffd23f");
  // Head, tilting.
  g.save();
  g.translate(-20, -2);
  g.rotate(Math.sin(t * 0.9) * 0.09 - 0.06);
  ellipse(-31, -16, 13, 27, 0.35, "#8a5a3b");
  ellipse(31, -16, 13, 27, -0.35, "#8a5a3b");
  circle(0, 0, 38, "#d9a066");
  ellipse(0, 17, 21, 15, 0, "#f2d2a6");
  const open = t % 3.7 < 0.14 ? 0.12 : 1;
  ellipse(-14, -6, 5, 6.5 * open, 0, "#2a1d14");
  ellipse(14, -6, 5, 6.5 * open, 0, "#2a1d14");
  if (open > 0.5) {
    circle(-12.5, -8, 1.7, "#fff");
    circle(15.5, -8, 1.7, "#fff");
  }
  ellipse(0, 8, 7, 5, 0, "#2a1d14");
  ellipse(4, 31 + Math.sin(t * 6) * 1.6, 7, 9, 0, "#e86a7a");
  g.restore();
  g.restore();
}

function create(screens: Screens, initial: DuoState): Instance {
  let state = initial;
  let zoomI = 0;
  let timerI = 1;
  let grid = true;
  let mirror = true;
  const photos: string[] = [];
  let viewing = -1; // index into photos; -1 = the latest
  let countdownEnd: number | null = null;
  let flashAt = -1e9;
  let lastBeep = -1;

  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let camNote = "";
  let camBusy = false;

  let views: { c: HTMLCanvasElement; mirrored: boolean }[] = [];
  let counts: HTMLElement[] = [];
  let flashes: HTMLElement[] = [];

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const el = (html: string): HTMLElement => {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild as HTMLElement;
  };

  const zoom = (): number => ZOOMS[zoomI]!;
  const live = (): boolean => !!video && video.readyState >= 2 && video.videoWidth > 0;

  function frame(g: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    if (video && live()) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const sc = Math.max(w / vw, h / vh) * zoom();
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.drawImage(video, (w - vw * sc) / 2, (h - vh * sc) / 2, vw * sc, vh * sc);
    } else {
      drawScene(g, w, h, t, zoom());
    }
  }

  function draw(c: HTMLCanvasElement, mirrored: boolean, t: number): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mirrored) {
      g.translate(w, 0);
      g.scale(-1, 1);
    }
    frame(g, w, h, t);
  }

  function sfx(kind: "shutter" | "beep" | "go"): void {
    ready()
      .then(() => {
        if (kind === "shutter") {
          burst(0.05, 0.5, 3200, 0.7);
          burst(0.08, 0.35, 1400, 0.6, undefined);
          tone(900, 400, 0.05, 0.08, "square");
        } else if (kind === "beep") note(84, 0.08, 0.1, "sine");
        else note(91, 0.18, 0.12, "sine");
      })
      .catch(() => {});
  }

  /** The photo, as the camera saw it: never mirrored, in the shape of the viewfinder. */
  function capture(): void {
    const landscape = state.pose.split === "stacked" || state.pose.id === "closed-landscape";
    const c = document.createElement("canvas");
    c.width = landscape ? 456 : 360;
    c.height = landscape ? 360 : 456;
    const g = c.getContext("2d");
    if (!g) return;
    frame(g, c.width, c.height, performance.now() / 1000);
    photos.push(c.toDataURL("image/jpeg", 0.82));
    if (photos.length > MAX_PHOTOS) photos.shift();
    viewing = -1;
    flashAt = performance.now();
    sfx("shutter");
    render(state);
  }

  function shutter(): void {
    void ready().catch(() => {});
    if (countdownEnd !== null) {
      countdownEnd = null;
      render(state);
      return;
    }
    const secs = TIMERS[timerI]!;
    if (!secs) {
      capture();
      return;
    }
    countdownEnd = performance.now() + secs * 1000;
    lastBeep = -1;
    render(state);
  }

  async function toggleCamera(): Promise<void> {
    if (stream) {
      stopCamera();
      camNote = "Back to the drawn scene.";
      render(state);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      camNote = "This browser has no camera access; the drawn scene stays.";
      render(state);
      return;
    }
    camBusy = true;
    camNote = "Asking for the camera…";
    render(state);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      camNote = "Your camera plays the one pointed at the subject: you see it straight, they see a mirror.";
    } catch {
      stopCamera();
      camNote = "No camera — permission was refused or none is attached. The drawn scene stays.";
    }
    camBusy = false;
    render(state);
  }

  function stopCamera(): void {
    stream?.getTracks().forEach((tr) => tr.stop());
    stream = null;
    if (video) video.srcObject = null;
    video = null;
  }

  /** A canvas view, with the countdown and flash layered on top. */
  function view(mirrored: boolean): HTMLElement {
    const root = el(`<div class="sp"><canvas></canvas>${grid && !mirrored ? `<div class="sp-grid"></div>` : ""}<div class="sp-count" hidden></div><div class="sp-flash"></div></div>`);
    views.push({ c: root.querySelector("canvas")!, mirrored });
    counts.push(root.querySelector<HTMLElement>(".sp-count")!);
    flashes.push(root.querySelector<HTMLElement>(".sp-flash")!);
    return root;
  }

  /** The photographer's viewfinder: what the camera sees, straight. */
  function finder(foldClass: string, withChips: boolean): HTMLElement {
    const root = view(false);
    const top = el(`<div class="sp-top ${foldClass}"></div>`);
    if (withChips) {
      const z = el(`<button class="sp-chip">${zoom()}×</button>`);
      z.onclick = () => {
        zoomI = (zoomI + 1) % ZOOMS.length;
        render(state);
      };
      const tm = el(`<button class="sp-chip" aria-pressed="${TIMERS[timerI]! > 0}">⏱ ${TIMERS[timerI] ? `${TIMERS[timerI]}s` : "off"}</button>`);
      tm.onclick = () => {
        timerI = (timerI + 1) % TIMERS.length;
        render(state);
      };
      const gr = el(`<button class="sp-chip" aria-pressed="${grid}">#</button>`);
      gr.onclick = () => {
        grid = !grid;
        render(state);
      };
      top.append(z, tm, gr);
    } else {
      top.append(el(`<span class="sp-chip sp-static">${zoom()}× · ⏱ ${TIMERS[timerI] ? `${TIMERS[timerI]}s` : "off"}</span>`));
    }
    if (live()) top.append(el(`<span class="sp-chip sp-static">● camera</span>`));
    root.append(top);
    return root;
  }

  function lastPhoto(): string | undefined {
    return viewing >= 0 ? photos[viewing] : photos[photos.length - 1];
  }

  function seg<T extends number>(label: string, values: readonly T[], current: number, fmt: (v: T) => string, set: (i: number) => void): HTMLElement {
    const row = el(`<div class="sp-row"><span>${label}</span><div class="sp-seg"></div></div>`);
    const s = row.querySelector(".sp-seg")!;
    values.forEach((v, i) => {
      const b = el(`<button aria-pressed="${i === current}">${fmt(v)}</button>`);
      b.onclick = () => {
        set(i);
        render(state);
      };
      s.append(b);
    });
    return row;
  }

  /** The other half: shutter, settings, and the photos so far. */
  function deck(wide: boolean, foldClass: string): HTMLElement {
    const root = el(`<div class="sp-deck ${foldClass}${wide ? " sp-wide" : ""}"></div>`);
    const src = lastPhoto();
    const last = el(`<div class="sp-last${src ? " sp-has" : ""}"><span>${src ? `Photo ${viewing >= 0 ? viewing + 1 : photos.length} of ${photos.length}` : "Photos land here"}</span></div>`);
    if (src) last.style.backgroundImage = `url(${src})`;
    const strip = el(`<div class="sp-strip"></div>`);
    if (!photos.length) strip.append(el(`<i>No photos yet</i>`));
    photos.forEach((p, i) => {
      const b = el(`<button aria-label="Photo ${i + 1}" aria-current="${src === p}"></button>`);
      b.style.backgroundImage = `url(${p})`;
      b.onclick = () => {
        viewing = i;
        render(state);
      };
      strip.append(b);
    });
    const ctl = el(`<div class="sp-ctl"></div>`);
    ctl.append(
      seg("Zoom", ZOOMS, zoomI, (v) => `${v}×`, (i) => (zoomI = i)),
      seg("Timer", TIMERS, timerI, (v) => (v ? `${v}s` : "Off"), (i) => (timerI = i)),
    );
    const shoot = el(`<div class="sp-shoot"></div>`);
    const mir = el(`<button class="sp-btn${mirror ? " sp-on" : ""}" title="Mirror the subject's preview">${mirror ? "Mirror ✓" : "Mirror ✗"}</button>`);
    mir.onclick = () => {
      mirror = !mirror;
      render(state);
    };
    const sh = el(`<button class="sp-shutter${countdownEnd !== null ? " sp-armed" : ""}" aria-label="${countdownEnd !== null ? "Cancel timer" : "Take photo"}"></button>`);
    sh.onclick = shutter;
    const cam = el(`<button class="sp-btn${stream ? " sp-on" : ""}">${stream ? "Drawn scene" : camBusy ? "…" : "Use my camera"}</button>`);
    cam.onclick = () => void toggleCamera();
    shoot.append(mir, sh, cam);
    ctl.append(shoot);
    const why = state.accessory
      ? mirror
        ? "They see a mirror on the outside, so moving left goes left. The photo is never mirrored."
        : "Mirroring is off: on the outside, their left is now on the wrong side. Turn around and look."
      : "The subject display is off; you can still shoot one-way.";
    ctl.append(el(`<div class="sp-note${camNote.startsWith("No camera") ? " sp-err" : ""}">${camNote || why}</div>`));
    if (wide) root.append(last, ctl, strip);
    else root.append(last, strip, ctl);
    return root;
  }

  /** The subject's side: themselves, mirrored, with the countdown big and a flash. */
  function subject(): HTMLElement {
    const root = view(mirror);
    root.append(el(`<div class="sp-look">LOOK HERE</div>`));
    root.append(el(`<div class="sp-label">${mirror ? "You, as in a mirror — the photo won't be flipped" : "Not mirrored — notice the sign"}</div>`));
    return root;
  }

  /** Closed: an ordinary camera — viewfinder, shutter, last photo. */
  function camera(landscape: boolean): HTMLElement {
    const root = finder("", true);
    const bar = el(`<div class="sp-over ${landscape ? "sp-side" : "sp-bottom"}"></div>`);
    const src = photos[photos.length - 1];
    const mini = el(`<div class="sp-mini" role="img" aria-label="${src ? "Last photo" : "No photos yet"}"></div>`);
    if (src) mini.style.backgroundImage = `url(${src})`;
    const sh = el(`<button class="sp-shutter${countdownEnd !== null ? " sp-armed" : ""}" aria-label="Take photo"></button>`);
    sh.onclick = shutter;
    const cam = el(`<button class="sp-chip">${stream ? "scene" : "cam"}</button>`);
    cam.onclick = () => void toggleCamera();
    if (landscape) bar.append(cam, sh, mini);
    else bar.append(mini, sh, cam);
    root.append(bar);
    return root;
  }

  function render(next: DuoState): void {
    state = next;
    views = [];
    counts = [];
    flashes = [];
    const { pose, accessory } = next;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.display === "outer") {
      screens.outer.append(camera(pose.id === "closed-landscape"));
    } else {
      const stacked = pose.split === "stacked";
      screens.start.append(finder(stacked ? "" : "sp-pad-s", false));
      screens.end.append(deck(stacked, stacked ? "sp-pad-b" : "sp-pad-e"));
      if (accessory) screens.outer.append(subject());
    }
    paint(performance.now());
  }

  function paint(now: number): void {
    const t = now / 1000;
    for (const v of views) draw(v.c, v.mirrored, t);
    let label = "";
    if (countdownEnd !== null) {
      const left = Math.ceil((countdownEnd - now) / 1000);
      label = left > 0 ? String(left) : "";
    }
    for (const c of counts) {
      if (c.textContent !== label) c.textContent = label;
      c.hidden = !label;
    }
    const f = Math.max(0, 1 - (now - flashAt) / 320);
    for (const fl of flashes) fl.style.opacity = String(f);
  }

  let raf = 0;
  const loop = (now: number): void => {
    if (countdownEnd !== null) {
      const left = Math.ceil((countdownEnd - now) / 1000);
      if (left <= 0) {
        countdownEnd = null;
        capture();
      } else if (left !== lastBeep) {
        lastBeep = left;
        sfx(left <= 1 ? "go" : "beep");
      }
    }
    paint(now);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  render(initial);

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      stopCamera();
      style.remove();
    },
  };
}

export const subjectPreviewExample: Example = {
  id: "subject-preview",
  title: "Subject Preview",
  category: "patterns",
  summary:
    "Stand the Duo up to take someone's photo: you frame it inside, and they see themselves — mirrored, like a mirror — on the outer display, with the self-timer counting down big and a flash when it fires. A drawn scene stands in for the camera; tap \"Use my camera\" for a real one.",
  bestPose: "stand",
  accessory: "A live, mirrored preview for the person being photographed, with the countdown and the flash.",
  poses: {
    closed: "An ordinary camera on the outer display: viewfinder, timer, zoom, shutter and last photo.",
    "closed-landscape": "The same camera held sideways, shutter on the trailing edge.",
    open: "Viewfinder on the left, shutter, settings and photos on the right; the subject's preview is lit on the back.",
    "open-portrait": "Viewfinder above, controls and photos below, the subject's preview on the back of the top half.",
    book: "Held like a card: frame on the left, shoot on the right, and the person in front sees themselves on the back.",
    table: "The viewfinder stands up, the controls lie flat to tap, and the subject's mirror is on the back of the standing half.",
    stand: "Stood on its edge for a group shot: viewfinder and controls inside, the subject's mirrored preview and countdown outside.",
  },
  principle:
    "Apple's own scene accessory is a camera preview for the subject (HIG checklist §9, 'Scene accessories', CameraCaptureAccessory). The system can switch it off, so shooting works one-way without it. And because the subject faces a camera pointed at them, their preview is mirrored while the photo is not (HIG checklist §9, 'Camera': mirror the preview when a rear camera faces the user).",
  create,
};
