/**
 * Translator — your side inside, theirs on the outside.
 *
 * Stand the Duo on a café table between you and someone who speaks another
 * language. You read and pick what to say on the inner display; they read it,
 * translated and large, on the outer display facing them — and answer by
 * tapping a reply in their own language, which arrives translated on yours.
 *
 * This is the first example to use the outer display while the phone is open
 * (Apple's `sceneAccessory`, HIG checklist §9; phase 12). It works offline
 * from a phrasebook rather than a translation model: the point is the shape
 * of the conversation across two displays, not the translation.
 */

import type { DuoState, Example, Instance, Screens } from "../core/example.ts";
import { note, ready } from "../lib/audio.ts";

type Lang = "es" | "fr" | "ja";
type Line = { en: string } & Record<Lang, string>;

const LANGS: Record<Lang, { name: string; native: string; speech: string }> = {
  es: { name: "Spanish", native: "Español", speech: "es-ES" },
  fr: { name: "French", native: "Français", speech: "fr-FR" },
  ja: { name: "Japanese", native: "日本語", speech: "ja-JP" },
};

/** What you might say, grouped the way a traveller reaches for them. */
const MINE: { group: string; lines: Line[] }[] = [
  {
    group: "Hello",
    lines: [
      { en: "Hello! Do you speak English?", es: "¡Hola! ¿Habla inglés?", fr: "Bonjour ! Parlez-vous anglais ?", ja: "こんにちは！英語を話せますか？" },
      { en: "I'm using a translator — read this side.", es: "Estoy usando un traductor: lea este lado.", fr: "J'utilise un traducteur — lisez ce côté.", ja: "翻訳アプリを使っています。こちら側を読んでください。" },
      { en: "Thank you so much!", es: "¡Muchísimas gracias!", fr: "Merci beaucoup !", ja: "本当にありがとうございます！" },
    ],
  },
  {
    group: "Food",
    lines: [
      { en: "A table for two, please.", es: "Una mesa para dos, por favor.", fr: "Une table pour deux, s'il vous plaît.", ja: "二人用のテーブルをお願いします。" },
      { en: "What do you recommend?", es: "¿Qué me recomienda?", fr: "Que me recommandez-vous ?", ja: "おすすめは何ですか？" },
      { en: "I'm allergic to nuts.", es: "Soy alérgico a los frutos secos.", fr: "Je suis allergique aux noix.", ja: "ナッツアレルギーがあります。" },
      { en: "The bill, please.", es: "La cuenta, por favor.", fr: "L'addition, s'il vous plaît.", ja: "お会計をお願いします。" },
    ],
  },
  {
    group: "Getting around",
    lines: [
      { en: "Where is the train station?", es: "¿Dónde está la estación de tren?", fr: "Où est la gare ?", ja: "駅はどこですか？" },
      { en: "How far is it on foot?", es: "¿Qué tan lejos está a pie?", fr: "C'est loin à pied ?", ja: "歩いてどのくらいですか？" },
      { en: "Could you show me on the map?", es: "¿Me lo puede mostrar en el mapa?", fr: "Pouvez-vous me montrer sur la carte ?", ja: "地図で教えてもらえますか？" },
    ],
  },
  {
    group: "Shopping",
    lines: [
      { en: "How much is this?", es: "¿Cuánto cuesta esto?", fr: "Combien ça coûte ?", ja: "これはいくらですか？" },
      { en: "Can I pay by card?", es: "¿Puedo pagar con tarjeta?", fr: "Je peux payer par carte ?", ja: "カードで払えますか？" },
      { en: "Just looking, thanks.", es: "Solo estoy mirando, gracias.", fr: "Je regarde seulement, merci.", ja: "見ているだけです。ありがとう。" },
    ],
  },
];

/** What they can answer with, from the outer display, in their language. */
const THEIRS: Line[] = [
  { en: "Yes.", es: "Sí.", fr: "Oui.", ja: "はい。" },
  { en: "No.", es: "No.", fr: "Non.", ja: "いいえ。" },
  { en: "A little.", es: "Un poco.", fr: "Un peu.", ja: "少しだけ。" },
  { en: "Of course — follow me.", es: "Claro, sígame.", fr: "Bien sûr, suivez-moi.", ja: "もちろん、こちらへどうぞ。" },
  { en: "It's about ten minutes away.", es: "Está a unos diez minutos.", fr: "C'est à environ dix minutes.", ja: "十分くらいです。" },
  { en: "The fish of the day.", es: "El pescado del día.", fr: "Le poisson du jour.", ja: "本日の魚料理です。" },
  { en: "Twelve euros.", es: "Doce euros.", fr: "Douze euros.", ja: "十二ユーロです。" },
  { en: "Could you say that again?", es: "¿Puede repetirlo?", fr: "Vous pouvez répéter ?", ja: "もう一度お願いします。" },
];

