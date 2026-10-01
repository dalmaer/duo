/**
 * Quiz Buzzers — two players inside, the audience outside.
 *
 * Stand the Duo up between two players. Each gets one half of the inner
 * display: a big buzzer and their score. The question appears on both halves
 * after a random pause — buzz before it does and you are locked out of that
 * question. First to buzz gets the answer choices on their half; a wrong
 * answer hands the question to the other player. Meanwhile the outer display,
 * facing the room, is the host's screen: the question large, a countdown
 * ring, who buzzed, and the reveal.
 *
 * The audience view is Apple's `sceneAccessory` (HIG checklist §9, phase 12).
 * The system can switch it off, so the players' halves carry everything the
 * game needs; the host view is a bonus. Closed, it is a solo quiz.
 *
 * Both buzzers take touches at once (pointer events, one per finger). On a
 * computer, A and L buzz for players 1 and 2.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { note, now, ready, tone } from "../lib/audio.ts";

interface Question {
  q: string;
  choices: [string, string, string, string];
  answer: number;
}

const QUESTIONS: Question[] = [
  { q: "Which planet has the most known moons?", choices: ["Jupiter", "Saturn", "Neptune", "Mars"], answer: 1 },
  { q: "How many sides does a hexagon have?", choices: ["Five", "Six", "Seven", "Eight"], answer: 1 },
  { q: "What is the largest ocean on Earth?", choices: ["Atlantic", "Indian", "Pacific", "Arctic"], answer: 2 },
  { q: "Which gas do plants take in from the air to make food?", choices: ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"], answer: 2 },
  { q: "What is the capital of Canada?", choices: ["Toronto", "Ottawa", "Vancouver", "Montreal"], answer: 1 },
  { q: "How many bones are in an adult human body?", choices: ["186", "206", "226", "306"], answer: 1 },
  { q: "Which instrument usually has 88 keys?", choices: ["Accordion", "Harpsichord", "Piano", "Xylophone"], answer: 2 },
  { q: "What is the chemical symbol for gold?", choices: ["Ag", "Gd", "Go", "Au"], answer: 3 },
  { q: "Which is the longest river in South America?", choices: ["Amazon", "Paraná", "Orinoco", "Magdalena"], answer: 0 },
  { q: "On which continent is the Sahara Desert?", choices: ["Asia", "Australia", "Africa", "South America"], answer: 2 },
  { q: "At what temperature does water freeze, in Fahrenheit?", choices: ["0°", "32°", "100°", "212°"], answer: 1 },
  { q: "What is the largest animal that has ever lived?", choices: ["African elephant", "Blue whale", "Sperm whale", "Whale shark"], answer: 1 },
  { q: "How many minutes are there in a day?", choices: ["1,240", "1,440", "2,400", "3,600"], answer: 1 },
  { q: "Which language has the most native speakers?", choices: ["English", "Spanish", "Hindi", "Mandarin Chinese"], answer: 3 },
  { q: "Mix blue and yellow paint and you get…", choices: ["Green", "Purple", "Orange", "Brown"], answer: 0 },
];

type Phase = "idle" | "armed" | "open" | "answer" | "reveal" | "over";
type P = 0 | 1;

const OPEN_MS = 10_000;
const ANSWER_MS = 7_000;
const REVEAL_MS = 6_000;
const NAMES = ["Player 1", "Player 2"] as const;
const LETTERS = ["A", "B", "C", "D"];

const CSS = `
.qz { position:absolute; inset:0; display:flex; flex-direction:column; gap:8px; padding:10px 12px 12px; background:#17142a; color:#f6f3ff; font:13px/1.3 ui-sans-serif,system-ui; overflow:hidden; }
.qz-p0 { --qz:#ff5a4e; --qz-d:#4a1d22; } .qz-p1 { --qz:#3d8bff; --qz-d:#16284d; }
.qz-pad-s { padding-right:28px; } .qz-pad-e { padding-left:28px; }
.qz-pad-t { padding-bottom:26px; } .qz-pad-b { padding-top:26px; }
.qz-head { display:flex; align-items:center; gap:8px; font:700 11px ui-monospace,monospace; letter-spacing:.08em; text-transform:uppercase; }
.qz-head .qz-name { color:var(--qz, #c9c2e8); }
.qz-head .qz-score { margin-left:auto; font:800 24px/1 ui-sans-serif,system-ui; color:#fff; letter-spacing:0; }
.qz-bar { height:4px; border-radius:2px; background:rgb(255 255 255 / .1); overflow:hidden; }
.qz-bar i { display:block; height:100%; width:0; background:var(--qz, #ffcf3f); }
.qz-q { font:650 15px/1.28 ui-sans-serif,system-ui; min-height:2.5em; }
.qz-q.qz-dim { opacity:.5; font-weight:500; }
.qz-main { flex:1; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; }
.qz-buzz { all:unset; box-sizing:border-box; cursor:pointer; touch-action:none; width:min(150px, 70cqw, 52cqh); aspect-ratio:1; border-radius:50%; display:flex; align-items:center; justify-content:center; font:900 clamp(16px, 7cqw, 24px) ui-sans-serif,system-ui; letter-spacing:.06em; color:#fff;
  background:radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--qz) 70%, #fff), var(--qz) 55%, color-mix(in srgb, var(--qz) 60%, #000)); box-shadow:0 8px 0 color-mix(in srgb, var(--qz) 45%, #000), 0 12px 24px rgb(0 0 0 / .4); transition:transform .06s, box-shadow .06s; }
.qz-buzz:active, .qz-buzz.qz-down { transform:translateY(6px); box-shadow:0 2px 0 color-mix(in srgb, var(--qz) 45%, #000), 0 4px 10px rgb(0 0 0 / .4); }
.qz-buzz.qz-wait { filter:saturate(.35) brightness(.75); }
.qz-buzz.qz-locked { filter:grayscale(1) brightness(.5); cursor:not-allowed; }
.qz-msg { font:600 13px/1.3 ui-sans-serif,system-ui; color:#c9c2e8; }
.qz-msg b { color:#fff; }
.qz-big { font:800 22px/1.15 ui-sans-serif,system-ui; }
.qz-good { color:#4ee08a; } .qz-bad { color:#ff7a6e; }
.qz-choices { align-self:stretch; display:grid; gap:6px; }
.qz-choices.qz-two { grid-template-columns:1fr 1fr; }
.qz-choice { all:unset; box-sizing:border-box; cursor:pointer; display:flex; align-items:center; gap:8px; padding:9px 10px; border-radius:11px; background:#2a2547; color:#fff; font:650 13px/1.2 ui-sans-serif,system-ui; text-align:left; }
.qz-choice b { flex:none; width:20px; height:20px; border-radius:6px; background:rgb(255 255 255 / .12); display:flex; align-items:center; justify-content:center; font:800 11px ui-monospace,monospace; }
.qz-choice:active { background:var(--qz, #5b4fd6); }
.qz-choice.qz-right { background:#1f7a4a; } .qz-choice.qz-wrong { background:#7a2a2a; text-decoration:line-through; }
.qz-choice[disabled] { cursor:default; }
.qz-btn { all:unset; cursor:pointer; padding:9px 16px; border-radius:999px; background:#ffcf3f; color:#241a00; font:800 13px ui-sans-serif,system-ui; }
.qz-btn.qz-quiet { background:rgb(255 255 255 / .12); color:#fff; font-weight:650; }
.qz-pair { flex:1; min-height:0; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.qz-col { position:relative; display:flex; flex-direction:column; gap:6px; min-width:0; container-type:size; }
.qz-col .qz-choice { padding:7px 8px; font-size:12px; }
.qz-ring { position:relative; flex:none; width:58px; height:58px; }
.qz-ring svg { width:100%; height:100%; transform:rotate(-90deg); }
.qz-ring circle { fill:none; stroke-width:6; }
.qz-ring .qz-track { stroke:rgb(255 255 255 / .12); }
.qz-ring .qz-arc { stroke:#ffcf3f; stroke-linecap:round; }
.qz-ring span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font:800 18px ui-monospace,monospace; }
.qz-host { background:radial-gradient(120% 90% at 50% 0%, #2d2363, #120f22 70%); }
.qz-host .qz-top { display:flex; align-items:center; gap:10px; }
.qz-host .qz-tag { font:700 11px ui-monospace,monospace; letter-spacing:.12em; color:#ffcf3f; text-transform:uppercase; }
.qz-host .qz-hq { font:750 clamp(16px, min(6.6cqw, 7.4cqh), 26px)/1.18 ui-sans-serif,system-ui; }
.qz-host .qz-choice { padding:6px 8px; font-size:12px; }
.qz-host .qz-ring { width:48px; height:48px; }
.qz-host .qz-status { font:700 14px ui-sans-serif,system-ui; color:#c9c2e8; }
.qz-host .qz-status em { font-style:normal; color:var(--qz); }
.qz-scores { margin-top:auto; display:flex; gap:8px; }
.qz-scores div { flex:1; display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-radius:10px; background:var(--qz-d); font:700 11px ui-monospace,monospace; }
.qz-scores div b { font:800 20px ui-sans-serif,system-ui; color:var(--qz); }
.qz-scores div.qz-lead { box-shadow:0 0 0 2px var(--qz); }
.qz-board { justify-content:center; }
.qz-board .qz-hq { font:750 clamp(16px, 5.4cqw, 24px)/1.2 ui-sans-serif,system-ui; }
.qz-wide { display:grid; grid-template-columns:1.1fr 1fr; grid-template-rows:auto auto 1fr; column-gap:12px; }
.qz-wide > .qz-main { grid-column:2; grid-row:1 / span 3; }
.qz-hint { font:500 10.5px ui-sans-serif,system-ui; color:#8a83ad; text-align:center; }
`;

function shuffle(n: number): number[] {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function create(screens: Screens, initial: DuoState): Instance {
  let state = initial;
  let phase: Phase = "idle";
  let order = shuffle(QUESTIONS.length);
  let qi = 0;
  let phaseEnd = 0;
  let phaseDur = 1;
  let openLeft = OPEN_MS;
  let buzzed: P | null = null;
  let locked: [string, string] = ["", ""]; // "" | "early" | "wrong"
  let wrongPicks: { p: P; choice: number }[] = [];
  let result: { p: P | null; correct: boolean; choice: number | null } | null = null;
  const scores: [number, number] = [0, 0];
  let lastTick = -1;

  let bars: HTMLElement[] = [];
  let rings: { arc: SVGCircleElement; label: HTMLElement }[] = [];

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const el = (html: string): HTMLElement => {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild as HTMLElement;
  };

  const question = (): Question => QUESTIONS[order[qi]!]!;
  const solo = (): boolean => state.pose.display === "outer";

  // --- sound -------------------------------------------------------------
  const unlock = (): void => void ready().catch(() => {});
  function sfx(kind: "buzz0" | "buzz1" | "early" | "right" | "wrong" | "reveal" | "tick"): void {
    try {
      if (kind === "buzz0" || kind === "buzz1") {
        const f = kind === "buzz0" ? 196 : 262;
        tone(f, f, 0.38, 0.22, "sawtooth");
        tone(f * 1.01, f * 1.01, 0.38, 0.16, "square");
      } else if (kind === "early") tone(140, 80, 0.32, 0.25, "square");
      else if (kind === "right") {
        note(76, 0.12, 0.2, "triangle");
        note(83, 0.3, 0.22, "triangle", now() + 0.11);
      } else if (kind === "wrong") tone(210, 110, 0.45, 0.22, "square");
      else if (kind === "reveal") note(88, 0.09, 0.09, "sine");
      else note(96, 0.03, 0.05, "sine");
    } catch {
      /* Audio not unlocked yet: the game is silent until the first tap. */
    }
  }

  // --- game --------------------------------------------------------------
  function setPhase(p: Phase, ms = 0): void {
    phase = p;
    phaseDur = ms || 1;
    phaseEnd = performance.now() + ms;
    lastTick = -1;
  }

  function start(): void {
    unlock();
    order = shuffle(QUESTIONS.length);
    qi = 0;
    scores[0] = 0;
    scores[1] = 0;
    arm();
  }

  function arm(): void {
    if (qi >= order.length) {
      setPhase("over");
      render(state);
      return;
    }
    buzzed = null;
    locked = ["", ""];
    wrongPicks = [];
    result = null;
    setPhase("armed", 1400 + Math.random() * 1600);
    render(state);
  }

  function next(): void {
    unlock();
    qi++;
    arm();
  }

  function open(ms: number): void {
    buzzed = null;
    if (!solo() && locked[0] && locked[1]) {
      reveal(null, false, null);
      return;
    }
    setPhase("open", ms);
    render(state);
  }

  function buzz(p: P): void {
    unlock();
    if (phase === "armed") {
      if (locked[p]) return;
      locked[p] = "early";
      sfx("early");
      render(state);
    } else if (phase === "open" && !locked[p]) {
      buzzed = p;
      openLeft = Math.max(0, phaseEnd - performance.now());
      sfx(p === 0 ? "buzz0" : "buzz1");
      setPhase("answer", ANSWER_MS);
      render(state);
    }
  }

  function answer(p: P, choice: number | null): void {
    unlock();
    if (phase !== "answer" || buzzed !== p) return;
    if (choice === question().answer) {
      scores[p]++;
      sfx("right");
      reveal(p, true, choice);
      return;
    }
    sfx("wrong");
    locked[p] = "wrong";
    if (choice !== null) wrongPicks.push({ p, choice });
    const other: P = p === 0 ? 1 : 0;
    if (!solo() && !locked[other]) open(Math.max(4000, openLeft));
    else reveal(p, false, choice);
  }

  function reveal(p: P | null, correct: boolean, choice: number | null): void {
    result = { p, correct, choice };
    buzzed = null;
    setPhase("reveal", REVEAL_MS);
    render(state);
  }

  /** Solo: no buzzer — choosing is buzzing. */
  function soloPick(choice: number): void {
    if (phase === "open") {
      buzzed = 0;
      setPhase("answer", ANSWER_MS);
    }
    answer(buzzed ?? 0, choice);
  }

  // --- views -------------------------------------------------------------
  function bar(): HTMLElement {
    const b = el(`<div class="qz-bar"><i></i></div>`);
    bars.push(b.firstElementChild as HTMLElement);
    return b;
  }

  function ring(): HTMLElement {
    const r = el(`<div class="qz-ring"><svg viewBox="0 0 60 60"><circle class="qz-track" cx="30" cy="30" r="26"/><circle class="qz-arc" cx="30" cy="30" r="26"/></svg><span></span></div>`);
    rings.push({ arc: r.querySelector<SVGCircleElement>(".qz-arc")!, label: r.querySelector("span")! });
    return r;
  }

  function questionText(): string {
    if (phase === "idle") return "Two players, one buzzer each. Wait for the question — buzz early and you're locked out.";
    if (phase === "over") return "That's the game.";
    if (phase === "armed") return "Get ready…";
    return question().q;
  }

  function choicesEl(onPick: ((i: number) => void) | null, two = false): HTMLElement {
    const box = el(`<div class="qz-choices${two ? " qz-two" : ""}"></div>`);
    const q = question();
    q.choices.forEach((c, i) => {
      const reveal = phase === "reveal";
      const wrong = wrongPicks.some((w) => w.choice === i);
      const cls = reveal && i === q.answer ? " qz-right" : wrong ? " qz-wrong" : "";
      const b = el(`<button class="qz-choice${cls}"${onPick && !wrong ? "" : " disabled"}><b>${LETTERS[i]}</b><span>${c}</span></button>`);
      if (onPick && !wrong) b.onclick = () => onPick(i);
      box.append(b);
    });
    return box;
  }

  function winnerLine(): string {
    if (scores[0] === scores[1]) return `A draw, ${scores[0]}–${scores[1]}!`;
    const w: P = scores[0] > scores[1] ? 0 : 1;
    return `<span style="color:${w === 0 ? "#ff5a4e" : "#3d8bff"}">${NAMES[w]}</span> wins, ${Math.max(...scores)}–${Math.min(...scores)}!`;
  }

  function revealLine(): string {
    if (!result) return "";
    const q = question();
    if (result.correct && result.p !== null) return `<span class="qz-good">${NAMES[result.p]} got it!</span>`;
    return `<span class="qz-bad">Nobody got it.</span> It was <b>${q.choices[q.answer]}</b>.`;
  }

  /** What a player's buzzer area shows right now. */
  function playerMain(p: P, compact: boolean): HTMLElement {
    const main = el(`<div class="qz-main"></div>`);
    if (phase === "idle" || phase === "over") {
      if (phase === "over") main.append(el(`<div class="qz-big">${winnerLine()}</div>`));
      const b = el(`<button class="qz-btn">${phase === "over" ? "Play again" : "Start the quiz"}</button>`);
      b.onclick = start;
      main.append(b);
      return main;
    }
    if (phase === "answer" && buzzed === p) {
      main.append(el(`<div class="qz-msg"><b>Your answer!</b></div>`), choicesEl((i) => answer(p, i)));
      return main;
    }
    if (phase === "reveal") {
      const mine = result?.p === p;
      main.append(
        el(`<div class="qz-big ${mine && result?.correct ? "qz-good" : ""}">${mine && result?.correct ? "Correct! +1" : mine ? "Not this time" : ""}</div>`),
        el(`<div class="qz-msg">${revealLine()}</div>`),
      );
      const n = el(`<button class="qz-btn qz-quiet">Next question</button>`);
      n.onclick = next;
      main.append(n);
      return main;
    }
    const other: P = p === 0 ? 1 : 0;
    const lock = locked[p];
    const cls = lock ? "qz-locked" : phase === "armed" || (phase === "answer" && buzzed === other) ? "qz-wait" : "";
    const label = lock ? "LOCKED" : phase === "open" ? "BUZZ!" : "BUZZ";
    const b = el(`<button class="qz-buzz ${cls}" aria-label="${NAMES[p]} buzzer">${label}</button>`);
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.classList.add("qz-down");
      buzz(p);
    });
    b.addEventListener("pointerup", () => b.classList.remove("qz-down"));
    b.addEventListener("pointerleave", () => b.classList.remove("qz-down"));
    main.append(b);
    const msg =
      lock === "early"
        ? "Too early — locked out of this one."
        : lock === "wrong"
          ? "Wrong — over to the other player."
          : phase === "answer" && buzzed === other
            ? `${NAMES[other]} is answering…`
            : phase === "armed"
              ? "Wait for the question…"
              : compact
                ? ""
                : "First to buzz answers.";
    if (msg) main.append(el(`<div class="qz-msg">${msg}</div>`));
    return main;
  }

  /** One player's half: score, question, buzzer or choices. */
  function player(p: P, padClass: string): HTMLElement {
    const root = el(`<div class="qz qz-p${p} ${padClass}">
      <div class="qz-head"><span class="qz-name">${NAMES[p]}</span><span class="qz-score">${scores[p]}</span></div></div>`);
    root.append(bar());
    root.append(el(`<div class="qz-q${phase === "armed" || phase === "idle" ? " qz-dim" : ""}">${questionText()}</div>`));
    root.append(playerMain(p, false));
    return root;
  }

  /** Table / open-portrait, standing half: the question for both players. */
  function board(): HTMLElement {
    const root = el(`<div class="qz qz-board qz-pad-t">
      <div class="qz-head"><span>${phase === "idle" || phase === "over" ? "Quiz" : `Question ${qi + 1} of ${order.length}`}</span></div></div>`);
    const row = el(`<div style="display:flex;gap:12px;align-items:center"></div>`);
    row.append(el(`<div class="qz-hq" style="flex:1">${phase === "over" ? winnerLine() : questionText()}</div>`), ring());
    root.append(row);
    if (phase === "reveal") root.append(choicesEl(null, true), el(`<div class="qz-msg">${revealLine()}</div>`));
    else if (phase === "answer" && buzzed !== null) root.append(el(`<div class="qz-msg"><b style="color:${buzzed === 0 ? "#ff5a4e" : "#3d8bff"}">${NAMES[buzzed]}</b> buzzed!</div>`));
    return root;
  }

  /** Table / open-portrait, flat half: two buzzers side by side. */
  function pair(): HTMLElement {
    const root = el(`<div class="qz qz-pad-b"><div class="qz-pair"></div></div>`);
    const grid = root.querySelector(".qz-pair")!;
    for (const p of [0, 1] as P[]) {
      const col = el(`<div class="qz-col qz-p${p}"><div class="qz-head"><span class="qz-name">${NAMES[p]}</span><span class="qz-score">${scores[p]}</span></div></div>`);
      col.append(playerMain(p, true));
      grid.append(col);
    }
    return root;
  }

  /** The outer display, for the host and audience. */
  function host(): HTMLElement {
    const root = el(`<div class="qz qz-host"></div>`);
    const top = el(`<div class="qz-top"><div style="flex:1"><div class="qz-tag">${phase === "idle" ? "Quiz night" : phase === "over" ? "Final scores" : `Question ${qi + 1} / ${order.length}`}</div></div></div>`);
    top.append(ring());
    root.append(top);
    if (phase === "over") root.append(el(`<div class="qz-hq">${winnerLine()}</div>`));
    else if (phase === "idle") root.append(el(`<div class="qz-hq">Two players, first to buzz.</div>`), el(`<div class="qz-status">The players start the game inside.</div>`));
    else {
      root.append(el(`<div class="qz-hq">${phase === "armed" ? "Here comes the question…" : question().q}</div>`));
      if (phase === "answer" || phase === "reveal" || wrongPicks.length) root.append(choicesEl(null, true));
      let status = "";
      if (phase === "answer" && buzzed !== null) status = `<em class="qz-p${buzzed}">${NAMES[buzzed]}</em> buzzed in!`;
      else if (phase === "reveal") status = revealLine();
      else if (phase === "open") status = locked[0] || locked[1] ? `Over to <em class="qz-p${locked[0] ? 1 : 0}">${NAMES[locked[0] ? 1 : 0]}</em>…` : "Who'll buzz first?";
      else if (phase === "armed" && (locked[0] || locked[1])) status = `<em class="qz-p${locked[0] ? 0 : 1}">${NAMES[locked[0] ? 0 : 1]}</em> jumped the gun!`;
      if (status) root.append(el(`<div class="qz-status">${status}</div>`));
    }
    const sc = el(`<div class="qz-scores"></div>`);
    for (const p of [0, 1] as P[]) {
      const lead = scores[p] > scores[p === 0 ? 1 : 0];
      sc.append(el(`<div class="qz-p${p}${lead ? " qz-lead" : ""}"><span>${NAMES[p]}</span><b>${scores[p]}</b></div>`));
    }
    root.append(sc);
    return root;
  }

  /** Closed: one player, question and choices together. */
  function soloView(wide: boolean): HTMLElement {
    const root = el(`<div class="qz qz-p0${wide ? " qz-wide" : ""}">
      <div class="qz-head"><span class="qz-name">${phase === "idle" || phase === "over" ? "Solo quiz" : `Q ${qi + 1} / ${order.length}`}</span><span class="qz-score">${scores[0]}</span></div></div>`);
    root.append(bar());
    root.append(el(`<div class="qz-q${phase === "armed" || phase === "idle" ? " qz-dim" : ""}">${phase === "idle" ? "Answer before the bar runs out. Open the phone to play with a friend." : phase === "over" ? `You scored ${scores[0]}.` : questionText()}</div>`));
    const main = el(`<div class="qz-main"></div>`);
    if (phase === "idle" || phase === "over") {
      const b = el(`<button class="qz-btn">${phase === "over" ? "Play again" : "Start"}</button>`);
      b.onclick = start;
      main.append(b);
    } else if (phase === "open" || phase === "answer") {
      const who: P = buzzed ?? 0;
      if (buzzed === 1) main.append(el(`<div class="qz-msg">${NAMES[1]} is answering</div>`));
      main.append(choicesEl((i) => (phase === "open" ? soloPick(i) : answer(who, i)), wide));
    } else if (phase === "reveal") {
      main.append(choicesEl(null, wide), el(`<div class="qz-msg">${result?.correct && result.p === 0 ? `<span class="qz-good">Correct! +1</span>` : revealLine()}</div>`));
      const n = el(`<button class="qz-btn qz-quiet">Next</button>`);
      n.onclick = next;
      main.append(n);
    } else {
      main.append(el(`<div class="qz-big">Get ready…</div>`));
    }
    root.append(main);
    return root;
  }

  function render(next: DuoState): void {
    state = next;
    bars = [];
    rings = [];
    const { pose, accessory } = next;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.display === "outer") {
      screens.outer.append(soloView(pose.id === "closed-landscape"));
    } else if (pose.split === "stacked") {
      screens.start.append(board());
      screens.end.append(pair());
    } else {
      screens.start.append(player(0, "qz-pad-s"));
      screens.end.append(player(1, "qz-pad-e"));
    }
    if (accessory && pose.display === "inner") screens.outer.append(host());
    paint(performance.now());
  }

  function paint(t: number): void {
    const timed = phase === "open" || phase === "answer";
    const left = timed ? Math.max(0, phaseEnd - t) : 0;
    const frac = timed ? left / phaseDur : phase === "reveal" ? 0 : 1;
    for (const b of bars) b.style.width = `${(timed ? frac : 0) * 100}%`;
    const C = 2 * Math.PI * 26;
    for (const r of rings) {
      r.arc.style.strokeDasharray = String(C);
      r.arc.style.strokeDashoffset = String(C * (1 - (timed ? frac : phase === "armed" ? 1 : 0)));
      const txt = timed ? String(Math.ceil(left / 1000)) : phase === "armed" ? "…" : phase === "reveal" ? "✓" : "";
      if (r.label.textContent !== txt) r.label.textContent = txt;
    }
  }

  function onKey(e: KeyboardEvent): void {
    if (e.repeat || state.pose.display !== "inner") return;
    const k = e.key.toLowerCase();
    if (k === "a") buzz(0);
    else if (k === "l") buzz(1);
  }
  window.addEventListener("keydown", onKey);

  let raf = 0;
  const loop = (t: number): void => {
    if (phase === "armed" && t >= phaseEnd) {
      sfx("reveal");
      open(OPEN_MS);
    } else if (phase === "open" && t >= phaseEnd) {
      sfx("wrong");
      reveal(null, false, null);
    } else if (phase === "answer" && t >= phaseEnd && buzzed !== null) {
      answer(buzzed, null);
    } else if (phase === "reveal" && t >= phaseEnd) {
      next();
    } else if (phase === "open" || phase === "answer") {
      const s = Math.ceil((phaseEnd - t) / 1000);
      if (s <= 3 && s !== lastTick) {
        lastTick = s;
        sfx("tick");
      }
    }
    paint(t);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  render(initial);

  return {
    render,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      style.remove();
    },
  };
}

