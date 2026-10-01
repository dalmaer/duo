/**
 * Pocket Console — the green-screen brick handheld, folded.
 *
 * The pattern: in table pose the standing half is the screen and the flat
 * half is the controls, like a clamshell handheld. The "cartridge" is Snake,
 * drawn on a 160×144 canvas in a four-shade pea-green palette with a 3×5
 * pixel font, and scaled up without smoothing so it reads like an old LCD.
 *
 * Controls: D-pad steers, A (hold) speeds up, B pauses, Start starts or
 * pauses, Select changes the speed. Keyboard: arrows, Space/Enter for Start,
 * X for A, Z for B.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { note, now, ready, running } from "../lib/audio.ts";

const W = 160;
const H = 144;
const CELL = 8;
const COLS = W / CELL; // 20
const ROWS = (H - CELL) / CELL; // 17, under an 8px HUD
const PAL = ["#9bbc0f", "#8bac0f", "#306230", "#0f380f"] as const;
const SPEEDS = [170, 125, 90] as const;

/** A 3×5 pixel font: five rows per glyph, each a 3-bit number, left pixel = 4. */
const FONT: Record<string, string> = {
  "0": "75557", "1": "26227", "2": "71747", "3": "71317", "4": "55711", "5": "74717", "6": "74757", "7": "71111", "8": "75757", "9": "75717",
  A: "25755", B: "65656", C: "34443", D: "65556", E: "74647", F: "74644", G: "34553", H: "55755", I: "72227", J: "11152", K: "55655", L: "44447", M: "57755",
  N: "65555", O: "25552", P: "65644", Q: "25563", R: "65655", S: "34216", T: "72222", U: "55557", V: "55552", W: "55775", X: "55255", Y: "55222", Z: "71247",
  " ": "00000", "-": "00700", "!": "22202", ":": "02020", ".": "00002", ">": "42124", "<": "12421",
};

type Btn = "up" | "down" | "left" | "right" | "a" | "b" | "start" | "select";
type Mode = "boot" | "title" | "play" | "pause" | "over";
type P = { x: number; y: number };
const DIRS: Record<"up" | "down" | "left" | "right", P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

