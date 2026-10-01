/**
 * Planner — a paper day-planner, open on the desk.
 *
 * Opened like a book it is the familiar spread: the day on the left page as
 * an hour timeline from 7 am to 9 pm, and notes on the right — free text, a
 * to-do list and a mini month for jumping about. Tap an empty hour to write
 * an event in; swipe the day page, or use the arrows, to turn the day.
 *
 * Closed, it is the week at a glance, the next event called out, and a tap on
 * a day shows that day's agenda. Set down in table pose, today's timeline
 * stands up where you can see it and the flat half is for quick capture.
 *
 * Everything — the day you are on, events, notes, half-typed text and where
 * the cursor was — lives in this closure, so folding never loses a word
 * (HIG, "Displays, poses, and continuity"). The sample week is invented.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

type Ev = { id: number; start: number; dur: number; title: string; hue: number };
type Task = { text: string; done: boolean };
type Notes = { text: string; tasks: Task[] };
type Draft = { key: string; hour: number; text: string; id?: number };

const FIRST = 7;
const LAST = 21;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The sample week, by weekday (0 = Monday): [start, duration, title, hue]. */
const SAMPLE: [number, number, string, number][][] = [
  [[9, 0.5, "Team stand-up", 210], [12.5, 1, "Lunch with Priya", 30], [16, 1, "Dentist", 0]],
  [[7.5, 1, "River run", 140], [10, 1.5, "Design review", 210], [19, 2, "Pottery class", 25]],
  [[8.5, 0.5, "School run", 45], [11, 1, "1:1 with Theo", 210], [14, 2, "Write the hinge spec", 265], [18.5, 1.5, "Book club", 330]],
  [[9.5, 1, "Sprint planning", 210], [13, 1, "Lunch & walk", 140], [17, 0.5, "Haircut", 0]],
  [[10, 1.5, "Demo day", 265], [15, 1, "Repot the fig", 140], [20, 1, "Film night", 330]],
  [[9, 2, "Farmers' market", 45], [14, 1, "Fix bike brakes", 25], [19.5, 1.5, "Dinner at Mum's", 0]],
  [[10, 2, "Long walk, Ridge Path", 140], [16, 1.5, "Meal prep", 30]],
];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
const weekday = (d: Date) => (d.getDay() + 6) % 7;
const monday = (k: string) => addDays(k, -weekday(fromKey(k)));
const hhmm = (h: number) => `${Math.floor(h)}:${pad(Math.round((h % 1) * 60))}`;
const hourLabel = (h: number) => (h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const CSS = `
.pl { position:absolute; inset:0; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden;
  color:#3a3226; font:13px/1.35 "Iowan Old Style", "Palatino", Georgia, serif;
  background-color:#f7f1e3; background-image:radial-gradient(circle, #d8ccb2 1px, transparent 1.3px); background-size:14px 14px; background-position:7px 7px; }
.pl * { box-sizing:border-box; }
.pl button, .pl input, .pl textarea { font:inherit; color:inherit; }
.pl button { cursor:pointer; }
.pl-sans { font-family:-apple-system, system-ui, sans-serif; }
.pl-top { display:flex; align-items:center; gap:6px; padding:12px 14px 6px; flex:none; }
.pl-date { flex:1; min-width:0; }
.pl-week > .pl-date, .pl-agenda > .pl-date { flex:none; }
.pl-date h1 { margin:0; font:600 21px/1.05 "Iowan Old Style", Palatino, Georgia, serif; letter-spacing:-0.01em; }
.pl-date small { display:block; font:600 10px system-ui; letter-spacing:0.14em; text-transform:uppercase; color:#b4552e; margin-bottom:2px; }
.pl-arrow { width:34px; height:34px; border:1px solid #d9cdb4; border-radius:50%; background:#fffaf0; font:600 17px/1 system-ui !important; display:grid; place-items:center; flex:none; }
.pl-chip { border:1px solid #d9cdb4; border-radius:999px; padding:5px 10px; background:#fffaf0; font:600 11px system-ui !important; }
.pl-scroll { position:relative; flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:none; }
.pl-scroll::-webkit-scrollbar { display:none; }
/* The hour timeline */
.pl-tl { position:relative; margin:0 10px 12px 0; touch-action:pan-y; }
.pl-hr { position:relative; display:block; width:100%; border:0; background:none; padding:0; text-align:left; border-top:1px solid #e1d6bf; }
.pl-hr span { position:absolute; left:0; top:-7px; width:42px; padding-right:6px; text-align:right; font:600 9.5px system-ui; color:#9a8b72; background:#f7f1e3; }
.pl-hr:hover { background:rgb(180 85 46 / 0.05); }
.pl-hr.ro { cursor:default; } .pl-hr.ro:hover { background:none; }
.pl-ev { position:absolute; left:48px; right:4px; border:0; border-radius:6px; padding:3px 7px; text-align:left; overflow:hidden; font:600 12px/1.2 system-ui !important; color:#2b2419; box-shadow:0 1px 0 rgb(0 0 0 / 0.06); }
.pl-ev small { display:block; font-weight:500; font-size:10px; opacity:0.7; }
.pl-ev.short { display:flex; gap:6px; align-items:center; }
.pl-ev.short small { display:inline; }
.pl-now { position:absolute; left:42px; right:0; height:2px; background:#d9482b; pointer-events:none; z-index:2; }
.pl-now::before { content:""; position:absolute; left:-4px; top:-3px; width:8px; height:8px; border-radius:50%; background:#d9482b; }
.pl-ed { position:absolute; left:46px; right:2px; z-index:3; display:flex; gap:4px; align-items:center; padding:4px; background:#fffaf0; border:1.5px solid #b4552e; border-radius:8px; box-shadow:0 6px 16px rgb(60 40 10 / 0.18); }
.pl-ed input { flex:1; min-width:0; border:0; outline:0; background:none; font:600 13px system-ui !important; padding:4px; }
.pl-ed button { border:0; border-radius:6px; padding:5px 8px; font:600 11px system-ui !important; background:#efe5d0; }
.pl-ed button.ok { background:#b4552e; color:#fff !important; }
.pl-ed .t { font:600 10px system-ui; color:#9a8b72; padding-left:2px; }
/* The notes page */
.pl-ribbon { position:absolute; top:0; right:12px; width:14px; height:36px; background:#b4552e; pointer-events:none; z-index:4;
  clip-path:polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%); box-shadow:inset -3px 0 0 rgb(0 0 0 / 0.12); }
.pl-notes { padding:12px 14px 12px; gap:8px; }
.pl-notes.wide { flex-direction:row; gap:12px; }
.pl-col { display:flex; flex-direction:column; gap:6px; min-width:0; min-height:0; }
.pl-month { flex:none; }
.pl-mh { display:flex; align-items:center; gap:4px; margin-bottom:3px; padding-right:22px; }
.pl-mh b { flex:1; font:600 14px "Iowan Old Style", Palatino, Georgia, serif; }
.pl-mh button { width:24px; height:24px; border:0; border-radius:50%; background:none; font:600 14px system-ui !important; }
.pl-grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:1px; text-align:center; }
.pl-grid i { font:700 8.5px system-ui; color:#9a8b72; font-style:normal; padding-bottom:2px; }
.pl-grid button { position:relative; height:22px; border:0; border-radius:6px; background:none; font:600 11px system-ui !important; padding:0; }
.pl-grid button.out { opacity:0.3; }
.pl-grid button.today { box-shadow:inset 0 0 0 1.5px #b4552e; }
.pl-grid button.sel { background:#3a3226; color:#f7f1e3 !important; }
.pl-grid button.has::after { content:""; position:absolute; left:50%; bottom:2px; width:3px; height:3px; margin-left:-1.5px; border-radius:50%; background:#b4552e; }
.pl-grid button.sel.has::after { background:#f7f1e3; }
.pl-label { font:700 10px system-ui; letter-spacing:0.14em; text-transform:uppercase; color:#b4552e; }
.pl-text { flex:1; min-height:54px; width:100%; resize:none; border:0; outline:0; padding:0 2px; background:repeating-linear-gradient(transparent 0 21px, #d9cdb4 21px 22px); line-height:22px !important; font:15px/22px "Bradley Hand", "Segoe Print", "Marker Felt", cursive !important; color:#2f3d66 !important; }
.pl-tasks { display:flex; flex-direction:column; flex:none; max-height:44%; overflow-y:auto; scrollbar-width:none; }
.pl-task { display:flex; align-items:center; gap:8px; border:0; background:none; text-align:left; padding:4px 0; min-height:30px; width:100%; }
.pl-task .bx { width:18px; height:18px; flex:none; border:1.5px solid #8c7c62; border-radius:4px; display:grid; place-items:center; font:800 12px system-ui; color:#2f3d66; }
.pl-task span:last-child { font:15px "Bradley Hand", "Segoe Print", "Marker Felt", cursive; color:#2f3d66; }
.pl-task.done span:last-child { text-decoration:line-through; opacity:0.5; }
.pl-add { display:flex; align-items:center; gap:8px; padding:2px 0; }
.pl-add i { width:18px; height:18px; border:1.5px dashed #b9aa8e; border-radius:4px; flex:none; }
.pl-add input { flex:1; min-width:0; border:0; border-bottom:1px solid #d9cdb4; outline:0; background:none; padding:4px 0; font:15px "Bradley Hand", "Segoe Print", "Marker Felt", cursive !important; color:#2f3d66 !important; }
/* Closed: the week */
.pl-week { padding:10px 12px 10px; gap:6px; }
.pl-next { flex:none; background:#3a3226; color:#f7f1e3; border-radius:12px; padding:8px 11px; font:12px/1.3 system-ui; }
.pl-next b { display:block; font:600 15px/1.2 "Iowan Old Style", Palatino, Georgia, serif; }
.pl-next small { color:#e6b89c; font:700 9.5px system-ui; letter-spacing:0.12em; text-transform:uppercase; }
.pl-rows { flex:1; min-height:0; display:flex; flex-direction:column; gap:3px; }
.pl-row { flex:1; display:grid; grid-template-columns:42px 1fr 20px; align-items:center; gap:6px; border:0; border-radius:10px; background:rgb(255 250 240 / 0.75); padding:0 8px; text-align:left; min-height:0; }
.pl-row .d { font:700 10px system-ui; color:#9a8b72; text-transform:uppercase; letter-spacing:0.06em; }
.pl-row .d b { display:block; font:600 17px/1 "Iowan Old Style", Palatino, Georgia, serif; color:#3a3226; letter-spacing:0; }
.pl-row .bar { position:relative; height:12px; border-radius:6px; background:repeating-linear-gradient(90deg, #ebe1cc 0 1px, transparent 1px calc(100% / 7)); }
.pl-row .bar i { position:absolute; top:50%; width:9px; height:9px; margin:-4.5px 0 0 -4.5px; border-radius:50%; }
.pl-row .n { font:700 11px system-ui; color:#9a8b72; text-align:right; }
.pl-row.today { background:#fffaf0; box-shadow:inset 0 0 0 1.5px #b4552e; }
.pl-row.sel .d b { text-decoration:underline; text-decoration-color:#b4552e; }
.pl-agenda { padding:10px 14px; gap:8px; }
.pl-back { align-self:flex-start; border:0; background:none; padding:2px 0; color:#b4552e !important; font:600 14px system-ui !important; }
.pl-item { display:grid; grid-template-columns:44px 6px 1fr; gap:8px; align-items:start; padding:6px 0; border-bottom:1px solid #e1d6bf; }
.pl-item .t { font:700 12px system-ui; color:#9a8b72; text-align:right; padding-top:1px; }
.pl-item .c { width:6px; height:100%; min-height:18px; border-radius:3px; }
.pl-item b { font:600 15px/1.2 "Iowan Old Style", Palatino, Georgia, serif; }
.pl-item small { display:block; font:500 11px system-ui; color:#9a8b72; }
.pl-empty { color:#9a8b72; font-style:italic; padding:16px 0; }
/* Closed landscape: seven columns and a trailing bar */
.pl-land { flex-direction:row; }
.pl-land .main { flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; padding:10px 8px 10px 12px; }
.pl-cols { flex:1; min-height:0; display:grid; grid-template-columns:repeat(7, 1fr); gap:3px; }
.pl-c { position:relative; display:flex; flex-direction:column; border:0; border-radius:8px; background:rgb(255 250 240 / 0.75); padding:3px 2px 2px; min-width:0; }
.pl-c.today { box-shadow:inset 0 0 0 1.5px #b4552e; background:#fffaf0; }
.pl-c .h { text-align:center; font:700 8.5px system-ui; color:#9a8b72; text-transform:uppercase; }
.pl-c .h b { display:block; font:600 14px/1 "Iowan Old Style", Palatino, Georgia, serif; color:#3a3226; }
.pl-c .body { position:relative; flex:1; margin-top:3px; }
.pl-c .body i { position:absolute; left:1px; right:1px; border-radius:3px; }
.pl-vbar { width:54px; flex:none; display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 0; background:rgb(58 50 38 / 0.92); }
.pl-vbar button { width:44px; height:42px; border:0; border-radius:10px; background:none; color:#f7f1e3 !important; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; font:600 8.5px system-ui !important; }
.pl-vbar button b { font-size:17px; line-height:1; }
.pl-vbar .sp { flex:1; }
/* Table: quick capture */
.pl-flat { padding:10px 14px 12px; gap:8px; }
.pl-cap { display:flex; flex-direction:column; gap:6px; flex:none; }
.pl-cap input { width:100%; border:1.5px solid #d9cdb4; border-radius:12px; background:#fffaf0; outline:0; padding:10px 12px; font:16px "Bradley Hand", "Segoe Print", "Marker Felt", cursive !important; color:#2f3d66 !important; }
.pl-cap input:focus { border-color:#b4552e; }
.pl-cap .btns { display:flex; gap:6px; }
.pl-cap .btns button { flex:1; height:42px; border:0; border-radius:12px; font:700 14px system-ui !important; background:#3a3226; color:#f7f1e3 !important; }
.pl-cap .btns button.alt { background:#efe5d0; color:#3a3226 !important; }
.pl-stand-head { display:flex; align-items:flex-end; gap:10px; padding:12px 16px 6px; flex:none; }
.pl-stand-head h1 { margin:0; font:600 24px/1 "Iowan Old Style", Palatino, Georgia, serif; flex:1; }
.pl-stand-head h1 small { display:block; font:700 10px system-ui; letter-spacing:0.14em; text-transform:uppercase; color:#b4552e; margin-bottom:3px; }
.pl-stand-head .nx { text-align:right; font:600 11px system-ui; color:#9a8b72; }
.pl-stand-head .nx b { display:block; font:600 15px "Iowan Old Style", Palatino, Georgia, serif; color:#3a3226; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  const todayKey = keyOf(new Date());
  let day = todayKey;
  let month = (() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  })();
  const events = new Map<string, Ev[]>();
  const notes = new Map<string, Notes>();
  let nextId = 1;
  let draft: Draft | null = null;
  let closedDay: string | null = null;
  let capture = "";
  const newTask = new Map<string, string>();
  const scroll = new Map<string, number>();
  let focus: { field: string; start: number; end: number } | null = null;
  let rendering = false;
  let state = initial;
  let dead = false;

  // The sample week is this week, so "today" and "next" mean something.
  const mon = monday(todayKey);
  SAMPLE.forEach((list, i) => {
    events.set(
      addDays(mon, i),
      list.map(([start, dur, title, hue]) => ({ id: nextId++, start, dur, title, hue })),
    );
  });
  notes.set(todayKey, {
    text: "Hinge spec: start with the four poses, then the reserved regions. Ask Theo about the 105° detent.",
    tasks: [
      { text: "Buy birthday card for Sam", done: false },
      { text: "Return library book", done: true },
      { text: "Book club: finish ch. 12", done: false },
    ],
  });
  notes.set(addDays(mon, 5), { text: "Market: tomatoes, eggs, feta, good bread.", tasks: [{ text: "Bring the tote bags", done: false }] });

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const rerender = () => render(state);
  const notesFor = (k: string): Notes => {
    let n = notes.get(k);
    if (!n) notes.set(k, (n = { text: "", tasks: [] }));
    return n;
  };
  const eventsFor = (k: string) => (events.get(k) ?? []).slice().sort((a, b) => a.start - b.start);

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
  function keepScroll<T extends HTMLElement>(e: T, key: string, initial?: () => number): T {
    e.addEventListener("scroll", () => scroll.set(key, e.scrollTop));
    requestAnimationFrame(() => (e.scrollTop = scroll.get(key) ?? initial?.() ?? 0));
    return e;
  }
  /** Remember which field has focus (and where the caret is) so a redraw can put it back. */
  function tracked<T extends HTMLInputElement | HTMLTextAreaElement>(e: T, field: string): T {
    e.dataset.f = field;
    const save = () => (focus = { field, start: e.selectionStart ?? 0, end: e.selectionEnd ?? 0 });
    e.addEventListener("focus", save);
    e.addEventListener("keyup", save);
    e.addEventListener("pointerup", save);
    e.addEventListener("input", save);
    e.addEventListener("blur", () => {
      if (!rendering && focus?.field === field) focus = null;
    });
    return e;
  }

  // --- actions ---
  function goDay(k: string): void {
    day = k;
    const d = fromKey(k);
    month = { y: d.getFullYear(), m: d.getMonth() };
    draft = null;
    rerender();
  }
  function openDraft(hour: number, ev?: Ev): void {
    draft = ev ? { key: day, hour: ev.start, text: ev.title, id: ev.id } : { key: day, hour, text: "" };
    focus = { field: "draft", start: draft.text.length, end: draft.text.length };
    rerender();
  }
  function saveDraft(): void {
    if (!draft) return;
    const text = draft.text.trim();
    const list = events.get(draft.key) ?? [];
    if (draft.id) {
      const ev = list.find((e) => e.id === draft!.id);
      if (ev && text) ev.title = text;
    } else if (text) {
      list.push({ id: nextId++, start: draft.hour, dur: 1, title: text, hue: [210, 140, 30, 265, 330][nextId % 5]! });
      events.set(draft.key, list);
    }
    draft = null;
    focus = null;
    rerender();
  }
  function deleteDraft(): void {
    if (!draft?.id) return;
    const list = events.get(draft.key) ?? [];
    events.set(draft.key, list.filter((e) => e.id !== draft!.id));
    draft = null;
    focus = null;
    rerender();
  }
  function nextEvent(): { key: string; ev: Ev } | null {
    const now = new Date();
    const nowH = now.getHours() + now.getMinutes() / 60;
    for (let i = 0; i < 14; i++) {
      const k = addDays(todayKey, i);
      const ev = eventsFor(k).find((e) => i > 0 || e.start >= nowH);
      if (ev) return { key: k, ev };
    }
    return null;
  }
  function inWords(key: string, ev: Ev): string {
    const d = fromKey(key);
    d.setHours(Math.floor(ev.start), Math.round((ev.start % 1) * 60));
    const mins = Math.round((d.getTime() - Date.now()) / 60000);
    if (mins < 60) return `in ${Math.max(0, mins)} min`;
    if (key === todayKey) return `in ${Math.floor(mins / 60)}h ${pad(mins % 60)}m`;
    if (key === addDays(todayKey, 1)) return "tomorrow";
    return DAY_NAMES[weekday(d)]!;
  }
  function dayTitle(k: string): { kicker: string; title: string } {
    const d = fromKey(k);
    const rel = k === todayKey ? "Today" : k === addDays(todayKey, 1) ? "Tomorrow" : k === addDays(todayKey, -1) ? "Yesterday" : DAY_NAMES[weekday(d)]!;
    return { kicker: rel === DAY_NAMES[weekday(d)] ? `Week of ${fromKey(monday(k)).getDate()} ${MONTHS[fromKey(monday(k)).getMonth()]!.slice(0, 3)}` : rel, title: `${DAY_NAMES[weekday(d)]} ${d.getDate()} ${MONTHS[d.getMonth()]}` };
  }

  // --- pieces ---
  /** The hour timeline. Interactive on a page you hold; read-only when it is standing up to be watched. */
  function timeline(H: number, interactive: boolean, key: string): HTMLElement {
    const sc = keepScroll(el("div", "pl-scroll"), `tl:${key}`, () => {
      const now = new Date();
      const h = day === todayKey ? Math.max(FIRST, now.getHours() - 1) : 8;
      return (h - FIRST) * H;
    });
    const tl = el("div", "pl-tl");
    tl.style.height = `${(LAST - FIRST) * H + 10}px`;
    tl.style.marginTop = "8px";
    for (let h = FIRST; h <= LAST; h++) {
      const row = el("div", `pl-hr ${interactive ? "" : "ro"}`, `<span>${hourLabel(h)}</span>`);
      row.style.height = `${h === LAST ? 10 : H}px`;
      if (interactive && h < LAST) {
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", `Add an event at ${hourLabel(h)}`);
        row.onclick = () => !swiped && openDraft(h);
      }
      tl.append(row);
    }
    for (const ev of eventsFor(day)) {
      const short = ev.dur * H < 34;
      const b = el(interactive ? "button" : "div", `pl-ev ${short ? "short" : ""}`, `<span>${esc(ev.title)}</span><small>${hhmm(ev.start)}–${hhmm(ev.start + ev.dur)}</small>`);
      b.style.top = `${(ev.start - FIRST) * H + 1}px`;
      b.style.height = `${ev.dur * H - 2}px`;
      b.style.background = `hsl(${ev.hue} 60% 86%)`;
      b.style.borderLeft = `3px solid hsl(${ev.hue} 45% 52%)`;
      if (interactive) (b as HTMLButtonElement).onclick = () => !swiped && openDraft(ev.start, ev);
      tl.append(b);
    }
    if (day === todayKey) {
      const n = new Date();
      const h = n.getHours() + n.getMinutes() / 60;
      if (h >= FIRST && h <= LAST) {
        const line = el("i", "pl-now");
        line.style.top = `${(h - FIRST) * H}px`;
        tl.append(line);
      }
    }
    if (interactive && draft && draft.key === day) tl.append(editor(H));
    if (interactive) swipeable(sc);
    sc.append(tl);
    return sc;
  }

  function editor(H: number): HTMLElement {
    const d = draft!;
    const box = el("div", "pl-ed pl-sans");
    box.style.top = `${(d.hour - FIRST) * H - 2}px`;
    box.append(el("span", "t", hhmm(d.hour)));
    const input = tracked(el("input"), "draft");
    input.value = d.text;
    input.placeholder = "New event";
    input.setAttribute("aria-label", `Event at ${hhmm(d.hour)}`);
    input.oninput = () => (d.text = input.value);
    input.onkeydown = (e) => {
      if (e.key === "Enter") saveDraft();
      if (e.key === "Escape") ((draft = null), (focus = null), rerender());
    };
    box.append(input);
    if (d.id) box.append(btn("", "Delete", deleteDraft));
    box.append(btn("", "✕", () => ((draft = null), (focus = null), rerender()), "Cancel"), btn("ok", "Save", saveDraft));
    return box;
  }

  let swiped = false;
  function swipeable(e: HTMLElement): void {
    let x0 = 0;
    let y0 = 0;
    let down = false;
    e.addEventListener("pointerdown", (ev) => {
      down = true;
      swiped = false;
      x0 = ev.clientX;
      y0 = ev.clientY;
    });
    e.addEventListener("pointerup", (ev) => {
      if (!down) return;
      down = false;
      const dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swiped = true;
        setTimeout(() => (swiped = false), 0);
        goDay(addDays(day, dx < 0 ? 1 : -1));
      }
    });
  }

  function dayHeader(withMonthJump: boolean): HTMLElement {
    const t = dayTitle(day);
    const top = el("div", "pl-top");
    top.append(
      btn("pl-arrow", "‹", () => goDay(addDays(day, -1)), "Previous day"),
      el("div", "pl-date", `<small>${t.kicker}</small><h1>${t.title}</h1>`),
    );
    if (withMonthJump && day !== todayKey) top.append(btn("pl-chip", "Today", () => goDay(todayKey)));
    top.append(btn("pl-arrow", "›", () => goDay(addDays(day, 1)), "Next day"));
    return top;
  }

  function miniMonth(): HTMLElement {
    const box = el("div", "pl-month pl-sans");
    const head = el("div", "pl-mh");
    head.append(
      el("b", "", `${MONTHS[month.m]} ${month.y}`),
      btn("", "‹", () => ((month = month.m === 0 ? { y: month.y - 1, m: 11 } : { y: month.y, m: month.m - 1 }), rerender()), "Previous month"),
      btn("", "›", () => ((month = month.m === 11 ? { y: month.y + 1, m: 0 } : { y: month.y, m: month.m + 1 }), rerender()), "Next month"),
    );
    const grid = el("div", "pl-grid");
    for (const d of "MTWTFSS") grid.append(el("i", "", d));
    const first = new Date(month.y, month.m, 1);
    let k = addDays(keyOf(first), -weekday(first));
    for (let i = 0; i < 42; i++) {
      const d = fromKey(k);
      if (i === 35 && d.getMonth() !== month.m) break;
      const has = (events.get(k)?.length ?? 0) > 0;
      const kk = k;
      const b = btn(`${d.getMonth() !== month.m ? "out" : ""} ${k === todayKey ? "today" : ""} ${k === day ? "sel" : ""} ${has ? "has" : ""}`, String(d.getDate()), () => goDay(kk));
      grid.append(b);
      k = addDays(k, 1);
    }
    box.append(head, grid);
    return box;
  }

  function notesText(): HTMLTextAreaElement {
    const n = notesFor(day);
    const ta = tracked(el("textarea", "pl-text"), `notes:${day}`);
    ta.value = n.text;
    ta.placeholder = "Notes for the day…";
    ta.setAttribute("aria-label", "Notes");
    ta.oninput = () => (n.text = ta.value);
    keepScroll(ta, `nt:${day}`);
    return ta;
  }

  function taskList(): HTMLElement {
    const n = notesFor(day);
    const box = keepScroll(el("div", "pl-tasks"), `tk:${day}`);
    n.tasks.forEach((t) => {
      const row = btn(`pl-task ${t.done ? "done" : ""}`, `<span class="bx">${t.done ? "✓" : ""}</span><span>${esc(t.text)}</span>`, () => ((t.done = !t.done), rerender()));
      row.setAttribute("role", "checkbox");
      row.setAttribute("aria-checked", String(t.done));
      box.append(row);
    });
    const add = el("div", "pl-add");
    const input = tracked(el("input"), `task:${day}`);
    input.placeholder = "Add a to-do";
    input.value = newTask.get(day) ?? "";
    input.oninput = () => newTask.set(day, input.value);
    input.onkeydown = (e) => {
      if (e.key !== "Enter" || !input.value.trim()) return;
      n.tasks.push({ text: input.value.trim(), done: false });
      newTask.set(day, "");
      focus = { field: `task:${day}`, start: 0, end: 0 };
      scroll.set(`tk:${day}`, 1e6);
      rerender();
    };
    add.append(el("i"), input);
    box.append(add);
    return box;
  }

  function notesPage(wide: boolean, folded: boolean, edge: "left" | "top"): HTMLElement {
    const page = el("div", `pl pl-notes ${wide ? "wide" : ""}`);
    if (folded) page.style[edge === "left" ? "paddingLeft" : "paddingTop"] = "22px";
    page.append(el("i", "pl-ribbon"));
    const writing = el("div", "pl-col");
    writing.style.flex = "1";
    writing.append(el("div", "pl-label", "Notes"), notesText(), el("div", "pl-label", "To do"), taskList());
    if (wide) {
      const side = el("div", "pl-col");
      side.style.width = "136px";
      side.style.flex = "none";
      side.append(miniMonth());
      page.append(side, writing);
    } else {
      writing.style.minHeight = "0";
      page.append(miniMonth(), writing);
    }
    return page;
  }

  function dayPage(folded: boolean, edge: "right" | "bottom"): HTMLElement {
    const page = el("div", "pl");
    if (folded) page.style[edge === "right" ? "paddingRight" : "paddingBottom"] = "16px";
    page.append(dayHeader(true), timeline(36, true, "page"));
    return page;
  }

  function nextBanner(): HTMLElement {
    const nx = nextEvent();
    const b = el("div", "pl-next");
    b.innerHTML = nx
      ? `<small>Next · ${inWords(nx.key, nx.ev)}</small><b>${esc(nx.ev.title)}</b>${nx.key === todayKey ? "Today" : DAY_NAMES[weekday(fromKey(nx.key))]} at ${hhmm(nx.ev.start)}`
      : `<small>Next</small><b>Nothing planned</b>`;
    return b;
  }

  function agenda(k: string, edgePad: boolean): HTMLElement {
    const page = el("div", "pl pl-agenda");
    if (edgePad) page.style.paddingRight = "8px";
    const t = dayTitle(k);
    page.append(btn("pl-back pl-sans", "‹ Week", () => ((closedDay = null), rerender())));
    page.append(el("div", "pl-date", `<small>${t.kicker}</small><h1>${t.title}</h1>`));
    const sc = keepScroll(el("div", "pl-scroll"), `ag:${k}`);
    const list = eventsFor(k);
    if (!list.length) sc.append(el("div", "pl-empty", "Nothing planned. Open the planner to add something."));
    for (const ev of list) {
      sc.append(el("div", "pl-item", `<span class="t">${hhmm(ev.start)}</span><i class="c" style="background:hsl(${ev.hue} 45% 52%)"></i><div><b>${esc(ev.title)}</b><small>until ${hhmm(ev.start + ev.dur)}</small></div>`));
    }
    const n = notes.get(k);
    if (n && (n.text || n.tasks.length)) {
      const open = n.tasks.filter((x) => !x.done).length;
      sc.append(el("div", "pl-item", `<span class="t">✎</span><i></i><div><b>Notes</b><small>${n.tasks.length ? `${open} of ${n.tasks.length} to-dos open · ` : ""}${esc(n.text.slice(0, 60))}${n.text.length > 60 ? "…" : ""}</small></div>`));
    }
    page.append(sc);
    return page;
  }

  function weekRows(): HTMLElement {
    const page = el("div", "pl pl-week");
    const ws = monday(day);
    const d0 = fromKey(ws);
    page.append(el("div", "pl-date", `<small>Week of ${d0.getDate()} ${MONTHS[d0.getMonth()]}</small>`), nextBanner());
    const rows = el("div", "pl-rows pl-sans");
    for (let i = 0; i < 7; i++) {
      const k = addDays(ws, i);
      const d = fromKey(k);
      const list = eventsFor(k);
      const row = btn(`pl-row ${k === todayKey ? "today" : ""} ${k === day ? "sel" : ""}`, `<span class="d">${DAY_NAMES[i]!.slice(0, 3)}<b>${d.getDate()}</b></span><span class="bar"></span><span class="n">${list.length || ""}</span>`, () => ((closedDay = k), (day = k), rerender()));
      row.setAttribute("aria-label", `${DAY_NAMES[i]} ${d.getDate()}, ${list.length} events`);
      const bar = row.querySelector(".bar")!;
      for (const ev of list) {
        const dot = el("i");
        dot.style.left = `${((ev.start - FIRST) / (LAST - FIRST)) * 100}%`;
        dot.style.background = `hsl(${ev.hue} 50% 52%)`;
        bar.append(dot);
      }
      rows.append(row);
    }
    page.append(rows);
    return page;
  }

  function weekColumns(): HTMLElement {
    const root = el("div", "pl pl-land");
    const main = el("div", "main");
    if (closedDay) {
      const ag = agenda(closedDay, false);
      ag.style.position = "relative";
      ag.style.padding = "0";
      ag.style.background = "none";
      main.append(ag);
    } else {
      const ws = monday(day);
      main.append(nextBanner());
      const cols = el("div", "pl-cols pl-sans");
      for (let i = 0; i < 7; i++) {
        const k = addDays(ws, i);
        const c = btn(`pl-c ${k === todayKey ? "today" : ""}`, `<span class="h">${DAY_NAMES[i]!.slice(0, 3)}<b>${fromKey(k).getDate()}</b></span><span class="body"></span>`, () => ((closedDay = k), (day = k), rerender()));
        const body = c.querySelector(".body")!;
        for (const ev of eventsFor(k)) {
          const b = el("i");
          b.style.top = `${((ev.start - FIRST) / (LAST - FIRST)) * 100}%`;
          b.style.height = `${Math.max(4, (ev.dur / (LAST - FIRST)) * 100)}%`;
          b.style.background = `hsl(${ev.hue} 50% 62%)`;
          b.title = ev.title;
          body.append(b);
        }
        cols.append(c);
      }
      main.append(cols);
    }
    // The outer display's bar runs down the trailing edge (HIG checklist §3).
    const bar = el("div", "pl-vbar pl-sans");
    const step = closedDay ? 1 : 7;
    const move = (n: number) => {
      day = addDays(day, n);
      if (closedDay) closedDay = day;
      rerender();
    };
    if (closedDay) bar.append(btn("", "<b>‹</b>Week", () => ((closedDay = null), rerender()), "Back to the week"));
    bar.append(
      btn("", "<b>↑</b>Earlier", () => move(-step), closedDay ? "Previous day" : "Previous week"),
      btn("", "<b>●</b>Today", () => ((day = todayKey), closedDay && (closedDay = todayKey), rerender())),
      el("i", "sp"),
      btn("", "<b>↓</b>Later", () => move(step), closedDay ? "Next day" : "Next week"),
    );
    root.append(main, bar);
    return root;
  }

  /** Table pose, standing half: today's timeline, large, to glance at. */
  function standingDay(folded: boolean): HTMLElement {
    const page = el("div", "pl");
    if (folded) page.style.paddingBottom = "14px";
    const t = dayTitle(day);
    const nx = nextEvent();
    const head = el("div", "pl-stand-head");
    head.append(el("h1", "", `<small>${t.kicker}</small>${t.title}`));
    if (nx && day === todayKey) head.append(el("div", "nx", `Next · ${inWords(nx.key, nx.ev)}<b>${esc(nx.ev.title)}</b>`));
    page.append(head, timeline(40, false, "stand"));
    return page;
  }

  /** Table pose, flat half: quick capture with big targets, and the day's to-dos. */
  function captureHalf(folded: boolean): HTMLElement {
    const page = el("div", "pl pl-flat");
    if (folded) page.style.paddingTop = "20px";
    const nav = el("div", "pl-top");
    nav.style.padding = "0";
    const t = dayTitle(day);
    nav.append(btn("pl-arrow", "‹", () => goDay(addDays(day, -1)), "Previous day"), el("div", "pl-date pl-sans", `<small>Quick capture · ${t.kicker === "Today" ? "today" : t.title}</small>`));
    if (day !== todayKey) nav.append(btn("pl-chip", "Today", () => goDay(todayKey)));
    nav.append(btn("pl-arrow", "›", () => goDay(addDays(day, 1)), "Next day"));
    const cap = el("div", "pl-cap");
    const input = tracked(el("input"), "capture");
    input.placeholder = "Jot something down…";
    input.value = capture;
    input.oninput = () => (capture = input.value);
    const add = (kind: "note" | "task") => {
      const text = capture.trim();
      if (!text) return;
      const n = notesFor(day);
      if (kind === "task") n.tasks.push({ text, done: false });
      else n.text = n.text ? `${n.text.replace(/\s+$/, "")}\n${text}` : text;
      capture = "";
      focus = { field: "capture", start: 0, end: 0 };
      rerender();
    };
    input.onkeydown = (e) => e.key === "Enter" && add("task");
    const btns = el("div", "btns");
    btns.append(btn("", "+ Task", () => add("task")), btn("alt", "+ Note", () => add("note")));
    cap.append(input, btns);
    const list = el("div", "pl-col");
    list.style.flex = "1";
    list.append(el("div", "pl-label", "To do"), taskList());
    (list.lastElementChild as HTMLElement).style.maxHeight = "none";
    (list.lastElementChild as HTMLElement).style.flex = "1";
    page.append(nav, cap, list);
    return page;
  }

  function render(s: DuoState): void {
    if (dead) return;
    state = s;
    rendering = true;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    rendering = false;
    const folded = s.hinge < 180;
    if (pose.display === "outer") {
      if (pose.size.height === "compact") screens.outer.append(weekColumns());
      else screens.outer.append(closedDay ? agenda(closedDay, false) : weekRows());
    } else {
      if (pose.id === "table") {
        screens.start.append(standingDay(folded));
        screens.end.append(captureHalf(folded));
      } else if (pose.split === "stacked") {
        screens.start.append(dayPage(folded, "bottom"));
        screens.end.append(notesPage(true, folded, "top"));
      } else {
        screens.start.append(dayPage(folded, "right"));
        screens.end.append(notesPage(false, folded, "left"));
      }
    }
    // Put the caret back where it was, if that field is still on screen.
    if (focus) {
      const f = focus;
      const e = [screens.outer, screens.start, screens.end].map((x) => x.querySelector<HTMLInputElement>(`[data-f="${window.CSS.escape(f.field)}"]`)).find(Boolean);
      if (e) {
        e.focus({ preventScroll: true });
        e.setSelectionRange(Math.min(f.start, e.value.length), Math.min(f.end, e.value.length));
      }
    }
  }

  return {
    render,
    destroy() {
      dead = true;
      style.remove();
    },
  };
}

export const plannerExample: Example = {
  id: "planner",
  title: "Planner",
  category: "productivity",
  summary:
    "A paper day-planner — cream pages, a dot grid, a ribbon. Opened like a book, the day's hour-by-hour timeline sits on the left page and your notes and to-dos on the right. Closed, it is the week at a glance, with your next event called out.",
  bestPose: "book",
  poses: {
    closed: "The week at a glance: seven rows with each event as a dot on the day's timeline and the next event called out above. Tap a day for its agenda.",
    "closed-landscape": "The week as seven columns with events drawn as blocks on each day's time axis, and Back, Earlier, Today and Later in a bar down the trailing edge.",
    open: "The two-page spread: the day's 7 am–9 pm timeline on the left (tap an empty hour to add an event, swipe to turn the day) and notes, to-dos and a mini month on the right.",
    "open-portrait": "The day's timeline on top and the notes page below, with the mini month in a column beside your notes.",
    book: "The planner itself: day on the left page and notes on the right, with the ribbon marking your page and a margin each side of the fold.",
    table: "Today's timeline stands up with a 'now' line and your next event, and the flat half is for quick capture — jot a note or a to-do, and tick off tasks.",
    stand: "Stood on the desk like a desk diary: the same spread, readable at a glance while you work.",
  },
  principle:
    "More space shows another level rather than a stretched phone app: closed it is the week, open it expands to a day and its notes side by side, and the same planner, data and half-typed text carry through every pose (HIG checklist §5, 'Inner display', and the Continuity checks).",
  create,
};
