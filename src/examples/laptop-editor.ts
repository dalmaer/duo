/**
 * Laptop Editor — the Duo as a tiny laptop, and where a keyboard belongs.
 *
 * Fold it into table pose and it is a laptop: the document stands on the top
 * half and a full keyboard — number row, shift, backspace, return — lies
 * flat on the bottom. The formatting toolbar is a horizontal bar (inner
 * portrait keeps bars horizontal) at the very top of the document half, the
 * edge away from the fold.
 *
 * Opened like a book, the fold runs top to bottom: the document list is the
 * leading pane, the editor the trailing one, and the keyboard covers the
 * bottom of the editor's half only — it belongs to the pane being edited, so
 * the list stays fully visible. Only that trailing pane gets the vertical bar
 * (HIG: "only the detail column" on the display edge). Closed, it is the phone
 * editor with a compact keyboard, and in landscape the formatting moves to a
 * bar down the trailing edge with the rest in the one overflow menu.
 *
 * Text and caret position live here, not in the textarea, so every fold puts
 * the caret back where it was. A physical keyboard works whenever the
 * document has focus.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

type Doc = { id: number; text: string; sel: [number, number]; scroll: number };
type Item = { id: string; title: string; icon: string; prio: number; on?: boolean; run: () => void };
type Key = { lo: string; up?: string; act?: "shift" | "back" | "enter" | "space" | "sym" | "hide"; w?: number; cls?: string };

const SEED = [
  "# Notes on the hinge\n\nThe fold is a **division**, not an edge. Treat it like the gutter of a book: text can run across it, but nothing you _tap_ should sit in it.\n\n- Watch on top\n- Touch on the bottom\n- [ ] Try it on the train\n\n> Layout follows the pose; the hinge is for effects.",
  "# Saturday list\n\n- [x] Farmers' market\n- [ ] Fix bike brakes\n- [ ] Call Mum about Sunday\n\nRemember the tote bags.",
  "# Dear Ada\n\nThank you for the plum jam. It did not survive the week, which I think is the highest compliment a jar can receive.\n\nThe garden is mostly courgettes now. Send help, or recipes.",
];

const ICON: Record<string, string> = {
  back: `<path d="M15 5l-7 7 7 7"/>`,
  docs: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>`,
  compose: `<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M18.5 3.5a2 2 0 0 1 3 3L13 15l-4 1 1-4z"/>`,
  heading: `<path d="M6 5v14M18 5v14M6 12h12"/>`,
  bold: `<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" stroke-width="2.4"/>`,
  italic: `<path d="M10 5h8M6 19h8M14 5l-4 14"/>`,
  list: `<circle cx="5" cy="7" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="17" r="1.2" fill="currentColor"/><path d="M9 7h11M9 12h11M9 17h11"/>`,
  check: `<rect x="3" y="4" width="7" height="7" rx="1.5"/><path d="M4.5 7.5l1.5 1.5 3-3M13 7.5h8M3 14h7v7H3zM13 17.5h8"/>`,
  quote: `<path d="M6 10c0-3 2-5 4-5M6 10v4h4v-4H6zM14 10c0-3 2-5 4-5M14 10v4h4v-4h-4z"/>`,
  eye: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`,
  done: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
  more: `<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>`,
  kbdown: `<rect x="3" y="4" width="18" height="11" rx="2"/><path d="M7 8h1M11 8h1M15 8h1M8 11.5h8M9 19l3 2 3-2"/>`,
  shift: `<path d="M12 4l8 8h-4.5v7h-7v-7H4z"/>`,
  shiftlock: `<path d="M12 4l8 8h-4.5v4h-7v-4H4z"/><path d="M8.5 20h7"/>`,
  bksp: `<path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>`,
  enter: `<path d="M19 6v5a3 3 0 0 1-3 3H6"/><path d="M9 10l-4 4 4 4"/>`,
};
const icon = (k: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const words = (t: string) => t.replace(/[#>*_`[\]-]/g, " ").split(/\s+/).filter(Boolean).length;
const titleOf = (t: string) => t.split("\n").find((l) => l.trim())?.replace(/^#+\s*/, "").trim() || "Untitled";
const snippet = (t: string) => t.split("\n").slice(1).join(" ").replace(/[#>*_`]|\[[ x]\]/g, "").replace(/\s+/g, " ").trim().slice(0, 70);

/** A small Markdown subset, for Preview. */
function markdown(src: string): string {
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^\w])_(.+?)_(?=[^\w]|$)/g, "$1<i>$2</i>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  const out: string[] = [];
  let list = false;
  for (const line of src.split("\n")) {
    const li = /^- (\[( |x)\] )?(.*)$/.exec(line);
    if (li && !list) (out.push("<ul>"), (list = true));
    if (!li && list) (out.push("</ul>"), (list = false));
    if (li) out.push(li[1] ? `<li class="task ${li[2] === "x" ? "on" : ""}"><span>${li[2] === "x" ? "✓" : ""}</span>${inline(li[3]!)}</li>` : `<li>${inline(li[3]!)}</li>`);
    else if (/^### /.test(line)) out.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (/^## /.test(line)) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (/^# /.test(line)) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (/^> /.test(line)) out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push("</ul>");
  return out.join("");
}

const NUM_ROW: [string, string][] = [["1", "!"], ["2", "@"], ["3", "#"], ["4", "$"], ["5", "%"], ["6", "^"], ["7", "&"], ["8", "*"], ["9", "("], ["0", ")"]];
const letters = (s: string): Key[] => s.split("").map((c) => ({ lo: c, up: c.toUpperCase() }));
const FULL: Key[][] = [
  NUM_ROW.map(([lo, up]) => ({ lo, up, cls: "num" })),
  letters("qwertyuiop"),
  [{ lo: "", w: 0.5, cls: "gap" }, ...letters("asdfghjkl"), { lo: "", w: 0.5, cls: "gap" }],
  [{ lo: "shift", act: "shift", w: 1.5, cls: "mod" }, ...letters("zxcvbnm"), { lo: "back", act: "back", w: 1.5, cls: "mod" }],
  [{ lo: "-", up: "_" }, { lo: ",", up: ";" }, { lo: "space", act: "space", w: 5 }, { lo: ".", up: ":" }, { lo: "?", up: "!" }, { lo: "return", act: "enter", w: 2, cls: "mod blue" }],
];
const COMPACT: Key[][] = [
  letters("qwertyuiop"),
  [{ lo: "", w: 0.5, cls: "gap" }, ...letters("asdfghjkl"), { lo: "", w: 0.5, cls: "gap" }],
  [{ lo: "shift", act: "shift", w: 1.4, cls: "mod" }, { lo: "", w: 0.1, cls: "gap" }, ...letters("zxcvbnm"), { lo: "", w: 0.1, cls: "gap" }, { lo: "back", act: "back", w: 1.4, cls: "mod" }],
  [{ lo: "123", act: "sym", w: 1.4, cls: "mod" }, { lo: "hide", act: "hide", w: 1.2, cls: "mod" }, { lo: "space", act: "space", w: 4.6 }, { lo: "return", act: "enter", w: 2.2, cls: "mod blue" }],
];
const SYMBOLS: Key[][] = [
  "1234567890".split("").map((c) => ({ lo: c })),
  "-/:;()$&@\"".split("").map((c) => ({ lo: c })),
  [{ lo: "#", w: 1.4, cls: "mod" }, { lo: "", w: 0.1, cls: "gap" }, ..."*.,?!'_".split("").map((c) => ({ lo: c })), { lo: "", w: 0.1, cls: "gap" }, { lo: "back", act: "back", w: 1.4, cls: "mod" }],
  [{ lo: "ABC", act: "sym", w: 1.4, cls: "mod" }, { lo: "hide", act: "hide", w: 1.2, cls: "mod" }, { lo: "space", act: "space", w: 4.6 }, { lo: "return", act: "enter", w: 2.2, cls: "mod blue" }],
];

const CSS = `
.lk { position:absolute; inset:0; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden; background:#fdfcf9; color:#1d1d1f; font:14px/1.45 -apple-system, system-ui, sans-serif; }
.lk * { box-sizing:border-box; }
.lk button { font:inherit; color:inherit; cursor:pointer; }
.lk.lk-row, .lk-main.lk-row { flex-direction:row; }
.lk-main { position:relative; flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; }
.lk-ta { flex:1; min-height:0; width:100%; resize:none; border:0; outline:0; background:none; padding:12px 16px 16px; color:#1d1d1f; caret-color:#0a7cff;
  font:15px/1.55 "Iowan Old Style", Palatino, Georgia, serif; scrollbar-width:none; }
.lk-ta::-webkit-scrollbar { display:none; }
.lk-pv { flex:1; min-height:0; overflow-y:auto; padding:10px 16px 16px; font:15px/1.5 "Iowan Old Style", Palatino, Georgia, serif; scrollbar-width:none; }
.lk-pv h1 { font:700 21px/1.2 -apple-system, system-ui; margin:4px 0 10px; letter-spacing:-0.01em; }
.lk-pv h2 { font:700 17px/1.2 -apple-system, system-ui; margin:12px 0 6px; }
.lk-pv h3 { font:700 15px/1.2 -apple-system, system-ui; margin:10px 0 4px; }
.lk-pv p { margin:0 0 10px; }
.lk-pv ul { margin:0 0 10px; padding-left:20px; }
.lk-pv li.task { list-style:none; margin-left:-20px; display:flex; gap:8px; align-items:baseline; }
.lk-pv li.task span { width:15px; height:15px; border:1.5px solid #8e8e93; border-radius:4px; display:inline-grid; place-items:center; font:800 10px system-ui; flex:none; transform:translateY(2px); }
.lk-pv li.task.on span { background:#0a7cff; border-color:#0a7cff; color:#fff; }
.lk-pv li.task.on { color:#8e8e93; text-decoration:line-through; }
.lk-pv blockquote { margin:0 0 10px; padding:2px 0 2px 12px; border-left:3px solid #d1d1d6; color:#6e6e73; font-style:italic; }
.lk-pv code { font:13px ui-monospace, monospace; background:#f2f2f7; padding:1px 4px; border-radius:4px; }
.lk-status { flex:none; display:flex; gap:8px; padding:4px 16px 6px; font:500 11px system-ui; color:#8e8e93; }
.lk-status .sp { flex:1; }
/* Horizontal toolbar (inner portrait) */
.lk-hbar { flex:none; display:flex; align-items:center; gap:1px; padding:6px 6px; background:rgb(242 242 247 / 0.94); border-bottom:0.5px solid #d1d1d6; }
.lk-hbar .sp { flex:1; }
.lk-hbar .lk-it { width:34px; }
.lk-it { width:36px; height:34px; border:0; border-radius:9px; background:none; color:#0a7cff !important; display:grid; place-items:center; padding:0; flex:none; }
.lk-it svg { width:20px; height:20px; }
.lk-it.on { background:#0a7cff; color:#fff !important; }
.lk-it:active { background:#e5e5ea; }
.lk-doc { display:flex; align-items:center; gap:6px; border:0; background:#fff; border-radius:9px; padding:5px 9px; max-width:96px; font:600 12px system-ui !important; color:#1d1d1f; box-shadow:0 0 0 0.5px #d1d1d6; flex:none; }
.lk-doc svg { width:16px; height:16px; color:#0a7cff; flex:none; }
.lk-doc span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* Vertical bar (outer display, and the trailing pane of the inner landscape) */
.lk-vbar { width:50px; flex:none; display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 0 10px; background:rgb(242 242 247 / 0.94); border-left:0.5px solid #d1d1d6; }
.lk-vbar .sp { flex:1; }
.lk-vbar .lk-it { height:32px; }
.lk-island { width:22px; height:44px; border-radius:11px; background:#000; flex:none; margin-bottom:2px; }
.lk-time { font:600 10px system-ui; margin-bottom:4px; flex:none; }
.lk-vbar.short .lk-island { height:32px; }
.lk-vbar.short .lk-it { height:30px; }
.lk-scrim { position:absolute; inset:0; z-index:8; }
.lk-menu { position:absolute; z-index:9; min-width:170px; border-radius:12px; background:rgb(250 250 252 / 0.98); box-shadow:0 10px 30px rgb(0 0 0 / 0.25), 0 0 0 0.5px #c7c7cc; overflow:hidden; }
.lk-menu button { display:flex; width:100%; align-items:center; justify-content:space-between; gap:12px; border:0; background:none; font:14px system-ui !important; padding:9px 12px; text-align:left; }
.lk-menu button + button { border-top:0.5px solid #e5e5ea; }
.lk-menu button.cur { font-weight:600 !important; color:#0a7cff !important; }
.lk-menu svg { width:18px; height:18px; color:#0a7cff; flex:none; }
/* Document list */
.lk-list { background:#f2f2f7; }
.lk-lhead { display:flex; align-items:center; gap:4px; padding:8px 10px 2px 14px; flex:none; }
.lk-lhead h1 { flex:1; margin:0; font:700 22px/1.1 -apple-system, system-ui; letter-spacing:-0.01em; }
.lk-scroll { flex:1; min-height:0; overflow-y:auto; scrollbar-width:none; padding:6px 10px 10px; }
.lk-scroll::-webkit-scrollbar { display:none; }
.lk-item { display:block; width:100%; border:0; text-align:left; background:#fff; border-radius:12px; padding:9px 12px; margin-bottom:6px; }
.lk-item b { display:block; font:600 14px/1.25 system-ui; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lk-item span { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font:12.5px/1.35 system-ui; color:#6e6e73; margin-top:2px; }
.lk-item small { display:block; font:500 11px system-ui; color:#8e8e93; margin-top:3px; }
.lk-item.sel { background:#0a7cff; color:#fff !important; }
.lk-item.sel span, .lk-item.sel small { color:#dbe9ff; }
/* Keyboards */
.lk-kb { flex:none; display:flex; flex-direction:column; gap:6px; padding:6px 4px 6px; background:#d1d3d9; touch-action:none; user-select:none; -webkit-user-select:none; }
.lk-kb.full { flex:1; gap:7px; padding:8px 6px 10px; }
.lk-kr { flex:1; display:flex; gap:5px; min-height:0; }
.lk-k { position:relative; flex:1 1 0; min-width:0; border:0; border-radius:6px; background:#fff; box-shadow:0 1px 0 #8a8a8e; display:grid; place-items:center; padding:0; font:400 17px/1 system-ui !important; color:#000 !important; }
.lk-kb.full .lk-k { font-size:20px !important; border-radius:8px; }
.lk-k.num { font-size:17px !important; }
.lk-k.mod { background:#adb1b9; font-size:13px !important; }
.lk-k.blue { background:#0a7cff; color:#fff !important; }
.lk-k.gap { visibility:hidden; }
.lk-k svg { width:20px; height:20px; }
.lk-k.lock { background:#fff; }
.lk-k.dn { background:#e5e5ea; }
.lk-k.mod.dn { background:#fff; }
.lk-k.letter.dn::after { content:attr(data-show); position:absolute; left:50%; bottom:100%; transform:translateX(-50%); width:130%; min-width:34px; padding:6px 0 8px; border-radius:9px 9px 6px 6px; background:#fff; box-shadow:0 2px 6px rgb(0 0 0 / 0.3); font:400 26px/1 system-ui; color:#000; text-align:center; pointer-events:none; z-index:5; }
.lk-kb .cap { font:600 9.5px system-ui; color:#6e6e73; text-align:center; letter-spacing:0.04em; margin-bottom:-2px; }
.lk-kb.compact .lk-kr { flex:none; height:36px; }
.lk-kb.compact.short .lk-kr { height:29px; }
.lk-kb.compact.short { gap:5px; padding:4px 3px 5px; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let nextId = 1;
  const docs: Doc[] = SEED.map((text) => ({ id: nextId++, text, sel: [text.length, text.length], scroll: 0 }));
  let cur = 0;
  let shift: "off" | "once" | "lock" = "off";
  let lastShift = 0;
  let symbols = false;
  /** Closed and book poses: whether the keyboard is up. Table always has one. */
  let editing = false;
  let closedView: "list" | "editor" = "editor";
  let preview = false;
  let menu: "docs" | "more" | null = null;
  let listScroll = 0;
  let state = initial;
  let dead = false;
  let repeatT = 0;
  let repeatI = 0;
  /** The live textarea for the current render, if there is one. */
  let ta: HTMLTextAreaElement | null = null;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const doc = () => docs[cur]!;
  const rerender = () => render(state);

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  // --- editing ---
  function sync(): void {
    if (!ta) return;
    const d = doc();
    d.text = ta.value;
    d.sel = [ta.selectionStart, ta.selectionEnd];
    d.scroll = ta.scrollTop;
    for (const s of [screens.outer, screens.start, screens.end]) {
      s.querySelectorAll<HTMLElement>("[data-wc]").forEach((e) => (e.textContent = `${words(d.text)} words`));
      s.querySelectorAll<HTMLElement>(`[data-doc="${d.id}"]`).forEach((e) => {
        const b = e.querySelector("b");
        const sp = e.querySelector("span");
        if (b) b.textContent = titleOf(d.text);
        if (sp) sp.textContent = snippet(d.text);
      });
    }
  }

  /** Make sure the textarea is live and editable before a key lands. */
  function target(): HTMLTextAreaElement | null {
    if (preview) {
      preview = false;
      rerender();
    }
    if (ta && document.activeElement !== ta) ta.focus({ preventScroll: true });
    return ta;
  }

  function insert(text: string): void {
    const t = target();
    if (!t) return;
    t.setRangeText(text, t.selectionStart, t.selectionEnd, "end");
    keepCaretVisible(t);
    sync();
    if (shift === "once") {
      shift = "off";
      refreshKeys();
    }
  }

  function backspace(): void {
    const t = target();
    if (!t) return;
    const s = t.selectionStart;
    const e = t.selectionEnd;
    if (s !== e) t.setRangeText("", s, e, "end");
    else if (s > 0) {
      const back = /[\uDC00-\uDFFF]/.test(t.value[s - 1] ?? "") ? 2 : 1;
      t.setRangeText("", s - back, s, "end");
    }
    keepCaretVisible(t);
    sync();
  }

  /** Return, continuing a list the way writing apps do. */
  function enter(): void {
    const t = target();
    if (!t) return;
    const s = t.selectionStart;
    const lineStart = t.value.lastIndexOf("\n", s - 1) + 1;
    const line = t.value.slice(lineStart, s);
    const m = /^(- \[[ x]\] |- |> )/.exec(line);
    if (m && line === m[1]) {
      t.setRangeText("", lineStart, s, "end");
      sync();
      return;
    }
    insert(`\n${m ? m[1]!.replace("[x]", "[ ]") : ""}`);
  }

  function keepCaretVisible(t: HTMLTextAreaElement): void {
    // A textarea scrolls to the caret only for native input; nudge it for ours.
    if (t.selectionStart >= t.value.length - 1) t.scrollTop = t.scrollHeight;
  }

  function wrap(mark: string): void {
    const t = target();
    if (!t) return;
    const s = t.selectionStart;
    const e = t.selectionEnd;
    const sel = t.value.slice(s, e);
    if (sel.startsWith(mark) && sel.endsWith(mark) && sel.length >= mark.length * 2) {
      t.setRangeText(sel.slice(mark.length, sel.length - mark.length), s, e, "select");
    } else {
      t.setRangeText(`${mark}${sel}${mark}`, s, e, "select");
      if (s === e) t.setSelectionRange(s + mark.length, s + mark.length);
      else t.setSelectionRange(s + mark.length, e + mark.length);
    }
    sync();
    rerender();
  }

  function prefix(p: string): void {
    const t = target();
    if (!t) return;
    const v = t.value;
    const s = v.lastIndexOf("\n", t.selectionStart - 1) + 1;
    let e = v.indexOf("\n", t.selectionEnd);
    if (e < 0) e = v.length;
    const lines = v.slice(s, e).split("\n");
    const strip = /^(#{1,3} |- \[[ x]\] |- |> )/;
    const all = lines.every((l) => l.startsWith(p));
    const next = lines.map((l) => (all ? l.slice(p.length) : p + l.replace(strip, ""))).join("\n");
    t.setRangeText(next, s, e, "end");
    sync();
    rerender();
  }

  /** Every formatting command, with a title and a symbol (HIG checklist §3, "Item content"). */
  function formatItems(): Item[] {
    return [
      { id: "heading", title: "Heading", icon: "heading", prio: 50, run: () => prefix("# ") },
      { id: "bold", title: "Bold", icon: "bold", prio: 90, run: () => wrap("**") },
      { id: "italic", title: "Italic", icon: "italic", prio: 80, run: () => wrap("_") },
      { id: "list", title: "Bulleted List", icon: "list", prio: 40, run: () => prefix("- ") },
      { id: "check", title: "Checklist", icon: "check", prio: 30, run: () => prefix("- [ ] ") },
      { id: "quote", title: "Quote", icon: "quote", prio: 20, run: () => prefix("> ") },
      { id: "preview", title: preview ? "Edit" : "Preview", icon: "eye", prio: 60, on: preview, run: () => ((preview = !preview), (menu = null), rerender()) },
    ];
  }

  function openDoc(i: number): void {
    if (ta) sync();
    cur = i;
    preview = false;
    menu = null;
    closedView = "editor";
    rerender();
  }

  function newDoc(): void {
    if (ta) sync();
    docs.unshift({ id: nextId++, text: "# ", sel: [2, 2], scroll: 0 });
    cur = 0;
    preview = false;
    menu = null;
    closedView = "editor";
    editing = true;
    rerender();
  }

  // --- pieces ---
  function itemButton(it: Item): HTMLButtonElement {
    const b = el("button", `lk-it ${it.on ? "on" : ""}`, icon(it.icon));
    b.type = "button";
    b.title = it.title;
    b.setAttribute("aria-label", it.title);
    // Keep the caret in the document while a toolbar item is pressed.
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.onclick = it.run;
    return b;
  }

  function popMenu(host: HTMLElement, anchor: HTMLElement, items: { label: string; icon?: string; cls?: string; run: () => void }[], side: "left" | "below"): void {
    const scrim = el("div", "lk-scrim");
    const m = el("div", "lk-menu");
    const h = host.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    const k = host.offsetWidth / (h.width || 1);
    if (side === "left") {
      m.style.right = `${(h.right - r.left) * k + 6}px`;
      m.style.top = `${Math.max(6, (r.top - h.top) * k - 6)}px`;
    } else {
      m.style.left = `${Math.max(6, (r.left - h.left) * k)}px`;
      m.style.top = `${(r.bottom - h.top) * k + 4}px`;
    }
    for (const it of items) {
      const b = el("button", it.cls ?? "", `<span>${esc(it.label)}</span>${it.icon ? icon(it.icon) : ""}`);
      b.type = "button";
      b.addEventListener("pointerdown", (e) => e.preventDefault());
      b.onclick = () => ((menu = null), it.run());
      m.append(b);
    }
    scrim.onclick = () => ((menu = null), rerender());
    host.append(scrim, m);
  }

  function docsMenu(host: HTMLElement, anchor: HTMLElement): void {
    popMenu(
      host,
      anchor,
      [
        ...docs.map((d, i) => ({ label: `${titleOf(d.text)} · ${words(d.text)}w`, cls: i === cur ? "cur" : "", run: () => openDoc(i) })),
        { label: "New Document", icon: "compose", run: newDoc },
      ],
      "below",
    );
  }

  function editorBody(): HTMLElement {
    if (preview) {
      ta = null;
      const pv = el("div", "lk-pv", markdown(doc().text));
      pv.onclick = () => ((preview = false), rerender());
      return pv;
    }
    const t = el("textarea", "lk-ta");
    t.value = doc().text;
    t.spellcheck = false;
    t.setAttribute("aria-label", "Document");
    // We always draw a keyboard of our own; don't summon the device's on top of it.
    t.setAttribute("inputmode", "none");
    t.addEventListener("input", sync);
    for (const ev of ["keyup", "pointerup", "select", "scroll"]) t.addEventListener(ev, sync);
    t.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "i")) {
        e.preventDefault();
        wrap(e.key === "b" ? "**" : "_");
      }
    });
    const startEditing = () => {
      if (editing) return;
      editing = true;
      // Let the tap place the caret first, then bring the keyboard up.
      setTimeout(() => {
        if (dead || !ta) return;
        sync();
        rerender();
      }, 0);
    };
    t.addEventListener("focus", startEditing);
    t.addEventListener("pointerup", startEditing);
    ta = t;
    return t;
  }

  function status(): HTMLElement {
    return el("div", "lk-status", `<span data-wc>${words(doc().text)} words</span><span class="sp"></span><span>${preview ? "Preview" : "Markdown"}</span>`);
  }

  /** One key. Acts on pointerdown so the caret never leaves the document. */
  function keyButton(k: Key): HTMLButtonElement {
    const b = el("button", `lk-k ${k.cls ?? ""}`);
    b.type = "button";
    b.style.flexGrow = String(k.w ?? 1);
    if (k.cls === "gap") return b;
    if (k.act === "shift") {
      b.innerHTML = icon(shift === "lock" ? "shiftlock" : "shift");
      if (shift !== "off") b.classList.add("lock");
      b.setAttribute("aria-label", "Shift");
    } else if (k.act === "back") (b.innerHTML = icon("bksp")), b.setAttribute("aria-label", "Delete");
    else if (k.act === "enter") (b.innerHTML = icon("enter")), b.setAttribute("aria-label", "Return");
    else if (k.act === "hide") (b.innerHTML = icon("kbdown")), b.setAttribute("aria-label", "Hide keyboard");
    else if (k.act === "space") b.textContent = "space";
    else if (k.act === "sym") b.textContent = k.lo;
    else {
      b.classList.add("letter");
      b.dataset.lo = k.lo;
      if (k.up) b.dataset.up = k.up;
      const show = shift !== "off" && k.up ? k.up : k.lo;
      b.textContent = show;
      b.dataset.show = show;
    }
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.classList.add("dn");
      press(k);
      if (k.act === "back") {
        repeatT = window.setTimeout(() => (repeatI = window.setInterval(backspace, 70)), 420);
      }
    });
    const up = () => {
      b.classList.remove("dn");
      clearTimeout(repeatT);
      clearInterval(repeatI);
    };
    b.addEventListener("pointerup", up);
    b.addEventListener("pointerleave", up);
    b.addEventListener("pointercancel", up);
    return b;
  }

  function press(k: Key): void {
    switch (k.act) {
      case "shift": {
        const t = Date.now();
        shift = shift === "off" ? (t - lastShift < 350 ? "lock" : "once") : shift === "once" && t - lastShift < 350 ? "lock" : "off";
        lastShift = t;
        refreshKeys();
        return;
      }
      case "back":
        return backspace();
      case "enter":
        return enter();
      case "space":
        return insert(" ");
      case "sym":
        symbols = !symbols;
        return rerender();
      case "hide":
        editing = false;
        ta?.blur();
        return rerender();
      default:
        insert(shift !== "off" && k.up ? k.up : k.lo);
    }
  }

  /** Shift changes labels in place, so a held key or the caret is never disturbed. */
  function refreshKeys(): void {
    for (const s of [screens.outer, screens.start, screens.end]) {
      s.querySelectorAll<HTMLElement>(".lk-k.letter").forEach((b) => {
        const show = shift !== "off" && b.dataset.up ? b.dataset.up : b.dataset.lo!;
        b.textContent = show;
        b.dataset.show = show;
      });
      s.querySelectorAll<HTMLElement>(".lk-k.mod").forEach((b) => {
        if (b.getAttribute("aria-label") !== "Shift") return;
        b.innerHTML = icon(shift === "lock" ? "shiftlock" : "shift");
        b.classList.toggle("lock", shift !== "off");
      });
    }
  }

  function keyboard(kind: "full" | "compact", opts: { caption?: string; short?: boolean; padTop?: number } = {}): HTMLElement {
    const kb = el("div", `lk-kb ${kind} ${opts.short ? "short" : ""}`);
    kb.setAttribute("role", "group");
    kb.setAttribute("aria-label", "Keyboard");
    if (opts.padTop) kb.style.paddingTop = `${opts.padTop}px`;
    if (opts.caption) kb.append(el("div", "cap", opts.caption));
    const rows = kind === "full" ? FULL : symbols ? SYMBOLS : COMPACT;
    for (const row of rows) {
      const r = el("div", "lk-kr");
      for (const k of row) r.append(keyButton(k));
      kb.append(r);
    }
    return kb;
  }

  function docList(withSelection: boolean): HTMLElement {
    const sc = el("div", "lk-scroll");
    docs.forEach((d, i) => {
      const b = el("button", `lk-item ${withSelection && i === cur ? "sel" : ""}`, `<b>${esc(titleOf(d.text))}</b><span>${esc(snippet(d.text))}</span><small>${words(d.text)} words</small>`);
      b.type = "button";
      b.dataset.doc = String(d.id);
      b.onclick = () => openDoc(i);
      sc.append(b);
    });
    sc.addEventListener("scroll", () => (listScroll = sc.scrollTop));
    requestAnimationFrame(() => (sc.scrollTop = listScroll));
    return sc;
  }

  /** Split items into those that fit and the ones that go in the single overflow menu, by priority. */
  function fit(items: Item[], cap: number): { shown: Item[]; over: Item[] } {
    if (items.length <= cap) return { shown: items, over: [] };
    const keep = new Set([...items].sort((a, b) => b.prio - a.prio).slice(0, cap - 1));
    return { shown: items.filter((i) => keep.has(i)), over: items.filter((i) => !keep.has(i)) };
  }

  function vbar(host: () => HTMLElement, items: Item[], cap: number, opts: { chrome: boolean; short?: boolean }): HTMLElement {
    const bar = el("div", `lk-vbar ${opts.short ? "short" : ""}`);
    if (opts.chrome) bar.append(el("i", "lk-island"), el("span", "lk-time", "9:41"));
    const { shown, over } = fit(items, cap);
    for (const it of shown) bar.append(itemButton(it));
    if (over.length) {
      const more = itemButton({ id: "more", title: "More", icon: "more", prio: 0, run: () => ((menu = "more"), rerender()) });
      bar.append(more);
      if (menu === "more") requestAnimationFrame(() => popMenu(host(), more, over.map((o) => ({ label: o.title, icon: o.icon, run: o.run })), "left"));
    }
    bar.append(el("i", "sp"));
    return bar;
  }

  // --- layouts ---
  /** Table and open portrait: a tiny laptop. */
  function laptop(folded: boolean): void {
    const top = el("div", "lk");
    const bar = el("div", "lk-hbar");
    const docBtn = el("button", "lk-doc", `${icon("docs")}<span>${esc(titleOf(doc().text))}</span>`);
    docBtn.type = "button";
    docBtn.setAttribute("aria-label", "Documents");
    docBtn.addEventListener("pointerdown", (e) => e.preventDefault());
    docBtn.onclick = () => ((menu = menu === "docs" ? null : "docs"), rerender());
    bar.append(docBtn, el("i", "sp"));
    for (const it of formatItems()) bar.append(itemButton(it));
    top.append(bar, editorBody(), status());
    if (folded) top.style.paddingBottom = "10px";
    screens.start.append(top);
    if (menu === "docs") requestAnimationFrame(() => docsMenu(top, docBtn));

    const bottom = el("div", "lk");
    bottom.style.background = "#d1d3d9";
    bottom.append(keyboard("full", { padTop: folded ? 18 : 8 }));
    screens.end.append(bottom);
    editing = true;
  }

  /** Open, book and stand: list beside the editor, keyboard under the editor only. */
  function spread(folded: boolean): void {
    const left = el("div", "lk lk-list");
    if (folded) left.style.paddingRight = "14px";
    const head = el("div", "lk-lhead");
    head.append(el("h1", "", "Documents"), itemButton({ id: "new", title: "New Document", icon: "compose", prio: 100, run: newDoc }));
    left.append(head, docList(true));
    screens.start.append(left);

    const right = el("div", "lk");
    if (folded) right.style.paddingLeft = "14px";
    const row = el("div", "lk-main lk-row");
    const main = el("div", "lk-main");
    main.append(editorBody(), status());
    const items: Item[] = [];
    if (editing) items.push({ id: "done", title: "Done", icon: "done", prio: 100, run: () => press({ lo: "", act: "hide" }) });
    items.push(...formatItems());
    row.append(main, vbar(() => right, items, editing ? 5 : 9, { chrome: false, short: editing }));
    right.append(row);
    if (editing) right.append(keyboard("compact", { caption: "Keyboard · covers only the pane you're editing" }));
    screens.end.append(right);
  }

  function closed(landscape: boolean): void {
    const root = el("div", "lk lk-row");
    const host = () => root;
    const main = el("div", "lk-main");
    let items: Item[];
    if (closedView === "list") {
      ta = null;
      main.classList.add("lk-list");
      main.append(el("div", "lk-lhead", `<h1>Documents</h1>`), docList(false));
      items = [{ id: "new", title: "New Document", icon: "compose", prio: 100, run: newDoc }];
    } else {
      main.append(editorBody());
      if (!editing || !landscape) main.append(status());
      if (editing) main.append(keyboard("compact", { short: landscape }));
      // Back first, then the prominent action (Done), then the app's groups (HIG checklist §3, "Item order").
      items = [{ id: "back", title: "Documents", icon: "back", prio: 100, run: () => (ta && sync(), (closedView = "list"), (editing = false), (menu = null), rerender()) }];
      if (editing) items.push({ id: "done", title: "Done", icon: "done", prio: 99, run: () => press({ lo: "", act: "hide" }) });
      items.push(...formatItems());
    }
    // Outer display: the bar runs down the trailing edge; landscape has less height, so more overflows.
    root.append(main, vbar(host, items, landscape ? 5 : 8, { chrome: true, short: landscape }));
    screens.outer.append(root);
  }

  function render(s: DuoState): void {
    if (dead) return;
    if (ta) sync();
    state = s;
    ta = null;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    const { pose } = s;
    const folded = s.hinge < 180;
    if (pose.display === "outer") closed(pose.size.height === "compact");
    else if (pose.split === "stacked") laptop(folded);
    else spread(folded);
    // Put the caret back exactly where it was.
    if (ta) {
      const t = ta as HTMLTextAreaElement;
      const d = doc();
      t.setSelectionRange(Math.min(d.sel[0], t.value.length), Math.min(d.sel[1], t.value.length));
      if (editing) t.focus({ preventScroll: true });
      requestAnimationFrame(() => (t.scrollTop = d.scroll));
    }
  }

  return {
    render,
    destroy() {
      dead = true;
      clearTimeout(repeatT);
      clearInterval(repeatI);
      style.remove();
    },
  };
}

export const laptopEditorExample: Example = {
  id: "laptop-editor",
  title: "Laptop Editor",
  category: "patterns",
  summary:
    "Fold the Duo into a tiny laptop: the document stands on the top half with its formatting bar along the top edge, and a full keyboard lies flat on the bottom. Opened like a book, the keyboard covers only the editor's pane, because it belongs to the pane being edited.",
  bestPose: "table",
  poses: {
    closed: "The phone editor: a document list or the document, a compact keyboard over the bottom when you are typing, and formatting in a bar down the trailing edge — Back first, then Done.",
    "closed-landscape": "A wide editor with the bar on the trailing edge; there is less height, so Back, Done, Bold and Italic stay and the rest of the formatting goes into the one overflow menu.",
    open: "Documents on the left, the editor on the right with a vertical bar on its trailing edge; when you type, the keyboard covers the bottom of the right half only.",
    "open-portrait": "The laptop layout lying flat: the document and its horizontal formatting bar on top, the full keyboard below.",
    book: "Held like a book, the same list and editor, with the keyboard under the editor alone and a margin each side of the fold.",
    table: "A tiny laptop: the document stands up with a horizontal formatting bar at its top edge, away from the fold, and a full keyboard with a number row lies flat to type on.",
    stand: "Stood on the desk as a little monitor: the list and the editor side by side, keyboard on the editor's half when you type.",
  },
  principle:
    "Bars sit at the edge away from the fold: horizontal in inner portrait, vertical on the outer display and on the trailing pane in inner landscape, and controls for a pane stay with that pane (HIG checklist §3, 'Bar audit': 'Where items go' and 'Grouping and spacing'). When the bar runs short, the least-used items go into one overflow menu ('Compression and overflow').",
  create,
};
