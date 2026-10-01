/**
 * Fold Cards — test yourself folded, reveal the answer by unfolding.
 *
 * A flash-card deck where the hinge is the card. Closed, the outer display
 * shows only the question: say your answer, then open the phone and the
 * answer is revealed on the inner display — question on the first half,
 * answer on the second, uncovered from the fold outwards. Grade yourself,
 * close it again, and the next question is waiting on the outside.
 *
 * Grading uses Leitner boxes: a card you know moves up a box and comes back
 * less often; a card you miss drops to box 1 and comes back soon. The deck is
 * twelve Spanish words, with an example sentence each.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";

type Card = { es: string; pos: string; en: string; ex: string; exEn: string };

const DECK: Card[] = [
  { es: "la mariposa", pos: "noun, f.", en: "the butterfly", ex: "La mariposa se posó en la flor.", exEn: "The butterfly landed on the flower." },
  { es: "el relámpago", pos: "noun, m.", en: "the flash of lightning", ex: "Contamos los segundos después del relámpago.", exEn: "We counted the seconds after the lightning." },
  { es: "madrugar", pos: "verb", en: "to get up very early", ex: "Los panaderos madrugan todos los días.", exEn: "Bakers get up early every day." },
  { es: "la sobremesa", pos: "noun, f.", en: "lingering at the table after a meal", ex: "La sobremesa duró dos horas.", exEn: "We sat talking after lunch for two hours." },
  { es: "el estornudo", pos: "noun, m.", en: "the sneeze", ex: "Su estornudo asustó al gato.", exEn: "Her sneeze startled the cat." },
  { es: "despistado", pos: "adjective", en: "absent-minded", ex: "Soy tan despistado que perdí las llaves otra vez.", exEn: "I'm so absent-minded I lost my keys again." },
  { es: "el atardecer", pos: "noun, m.", en: "dusk, the evening", ex: "Caminamos por la playa al atardecer.", exEn: "We walked along the beach at dusk." },
  { es: "la almohada", pos: "noun, f.", en: "the pillow", ex: "Dejé el libro debajo de la almohada.", exEn: "I left the book under the pillow." },
  { es: "aprovechar", pos: "verb", en: "to make the most of", ex: "Hay que aprovechar el buen tiempo.", exEn: "We should make the most of the good weather." },
  { es: "el caracol", pos: "noun, m.", en: "the snail", ex: "El caracol lleva su casa a cuestas.", exEn: "The snail carries its house on its back." },
  { es: "la bisagra", pos: "noun, f.", en: "the hinge", ex: "La bisagra del teléfono es muy suave.", exEn: "The phone's hinge is very smooth." },
  { es: "desdoblar", pos: "verb", en: "to unfold", ex: "Desdobla el mapa para ver el camino.", exEn: "Unfold the map to see the way." },
];

/** How far back in the queue a card goes after "Got it", by its new box. */
const GAP = [2, 3, 5, 8, 99];

