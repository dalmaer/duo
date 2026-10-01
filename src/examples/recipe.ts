/**
 * Kitchen Recipe — the Duo set down on the counter like a tiny laptop.
 *
 * In table pose the standing half is a step card you can read from across
 * the kitchen: step N of M, a picture, the words in big type and only the
 * ingredients that step needs. The flat half is for messy hands: whole-width
 * Previous / Next, named timers you start from the step that needs them (as
 * many as you like, all counting down at once, each chiming when it ends), an
 * ingredient checklist and a servings scaler.
 *
 * Opened like a book it is a cookbook spread: ingredients on the left page,
 * the method on the right with the current step highlighted. Closed, it is the
 * current step and your running timers. The step, servings, ticked
 * ingredients and every timer live here, in the example, so nothing is lost
 * when you pick the phone up, close it, or set it back down.
 *
 * Both recipes are written for this example.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { note, now as audioNow, ready, running } from "../lib/audio.ts";

type Unit = string | [string, string];
type Ing = { id: string; qty: number | null; unit?: Unit; name: string; whole?: boolean };
type Step = { text: string; icon: string; uses: string[]; timer?: { label: string; min: number } };
type Recipe = { id: string; title: string; short: string; serves: number; time: string; ings: Ing[]; steps: Step[] };

const RECIPES: Recipe[] = [
  {
    id: "shakshuka",
    title: "Weeknight Shakshuka",
    short: "Shakshuka",
    serves: 2,
    time: "30 min",
    ings: [
      { id: "oil", qty: 2, unit: "tbsp", name: "olive oil" },
      { id: "onion", qty: 1, name: "onion, sliced", whole: true },
      { id: "pepper", qty: 1, name: "red pepper, sliced", whole: true },
      { id: "garlic", qty: 3, unit: ["clove", "cloves"], name: "garlic", whole: true },
      { id: "cumin", qty: 1, unit: "tsp", name: "ground cumin" },
      { id: "paprika", qty: 1, unit: "tsp", name: "smoked paprika" },
      { id: "chilli", qty: 0.25, unit: "tsp", name: "chilli flakes" },
      { id: "tomato", qty: 400, unit: "g", name: "chopped tomatoes" },
      { id: "eggs", qty: 4, name: "eggs", whole: true },
      { id: "feta", qty: 60, unit: "g", name: "feta" },
      { id: "parsley", qty: 0.5, unit: ["bunch", "bunches"], name: "parsley" },
      { id: "salt", qty: null, name: "salt and pepper" },
      { id: "bread", qty: null, name: "crusty bread, to serve" },
    ],
    steps: [
      { icon: "🫑", text: "Warm the oil in a wide pan over medium heat. Add the onion and pepper and cook until soft and sweet.", uses: ["oil", "onion", "pepper"], timer: { label: "Soften veg", min: 8 } },
      { icon: "🧄", text: "Stir in the garlic, cumin, paprika and chilli. Cook for a minute, until the kitchen smells of it.", uses: ["garlic", "cumin", "paprika", "chilli"], timer: { label: "Spices", min: 1 } },
      { icon: "🍅", text: "Tip in the tomatoes, a splash of water and a pinch of salt. Simmer until a spoon leaves a trail.", uses: ["tomato", "salt"], timer: { label: "Simmer sauce", min: 10 } },
      { icon: "🥄", text: "Taste. Make it bolder than you think — the eggs will soften it. Season with salt and pepper.", uses: ["salt"] },
      { icon: "🥚", text: "Make a well for each egg and crack them in. Cover and cook until the whites set but the yolks still wobble.", uses: ["eggs"], timer: { label: "Eggs", min: 6 } },
      { icon: "🧀", text: "Take it off the heat. Crumble over the feta and scatter the parsley.", uses: ["feta", "parsley"] },
      { icon: "🍞", text: "Carry the pan to the table with warm bread. Tear, dip, mop.", uses: ["bread"] },
    ],
  },
  {
    id: "noodles",
    title: "Five-Minute Peanut Noodles",
    short: "Peanut noodles",
    serves: 2,
    time: "10 min",
    ings: [
      { id: "noodles", qty: 200, unit: "g", name: "wheat noodles" },
      { id: "pb", qty: 3, unit: "tbsp", name: "peanut butter" },
      { id: "soy", qty: 2, unit: "tbsp", name: "soy sauce" },
      { id: "vinegar", qty: 1, unit: "tbsp", name: "rice vinegar" },
      { id: "honey", qty: 1, unit: "tsp", name: "honey" },
      { id: "chillioil", qty: 1, unit: "tsp", name: "chilli oil" },
      { id: "spring", qty: 2, name: "spring onions", whole: true },
      { id: "cucumber", qty: 0.5, name: "cucumber" },
    ],
    steps: [
      { icon: "🍜", text: "Boil the noodles until just tender. Save a mug of the cooking water before you drain them.", uses: ["noodles"], timer: { label: "Noodles", min: 4 } },
      { icon: "🥜", text: "Whisk the peanut butter, soy, vinegar, honey and chilli oil with a splash of the hot water until glossy.", uses: ["pb", "soy", "vinegar", "honey", "chillioil"] },
      { icon: "🥢", text: "Toss the noodles through the sauce, loosening with more water until every strand is coated.", uses: [] },
      { icon: "🥒", text: "Top with sliced spring onion and cucumber batons. Eat straight away.", uses: ["spring", "cucumber"] },
    ],
  },
];

const FRACTIONS: [number, string][] = [[0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];

function amount(ing: Ing, servings: number, serves: number): string {
  if (ing.qty === null) return "";
  let q = (ing.qty * servings) / serves;
  let text: string;
  if (ing.whole) {
    q = Math.max(1, Math.round(q));
    text = String(q);
  } else if (ing.unit === "g" || ing.unit === "ml") {
    q = Math.round(q / 5) * 5;
    text = String(q);
  } else {
    const w = Math.floor(q + 1e-6);
    let best = FRACTIONS[0]!;
    for (const f of FRACTIONS) if (Math.abs(q - w - f[0]) < Math.abs(q - w - best[0])) best = f;
    const whole = best[0] === 1 ? w + 1 : w;
    text = whole === 0 && !best[1] ? "⅛" : `${whole || ""}${best[1]}`;
  }
  const unit = Array.isArray(ing.unit) ? (q > 1 ? ing.unit[1] : ing.unit[0]) : ing.unit;
  return unit ? (unit === "g" || unit === "ml" ? `${text}${unit}` : `${text} ${unit}`) : text;
}

const CSS = `
.rc { position:absolute; inset:0; display:flex; flex-direction:column; background:#fbf6ee; color:#2b211a; font:14px/1.35 -apple-system, system-ui, sans-serif; overflow:hidden; box-sizing:border-box; }
.rc * { box-sizing:border-box; }
.rc button { font:inherit; color:inherit; cursor:pointer; }
.rc-row { display:flex; align-items:center; gap:8px; }
.rc-sp { flex:1; }
.rc-scroll { position:relative; flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:none; }
.rc-scroll::-webkit-scrollbar { display:none; }
.rc-kick { font:700 11px system-ui; letter-spacing:0.12em; text-transform:uppercase; color:#d9482b; }
.rc-title { font:700 17px/1.15 -apple-system, system-ui; margin:0; }
.rc-pill { border:0; border-radius:999px; padding:6px 11px; background:#efe4d3; font:600 12px system-ui !important; white-space:nowrap; }
.rc-pill.dark { background:#2b211a; color:#fbf6ee !important; }
/* Servings scaler */
.rc-serv { display:flex; align-items:center; gap:2px; background:#efe4d3; border-radius:999px; padding:2px; }
.rc-serv button { width:30px; height:30px; border:0; border-radius:50%; background:#fff; font:700 17px/1 system-ui !important; }
.rc-serv button:disabled { opacity:0.35; cursor:default; }
.rc-serv span { min-width:58px; text-align:center; font:600 12px system-ui; }
.rc-serv.big button { width:44px; height:44px; font-size:22px !important; }
.rc-serv.big span { min-width:70px; font-size:14px; }
/* Step card */
.rc-step { position:relative; display:flex; flex-direction:column; gap:8px; }
.rc-step .meta { display:flex; align-items:center; gap:10px; }
.rc-step .ic { font-size:34px; line-height:1; width:48px; height:48px; display:grid; place-items:center; background:#fff; border-radius:14px; box-shadow:0 1px 0 #e6d8c2; flex:none; }
.rc-step .num { font:800 13px system-ui; letter-spacing:0.08em; text-transform:uppercase; color:#d9482b; }
.rc-step .of { font:600 12px system-ui; color:#8a7766; }
.rc-step p { margin:0; font-weight:600; letter-spacing:-0.01em; text-wrap:pretty; }
.rc-chips { display:flex; flex-wrap:wrap; gap:5px; }
.rc-chip { background:#fff; border:1px solid #e6d8c2; border-radius:999px; padding:3px 9px; font:600 12px system-ui; }
.rc-chip.got { background:#e3efe2; border-color:#bcd8bd; color:#3f7d4e; text-decoration:line-through; }
.rc-dots { display:flex; gap:4px; }
.rc-dots i { width:7px; height:7px; border-radius:50%; background:#e6d8c2; }
.rc-dots i.done { background:#c9b49a; } .rc-dots i.on { background:#d9482b; width:18px; border-radius:4px; }
/* The standing half: readable from a metre away. */
.rc-stand { padding:16px 20px 14px; gap:10px; }
.rc-stand .rc-step { flex:1; min-height:0; }
.rc-stand .ic { font-size:44px; width:62px; height:62px; border-radius:18px; }
.rc-stand .num { font-size:20px; }
.rc-stand .of { font-size:14px; }
.rc-stand p { font-size:clamp(17px, 6cqw, 25px); line-height:1.22; }
.rc-stand .rc-chip { font-size:14px; padding:4px 11px; }
.rc-corner { position:absolute; top:0; right:0; display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
.rc-big-tm { background:#2b211a; color:#fbf6ee; border-radius:14px; padding:6px 12px; text-align:right; }
.rc-big-tm b { display:block; font:700 24px/1 ui-monospace, SFMono-Regular, monospace; font-variant-numeric:tabular-nums; }
.rc-big-tm small { font:600 11px system-ui; opacity:0.75; }
.rc-big-tm.done { background:#d9482b; animation:rc-pulse 0.8s ease-in-out infinite alternate; }
@keyframes rc-pulse { to { transform:scale(1.06); } }
/* The flat half: big targets. */
.rc-flat { padding:10px 12px 12px; gap:8px; background:#f3eadc; }
.rc-nav { display:flex; gap:8px; flex:none; }
.rc-nav button { height:60px; border:0; border-radius:16px; font:700 18px system-ui !important; display:flex; align-items:center; justify-content:center; gap:8px; }
.rc-nav .prev { flex:1; background:#e6d8c2; }
.rc-nav .next { flex:2; background:#d9482b; color:#fff !important; }
.rc-nav button:disabled { opacity:0.4; cursor:default; }
.rc-nav button:active:not(:disabled) { filter:brightness(0.9); }
.rc-nav.slim button { height:46px; font-size:15px !important; border-radius:13px; }
.rc-tms { display:flex; gap:6px; overflow-x:auto; flex:none; scrollbar-width:none; min-height:48px; }
.rc-tms::-webkit-scrollbar { display:none; }
.rc-start { flex:none; border:2px dashed #d9482b; background:#fff; border-radius:14px; padding:0 14px; height:48px; color:#d9482b !important; font:700 14px system-ui !important; display:flex; align-items:center; gap:6px; white-space:nowrap; }
.rc-start:disabled { border-style:solid; opacity:0.5; cursor:default; }
.rc-tm { flex:none; display:flex; align-items:center; gap:6px; height:48px; padding:0 4px 0 12px; border:0; border-radius:14px; background:#2b211a; color:#fbf6ee !important; white-space:nowrap; }
.rc-tm .l { font:600 12px system-ui; opacity:0.8; max-width:90px; overflow:hidden; text-overflow:ellipsis; }
.rc-tm .t { font:700 18px ui-monospace, SFMono-Regular, monospace; font-variant-numeric:tabular-nums; }
.rc-tm .x { width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:rgb(255 255 255 / 0.12); font:700 16px system-ui; }
.rc-tm.done { background:#d9482b; animation:rc-pulse 0.8s ease-in-out infinite alternate; padding-right:12px; }
.rc-empty-tm { align-self:center; font:500 12px system-ui; color:#8a7766; padding-left:4px; }
.rc-mid { flex:1; min-height:0; display:flex; gap:8px; }
.rc-list { flex:1; min-width:0; background:#fff; border-radius:14px; display:flex; flex-direction:column; }
.rc-check { display:flex; align-items:center; gap:10px; width:100%; border:0; background:none; text-align:left; padding:8px 10px; min-height:42px; border-bottom:1px solid #f1e8da; }
.rc-check .bx { width:24px; height:24px; border-radius:7px; border:2px solid #c9b49a; flex:none; display:grid; place-items:center; color:#fff; font:800 14px system-ui; }
.rc-check.on .bx { background:#3f7d4e; border-color:#3f7d4e; }
.rc-check .nm { flex:1; font-size:14px; }
.rc-check .q { font:700 13px system-ui; color:#8a7766; white-space:nowrap; }
.rc-check.on .nm, .rc-check.on .q { color:#a3998e; text-decoration:line-through; }
.rc-check.used .nm { font-weight:700; }
.rc-check.used { box-shadow:inset 4px 0 0 #d9482b; }
.rc-side { width:112px; flex:none; display:flex; flex-direction:column; gap:6px; align-items:stretch; }
.rc-side .rc-serv { flex-direction:column; border-radius:16px; padding:6px; }
.rc-side .rc-serv span { padding:2px 0; }
.rc-swap { border:0; border-radius:14px; background:#fff; padding:7px 8px; font:600 11px/1.2 system-ui !important; text-align:left; flex:none; }
.rc-swap small { display:block; color:#8a7766; font-weight:500; margin-bottom:2px; }
/* Book spread */
.rc-page { padding:14px 14px 12px; gap:10px; }
.rc-page.l { background:#fbf6ee; }
.rc-page.r { background:#fffaf2; }
.rc-head { display:flex; flex-direction:column; gap:3px; }
.rc-head small { color:#8a7766; font:500 12px system-ui; }
.rc-method { display:flex; flex-direction:column; gap:6px; padding:3px 3px 6px; }
.rc-mstep { display:grid; grid-template-columns:26px minmax(0,1fr); gap:8px; border:0; text-align:left; background:none; padding:8px; border-radius:12px; font-size:13px !important; color:#6d5d4f !important; }
.rc-mstep .n { width:24px; height:24px; border-radius:50%; background:#efe4d3; display:grid; place-items:center; font:700 12px system-ui; color:#2b211a; }
.rc-mstep.done .n { background:#c9b49a; color:#fff; }
.rc-mstep.on { background:#fff; color:#2b211a !important; box-shadow:0 0 0 2px #d9482b; font-size:15px !important; font-weight:600; }
.rc-mstep.on .n { background:#d9482b; color:#fff; }
.rc-mstep .xtra { grid-column:2; display:flex; flex-direction:column; gap:6px; margin-top:6px; font-weight:400; }
.rc-mstep .xtra .rc-start { min-height:40px; height:auto; padding:6px 12px; white-space:normal; align-self:flex-start; }
.rc-tlist { display:flex; flex-direction:column; gap:6px; flex:none; }
.rc-tlist .rc-tm { width:100%; height:42px; }
.rc-tlist .rc-tm .l { max-width:none; flex:1; text-align:left; }
/* Closed */
.rc-phone { padding:12px 14px 12px; gap:8px; }
.rc-seg { display:flex; padding:2px; border-radius:10px; background:#efe4d3; flex:none; }
.rc-seg button { flex:1; border:0; border-radius:8px; background:none; padding:6px; font:600 12px system-ui !important; }
.rc-seg button.on { background:#fff; box-shadow:0 1px 2px rgb(0 0 0 / 0.08); }
.rc-phone .rc-step p { font-size:18px; line-height:1.28; }
.rc-phone .rc-tms { min-height:44px; }
.rc-phone .rc-tm, .rc-phone .rc-start { height:44px; }
/* Closed landscape: the bar on the trailing edge. */
.rc-land { flex-direction:row; }
.rc-land .main { flex:1; min-width:0; display:flex; flex-direction:column; gap:8px; padding:12px 14px; }
.rc-land .rc-step p { font-size:19px; line-height:1.25; }
.rc-vbar { width:76px; flex:none; display:flex; flex-direction:column; gap:6px; padding:8px; background:#efe4d3; }
.rc-vbar button { border:0; border-radius:14px; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font:600 10px system-ui !important; padding:6px 2px; }
.rc-vbar button b { font-size:20px; line-height:1; }
.rc-vbar button:disabled { opacity:0.4; cursor:default; }
.rc-vbar .next { flex:1; background:#d9482b; color:#fff !important; font-size:12px !important; }
.rc-vbar .next b { font-size:28px; }
.rc-vbar .tmr { color:#d9482b !important; }
`;

type Timer = { id: number; label: string; recipe: number; step: number; total: number; ends: number; done: boolean };

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let ri = 0;
  const stepOf = RECIPES.map(() => 0);
  const checked = RECIPES.map(() => new Set<string>());
  let servings = 2;
  let closedView: "step" | "ings" = "step";
  const timers: Timer[] = [];
  let nextId = 1;
  const scroll = new Map<string, number>();
  const listAt = new Map<string, string>();
  let state = initial;
  let dead = false;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const recipe = () => RECIPES[ri]!;
  const stepIdx = () => stepOf[ri]!;
  const step = () => recipe().steps[stepIdx()]!;
  const rerender = () => render(state);

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }
  function btn(cls: string, html: string, run: () => void, label?: string): HTMLButtonElement {
    const b = el("button", cls, html);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    b.onclick = run;
    return b;
  }
  function keepScroll(e: HTMLElement, key: string): HTMLElement {
    e.addEventListener("scroll", () => scroll.set(key, e.scrollTop));
    requestAnimationFrame(() => (e.scrollTop = scroll.get(key) ?? 0));
    return e;
  }

  // --- actions ---
  function go(d: number): void {
    const n = Math.min(recipe().steps.length - 1, Math.max(0, stepIdx() + d));
    stepOf[ri] = n;
    rerender();
  }
  function setStep(n: number): void {
    stepOf[ri] = n;
    rerender();
  }
  function switchRecipe(): void {
    ri = (ri + 1) % RECIPES.length;
    servings = recipe().serves;
    rerender();
  }
  function scale(d: number): void {
    servings = Math.min(6, Math.max(1, servings + d));
    rerender();
  }
  function toggle(id: string): void {
    const set = checked[ri]!;
    set.has(id) ? set.delete(id) : set.add(id);
    rerender();
  }
  function timerFor(r: number, s: number): Timer | undefined {
    return timers.find((t) => t.recipe === r && t.step === s && !t.done);
  }
  function startTimer(): void {
    const t = step().timer;
    if (!t || timerFor(ri, stepIdx())) return;
    // A tap is a trusted gesture: unlock audio now so the chime can play later.
    ready().catch(() => {});
    const total = t.min * 60_000;
    timers.push({ id: nextId++, label: t.label, recipe: ri, step: stepIdx(), total, ends: Date.now() + total, done: false });
    rerender();
  }
  function removeTimer(id: number): void {
    const i = timers.findIndex((t) => t.id === id);
    if (i >= 0) timers.splice(i, 1);
    rerender();
  }
  function chime(): void {
    if (!running()) return;
    const t0 = audioNow();
    for (let r = 0; r < 3; r++) for (const [k, m] of [76, 81, 88].entries()) note(m, 0.5, 0.22, "sine", t0 + r * 0.9 + k * 0.14);
  }

  const tick = window.setInterval(() => {
    const t = Date.now();
    let changed = false;
    for (const tm of timers) {
      if (!tm.done && t >= tm.ends) {
        tm.done = true;
        changed = true;
        chime();
      }
    }
    if (changed) rerender();
    else
      for (const s of [screens.outer, screens.start, screens.end])
        s.querySelectorAll<HTMLElement>("[data-tm]").forEach((e) => {
          const tm = timers.find((x) => x.id === Number(e.dataset.tm));
          const out = e.querySelector(".t, b");
          if (tm && out) out.textContent = tm.done ? "Done" : mmss(tm.ends - t);
        });
  }, 250);

  // --- pieces ---
  function servingsCtl(big = false): HTMLElement {
    const w = el("div", `rc-serv ${big ? "big" : ""}`);
    const minus = btn("", "−", () => scale(-1), "Fewer servings");
    const plus = btn("", "+", () => scale(1), "More servings");
    minus.disabled = servings <= 1;
    plus.disabled = servings >= 6;
    w.append(minus, el("span", "", `Serves ${servings}`), plus);
    return w;
  }

  function chips(): HTMLElement {
    const c = el("div", "rc-chips");
    const r = recipe();
    for (const id of step().uses) {
      const ing = r.ings.find((i) => i.id === id)!;
      const a = amount(ing, servings, r.serves);
      c.append(el("span", `rc-chip ${checked[ri]!.has(id) ? "got" : ""}`, `${a ? `${a} ` : ""}${ing.name.replace(/, .*/, "")}`));
    }
    return c;
  }

  function dots(): HTMLElement {
    const d = el("div", "rc-dots");
    d.setAttribute("aria-hidden", "true");
    recipe().steps.forEach((_, i) => d.append(el("i", i === stepIdx() ? "on" : i < stepIdx() ? "done" : "")));
    return d;
  }

  function stepCard(): HTMLElement {
    const s = step();
    const card = el("div", "rc-step");
    const meta = el("div", "meta");
    meta.append(el("div", "ic", s.icon), el("div", "", `<div class="num">Step ${stepIdx() + 1}</div><div class="of">of ${recipe().steps.length} · ${recipe().short}</div>`));
    card.append(meta, el("p", "", s.text));
    if (s.uses.length) card.append(chips());
    return card;
  }

  function timerChip(tm: Timer, cancellable: boolean): HTMLElement {
    const b = el("div", `rc-tm ${tm.done ? "done" : ""}`);
    b.dataset.tm = String(tm.id);
    b.setAttribute("role", "timer");
    b.innerHTML = `<span class="l">${tm.label}</span><span class="t">${tm.done ? "Done" : mmss(tm.ends - Date.now())}</span>`;
    if (tm.done) {
      b.setAttribute("role", "button");
      b.title = "Dismiss";
      b.onclick = () => removeTimer(tm.id);
    } else if (cancellable) {
      b.append(btn("x", "×", () => removeTimer(tm.id), `Cancel ${tm.label} timer`));
    }
    return b;
  }

  function startButton(): HTMLButtonElement | null {
    const t = step().timer;
    if (!t) return null;
    const running = timerFor(ri, stepIdx());
    const b = btn("rc-start", running ? `⏱ ${t.label} running` : `⏱ Start “${t.label}” · ${t.min} min`, startTimer);
    b.disabled = !!running;
    return b;
  }

  function timerRow(): HTMLElement {
    const row = el("div", "rc-tms");
    const sb = startButton();
    if (sb) row.append(sb);
    for (const tm of timers) row.append(timerChip(tm, true));
    if (!row.children.length) row.append(el("span", "rc-empty-tm", "No timer for this step"));
    return row;
  }

  function nav(slim = false): HTMLElement {
    const n = el("div", `rc-nav ${slim ? "slim" : ""}`);
    const last = stepIdx() === recipe().steps.length - 1;
    const p = btn("prev", "‹ Back", () => go(-1), "Previous step");
    const x = btn("next", last ? "Enjoy ✓" : "Next ›", () => go(1), "Next step");
    p.disabled = stepIdx() === 0;
    x.disabled = last;
    n.append(p, x);
    return n;
  }

  function checklist(key: string): HTMLElement {
    const box = keepScroll(el("div", "rc-scroll"), key);
    const r = recipe();
    const uses = new Set(step().uses);
    for (const ing of r.ings) {
      const on = checked[ri]!.has(ing.id);
      const row = btn(`rc-check ${on ? "on" : ""} ${uses.has(ing.id) ? "used" : ""}`, `<span class="bx">${on ? "✓" : ""}</span><span class="nm">${ing.name}</span><span class="q">${amount(ing, servings, r.serves)}</span>`, () => toggle(ing.id));
      row.setAttribute("role", "checkbox");
      row.setAttribute("aria-checked", String(on));
      box.append(row);
    }
    // When the step changes, bring the first ingredient it uses into view.
    const at = `${ri}:${stepIdx()}`;
    if (listAt.get(key) !== at) {
      listAt.set(key, at);
      const first = box.querySelector<HTMLElement>(".used");
      requestAnimationFrame(() => {
        if (first && (first.offsetTop < box.scrollTop || first.offsetTop + first.offsetHeight > box.scrollTop + box.clientHeight)) {
          box.scrollTop = first.offsetTop - 4;
          scroll.set(key, box.scrollTop);
        }
      });
    }
    return box;
  }

  function swapButton(): HTMLButtonElement {
    const other = RECIPES[(ri + 1) % RECIPES.length]!;
    return btn("rc-swap", `<small>Switch recipe</small>${other.title}`, switchRecipe);
  }

  // --- layouts ---
  /** Table and open portrait: watch on top, touch on the bottom. */
  function stacked(folded: boolean): void {
    const top = el("div", "rc rc-stand");
    if (folded) top.style.paddingBottom = "18px";
    top.append(stepCard(), dots());
    const live = timers.slice().sort((a, b) => Number(b.done) - Number(a.done) || a.ends - b.ends)[0];
    if (live) {
      const corner = el("div", "rc-corner");
      const t = el("div", `rc-big-tm ${live.done ? "done" : ""}`, `<b>${live.done ? "Done" : mmss(live.ends - Date.now())}</b><small>${live.label}${timers.length > 1 ? ` +${timers.length - 1}` : ""}</small>`);
      t.dataset.tm = String(live.id);
      corner.append(t);
      corner.style.cssText = "top:16px;right:20px";
      top.append(corner);
    }
    screens.start.append(top);

    const flat = el("div", "rc rc-flat");
    if (folded) flat.style.paddingTop = "18px";
    const mid = el("div", "rc-mid");
    const list = el("div", "rc-list");
    list.append(checklist("flat"));
    const side = el("div", "rc-side");
    const sv = servingsCtl();
    side.append(sv, swapButton());
    mid.append(list, side);
    flat.append(timerRow(), mid, nav());
    screens.end.append(flat);
  }

  /** Open, book and stand: a cookbook spread. */
  function spread(folded: boolean): void {
    const r = recipe();
    const left = el("div", "rc rc-page l");
    if (folded) left.style.paddingRight = "20px";
    const head = el("div", "rc-row");
    head.append(el("div", "rc-head", `<span class="rc-kick">Ingredients</span><h1 class="rc-title">${r.title}</h1><small>${r.time} · ${checked[ri]!.size} of ${r.ings.length} ready</small>`));
    left.append(head);
    const controls = el("div", "rc-row");
    controls.append(servingsCtl(), el("i", "rc-sp"), btn("rc-pill", "Switch recipe", switchRecipe));
    left.append(controls);
    const list = el("div", "rc-list");
    list.append(checklist("book"));
    left.append(list);
    if (timers.length) {
      const tl = el("div", "rc-tlist");
      for (const tm of timers) tl.append(timerChip(tm, true));
      left.append(tl);
    }
    screens.start.append(left);

    const right = el("div", "rc rc-page r");
    if (folded) right.style.paddingLeft = "20px";
    right.append(el("div", "rc-row", `<span class="rc-kick">Method</span><i class="rc-sp"></i><span style="font:600 12px system-ui;color:#8a7766">Step ${stepIdx() + 1} of ${r.steps.length}</span>`));
    const sc = keepScroll(el("div", "rc-scroll"), "method");
    const m = el("div", "rc-method");
    r.steps.forEach((s, i) => {
      const on = i === stepIdx();
      const b = el("div", `rc-mstep ${on ? "on" : i < stepIdx() ? "done" : ""}`, `<span class="n">${i < stepIdx() ? "✓" : i + 1}</span><span>${s.text}</span>`);
      b.setAttribute("role", "button");
      if (!on) b.onclick = () => setStep(i);
      if (on && (s.uses.length || s.timer)) {
        const x = el("div", "xtra");
        if (s.uses.length) x.append(chips());
        const sb = startButton();
        if (sb) x.append(sb);
        b.append(x);
        // Keep the current step in view without scrolling anything outside this pane.
        requestAnimationFrame(() => {
          if (b.offsetTop < sc.scrollTop) sc.scrollTop = b.offsetTop - 6;
          else if (b.offsetTop + b.offsetHeight > sc.scrollTop + sc.clientHeight) sc.scrollTop = b.offsetTop + b.offsetHeight - sc.clientHeight + 6;
        });
      }
      m.append(b);
    });
    sc.append(m);
    right.append(sc, nav(true));
    screens.end.append(right);
  }

  function closed(): void {
    const r = recipe();
    const root = el("div", "rc rc-phone");
    const head = el("div", "rc-row");
    head.append(el("h1", "rc-title", r.short), el("i", "rc-sp"), servingsCtl());
    const seg = el("div", "rc-seg");
    for (const [id, label] of [["step", "Step"], ["ings", "Ingredients"]] as const) {
      seg.append(btn(closedView === id ? "on" : "", label, () => ((closedView = id), rerender())));
    }
    root.append(head, seg);
    if (closedView === "step") {
      const body = keepScroll(el("div", "rc-scroll"), "closed");
      body.append(stepCard());
      root.append(body, timerRow(), nav(true));
    } else {
      const list = el("div", "rc-list");
      list.append(checklist("closed"));
      root.append(list, btn("rc-pill", `Switch to ${RECIPES[(ri + 1) % RECIPES.length]!.short}`, switchRecipe));
    }
    screens.outer.append(root);
  }

  function closedLandscape(): void {
    const root = el("div", "rc rc-land");
    const main = el("div", "main");
    const body = keepScroll(el("div", "rc-scroll"), "land");
    body.append(stepCard());
    main.append(body);
    if (timers.length) {
      const row = el("div", "rc-tms");
      for (const tm of timers) row.append(timerChip(tm, true));
      main.append(row);
    }
    // Trailing-edge bar (HIG: outer-display bars are vertical): Back first, the prominent Next last and largest.
    const bar = el("div", "rc-vbar");
    const last = stepIdx() === recipe().steps.length - 1;
    const back = btn("", "<b>‹</b>Back", () => go(-1), "Previous step");
    back.disabled = stepIdx() === 0;
    bar.append(back);
    const t = step().timer;
    if (t) {
      const tb = btn("tmr", `<b>⏱</b>${t.min} min`, startTimer, `Start ${t.label} timer`);
      tb.disabled = !!timerFor(ri, stepIdx());
      bar.append(tb);
    }
    const next = btn("next", `<b>›</b>${last ? "Done" : "Next"}`, () => go(1), "Next step");
    next.disabled = last;
    bar.append(next);
    root.append(main, bar);
    screens.outer.append(root);
  }

  function render(s: DuoState): void {
    if (dead) return;
    state = s;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    const folded = s.hinge < 180;
    if (pose.display === "outer") {
      if (pose.size.height === "compact") closedLandscape();
      else closed();
    } else if (pose.split === "stacked") stacked(folded);
    else spread(folded);
  }

  return {
    render,
    destroy() {
      dead = true;
      clearInterval(tick);
      style.remove();
    },
  };
}

export const recipeExample: Example = {
  id: "recipe",
  title: "Kitchen Recipe",
  category: "productivity",
  summary:
    "A recipe for the kitchen counter. Set the Duo down like a tiny laptop: the standing half shows the current step in type you can read from across the room, and the flat half has big Back and Next buttons for messy hands, timers you start from a step (several can run at once, and each chimes when it ends), an ingredient checklist and a servings scaler.",
  bestPose: "table",
  poses: {
    closed: "The phone in your hand: the current step, its ingredients and every running timer, with Back and Next at the bottom and the ingredient checklist one tab away.",
    "closed-landscape": "The current step runs across the display, and a bar down the trailing edge holds Back, the step's timer and a large Next.",
    open: "A cookbook spread: the ingredient checklist and servings scaler on the left page, and the method on the right with the current step highlighted.",
    "open-portrait": "The table layout lying flat: the step card on top, and the big controls, timers and checklist below.",
    book: "The same spread held like a cookbook, with a margin each side of the fold so nothing you tap is in it.",
    table: "Watch on top, touch below: the current step stands up in huge type with its ingredients and the next timer due, while the flat half has whole-width Back and Next, step timers, the checklist and the scaler.",
    stand: "Stood on the counter like a card, the full spread faces you: ingredients left, method right, and you can still tap a step.",
  },
  principle:
    "In table pose, content you read from a distance goes on the standing half and the controls you tap go on the stable flat half, with the same features and hierarchy as every other pose (HIG checklist §6, 'Destination follows purpose', and §8, 'Optional table-pose layout').",
  create,
};