export const quizBuzzersExample: Example = {
  id: "quiz-buzzers",
  title: "Quiz Buzzers",
  category: "learning",
  summary:
    "A quiz show on one phone. Two players share the inside, a big buzzer each — buzz before the question appears and you're locked out; first in gets the choices on their half. The outer display is the host's screen for the room: the question, a countdown ring, who buzzed, and the reveal.",
  bestPose: "stand",
  accessory: "The host and audience view: the question large, a countdown ring, who buzzed, the reveal and the scores.",
  poses: {
    closed: "A solo quiz: you play as Player 1, with the question and choices on the outer display and a bar running down.",
    "closed-landscape": "The solo quiz held wide: the question on the left, the choices on the right.",
    open: "Flat between two players: one half and one buzzer each, the choices appearing on the half that buzzed first.",
    "open-portrait": "The question across the top half, both buzzers side by side on the bottom half, the host view on the back.",
    book: "Held up by the host or propped between two players: a buzzer on each page, the audience view on the back.",
    table: "The question stands up for the players, both buzzers lie flat side by side, and the audience reads the back of the standing half.",
    stand: "Stood between the players and the room: a half and a buzzer each inside, the host's screen facing the audience outside.",
  },
  principle:
    "The audience view is extra UI on the outer display — Apple's scene accessory. The system can switch it off, so each player's half carries the question, the timer and the result, and the game never needs the outside to be played (HIG checklist §9, 'Scene accessories').",
  create,
};