const CSS = `
.fc { position:absolute; inset:0; display:flex; flex-direction:column; gap:10px; padding:12px; box-sizing:border-box;
  background: radial-gradient(120% 90% at 50% 0%, #243447, #111a24); color:#eef3f8; font:12px/1.3 system-ui, -apple-system, sans-serif; }
.fc-row { flex-direction:row; }
.fc-stats { display:flex; align-items:center; gap:10px; }
.fc-streak { display:flex; align-items:center; gap:5px; font-weight:700; font-size:13px; }
.fc-streak svg { width:14px; height:16px; }
.fc-streak small { font-weight:500; color:#8fa5bb; font-size:10px; margin-left:2px; }
.fc-boxes { margin-left:auto; display:flex; gap:4px; align-items:flex-end; height:28px; }
.fc-box { display:flex; flex-direction:column; align-items:center; gap:2px; width:18px; }
.fc-box i { display:block; width:12px; border-radius:3px 3px 1px 1px; background:#4d6a88; min-height:2px; transition:height 0.3s; }
.fc-box.cur i { background:#ffd166; }
.fc-box span { font-size:8px; color:#8fa5bb; }
.fc-card { position:relative; flex:1; min-height:0; border-radius:10px; overflow:hidden; color:#1f2a36;
  background: repeating-linear-gradient(180deg, transparent 0 21px, rgb(80 130 200 / 0.18) 21px 22px) 0 44px / 100% calc(100% - 44px) no-repeat, #fbf8ef;
  box-shadow: 0 10px 26px rgb(0 0 0 / 0.45), 0 1px 0 rgb(255 255 255 / 0.6) inset; display:flex; flex-direction:column; }
.fc-card::before { content:""; position:absolute; left:0; right:0; top:40px; height:1.5px; background:rgb(220 70 70 / 0.55); }
.fc-card header { display:flex; justify-content:space-between; padding:13px 14px 0; height:27px; box-sizing:border-box; font:700 9px system-ui; letter-spacing:0.12em; text-transform:uppercase; color:#7a8795; }
.fc-body { flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:8px 16px 14px; gap:6px; min-height:0; }
.fc-word { font:600 clamp(22px, 10cqw, 34px)/1.1 'Iowan Old Style', Palatino, Georgia, serif; color:#16202b; }
.fc-pos { font:italic 12px Georgia, serif; color:#6b7a89; }
.fc-ans { font:600 clamp(19px, 8cqw, 28px)/1.15 'Iowan Old Style', Palatino, Georgia, serif; color:#1b5e3b; }
.fc-ex { font:italic 12.5px/1.4 Georgia, serif; color:#2d3a47; max-width:30em; }
.fc-ex small { display:block; font:12px/1.4 system-ui; font-style:normal; color:#6b7a89; margin-top:2px; }
.fc-cover { position:absolute; inset:0; z-index:2; display:grid; place-items:center; text-align:center; border-radius:10px; cursor:pointer; border:0; width:100%; font:inherit; color:#eef3f8;
  background: repeating-linear-gradient(45deg, #2f4d6e 0 8px, #2a4563 8px 16px); box-shadow: inset 0 0 0 6px #fbf8ef; }
.fc-cover b { display:block; font:600 15px 'Iowan Old Style', Georgia, serif; margin-bottom:4px; }
.fc-cover span { font-size:11px; opacity:0.8; }
.fc-cover.fc-x { transform-origin: 100% 50%; }
.fc-cover.fc-y { transform-origin: 50% 100%; }
.fc-cover.fc-x.fc-go { animation: fc-away-x 0.75s cubic-bezier(.55,0,.25,1) forwards; }
.fc-cover.fc-y.fc-go { animation: fc-away-y 0.75s cubic-bezier(.55,0,.25,1) forwards; }
@keyframes fc-away-x { 0% { transform: perspective(700px) rotateY(0); } 100% { transform: perspective(700px) rotateY(-105deg); opacity:0; visibility:hidden; } }
@keyframes fc-away-y { 0% { transform: perspective(700px) rotateX(0); } 100% { transform: perspective(700px) rotateX(105deg); opacity:0; visibility:hidden; } }
.fc-body.fc-rise > * { animation: fc-rise 0.6s 0.25s both ease-out; }
.fc-body.fc-rise > *:nth-child(2) { animation-delay:0.35s; } .fc-body.fc-rise > *:nth-child(3) { animation-delay:0.45s; }
@keyframes fc-rise { from { opacity:0; transform: translateY(8px); } }
.fc-card.fc-in { animation: fc-in 0.45s ease-out; }
@keyframes fc-in { from { opacity:0; transform: translateY(14px) scale(0.97); } }
.fc-grade { display:grid; grid-template-columns:1fr 1.3fr; gap:8px; }
.fc-grade button { border:0; border-radius:12px; padding:11px 8px; font:700 13px system-ui; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:1px; }
.fc-grade button small { font-weight:500; font-size:9.5px; opacity:0.75; }
.fc-again { background:#3a2630; color:#ffb4b4; box-shadow: inset 0 0 0 1.5px #7a3b48; }
.fc-got { background:#2fbf71; color:#08240f; }
.fc-grade button:active { transform: scale(0.97); }
.fc-grade.fc-small button { padding:8px 6px; font-size:12px; }
.fc-hint { display:flex; align-items:center; justify-content:center; gap:8px; color:#a9bbcc; font-size:11px; }
.fc-hint svg { width:26px; height:18px; flex:none; }
.fc-hint svg .fc-flap { transform-origin: 13px 9px; animation: fc-flap 2.4s ease-in-out infinite; }
@keyframes fc-flap { 0%,30% { transform: scaleX(1); } 60%,80% { transform: scaleX(-1); } 100% { transform: scaleX(1); } }
.fc-peek { background:none; border:0; color:#ffd166; font:600 11px system-ui; cursor:pointer; padding:2px 4px; }
.fc-mini { border-radius:9px; background:#fbf8ef; color:#1b5e3b; text-align:center; padding:7px 10px; font:600 15px 'Iowan Old Style', Georgia, serif; animation: fc-rise 0.4s ease-out; }
.fc-mini small { display:block; font:italic 11px Georgia, serif; color:#6b7a89; margin-top:1px; }
.fc-side .fc-stats { flex-direction:column; align-items:stretch; gap:8px; }
.fc-side .fc-boxes { margin-left:0; justify-content:space-between; }
.fc-side .fc-hint { flex-wrap:wrap; }
.fc-side { width:140px; flex:none; display:flex; flex-direction:column; gap:10px; justify-content:space-between; }
.fc-done { text-align:center; font-size:11px; color:#a9bbcc; }
`;