type Turn = { who: "me" | "them"; line: Line };

const CSS = `
.tr { position:absolute; inset:0; display:flex; flex-direction:column; background:#f7f4ee; color:#1f1d1a; font:13px/1.35 ui-sans-serif,system-ui; }
.tr-dark { background:#141826; color:#eef1fa; }
.tr-head { display:flex; align-items:center; gap:8px; padding:10px 12px 6px; font-weight:650; font-size:12px; letter-spacing:.02em; }
.tr-head .tr-pill { margin-left:auto; display:flex; gap:4px; }
.tr-pill button { border:1px solid currentColor; background:none; color:inherit; border-radius:999px; padding:2px 8px; font:600 11px system-ui; cursor:pointer; opacity:.55; }
.tr-pill button[aria-pressed="true"] { opacity:1; background:#e0603a; border-color:#e0603a; color:#fff; }
.tr-log { flex:1; overflow-y:auto; padding:4px 12px 10px; display:flex; flex-direction:column; gap:6px; }
.tr-bub { max-width:88%; padding:7px 10px; border-radius:14px; }
.tr-bub small { display:block; opacity:.6; font-size:11px; margin-top:2px; }
.tr-bub.me { align-self:flex-end; background:#e0603a; color:#fff; border-bottom-right-radius:4px; }
.tr-bub.them { align-self:flex-start; background:#fff; border:1px solid #e3ddd2; border-bottom-left-radius:4px; }
.tr-empty { margin:auto; text-align:center; opacity:.55; font-size:12px; padding:0 18px; }
.tr-groups { display:flex; gap:4px; padding:8px 10px 4px; overflow-x:auto; }
.tr-groups button { flex:none; border:0; border-radius:999px; padding:4px 10px; background:#e8e2d6; font:600 11.5px system-ui; cursor:pointer; color:#1f1d1a; }
.tr-groups button[aria-pressed="true"] { background:#1f1d1a; color:#fff; }
.tr-phrases { flex:1; overflow-y:auto; padding:4px 10px 10px; display:flex; flex-direction:column; gap:6px; }
.tr-phrases button { text-align:left; border:1px solid #e3ddd2; background:#fff; border-radius:12px; padding:9px 11px; font:13px system-ui; cursor:pointer; color:#1f1d1a; }
.tr-phrases button:active { background:#fdeee8; }
.tr-say { flex:1; display:flex; flex-direction:column; justify-content:center; padding:14px 18px; gap:10px; }
.tr-say .big { font-size:clamp(18px, 9cqw, 30px); font-weight:650; line-height:1.2; }
.tr-say .gloss { opacity:.6; font-size:12px; }
.tr-say .waiting { opacity:.6; font-size:13px; }
.tr-replies { display:grid; grid-template-columns:1fr 1fr; gap:5px; padding:0 10px 10px; }
.tr-replies button { border:0; border-radius:10px; padding:8px 6px; background:#2a3150; color:#eef1fa; font:600 12px system-ui; cursor:pointer; }
.tr-replies button:active { background:#e0603a; }
.tr-speak { border:0; background:none; color:inherit; cursor:pointer; font-size:15px; opacity:.7; }
.tr-hint { font-size:10.5px; opacity:.55; text-align:center; padding:0 10px 8px; }
`;

