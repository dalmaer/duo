/**
 * List and Detail — Apple's own example of what more space should do.
 *
 * The HIG's words: "Mail shows either a list or message closed, then both side
 * by side open." Closed, this inbox is a navigation stack (list, then message,
 * with Back); open, it becomes a split view with the list on the leading pane
 * and the message beside it. The selected message, the tab, the filter and the
 * scroll positions survive every fold.
 *
 * The bars follow the HIG's placement rules to the letter:
 *   - On the outer display the bars run down the trailing edge, top to
 *     bottom: Dynamic Island, status bar, toolbar, tab bar. Back comes first
 *     in the toolbar; bottom-bar items sit at the bottom of the strip.
 *   - In outer landscape there is less height, so lower-priority items move
 *     into the one system overflow (the ellipsis), keeping Back and Reply.
 *   - Open and landscape, only the detail column — the one on the display
 *     edge — gets the vertical bar; the list's controls stay above the list.
 *   - Inner portrait (open-portrait, table) keeps horizontal bars.
 *   - "Edit" is a text button, so it stays horizontal in every pose.
 *   - Nothing interactive sits in the fold.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

type Msg = { from: string; email: string; hue: number; subject: string; time: string; body: string[] };

const INBOX: Msg[] = [
  {
    from: "Ines Marlow", email: "ines@tinyhinge.studio", hue: 18, time: "9:12", subject: "Hinge test results are in",
    body: [
      "Morning! The overnight rig finished: 200,000 open-close cycles and the hinge still stops cleanly at every angle between 30 and 175 degrees.",
      "The only thing that drifted was the detent at 105°, the table-pose one. It softened by about 4% — well inside tolerance, but I've flagged it for the next build.",
      "Full numbers attached. Coffee at 11 to go through them?",
      "— Ines",
    ],
  },
  {
    from: "Maple Street Garden Club", email: "hello@maplestreet.garden", hue: 120, time: "8:40", subject: "Seed swap this Saturday",
    body: [
      "Bring your saved seeds (labelled, please!) and take home something new. We'll have tables for tomatoes, beans, herbs and 'mystery squash'.",
      "Saturday, 10am to noon, behind the library. Tea provided; mugs appreciated.",
    ],
  },
  {
    from: "Theo Park", email: "theo.park@fastmail.example", hue: 205, time: "Yesterday", subject: "Photos from the lake",
    body: [
      "Finally went through the card. The one of the fog lifting off the water at 6am is my new favourite thing I've ever taken.",
      "Shared album is up — add yours when you get a sec. Also: same cabin next year? I'll book early this time.",
    ],
  },
  {
    from: "Northwind Air", email: "trips@northwind.example", hue: 225, time: "Yesterday", subject: "Your trip to Lisbon: check-in opens",
    body: [
      "Check-in for your flight on Friday is now open. Choose your seat and add your boarding pass to Wallet.",
      "Tip: the fold-flat trays in row 12 fit an iPhone Duo in table pose perfectly. (We checked.)",
    ],
  },
  {
    from: "Priya Raman", email: "priya@quietcraft.example", hue: 280, time: "Tue", subject: "Draft: onboarding copy",
    body: [
      "Here's a first pass at the three onboarding screens. I kept each one to a single sentence — people skim these.",
      "1. Close it to read. 2. Open it to write. 3. Fold it to watch.",
      "Too cute? Happy to make it plainer. Comments by Thursday would be great.",
    ],
  },
  {
    from: "Riverside Library", email: "holds@riverside-library.example", hue: 32, time: "Tue", subject: "Your hold is ready: The Quiet Orchard",
    body: ["Your hold is ready for pickup at the Riverside branch. We'll keep it for you until next Wednesday.", "Happy reading!"],
  },
  {
    from: "Mum", email: "mum@home.example", hue: 340, time: "Mon", subject: "Sunday dinner?",
    body: [
      "Are you coming Sunday? Dad's attempting the lemon chicken again. Last time it was 'very rustic'.",
      "Bring the new phone, your aunt wants to see the folding thing.",
    ],
  },
  {
    from: "Lumen Weekly", email: "news@lumenweekly.example", hue: 50, time: "Mon", subject: "Five small tools we love this week",
    body: [
      "A pocket e-ink reader, a sketchbook that knows when it's on a desk, a flash-card app you quiz by folding, a list-and-detail mail client done properly, and a player that puts the video up and the controls down.",
      "All five are built for two screens and one hinge. Read on for why that combination is harder — and better — than it looks.",
    ],
  },
  {
    from: "Sam Okafor", email: "sam.okafor@example.net", hue: 160, time: "Sun", subject: "Re: bike ride",
    body: ["Sounds good. Meet at the bridge at 8? I'll bring the good snacks this time, not the sad granola bars.", "Sam"],
  },
  {
    from: "Studio Ceramica", email: "kiln@studioceramica.example", hue: 12, time: "Sat", subject: "Your glaze firing is done",
    body: [
      "Your pieces came out of the kiln this morning. The celadon mug is lovely; the bowl has a small crawl on the rim, which honestly suits it.",
      "Pick up any time during open studio hours.",
    ],
  },
];

const ICON: Record<string, string> = {
  back: `<path d="M15 5l-7 7 7 7"/>`,
  flag: `<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>`,
  unread: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 8l9 6 9-6"/>`,
  archive: `<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>`,
  move: `<path d="M3 7h6l2 2h10v10H3z"/><path d="M12 13h5m-2-2 2 2-2 2"/>`,
  reply: `<path d="M10 8 5 12l5 4"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/>`,
  compose: `<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M18.5 3.5a2 2 0 0 1 3 3L13 15l-4 1 1-4z"/>`,
  filter: `<circle cx="12" cy="12" r="9"/><path d="M8 9h8M9.5 12h5M11 15h2"/>`,
  inbox: `<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 2h6l1-2h5"/>`,
  flagged: `<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>`,
  more: `<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>`,
};
const icon = (k: string, fill = false) =>
  `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const CSS = `
.ml { position:absolute; inset:0; display:flex; background:#000; color:#f2f2f7; font:13px/1.3 -apple-system, system-ui, sans-serif; }
.ml-col { flex-direction:column; }
.ml-main { position:relative; flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; }
.ml-scroll { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:none; }
.ml-scroll::-webkit-scrollbar { display:none; }
.ml-head { padding:12px 14px 6px; display:flex; align-items:flex-end; gap:8px; }
.ml-head h1 { margin:0; font:700 24px/1.1 -apple-system, system-ui; letter-spacing:-0.01em; flex:1; }
.ml-head small { display:block; font:500 11px system-ui; color:#8e8e93; margin-top:2px; }
.ml-text { border:0; background:none; color:#0a84ff; font:500 14px system-ui; padding:4px 2px; cursor:pointer; }
.ml-row { position:relative; display:grid; grid-template-columns:14px 1fr auto; column-gap:4px; padding:9px 12px 9px 6px; cursor:pointer; }
.ml-row::after { content:""; position:absolute; left:20px; right:0; bottom:0; height:0.5px; background:#38383a; }
.ml-row .dot { width:8px; height:8px; border-radius:50%; background:#0a84ff; margin:5px 0 0 3px; visibility:hidden; }
.ml-row.unread .dot { visibility:visible; }
.ml-row .from { font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ml-row .time { font-size:12px; color:#8e8e93; display:flex; align-items:center; gap:4px; }
.ml-row .time svg { width:12px; height:12px; color:#ff9f0a; }
.ml-row .subj { grid-column:2 / 4; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ml-row .prev { grid-column:2 / 4; font-size:12.5px; color:#8e8e93; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.ml-row.sel { background:#0a84ff; border-radius:10px; margin:0 6px; padding-left:0; }
.ml-row.sel::after { display:none; }
.ml-row.sel .time, .ml-row.sel .prev, .ml-row.sel .dot { color:#dbe9ff; }
.ml-row.sel .dot { background:#fff; }
.ml-empty { padding:40px 20px; text-align:center; color:#8e8e93; }
.ml-msg { padding:14px 16px 28px; }
.ml-msg h2 { margin:0 0 12px; font:700 19px/1.2 -apple-system, system-ui; letter-spacing:-0.01em; }
.ml-meta { display:flex; gap:10px; align-items:center; padding-bottom:12px; border-bottom:0.5px solid #38383a; margin-bottom:12px; }
.ml-av { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; font:600 13px system-ui; color:#fff; flex:none; }
.ml-meta b { display:block; font-size:14px; }
.ml-meta span { font-size:11.5px; color:#8e8e93; }
.ml-meta .flag { margin-left:auto; color:#ff9f0a; width:16px; height:16px; }
.ml-msg p { margin:0 0 10px; font-size:14px; line-height:1.45; color:#e5e5ea; }
.ml-none { flex:1; display:grid; place-items:center; color:#636366; font-size:15px; }
/* The vertical bar: trailing edge, top to bottom. */
.ml-vbar { width:50px; flex:none; display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 0 10px; box-sizing:border-box;
  background:rgb(28 28 30 / 0.92); border-left:0.5px solid #2c2c2e; }
.ml-island { width:24px; height:52px; border-radius:12px; background:#000; box-shadow:0 0 0 1px #2c2c2e; margin-bottom:4px; flex:none; }
.ml-status { display:flex; flex-direction:column; align-items:center; gap:3px; font:600 10px system-ui; color:#f2f2f7; margin-bottom:6px; flex:none; }
.ml-status svg { width:16px; height:10px; }
.ml-grp { display:flex; flex-direction:column; align-items:center; gap:2px; }
.ml-sp { flex:1; }
.ml-item { width:38px; height:36px; border:0; border-radius:10px; background:none; color:#0a84ff; display:grid; place-items:center; cursor:pointer; padding:0; position:relative; }
.ml-item svg { width:21px; height:21px; }
.ml-item:active { background:#2c2c2e; }
.ml-item.on { color:#ff9f0a; }
.ml-item.prim { color:#f2f2f7; background:#2c2c2e; }
.ml-tabs { display:flex; flex-direction:column; gap:2px; padding:4px; border-radius:22px; background:#2c2c2e; margin-top:6px; flex:none; }
.ml-tab { width:36px; height:40px; border:0; border-radius:18px; background:none; color:#8e8e93; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; cursor:pointer; font:600 7.5px system-ui; padding:0; }
.ml-tab svg { width:18px; height:18px; }
.ml-tab.on { background:#3a3a3c; color:#0a84ff; }
.ml-compact { gap:2px; padding:6px 0 6px; }
.ml-compact .ml-island { height:38px; margin-bottom:2px; }
.ml-compact .ml-status { margin-bottom:2px; gap:2px; }
.ml-compact .ml-item { height:32px; }
.ml-compact .ml-tabs { margin-top:2px; }
.ml-compact .ml-tab { height:34px; }
/* Horizontal bars. */
.ml-hbar { display:flex; align-items:center; gap:4px; padding:6px 10px; flex:none; background:rgb(28 28 30 / 0.92); }
.ml-hbar.ml-top { border-bottom:0.5px solid #2c2c2e; }
.ml-hbar.ml-bot { border-top:0.5px solid #2c2c2e; justify-content:space-between; }
.ml-hbar .ml-sp { flex:1; }
.ml-seg { display:flex; margin:0 12px 8px; padding:2px; border-radius:9px; background:#1c1c1e; }
.ml-seg button { flex:1; border:0; border-radius:7px; background:none; color:#f2f2f7; font:600 12px system-ui; padding:5px; cursor:pointer; }
.ml-seg button.on { background:#3a3a3c; }
.ml-pane { position:absolute; inset:0; display:flex; flex-direction:column; background:#000; }
.ml-pane.ml-list { background:#0d0d0f; }
/* Overflow menu and toast. */
.ml-scrim { position:absolute; inset:0; z-index:8; }
.ml-menu { position:absolute; z-index:9; min-width:150px; border-radius:12px; background:rgb(44 44 46 / 0.97); box-shadow:0 10px 30px rgb(0 0 0 / 0.6); overflow:hidden; animation: ml-pop 0.16s ease-out; }
.ml-menu button { display:flex; width:100%; align-items:center; justify-content:space-between; gap:12px; border:0; background:none; color:#f2f2f7; font:14px system-ui; padding:10px 12px; cursor:pointer; }
.ml-menu button + button { border-top:0.5px solid #48484a; }
.ml-menu svg { width:18px; height:18px; color:#f2f2f7; }
@keyframes ml-pop { from { opacity:0; transform:scale(0.92); } }
.ml-toast { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); z-index:9; display:flex; gap:10px; align-items:center; white-space:nowrap;
  background:#2c2c2e; color:#f2f2f7; border-radius:18px; padding:8px 14px; font:500 12.5px system-ui; box-shadow:0 6px 20px rgb(0 0 0 / 0.5); animation: ml-pop 0.2s ease-out; }
.ml-toast button { border:0; background:none; color:#0a84ff; font:600 12.5px system-ui; cursor:pointer; padding:0; }
`;

type Item = { id: string; title: string; icon: string; group: "top" | "bottom"; prio: number; on?: boolean; prim?: boolean; run: () => void };

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  let selected = 0;
  /** Closed: whether the message is pushed on top of the list. Opening shows both either way. */
  let showing = false;
  let tab: "inbox" | "flagged" = "inbox";
  let unreadOnly = false;
  const unread = new Set([0, 1, 3, 5, 7]);
  const flagged = new Set([0, 4]);
  const archived = new Set<number>();
  let listScroll = 0;
  let msgScroll = 0;
  let state = initial;
  let dead = false;
  let toastTimer = 0;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const visible = () =>
    INBOX.map((_, i) => i).filter(
      (i) => !archived.has(i) && (tab === "inbox" || flagged.has(i)) && (!unreadOnly || unread.has(i) || i === selected),
    );

  const rerender = () => render(state);

  function open(i: number): void {
    if (i !== selected) msgScroll = 0;
    selected = i;
    unread.delete(i);
    showing = true;
    rerender();
  }

  function toast(root: HTMLElement, text: string, undo?: () => void): void {
    root.querySelector(".ml-toast")?.remove();
    const t = document.createElement("div");
    t.className = "ml-toast";
    t.innerHTML = `<span>${text}</span>`;
    if (undo) {
      const b = document.createElement("button");
      b.textContent = "Undo";
      b.onclick = undo;
      t.append(b);
    }
    root.append(t);
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => t.remove(), 2200);
  }

  // --- toolbar items: every one has a title and a symbol (HIG) ---

  function detailItems(root: () => HTMLElement, withBack: boolean): Item[] {
    const items: Item[] = [];
    if (withBack) items.push({ id: "back", title: "Inbox", icon: "back", group: "top", prio: 100, run: () => ((showing = false), rerender()) });
    items.push(
      { id: "flag", title: flagged.has(selected) ? "Unflag" : "Flag", icon: "flag", group: "top", prio: 60, on: flagged.has(selected), run: () => { flagged.has(selected) ? flagged.delete(selected) : flagged.add(selected); rerender(); } },
      { id: "unread", title: unread.has(selected) ? "Mark as Read" : "Mark as Unread", icon: "unread", group: "top", prio: 20, run: () => { unread.has(selected) ? unread.delete(selected) : unread.add(selected); rerender(); } },
      { id: "archive", title: "Archive", icon: "archive", group: "bottom", prio: 40, run: () => archive(root) },
      { id: "move", title: "Move to Folder", icon: "move", group: "bottom", prio: 10, run: () => toast(root(), "Move sheet would slide in here") },
      { id: "reply", title: "Reply", icon: "reply", group: "bottom", prio: 90, run: () => toast(root(), `Replying to ${INBOX[selected]!.from.split(" ")[0]}…`) },
    );
    return items;
  }

  function listItems(root: () => HTMLElement): Item[] {
    return [
      { id: "filter", title: unreadOnly ? "Show All Mail" : "Filter: Unread", icon: "filter", group: "top", prio: 50, on: unreadOnly, run: () => ((unreadOnly = !unreadOnly), (listScroll = 0), rerender()) },
      { id: "compose", title: "New Message", icon: "compose", group: "bottom", prio: 100, run: () => toast(root(), "A compose sheet would open here") },
    ];
  }

  function archive(root: () => HTMLElement): void {
    const was = selected;
    const list = visible();
    const at = list.indexOf(was);
    archived.add(was);
    const rest = visible();
    const next = rest[Math.min(at, rest.length - 1)];
    if (next === undefined) showing = false;
    else selected = next;
    msgScroll = 0;
    rerender();
    toast(root(), "Archived", () => {
      archived.delete(was);
      selected = was;
      rerender();
    });
  }

  function itemButton(it: Item): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = `ml-item ${it.on ? "on" : ""} ${it.prim ? "prim" : ""}`;
    b.title = it.title;
    b.setAttribute("aria-label", it.title);
    b.innerHTML = icon(it.icon, it.on);
    b.onclick = it.run;
    return b;
  }

  /** The system overflow: the lowest-priority items, listed by title, behind one ellipsis. */
  function overflow(root: () => HTMLElement, items: Item[], anchor: "left" | "above"): HTMLButtonElement {
    const b = itemButton({ id: "more", title: "More", icon: "more", group: "top", prio: 0, run: () => {} });
    b.onclick = () => {
      const host = root();
      const scrim = document.createElement("div");
      scrim.className = "ml-scrim";
      const menu = document.createElement("div");
      menu.className = "ml-menu";
      const r = b.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      const k = host.offsetWidth / (h.width || 1);
      if (anchor === "left") {
        menu.style.right = `${(h.right - r.left) * k + 6}px`;
        menu.style.top = `${Math.max(8, (r.top - h.top) * k - 8)}px`;
      } else {
        menu.style.right = "8px";
        menu.style.bottom = `${(h.bottom - r.top) * k + 6}px`;
      }
      for (const it of items) {
        const m = document.createElement("button");
        m.innerHTML = `<span>${it.title}</span>${icon(it.icon)}`;
        m.onclick = () => {
          scrim.remove();
          menu.remove();
          it.run();
        };
        menu.append(m);
      }
      scrim.onclick = () => (scrim.remove(), menu.remove());
      host.append(scrim, menu);
    };
    return b;
  }

  /** Split items into those that fit and those that overflow, by priority, keeping bar order. */
  function fit(items: Item[], cap: number): { shown: Item[]; over: Item[] } {
    if (items.length <= cap) return { shown: items, over: [] };
    const keep = new Set([...items].sort((a, b) => b.prio - a.prio).slice(0, cap - 1));
    return { shown: items.filter((i) => keep.has(i)), over: items.filter((i) => !keep.has(i)) };
  }

  /**
   * The outer display's trailing strip. Order from the top, per the HIG:
   * Dynamic Island, status bar, toolbar (top group, then bottom group), tab bar.
   */
  function vbar(root: () => HTMLElement, items: Item[], opts: { chrome: boolean; tabs: boolean; cap: number; compact?: boolean; minTabs?: boolean }): HTMLElement {
    const bar = document.createElement("div");
    bar.className = `ml-vbar ${opts.compact ? "ml-compact" : ""}`;
    if (opts.chrome) {
      bar.insertAdjacentHTML(
        "beforeend",
        `<i class="ml-island" aria-hidden="true"></i>
         <div class="ml-status" aria-label="Status bar"><span>9:41</span>
           <svg viewBox="0 0 16 10"><rect x="0" y="6" width="3" height="4" rx=".6" fill="currentColor"/><rect x="4.3" y="4" width="3" height="6" rx=".6" fill="currentColor"/><rect x="8.6" y="2" width="3" height="8" rx=".6" fill="currentColor"/><rect x="12.9" y="0" width="3" height="10" rx=".6" fill="currentColor" opacity=".4"/></svg>
           <svg viewBox="0 0 16 10"><rect x=".5" y=".5" width="13" height="9" rx="2.5" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="9" height="6" rx="1.4" fill="currentColor"/><rect x="14.3" y="3.3" width="1.4" height="3.4" rx=".6" fill="currentColor" opacity=".5"/></svg>
         </div>`,
      );
    }
    const { shown, over } = fit(items, opts.cap);
    const top = document.createElement("div");
    top.className = "ml-grp";
    const bottom = document.createElement("div");
    bottom.className = "ml-grp";
    for (const it of shown) (it.group === "top" ? top : bottom).append(itemButton(it));
    if (over.length) top.append(overflow(root, over, "left"));
    const sp = document.createElement("i");
    sp.className = "ml-sp";
    bar.append(top, sp, bottom);
    if (opts.tabs) bar.append(tabBar(opts.minTabs));
    return bar;
  }

  /** The tab bar; minimized to the current tab alone when a task-focused view needs the room (HIG). */
  function tabBar(minimized = false): HTMLElement {
    const t = document.createElement("div");
    t.className = "ml-tabs";
    t.setAttribute("role", "tablist");
    const all = [["inbox", "Inbox", "inbox"], ["flagged", "Flagged", "flagged"]] as const;
    for (const [id, label, ic] of all.filter(([id]) => !minimized || id === tab)) {
      const b = document.createElement("button");
      b.className = `ml-tab ${tab === id ? "on" : ""}`;
      b.setAttribute("aria-label", label);
      b.innerHTML = `${icon(ic)}${label}`;
      b.onclick = () => {
        tab = minimized ? (tab === "inbox" ? "flagged" : "inbox") : id;
        listScroll = 0;
        showing = false;
        rerender();
      };
      t.append(b);
    }
    return t;
  }

  function segmented(): HTMLElement {
    const s = document.createElement("div");
    s.className = "ml-seg";
    for (const [id, label] of [["inbox", "Inbox"], ["flagged", "Flagged"]] as const) {
      const b = document.createElement("button");
      b.className = tab === id ? "on" : "";
      b.textContent = label;
      b.onclick = () => ((tab = id), (listScroll = 0), rerender());
      s.append(b);
    }
    return s;
  }

  function head(extra?: HTMLElement): HTMLElement {
    const h = document.createElement("div");
    h.className = "ml-head";
    const n = visible().filter((i) => unread.has(i)).length;
    h.innerHTML = `<h1>${tab === "inbox" ? "Inbox" : "Flagged"}<small>${unreadOnly ? "Unread only · " : ""}${n} unread</small></h1>`;
    if (extra) h.append(extra);
    return h;
  }

  function editButton(root: () => HTMLElement): HTMLButtonElement {
    // A text button: it stays horizontal, even beside a vertical bar (HIG).
    const b = document.createElement("button");
    b.className = "ml-text";
    b.textContent = "Edit";
    b.onclick = () => toast(root(), "Edit mode: select messages to move or archive");
    return b;
  }

  function list(split: boolean): HTMLElement {
    const sc = document.createElement("div");
    sc.className = "ml-scroll";
    const ids = visible();
    if (!ids.length) sc.innerHTML = `<div class="ml-empty">${tab === "flagged" ? "No flagged messages" : "No messages"}</div>`;
    for (const i of ids) {
      const m = INBOX[i]!;
      const row = document.createElement("div");
      row.className = `ml-row ${unread.has(i) ? "unread" : ""} ${split && i === selected ? "sel" : ""}`;
      row.setAttribute("role", "button");
      row.innerHTML = `<i class="dot"></i><div class="from">${m.from}</div><div class="time">${flagged.has(i) ? icon("flag", true) : ""}${m.time}</div>
        <div class="subj">${m.subject}</div><div class="prev">${m.body[0]}</div>`;
      row.onclick = () => open(i);
      sc.append(row);
    }
    sc.addEventListener("scroll", () => (listScroll = sc.scrollTop));
    requestAnimationFrame(() => (sc.scrollTop = listScroll));
    return sc;
  }

  function message(): HTMLElement {
    const sc = document.createElement("div");
    sc.className = "ml-scroll";
    const m = INBOX[selected]!;
    const initials = m.from.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
    sc.innerHTML = `<article class="ml-msg">
      <h2>${m.subject}</h2>
      <div class="ml-meta"><div class="ml-av" style="background:hsl(${m.hue} 55% 42%)">${initials}</div>
        <div><b>${m.from}</b><span>To: me · ${m.time}</span></div>${flagged.has(selected) ? `<span class="flag">${icon("flag", true)}</span>` : ""}</div>
      ${m.body.map((p) => `<p>${p}</p>`).join("")}</article>`;
    sc.addEventListener("scroll", () => (msgScroll = sc.scrollTop));
    requestAnimationFrame(() => (sc.scrollTop = msgScroll));
    return sc;
  }

  function div(cls: string, ...kids: HTMLElement[]): HTMLElement {
    const d = document.createElement("div");
    d.className = cls;
    d.append(...kids);
    return d;
  }

  function hbar(items: Item[], where: "ml-top" | "ml-bot"): HTMLElement {
    const b = div(`ml-hbar ${where}`);
    for (const it of items) b.append(itemButton(it));
    return b;
  }

  function render(s: DuoState): void {
    if (dead) return;
    state = s;
    const { pose } = s;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    const archivedAll = visible().length === 0 && showing;
    if (archivedAll) showing = false;

    if (pose.display === "outer") {
      // One pane at a time, as a navigation stack; the bars run down the trailing edge.
      const root = () => screens.outer.firstElementChild as HTMLElement;
      const landscape = pose.id === "closed-landscape";
      const main = div("ml-main");
      let items: Item[];
      if (showing) {
        main.append(message());
        items = detailItems(root, true);
      } else {
        main.append(head(editButton(root)), list(false));
        items = listItems(root);
      }
      // Less height in landscape: low-priority items overflow, bottom to top.
      // The message view is task-focused, so there the tab bar minimizes to one control.
      const bar = vbar(root, items, { chrome: true, tabs: true, cap: landscape ? 4 : 7, compact: landscape, minTabs: landscape && showing });
      screens.outer.append(div("ml", main, bar));
      return;
    }

    const root = () => screens.end.firstElementChild as HTMLElement;
    const listRoot = () => screens.start.firstElementChild as HTMLElement;
    // The list's own controls stay above the list (HIG: "list controls above Mail's leading pane").
    const listBar = div("ml-hbar ml-top", editButton(listRoot), div("ml-sp"), ...listItems(listRoot).map(itemButton));
    const listPane = div("ml-pane ml-list", listBar, head(), segmented(), list(true));
    const folded = s.hinge < 180;
    const detail = div("ml-main");
    if (visible().includes(selected) || !archived.has(selected)) detail.append(message());
    else detail.append(div("ml-none"));

    if (pose.split === "side-by-side") {
      // Inner landscape keeps side controls — but only on the detail column, which is on the display edge.
      if (folded) {
        listPane.style.paddingRight = "12px";
        detail.style.paddingLeft = "12px";
      }
      screens.start.append(div("ml", listPane));
      screens.end.append(div("ml", detail, vbar(root, detailItems(root, false), { chrome: false, tabs: false, cap: 9 })));
    } else {
      // Inner portrait keeps horizontal bars; both sit on the outside edges, away from the fold.
      if (folded) {
        listPane.style.paddingBottom = "12px";
        detail.style.paddingTop = "12px";
      }
      screens.start.append(div("ml", listPane));
      const items = detailItems(root, false);
      screens.end.append(div("ml ml-col", detail, hbar(items, "ml-bot")));
    }
  }

  return {
    render,
    destroy() {
      dead = true;
      clearTimeout(toastTimer);
      style.remove();
    },
  };
}

export const mailExample: Example = {
  id: "mail",
  title: "List and Detail",
  category: "patterns",
  summary:
    "Apple's canonical adaptation, done by the book: closed, the inbox is a list or a message with Back; open, the list and the message sit side by side. The bars move to the trailing edge of the outer display in the HIG's order, and your selection, tab, filter and scroll position survive every fold.",
  bestPose: "open",
  poses: {
    closed: "One pane at a time — the list, or a message with Back — and a vertical bar down the trailing edge: Dynamic Island, status, toolbar, then the tab bar.",
    "closed-landscape": "The same trailing bar with less height, so the lowest-priority actions move into the single overflow menu while Back and Reply stay.",
    open: "Both levels at once: the list on the leading pane with its controls above it, and the message beside it with a vertical bar on the detail column's trailing edge.",
    "open-portrait": "List on top, message below, with horizontal bars — inner portrait keeps bars horizontal.",
    book: "List on the left page and the message on the right, with a margin either side of the fold so nothing tappable sits in it.",
    table: "The same stacked split as open portrait, with the list's bar at the very top and the message's toolbar at the very bottom — both clear of the fold.",
  },
  principle:
    "More space shows another level: Mail shows either a list or a message closed, then both side by side open, and on the outer display the bars run down the trailing edge — Dynamic Island, status bar, toolbar, then tab bar (HIG, 'Displays, poses, and continuity' and 'Vertical controls').",
  create,
};