const FLAME = `<svg viewBox="0 0 14 16" aria-hidden="true"><path d="M7 1c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-8z" fill="#ff9f43"/><path d="M7 8c1 1.5 2.5 2.5 2.5 4a2.5 2.5 0 0 1-5 0c0-1 .5-1.5 1-2 .3 1 .8 1.3 1.5 1.3C6.5 10 6.6 9 7 8z" fill="#ffd166"/></svg>`;
const UNFOLD = `<svg viewBox="0 0 26 18" aria-hidden="true"><rect x="1" y="2" width="11" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect class="fc-flap" x="13" y="2" width="11" height="14" rx="2" fill="currentColor" opacity=".55"/></svg>`;

function create(screens: Screens, initial: DuoState): Instance {
  // --- state, which outlives every render ---
  const box = DECK.map(() => 1);
  const queue = DECK.map((_, i) => i);
  let streak = 0;
  let best = 0;
  let reviewed = 0;
  /** Whether the current card's answer has been shown. */
  let revealed = false;
  let lastDisplay = initial.pose.display;
  let state = initial;
  let dead = false;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const card = () => DECK[queue[0]!]!;

  function stats(): HTMLElement {
    const el = document.createElement("div");
    el.className = "fc-stats";
    const counts = [1, 2, 3, 4, 5].map((b) => box.filter((x) => x === b).length);
    const curBox = box[queue[0]!]!;
    el.innerHTML = `
      <div class="fc-streak" title="Streak">${FLAME}${streak}<small>streak · best ${best}</small></div>
      <div class="fc-boxes" aria-label="Leitner boxes">${counts
        .map((n, i) => `<div class="fc-box ${i + 1 === curBox ? "cur" : ""}" title="Box ${i + 1}: ${n} cards"><i style="height:${2 + (n / DECK.length) * 20}px"></i><span>${i + 1}</span></div>`)
        .join("")}</div>`;
    return el;
  }

  function question(): HTMLElement {
    const c = card();
    const el = document.createElement("div");
    el.className = "fc-card";
    el.style.containerType = "inline-size";
    el.innerHTML = `
      <header><span>Spanish → English</span><span>Box ${box[queue[0]!]} · #${reviewed + 1}</span></header>
      <div class="fc-body"><div class="fc-word">${c.es}</div><div class="fc-pos">${c.pos}</div></div>`;
    return el;
  }

  /** The answer card. `animate` uncovers it from the fold outward; `axis` says which way the fold runs. */
  function answer(axis: "x" | "y", animate: boolean): HTMLElement {
    const c = card();
    const el = document.createElement("div");
    el.className = "fc-card";
    el.style.containerType = "inline-size";
    el.innerHTML = `
      <header><span>Answer</span><span>${c.pos}</span></header>
      <div class="fc-body ${animate ? "fc-rise" : ""}"><div class="fc-ans">${c.en}</div><div class="fc-ex">${c.ex}<small>${c.exEn}</small></div></div>`;
    if (!revealed || animate) {
      const cover = document.createElement("button");
      cover.className = `fc-cover fc-${axis}`;
      cover.innerHTML = `<div><b>Say it out loud first</b><span>Tap to reveal — or fold it shut and quiz yourself</span></div>`;
      if (animate) requestAnimationFrame(() => requestAnimationFrame(() => cover.classList.add("fc-go")));
      else
        cover.onclick = () => {
          revealed = true;
          cover.classList.add("fc-go");
          el.querySelector(".fc-body")!.classList.add("fc-rise");
          el.parentElement?.querySelector<HTMLElement>(".fc-grade")?.removeAttribute("hidden");
          const g = el.parentElement?.querySelector<HTMLElement>(".fc-grade");
          if (g) g.style.visibility = "";
        };
      el.append(cover);
    }
    return el;
  }

  function grade(small = false): HTMLElement {
    const el = document.createElement("div");
    el.className = `fc-grade ${small ? "fc-small" : ""}`;
    el.innerHTML = `<button class="fc-again">Again<small>back to box 1</small></button><button class="fc-got">Got it<small>up to box ${Math.min(5, box[queue[0]!]! + 1)}</small></button>`;
    el.querySelector<HTMLButtonElement>(".fc-again")!.onclick = () => schedule(false);
    el.querySelector<HTMLButtonElement>(".fc-got")!.onclick = () => schedule(true);
    if (!revealed) el.style.visibility = "hidden";
    return el;
  }

  function schedule(knew: boolean): void {
    const id = queue.shift()!;
    if (knew) {
      box[id] = Math.min(5, box[id]! + 1);
      streak++;
      best = Math.max(best, streak);
    } else {
      box[id] = 1;
      streak = 0;
    }
    const gap = knew ? GAP[box[id]! - 1]! : 2;
    queue.splice(Math.min(queue.length, gap), 0, id);
    reviewed++;
    revealed = false;
    draw(false, true);
  }

  function hint(): HTMLElement {
    const el = document.createElement("div");
    el.className = "fc-hint";
    el.innerHTML = `${UNFOLD}<span>Unfold to reveal the answer</span><button class="fc-peek">Peek</button>`;
    el.querySelector<HTMLButtonElement>(".fc-peek")!.onclick = () => {
      revealed = true;
      draw(false, false);
    };
    return el;
  }

  function mini(): HTMLElement {
    const c = card();
    const el = document.createElement("div");
    el.className = "fc-mini";
    el.innerHTML = `${c.en}<small>${c.ex}</small>`;
    return el;
  }

  function wrap(cls: string, ...kids: HTMLElement[]): HTMLElement {
    const el = document.createElement("div");
    el.className = cls;
    el.append(...kids);
    return el;
  }

  function draw(unfolded: boolean, next: boolean): void {
    const { pose } = state;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    const q = question();
    if (next) q.classList.add("fc-in");
    if (pose.display === "outer") {
      // Closed: only the question. Unfold to reveal; peeking and grading still work here.
      const foot = revealed ? wrap("", mini(), grade(true)) : hint();
      if (revealed) foot.style.cssText = "display:grid;gap:8px";
      if (pose.id === "closed") screens.outer.append(wrap("fc", stats(), q, foot));
      else screens.outer.append(wrap("fc fc-row", q, wrap("fc-side", stats(), foot)));
      return;
    }
    const axis = pose.split === "side-by-side" ? "x" : "y";
    const doneNote = document.createElement("div");
    doneNote.className = "fc-done";
    doneNote.textContent = `${box.filter((b) => b === 5).length} of ${DECK.length} mastered · ${reviewed} reviewed`;
    screens.start.append(wrap("fc", stats(), q, doneNote));
    screens.end.append(wrap("fc", answer(axis, unfolded), grade()));
  }

  function render(s: DuoState): void {
    if (dead) return;
    state = s;
    // Opening the phone is the reveal.
    const unfolded = lastDisplay === "outer" && s.pose.display === "inner" && !revealed;
    if (unfolded) revealed = true;
    lastDisplay = s.pose.display;
    draw(unfolded, false);
  }

  return {
    render,
    destroy() {
      dead = true;
      style.remove();
    },
  };
}