function create(screens: Screens, initial: DuoState): Instance {
  let lang: Lang = "es";
  let group = 0;
  const turns: Turn[] = [];
  let state = initial;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const el = (html: string): HTMLElement => {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild as HTMLElement;
  };

  function speak(text: string, l: Lang | "en"): void {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = l === "en" ? "en-US" : LANGS[l].speech;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      /* No speech synthesis: the text is the translation. */
    }
  }

  function say(who: Turn["who"], line: Line): void {
    turns.push({ who, line });
    ready().then(() => note(who === "me" ? 79 : 74, 0.08, 0.08, "sine")).catch(() => {});
    render(state);
  }

  /** Your side: the conversation in English, with their words translated. */
  function log(): HTMLElement {
    const root = el(`<div class="tr"><div class="tr-head">Conversation<span class="tr-pill"></span></div><div class="tr-log"></div></div>`);
    const pill = root.querySelector(".tr-pill")!;
    for (const l of Object.keys(LANGS) as Lang[]) {
      const b = el(`<button aria-pressed="${l === lang}">${LANGS[l].native}</button>`) as HTMLButtonElement;
      b.onclick = () => {
        lang = l;
        render(state);
      };
      pill.append(b);
    }
    const list = root.querySelector(".tr-log")!;
    if (!turns.length) {
      list.append(el(`<p class="tr-empty">Stand the phone between you. Pick what to say — they read it in ${LANGS[lang].name} on the outside, and answer there.</p>`));
    }
    for (const t of turns) {
      const b = el(`<div class="tr-bub ${t.who}">${t.line.en}<small>${t.line[lang]}</small></div>`);
      list.append(b);
    }
    queueMicrotask(() => (list.scrollTop = list.scrollHeight));
    return root;
  }

  /** Your side: the phrasebook. */
  function phrases(): HTMLElement {
    const root = el(`<div class="tr"><div class="tr-groups"></div><div class="tr-phrases"></div><div class="tr-hint">Tap a phrase to show it to them</div></div>`);
    const tabs = root.querySelector(".tr-groups")!;
    MINE.forEach((g, i) => {
      const b = el(`<button aria-pressed="${i === group}">${g.group}</button>`) as HTMLButtonElement;
      b.onclick = () => {
        group = i;
        render(state);
      };
      tabs.append(b);
    });
    const list = root.querySelector(".tr-phrases")!;
    for (const line of MINE[group]!.lines) {
      const b = el(`<button>${line.en}</button>`) as HTMLButtonElement;
      b.onclick = () => say("me", line);
      list.append(b);
    }
    return root;
  }

  /** Their side, on the outer display: your last line, big, and replies in their language. */
  function theirs(): HTMLElement {
    const last = [...turns].reverse().find((t) => t.who === "me");
    const root = el(`<div class="tr tr-dark">
      <div class="tr-head">${LANGS[lang].native}<button class="tr-speak" aria-label="Read aloud">🔊</button></div>
      <div class="tr-say">${
        last
          ? `<div class="big">${last.line[lang]}</div><div class="gloss">${last.line.en}</div>`
          : `<div class="waiting">${lang === "ja" ? "相手がメッセージを選んでいます…" : lang === "fr" ? "Votre interlocuteur choisit un message…" : "La otra persona está eligiendo un mensaje…"}</div>`
      }</div>
      <div class="tr-replies"></div></div>`);
    root.querySelector<HTMLButtonElement>(".tr-speak")!.onclick = () => last && speak(last.line[lang], lang);
    const replies = root.querySelector(".tr-replies")!;
    for (const line of THEIRS) {
      const b = el(`<button>${line[lang]}</button>`) as HTMLButtonElement;
      b.onclick = () => say("them", line);
      replies.append(b);
    }
    return root;
  }

  /** Closed: a one-way phrasebook — pick, then turn the phone round to show them. */
  function phrasebook(): HTMLElement {
    const last = [...turns].reverse().find((t) => t.who === "me");
    const root = phrases();
    if (last) {
      root.prepend(el(`<div class="tr-say" style="flex:none;padding:10px 14px 4px"><div class="big" style="font-size:20px">${last.line[lang]}</div><div class="gloss">${last.line.en} · show them the screen</div></div>`));
    }
    root.querySelector(".tr-hint")!.textContent = "Open and stand it up to talk both ways";
    return root;
  }

  function render(next: DuoState): void {
    state = next;
    const { pose, accessory } = next;
    screens.outer.replaceChildren();
    screens.start.replaceChildren();
    screens.end.replaceChildren();
    if (pose.display === "outer") {
      screens.outer.append(phrasebook());
      return;
    }
    screens.start.append(log());
    screens.end.append(phrases());
    if (accessory) screens.outer.append(theirs());
  }

  return {
    render,
    destroy() {
      try {
        speechSynthesis.cancel();
      } catch {
        /* nothing to cancel */
      }
      style.remove();
    },
  };
}

export const translatorExample: Example = {
  id: "translator",
  title: "Translator",
  category: "productivity",
  summary:
    "Stand the Duo on the table between you and someone who speaks another language. You pick what to say inside; they read it, translated and large, on the outer display facing them — and answer by tapping a reply in their own language.",
  bestPose: "stand",
  accessory: "Your words in their language, large, with replies they can tap — for the person across the table.",
  poses: {
    closed: "A one-way phrasebook: pick a phrase, then turn the screen to show them.",
    "closed-landscape": "The same phrasebook, wider.",
    open: "The conversation and phrasebook inside; the outer display faces the table, so it is lit but nobody can see it.",
    "open-portrait": "Conversation above, phrases below, their side lit on the back.",
    book: "Held up like a menu: you read inside, they read the back — turn it around to see their side.",
    table: "Set down: your conversation stands up, phrases lie flat, and the back of the standing half faces them.",
    stand: "Stood on the table between you: your side inside, theirs on the outer display, both talking at once.",
  },
  principle:
    "The outer display shows extra UI for someone else while the app runs inside — Apple's scene accessory, which the system can switch off, so the app keeps working one-way without it (HIG checklist §9, 'Scene accessories').",
  create,
};