const CSS = `
.pc { position:absolute; inset:0; box-sizing:border-box; display:flex; align-items:center; justify-content:center; gap:10px; overflow:hidden;
  background: radial-gradient(140% 100% at 30% 0%, #dcd8cf, #c3beb3 60%, #aea99e); color:#3b3a52; font:12px/1.2 system-ui,-apple-system,sans-serif; user-select:none; -webkit-user-select:none; }
.pc.col { flex-direction:column; }
.pc-bezel { position:relative; background:#5d5f6e; border-radius:10px 10px 34px 10px; padding:14px 22px 24px; box-shadow: inset 0 2px 6px rgb(0 0 0 / .45), 0 1px 0 rgb(255 255 255 / .5); }
.pc-bezel .led { position:absolute; left:8px; top:50%; width:6px; height:6px; margin-top:-10px; border-radius:50%; background:#3a1414; }
.pc-bezel .led.on { background:#ff3b3b; box-shadow:0 0 6px #ff3b3b; }
.pc-bezel .led + span { position:absolute; left:3px; top:50%; margin-top:0; font:700 5px/1 system-ui; color:#aeb0bf; letter-spacing:.05em; writing-mode:vertical-rl; transform:rotate(180deg); }
.pc-bezel .rule { position:absolute; left:22px; right:22px; top:6px; height:2px; border-top:1px solid #8a3a6a; border-bottom:1px solid #2f4f8a; }
.pc-bezel .brand { position:absolute; left:0; right:0; bottom:6px; text-align:center; font:italic 800 10px/1 system-ui; letter-spacing:.14em; color:#c9cbd8; }
.pc-lcd { display:block; image-rendering: pixelated; image-rendering: crisp-edges; background:${PAL[0]}; box-shadow: inset 0 0 0 2px #0f380f33; }
.pc-screenwrap { position:relative; }
.pc-screenwrap::after { content:""; position:absolute; inset:0; pointer-events:none;
  background: linear-gradient(135deg, rgb(255 255 255 / .12), transparent 40%), repeating-linear-gradient(0deg, rgb(15 56 15 / .08) 0 1px, transparent 1px 3px);
  box-shadow: inset 0 3px 8px rgb(0 0 0 / .35); }
.pc-cart { margin:0 auto; width:130px; height:13px; border-radius:4px 4px 0 0; background:linear-gradient(#7d7a74,#95928b); box-shadow: inset 0 2px 0 rgb(255 255 255 / .15); font:800 7px/13px system-ui; text-align:center; letter-spacing:.2em; color:#e7e3da; }
.pc-controls { position:relative; display:flex; align-items:center; justify-content:space-between; }
.pc-dpad { position:relative; width:var(--d); height:var(--d); flex:none; filter: drop-shadow(0 3px 2px rgb(0 0 0 / .35)); }
.pc-dpad button, .pc-dpad i { all:unset; position:absolute; background:#26262c; box-sizing:border-box; touch-action:none; cursor:pointer; }
.pc-dpad i { left:33.3%; top:33.3%; width:33.4%; height:33.4%; pointer-events:none; background: radial-gradient(circle, #1a1a1f 30%, #26262c 32%); }
.pc-dpad .up { left:33.3%; top:0; width:33.4%; height:34%; border-radius:4px 4px 0 0; }
.pc-dpad .down { left:33.3%; bottom:0; width:33.4%; height:34%; border-radius:0 0 4px 4px; }
.pc-dpad .left { left:0; top:33.3%; width:34%; height:33.4%; border-radius:4px 0 0 4px; }
.pc-dpad .right { right:0; top:33.3%; width:34%; height:33.4%; border-radius:0 4px 4px 0; }
.pc-dpad button::after { content:""; position:absolute; left:50%; top:50%; border:5px solid transparent; transform:translate(-50%,-50%); }
.pc-dpad .up::after { border-bottom-color:#4a4a55; margin-top:-3px; }
.pc-dpad .down::after { border-top-color:#4a4a55; margin-top:3px; }
.pc-dpad .left::after { border-right-color:#4a4a55; margin-left:-3px; }
.pc-dpad .right::after { border-left-color:#4a4a55; margin-left:3px; }
.pc-dpad button.down-p, .pc-dpad button.on { background:#141417; }
.pc-ab { position:relative; width:calc(var(--b) * 2.5); height:calc(var(--b) * 1.9); flex:none; }
.pc-ab .well { position:absolute; left:0; right:0; top:50%; height:calc(var(--b) + 12px); margin-top:calc(var(--b) / -2 - 6px); border-radius:999px; background:rgb(0 0 0 / .08); transform:rotate(-25deg); }
.pc-ab button { all:unset; position:absolute; width:var(--b); height:var(--b); border-radius:50%; cursor:pointer; touch-action:none;
  background: radial-gradient(circle at 35% 30%, #c2407a, #9b2257 60%, #7c1844); box-shadow: 0 3px 0 #5a1030, 0 5px 6px rgb(0 0 0 / .3); }
.pc-ab button.on { transform:translateY(2px); box-shadow: 0 1px 0 #5a1030; filter:brightness(.9); }
.pc-ab .b { left:0; bottom:0; } .pc-ab .a { right:0; top:0; }
.pc-ab label { position:absolute; font:800 11px/1 system-ui; color:#3b3a78; letter-spacing:.05em; pointer-events:none; }
.pc-ss { display:flex; gap:16px; flex:none; }
.pc-ss div { display:flex; flex-direction:column; align-items:center; gap:5px; transform:rotate(-25deg); }
.pc-ss button { all:unset; width:38px; height:10px; border-radius:999px; background:#8f8d96; box-shadow: inset 0 -2px 0 rgb(0 0 0 / .25), 0 0 0 3px rgb(0 0 0 / .06); cursor:pointer; touch-action:none; }
.pc-ss button.on { background:#6f6d76; }
.pc-ss span { font:800 8px/1 system-ui; letter-spacing:.1em; color:#3b3a78; }
.pc-speaker { position:absolute; display:flex; gap:6px; transform:rotate(-30deg); pointer-events:none; }
.pc-speaker i { width:5px; height:44px; border-radius:3px; background:#8f8b82; box-shadow: inset 0 2px 2px rgb(0 0 0 / .35); }
.pc-hinge { position:absolute; left:0; right:0; height:6px; background: linear-gradient(#a19c91, #c3beb3); }
.pc-tip { position:absolute; left:14px; max-width:58%; bottom:8px; text-align:left; font-size:9px; color:#6d6a63; pointer-events:none; }
`;