export const flashcardsExample: Example = {
  id: "flashcards",
  title: "Fold Cards",
  category: "learning",
  summary:
    "Flash cards where the hinge is the card. Folded, the outer display shows only the question; open the phone and the answer is uncovered on the inner display. Grade yourself, fold it shut, and the next question is waiting. Twelve Spanish words, scheduled with Leitner boxes.",
  bestPose: "closed",
  poses: {
    closed: "The question alone on the outer display, with your streak and Leitner boxes; unfold to reveal, or peek and grade right here.",
    "closed-landscape": "The question card on the left, with the streak, boxes and the unfold hint in a column beside it.",
    open: "Unfolding uncovers the answer on the right page, flap swinging away from the fold, with Again and Got it underneath.",
    "open-portrait": "Question on the top half, answer and grading on the bottom.",
    book: "The same as open: question on the left page, answer revealed on the right.",
    table: "The question stands on the top half to read at a glance; the answer and the big grading buttons lie on the flat half under your thumbs.",
    stand: "Stood between two people: hold up the question side, reveal the answer when they guess.",
  },
  principle:
    "Opening is the reveal, but never the only way to it — Peek and grading work folded too, because Apple asks that you preserve functionality and access in every pose rather than tie a feature to one (HIG, 'Displays, poses, and continuity').",
  credits: [{ who: "@elvin_not_11", url: "https://x.com/elvin_not_11", what: "flash cards: test yourself folded, reveal the answer by unfolding" }],
  create,
};