function create(screens: Screens, state: DuoState): Instance {
  // --- state, which outlives every render ---
  let mode: Mode = "boot";
  const bootAt = performance.now();
  let snake: P[] = [];
  let dir: P = DIRS.right;
  let queue: P[] = [];
  let food: P = { x: 0, y: 0 };
  let score = 0;
  let hi = 0;
  let speed = 1;
  let boost = false;
  let lastStep = 0;
  let deadAt = 0;
  let current = state;
  let canvas: HTMLCanvasElement | null = null;
  let led: HTMLElement | null = null;
  const btnEls = new Map<Btn, HTMLElement[]>();

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  // --- sound ---
  const beep = (fn: () => void) => {
    if (running()) fn();
    else ready().then(fn).catch(() => {});
  };
  const sfx = {
    click: () => beep(() => note(100, 0.02, 0.04, "square")),
    eat: () => beep(() => {
      note(84, 0.05, 0.12, "square");
      note(91, 0.07, 0.12, "square", now() + 0.05);
    }),
    start: () => beep(() => [72, 76, 79, 84].forEach((m, k) => note(m, 0.08, 0.12, "square", now() + k * 0.07))),
    die: () => beep(() => [67, 63, 58, 51].forEach((m, k) => note(m, 0.14, 0.14, "square", now() + k * 0.12))),
    ding: () => beep(() => {
      note(88, 0.12, 0.12, "square");
      note(100, 0.4, 0.1, "square", now() + 0.1);
    }),
  };

  // --- game ---
  function placeFood(): void {
    for (;;) {
      const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      if (!snake.some((s) => s.x === p.x && s.y === p.y)) {
        food = p;
        return;
      }
    }
  }

  function startGame(): void {
    snake = [
      { x: 7, y: 8 },
      { x: 6, y: 8 },
      { x: 5, y: 8 },
    ];
    dir = DIRS.right;
    queue = [];
    score = 0;
    placeFood();
    mode = "play";
    lastStep = performance.now();
    sfx.start();
  }

  function step(): void {
    const d = queue.shift() ?? dir;
    dir = d;
    const head = snake[0]!;
    const n = { x: head.x + d.x, y: head.y + d.y };
    const eating = n.x === food.x && n.y === food.y;
    const body = eating ? snake : snake.slice(0, -1);
    if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS || body.some((s) => s.x === n.x && s.y === n.y)) {
      mode = "over";
      deadAt = performance.now();
      hi = Math.max(hi, score);
      sfx.die();
      return;
    }
    snake = [n, ...body];
    if (eating) {
      score++;
      hi = Math.max(hi, score);
      placeFood();
      sfx.eat();
    }
  }

  function steer(p: P): void {
    const last = queue[queue.length - 1] ?? dir;
    if ((p.x === last.x && p.y === last.y) || (p.x === -last.x && p.y === -last.y)) return;
    if (queue.length < 2) queue.push(p);
  }

  function press(b: Btn): void {
    for (const e of btnEls.get(b) ?? []) e.classList.add("on");
    if (b === "up" || b === "down" || b === "left" || b === "right") {
      if (mode === "play") steer(DIRS[b]);
      return;
    }
    if (b === "a") {
      boost = true;
      if (mode === "title" || (mode === "over" && performance.now() - deadAt > 500)) startGame();
      else if (mode === "pause") mode = "play";
      return;
    }
    sfx.click();
    if (b === "start") {
      if (mode === "boot" || mode === "title" || mode === "over") startGame();
      else if (mode === "play") mode = "pause";
      else if (mode === "pause") {
        mode = "play";
        lastStep = performance.now();
      }
    } else if (b === "b") {
      if (mode === "play") mode = "pause";
      else if (mode === "pause") mode = "play";
    } else if (b === "select") {
      if (mode !== "play") speed = (speed + 1) % SPEEDS.length;
    }
  }

  function release(b: Btn): void {
    for (const e of btnEls.get(b) ?? []) e.classList.remove("on");
    if (b === "a") boost = false;
  }

  // --- drawing ---
  function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, scale = 1, color: string = PAL[3]): void {
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT[" "]!;
      for (let row = 0; row < 5; row++) {
        const bits = Number(g[row]);
        for (let col = 0; col < 3; col++) if (bits & (4 >> col)) ctx.fillRect(cx + col * scale, y + row * scale, scale, scale);
      }
      cx += 4 * scale;
    }
  }
  const centered = (ctx: CanvasRenderingContext2D, s: string, y: number, scale = 1, color: string = PAL[3]) =>
    text(ctx, s, Math.round((W - (s.length * 4 - 1) * scale) / 2), y, scale, color);
  const pad = (n: number) => String(n).padStart(3, "0");

  function drawSnake(ctx: CanvasRenderingContext2D, body: P[], ox = 0, oy = CELL): void {
    body.forEach((s, k) => {
      const x = ox + s.x * CELL;
      const y = oy + s.y * CELL;
      ctx.fillStyle = PAL[3];
      ctx.fillRect(x, y, 7, 7);
      if (k === 0) {
        ctx.fillStyle = PAL[0];
        ctx.fillRect(x + 2, y + 2, 1, 1);
        ctx.fillRect(x + 4, y + 2, 1, 1);
      } else {
        ctx.fillStyle = PAL[1];
        ctx.fillRect(x + 2, y + 2, 3, 3);
      }
    });
  }

  function draw(t: number): void {
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PAL[0];
    ctx.fillRect(0, 0, W, H);
    const blink = Math.floor(t / 450) % 2 === 0;

    if (mode === "boot") {
      const e = t - bootAt;
      const y = Math.min(58, -12 + e / 16);
      centered(ctx, "POCKET CONSOLE", Math.round(y), 2, PAL[3]);
      if (y >= 58) centered(ctx, "PORTABLE SYSTEM", 80, 1, PAL[2]);
      if (e > 2300) mode = "title";
      return;
    }

    if (mode === "title") {
      ctx.fillStyle = PAL[1];
      ctx.fillRect(0, 0, W, 44);
      centered(ctx, "INSERT CARTRIDGE", 6, 1, PAL[2]);
      centered(ctx, "SNAKE", 16, 4, PAL[3]);
      // A little snake chasing a pellet along the bottom.
      const phase = Math.floor(t / 180) % 26;
      const demo: P[] = Array.from({ length: 5 }, (_, k) => ({ x: phase - k - 3, y: 0 }));
      drawSnake(ctx, demo.filter((p) => p.x >= 0 && p.x < COLS), 0, 104);
      ctx.fillStyle = PAL[2];
      if (phase < 16) ctx.fillRect(16 * CELL + 2, 106, 3, 3);
      if (blink) centered(ctx, "PRESS START", 62, 1, PAL[3]);
      centered(ctx, `HI ${pad(hi)}   SPEED ${speed + 1}`, 78, 1, PAL[2]);
      centered(ctx, "SELECT: SPEED  A: GO", 88, 1, PAL[2]);
      return;
    }

    // HUD
    ctx.fillStyle = PAL[3];
    ctx.fillRect(0, 0, W, CELL);
    text(ctx, `SCORE ${pad(score)}`, 2, 1, 1, PAL[0]);
    text(ctx, `HI ${pad(hi)}`, W - 2 - (6 * 4 - 1), 1, 1, PAL[0]);
    // faint grid
    ctx.fillStyle = PAL[1];
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if ((x + y) % 2 === 0) ctx.fillRect(x * CELL + 3, CELL + y * CELL + 3, 1, 1);
    // food: a small diamond
    const fx = food.x * CELL;
    const fy = CELL + food.y * CELL;
    ctx.fillStyle = PAL[2];
    ctx.fillRect(fx + 3, fy + 1, 1, 5);
    ctx.fillRect(fx + 2, fy + 2, 3, 3);
    ctx.fillRect(fx + 1, fy + 3, 5, 1);
    ctx.fillStyle = PAL[3];
    ctx.fillRect(fx + 3, fy + 3, 1, 1);
    if (!(mode === "over" && blink)) drawSnake(ctx, snake);

    if (mode === "pause" || mode === "over") {
      const bw = 100;
      const bh = mode === "over" ? 40 : 22;
      const bx = (W - bw) / 2;
      const by = (H - bh) / 2 + 4;
      ctx.fillStyle = PAL[3];
      ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.fillStyle = PAL[0];
      ctx.fillRect(bx, by, bw, bh);
      if (mode === "pause") centered(ctx, "PAUSE", by + 6, 2);
      else {
        centered(ctx, "GAME OVER", by + 5, 2);
        centered(ctx, `SCORE ${pad(score)}`, by + 20, 1, PAL[2]);
        if (blink) centered(ctx, "PRESS START", by + 29, 1, PAL[3]);
      }
    }
  }

  let raf = 0;
  function frame(t: number): void {
    raf = requestAnimationFrame(frame);
    const was = mode;
    if (mode === "play") {
      const ms = boost ? SPEEDS[speed]! * 0.5 : SPEEDS[speed]!;
      if (t - lastStep >= ms) {
        lastStep = t;
        step();
      }
    }
    draw(t);
    if (was === "boot" && mode === "title") sfx.ding();
  }
  raf = requestAnimationFrame(frame);

  // --- keyboard ---
  const KEYS: Record<string, Btn> = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    " ": "start", Enter: "start", x: "a", X: "a", z: "b", Z: "b", Shift: "select",
  };
  function typing(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }
  function onKey(e: KeyboardEvent): void {
    const b = KEYS[e.key];
    if (!b || typing(e) || e.metaKey || e.ctrlKey || e.altKey || !canvas?.isConnected) return;
    e.preventDefault();
    if (e.type === "keydown") {
      if (e.repeat) return;
      press(b);
    } else release(b);
  }
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);

  // --- pieces ---
  function el(tag: string, cls = "", html = ""): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function bind(e: HTMLElement, b: Btn): void {
    const list = btnEls.get(b) ?? [];
    list.push(e);
    btnEls.set(b, list);
    e.setAttribute("aria-label", b);
    e.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      // Unlock audio inside the gesture; beeps follow once it runs.
      if (!running()) ready().catch(() => {});
      press(b);
    });
    for (const t of ["pointerup", "pointerleave", "pointercancel"]) e.addEventListener(t, () => release(b));
  }

  function screen(scale: number, opts: { cart?: boolean } = {}): HTMLElement {
    const bezel = el("div", "pc-bezel");
    bezel.innerHTML = `<i class="rule"></i><i class="led"></i><span>BATTERY</span><span class="brand">POCKET CONSOLE</span>`;
    led = bezel.querySelector(".led");
    led?.classList.add("on");
    const wrap = el("div", "pc-screenwrap");
    canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "pc-lcd";
    canvas.style.width = `${Math.round(W * scale)}px`;
    canvas.style.height = `${Math.round(H * scale)}px`;
    wrap.append(canvas);
    bezel.append(wrap);
    if (opts.cart) {
      const holder = el("div");
      holder.style.position = "relative";
      holder.append(el("div", "pc-cart", "SNAKE · CART 01"), bezel);
      return holder;
    }
    return bezel;
  }

  function dpad(size: number): HTMLElement {
    const d = el("div", "pc-dpad");
    d.style.setProperty("--d", `${size}px`);
    for (const k of ["up", "down", "left", "right"] as const) {
      const b = el("button", k);
      bind(b, k);
      d.append(b);
    }
    d.append(el("i"));
    return d;
  }

  function ab(size: number): HTMLElement {
    const w = el("div", "pc-ab");
    w.style.setProperty("--b", `${size}px`);
    w.append(el("i", "well"));
    const b = el("button", "b");
    const a = el("button", "a");
    bind(b, "b");
    bind(a, "a");
    const lb = el("label", "", "B");
    lb.style.cssText = `left:${size / 2 - 4}px; bottom:-15px;`;
    const la = el("label", "", "A");
    la.style.cssText = `right:${size / 2 - 4}px; top:${size + 5}px;`;
    w.append(b, a, lb, la);
    return w;
  }

  function startSelect(): HTMLElement {
    const s = el("div", "pc-ss");
    for (const k of ["select", "start"] as const) {
      const d = el("div");
      const b = el("button");
      bind(b, k);
      d.append(b, el("span", "", k.toUpperCase()));
      s.append(d);
    }
    return s;
  }

  function speaker(pos: string): HTMLElement {
    const s = el("div", "pc-speaker", "<i></i>".repeat(6));
    s.style.cssText = pos;
    return s;
  }

  /** The control deck: D-pad left, A/B right, Start/Select between and below. */
  function deck(dp: number, bs: number, opts: { hingeTop?: boolean; tip?: string } = {}): HTMLElement {
    const root = el("div", "pc col");
    root.style.gap = "18px";
    const row = el("div", "pc-controls");
    row.style.width = "86%";
    row.append(dpad(dp), ab(bs));
    root.append(row, startSelect());
    root.append(speaker("right:26px;bottom:14px;"));
    if (opts.hingeTop) {
      const h = el("i", "pc-hinge");
      h.style.top = "0";
      root.append(h);
    }
    if (opts.tip) root.append(el("div", "pc-tip", opts.tip));
    return root;
  }

  function render(s: DuoState): void {
    current = s;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    btnEls.clear();
    canvas = null;
    led = null;

    if (pose.id === "closed") {
      // The brick: compact screen on top, controls below.
      const root = el("div", "pc col");
      root.style.gap = "10px";
      root.append(screen(1.0, { cart: true }));
      const row = el("div", "pc-controls");
      row.style.width = "88%";
      row.append(dpad(74), ab(32));
      root.append(row, startSelect());
      screens.outer.append(root);
    } else if (pose.id === "closed-landscape") {
      const root = el("div", "pc");
      root.style.gap = "8px";
      const mid = el("div", "pc col");
      mid.style.cssText = "position:relative; inset:auto; background:none; gap:10px;";
      mid.append(screen(1.0), startSelect());
      const abw = ab(32);
      root.append(dpad(76), mid, abw);
      screens.outer.append(root);
    } else if (pose.split === "side-by-side") {
      const left = el("div", "pc");
      left.append(screen(1.5));
      screens.start.append(left);
      screens.end.append(deck(116, 46, { tip: pose.id === "book" ? "Fold into table pose: screen up, buttons down" : "Arrows · Space = Start · X = A · Z = B" }));
    } else {
      const top = el("div", "pc");
      top.append(screen(1.45));
      screens.start.append(top);
      screens.end.append(deck(118, 48, { hingeTop: true, tip: "Arrows · Space = Start · X = A · Z = B" }));
    }
    draw(performance.now());
  }

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      style.remove();
    },
  };
}

export const pocketConsoleExample: Example = {
  id: "pocket-console",
  title: "Pocket Console",
  category: "retro",
  summary:
    "A green-screen brick handheld, folded: set the Duo down and the standing half is a pea-green LCD running Snake, the flat half is a D-pad, A/B and Start/Select.",
  bestPose: "table",
  poses: {
    closed: "The brick itself: a compact LCD with the Snake cartridge poking out the top, and a small D-pad and buttons beneath it.",
    "closed-landscape": "A horizontal handheld: screen in the middle, D-pad under your left thumb, A/B under your right.",
    open: "Screen on the left page, full-size controls on the right, played flat in two hands.",
    "open-portrait": "The table-pose split laid flat: screen above the fold, controls below.",
    book: "Screen on the left, controls on the right — it works, but it wants to be folded the other way.",
    table:
      "The clamshell handheld: the standing half is the LCD you watch, the flat half is the control deck under your thumbs, with keyboard arrows too.",
    stand: "Propped up like a tiny arcade cabinet: screen on one side, controls on the other.",
  },
  principle:
    "Table pose's controls-below pattern: content you watch stands up, controls you touch lie on the stable half, and the game keeps running through every fold (HIG checklist §6, 'Destination follows purpose').",
  create,
};
