// Option B · Gallery wall — editorial, big type, live device cards.
import { writeFileSync, mkdirSync } from "node:fs";
import { POSES, CATS, EXAMPLES, exById, fit, glyph, page_, poseById, CAJON_POSES, CAJON_SUMMARY, CAJON_PRINCIPLE } from "./kit.mjs";

const out = new URL("../option-b/", import.meta.url);
mkdirSync(out, { recursive: true });
const FONTS = "family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700";

const COL = {
  music: { bg: "#ff6a3d", ink: "#2a0e02", soft: "#ffd9c9" },
  games: { bg: "#3a5bff", ink: "#ffffff", soft: "#d6ddff" },
  retro: { bg: "#17a589", ink: "#03261f", soft: "#c9efe6" },
  productivity: { bg: "#c7b8ff", ink: "#1f1147", soft: "#ebe5ff" },
  learning: { bg: "#ffcf3f", ink: "#2d2200", soft: "#fff0c2" },
  patterns: { bg: "#1b1916", ink: "#f4efe6", soft: "#e4ded3" },
};

const CSS = `
:root{--paper:#f3ede3;--ink:#16140f;--ink2:#5e584d;--line:rgba(22,20,15,.14);--serif:"Instrument Serif",Georgia,serif;--sans:Inter,system-ui,sans-serif}
body{background:var(--paper);color:var(--ink);font:15px/1.45 var(--sans)}
.nav{display:flex;align-items:center;gap:28px;padding:22px 48px}
.logo{font:400 30px/1 var(--serif);letter-spacing:-.01em;display:flex;align-items:center;gap:10px}
.logo i{font-style:italic}
.cats{display:flex;gap:6px;margin-left:24px}
.cats span{display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:99px;font-weight:600;font-size:13px;background:rgba(22,20,15,.06)}
.cats span b{width:9px;height:9px;border-radius:50%;background:var(--c)}
.cats span.on{background:var(--ink);color:var(--paper)}
.nav .r{margin-left:auto;display:flex;gap:22px;font-weight:500;color:var(--ink2);font-size:14px}

/* the live card animation: three renders crossfade, closed → open → best */
.live{position:relative}
.live .f{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;animation:cyc 9s infinite}
.live .f:nth-child(1){animation-delay:var(--o,0s)}.live .f:nth-child(2){animation-delay:calc(var(--o,0s) + 3s)}.live .f:nth-child(3){animation-delay:calc(var(--o,0s) + 6s)}
@keyframes cyc{0%{opacity:0;transform:scale(.96) rotate(-2deg)}6%{opacity:1;transform:none}30%{opacity:1;transform:none}36%{opacity:0;transform:scale(1.03) rotate(1.5deg)}100%{opacity:0}}
.tick{position:relative;height:16px;overflow:hidden}
.tick span{position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;white-space:nowrap;opacity:0;animation:cyc2 9s infinite}
.tick span:nth-child(1){animation-delay:var(--o,0s)}.tick span:nth-child(2){animation-delay:calc(var(--o,0s) + 3s)}.tick span:nth-child(3){animation-delay:calc(var(--o,0s) + 6s)}
@keyframes cyc2{0%{opacity:0;transform:translateY(8px)}5%{opacity:1;transform:none}30%{opacity:1}35%{opacity:0;transform:translateY(-8px)}100%{opacity:0}}
.pips{display:flex;gap:4px}
.pips i{width:18px;height:3px;border-radius:2px;background:currentColor;opacity:.25}
.pips i{animation:pip 9s infinite}.pips i:nth-child(1){animation-delay:var(--o,0s)}.pips i:nth-child(2){animation-delay:calc(var(--o,0s) + 3s)}.pips i:nth-child(3){animation-delay:calc(var(--o,0s) + 6s)}
@keyframes pip{0%,33%{opacity:1}34%,100%{opacity:.25}}
`;

const live = (ex, w, h, poses = ["closed", "open", ex.best === "open" ? "book" : ex.best]) =>
  `<div class="live" style="width:${w}px;height:${h}px">${poses.map((p) => `<div class="f">${fit(p, ex, w, h)}</div>`).join("")}</div>`;
const tick = (ex, poses = ["closed", "open", ex.best === "open" ? "book" : ex.best]) =>
  `<div class="tick" style="width:120px">${poses.map((p) => `<span>${glyph(p, 15)}${poseById(p).label}</span>`).join("")}</div>`;

let K = 0;
const card = (ex, span = 1) => {
  const c = COL[ex.cat];
  const o = -((K++ * 4) % 9) - 1;
  const w = span === 2 ? 640 : 300;
  return `<article class="card" style="grid-column:span ${span};background:${c.bg};color:${c.ink};--o:${o}s">
    <div class="card-top"><span class="best">${glyph(ex.best, 14)} Best ${poseById(ex.best).short.toLowerCase()}</span><span class="pips"><i></i><i></i><i></i></span></div>
    <div class="card-dev">${live(ex, span === 2 ? 560 : 260, 300)}</div>
    <div class="card-foot"><h3>${ex.title}</h3><p>${ex.line}</p><div class="card-meta">${tick(ex)}<span class="go">Open →</span></div></div></article>`;
};
const poster = (cat, n) => {
  const c = CATS.find((x) => x.id === cat);
  const k = COL[cat];
  return `<article class="poster"><span class="num">${String(n).padStart(2, "0")}</span><h2>${c.label}</h2><p>${c.blurb}</p><span class="count" style="--c:${k.bg}"><b></b>${EXAMPLES.filter((e) => e.cat === cat).length} examples</span></article>`;
};

const HOME_CSS = `
.hero{display:grid;grid-template-columns:1.15fr .85fr;gap:24px;align-items:center;padding:24px 48px 40px}
.hero h1{margin:0;font:400 132px/.9 var(--serif);letter-spacing:-.035em}
.hero h1 i{color:#ff6a3d}
.hero p{max-width:520px;font-size:19px;line-height:1.45;color:var(--ink2);margin:28px 0 0}
.hero .ctas{display:flex;gap:10px;margin-top:28px}
.pill{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 22px;border-radius:99px;font-weight:600;font-size:15px;background:var(--ink);color:var(--paper)}
.pill.o{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.hero-dev{position:relative;height:470px;border-radius:28px;background:radial-gradient(circle at 50% 60%,#ffd2bf,#ff6a3d 70%);display:flex;align-items:center;justify-content:center;overflow:hidden}
.hero-dev .cap{position:absolute;left:24px;bottom:20px;right:24px;display:flex;justify-content:space-between;align-items:center;color:#2a0e02;font-weight:600;font-size:13px}
.hero-dev .stamp{position:absolute;right:22px;top:20px;font:italic 400 28px/1 var(--serif);color:#2a0e02;transform:rotate(6deg)}
.wall{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:0 48px 28px}
.card{border-radius:26px;padding:18px 20px 20px;display:flex;flex-direction:column;min-height:440px;position:relative;overflow:hidden}
.card-top{display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:12.5px}
.best{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:99px;background:rgba(255,255,255,.28)}
.card-dev{flex:1;display:flex;align-items:center;justify-content:center;margin:6px 0}
.card-foot h3{margin:0;font:400 38px/1 var(--serif);letter-spacing:-.01em}
.card-foot p{margin:8px 0 0;font-size:14px;line-height:1.4;opacity:.85;max-width:420px}
.card-meta{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-weight:600;font-size:12.5px}
.go{padding:7px 12px;border-radius:99px;background:rgba(0,0,0,.14)}
.poster{padding:10px 8px 0 4px;display:flex;flex-direction:column;border-top:2px solid var(--ink)}
.poster .num{font:italic 400 30px/1 var(--serif);color:var(--ink2);margin-top:10px}
.poster h2{margin:4px 0 0;font:400 84px/.95 var(--serif);letter-spacing:-.03em}
.poster p{font-size:16px;line-height:1.45;color:var(--ink2);margin:14px 0 0}
.count{margin-top:auto;display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px;padding-bottom:6px}
.count b{width:10px;height:10px;border-radius:50%;background:var(--c)}
.marquee{margin:18px 0 26px;border-top:1.5px solid var(--ink);border-bottom:1.5px solid var(--ink);padding:12px 0;overflow:hidden;white-space:nowrap;font:italic 400 30px/1 var(--serif)}
.marquee span{margin:0 18px}
.marquee b{font-style:normal;font-family:var(--sans);font-size:14px;font-weight:600;vertical-align:6px;margin:0 18px}
`;

const home = page_(
  "Duo Explorer — Gallery",
  FONTS,
  CSS + HOME_CSS,
  `<nav class="nav"><div class="logo">${glyph("book", 26)}<span>Duo <i>Explorer</i></span></div>
  <div class="cats"><span class="on">All 12</span>${CATS.map((c) => `<span style="--c:${COL[c.id].bg}"><b></b>${c.label}</span>`).join("")}</div>
  <div class="r"><span>What is Duo?</span><span>The six poses</span><span>GitHub</span></div></nav>
<section class="hero"><div><h1>Twelve apps,<br>one <i>fold.</i></h1><p>Ideas for Apple’s folding iPhone Duo — each one running live in all six poses. Fold it, stand it up, set it down like a tiny laptop, and watch the app change its mind.</p>
  <div class="ctas"><span class="pill">Start with the Cajón →</span><span class="pill o">Shuffle</span></div></div>
  <div class="hero-dev" style="--o:-7s">${live(exById("cajon"), 520, 420, ["closed", "book", "table"])}<span class="stamp">set it down &amp; play!</span><div class="cap">${tick(exById("cajon"), ["closed", "book", "table"])}<span class="pips"><i></i><i></i><i></i></span></div></div></section>
<div class="marquee">${["closed", "open", "book", "table", "closed · landscape", "open · portrait"].map((p) => `<span>${p}</span><b>✦</b>`).join("").repeat(2)}</div>
<section class="wall">
  ${poster("music", 1)}${card(exById("cajon"), 2)}${card(exById("sampler"))}
  ${poster("games", 2)}${card(exById("battleships"), 2)}${card(exById("hinge-guess"))}
  ${poster("retro", 3)}${card(exById("pocket-console"))}${card(exById("duo-man"))}${card(exById("critterdex"))}
</section>`
);

/* ---------------- example: focused view */
const cj = exById("cajon");
const EX_CSS = `
.focus{display:grid;grid-template-columns:520px 1fr;gap:0;height:884px;margin:0 24px 24px;border-radius:32px;overflow:hidden;background:#ff6a3d;color:#2a0e02;position:relative}
.fl{padding:40px 44px;display:flex;flex-direction:column}
.back{display:flex;align-items:center;gap:10px;font-weight:600;font-size:13px}
.back span{padding:8px 13px;border-radius:99px;background:rgba(255,255,255,.3)}
.fl h1{margin:28px 0 0;font:400 168px/.82 var(--serif);letter-spacing:-.045em}
.fl .sub{font:italic 400 32px/1.1 var(--serif);margin:14px 0 0}
.fl p.lede{font-size:16.5px;line-height:1.5;margin:22px 0 0;max-width:420px}
.pchips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px}
.inpose{margin-top:auto;padding-top:18px;border-top:1.5px solid rgba(42,14,2,.35)}
.inpose small{display:block;font:600 11.5px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:10px}
.inpose p{margin:0;font:400 25px/1.2 var(--serif)}
.pchips span{display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.22);font-weight:600;font-size:13.5px}
.pchips span.on{background:#2a0e02;color:#ffd9c9}
.pchips span em{margin-left:auto;font-style:normal;font-size:11px;opacity:.6}
.fr{position:relative;background:radial-gradient(ellipse at 50% 62%,#ffe7dc 0%,#ffb899 38%,#ff6a3d 72%);display:flex;align-items:center;justify-content:center}
.fr .dev{transform:translateY(-10px)}
.sticker{position:absolute;padding:12px 16px;border-radius:14px;background:#fff8f2;color:#2a0e02;box-shadow:0 14px 30px -12px rgba(80,20,0,.4);max-width:230px;font-size:13.5px;line-height:1.35}
.sticker b{display:block;font:italic 400 24px/1 var(--serif);margin-bottom:4px}
.sticker::after{content:"";position:absolute;width:10px;height:10px;border-radius:50%;background:#2a0e02;box-shadow:0 0 0 4px rgba(42,14,2,.2)}
.sticker.s1{left:60px;top:170px;transform:rotate(-3deg)}.sticker.s1::after{right:-34px;top:40px}
.sticker.s2{right:48px;top:400px;transform:rotate(2.5deg)}.sticker.s2::after{left:-34px;top:30px}
.sticker.s3{left:70px;bottom:120px;transform:rotate(-1.5deg)}.sticker.s3::after{right:-30px;top:10px}
.quote{position:absolute;left:40px;right:40px;bottom:30px;display:flex;align-items:flex-end;justify-content:space-between;gap:30px}
.quote q{font:italic 400 22px/1.25 var(--serif);max-width:560px;quotes:"“" "”"}
.quote cite{display:block;font:600 12px/1 var(--sans);font-style:normal;margin-top:8px;opacity:.7;letter-spacing:.04em}
.nextc{display:flex;align-items:center;gap:14px;padding:10px 12px 10px 10px;border-radius:20px;background:#fff8f2;flex:none}
.nextc .th{width:74px;height:74px;border-radius:14px;background:#ff6a3d;display:flex;align-items:center;justify-content:center;overflow:hidden}
.nextc small{display:block;font-weight:600;font-size:11px;opacity:.6;letter-spacing:.06em;text-transform:uppercase}
.nextc b{display:block;font:400 26px/1 var(--serif)}
.close{position:absolute;right:26px;top:24px;width:44px;height:44px;border-radius:50%;background:#2a0e02;color:#ffd9c9;display:flex;align-items:center;justify-content:center;font-size:20px;z-index:3}
`;
const example = page_(
  "Duo Explorer — Cajón",
  FONTS,
  CSS + EX_CSS + `.nav{padding:14px 48px}`,
  `<nav class="nav"><div class="logo">${glyph("book", 26)}<span>Duo <i>Explorer</i></span></div>
  <div class="cats"><span>All 12</span>${CATS.map((c) => `<span class="${c.id === "music" ? "on" : ""}" style="--c:${COL[c.id].bg}"><b></b>${c.label}</span>`).join("")}</div>
  <div class="r"><span>What is Duo?</span><span>The six poses</span><span>GitHub</span></div></nav>
<section class="focus">
  <div class="fl"><div class="back"><span>← Gallery</span><span>Music · 1 of 2</span></div>
    <h1>Cajón</h1><div class="sub">a drum you set on the table</div>
    <p class="lede">${CAJON_SUMMARY}</p>
    <div class="inpose"><small>In table pose · the one it was built for</small><p>${CAJON_POSES.table}</p></div>
    <div class="pchips">${POSES.map((p) => `<span class="${p.id === "table" ? "on" : ""}">${glyph(p.id, 18)}${p.short}${p.id === "table" ? "<em>★ best</em>" : ""}</span>`).join("")}</div></div>
  <div class="fr"><span class="close">×</span>
    <div class="dev">${fit("table", cj, 560, 640)}</div>
    <div class="sticker s1"><b>watch up here</b>The box answers: the plate flexes where you hit, snare wires buzz.</div>
    <div class="sticker s2"><b>slap by the hinge</b>The fold is the plate’s top edge. Bass lives down low.</div>
    <div class="quote"><div><q>Content you watch on top, controls you touch on the stable bottom half.</q><cite>APPLE HIG · DESIGNING FOR IPHONE DUO · §6</cite></div>
      <div class="nextc"><div class="th">${fit("table", exById("sampler"), 66, 66)}</div><div><small>Next in Music</small><b>Crate Sampler →</b></div></div></div>
  </div>
</section>`
);

/* ---------------- mobile */
const M_CSS = `
body{width:390px;overflow-x:hidden}
.mn{display:flex;align-items:center;justify-content:space-between;padding:14px 16px}
.mn .logo{font-size:24px}
.mn .menu{width:40px;height:40px;border-radius:50%;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center}
.mh{padding:4px 16px 0}
.mh h1{margin:0;font:400 64px/.9 var(--serif);letter-spacing:-.035em}
.mh h1 i{color:#ff6a3d}
.mh p{margin:12px 0 0;color:var(--ink2);font-size:15px}
.mc{display:flex;gap:6px;padding:18px 16px 14px;overflow:hidden}
.mc span{flex:none;display:flex;align-items:center;gap:6px;padding:8px 13px;border-radius:99px;background:rgba(22,20,15,.06);font-weight:600;font-size:13px}
.mc span b{width:8px;height:8px;border-radius:50%;background:var(--c)}
.mc span.on{background:var(--ink);color:var(--paper)}
.feed{display:flex;flex-direction:column;gap:14px;padding:0 16px 30px}
.mcard{border-radius:26px;padding:16px 18px 18px;position:relative;overflow:hidden}
.mcard .top{display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:12px}
.mcard .best{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:99px;background:rgba(255,255,255,.28)}
.mcard .d{display:flex;justify-content:center;margin:4px 0}
.mcard h3{margin:0;font:400 40px/1 var(--serif)}
.mcard p{margin:6px 0 0;font-size:14px;opacity:.85}
.mcard .meta{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-weight:600;font-size:12px}
.sec-h{display:flex;align-items:baseline;gap:10px;padding:6px 2px 0;border-top:2px solid var(--ink)}
.sec-h i{font:italic 400 20px/1 var(--serif);color:var(--ink2);padding-top:10px}
.sec-h b{font:400 40px/1.1 var(--serif);font-weight:400}
`;
const mcard = (ex, oo) => {
  const c = COL[ex.cat];
  const o = oo ?? -((K++ * 4) % 9) - 1;
  return `<article class="mcard" style="background:${c.bg};color:${c.ink};--o:${o}s"><div class="top"><span class="best">${glyph(ex.best, 13)} Best ${poseById(ex.best).short.toLowerCase()}</span><span class="pips"><i></i><i></i><i></i></span></div>
  <div class="d">${live(ex, 320, 250)}</div><h3>${ex.title}</h3><p>${ex.line}</p><div class="meta">${tick(ex)}<span class="go" style="padding:7px 12px;border-radius:99px;background:rgba(0,0,0,.14)">Open →</span></div></article>`;
};
const mobile = page_(
  "Duo Explorer — Gallery (mobile)",
  FONTS,
  CSS + M_CSS,
  `<div class="mn"><div class="logo">${glyph("book", 22)}<span>Duo <i>Explorer</i></span></div><span class="menu"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 8h16M4 16h16"/></svg></span></div>
<div class="mh"><h1>Twelve apps, one <i>fold.</i></h1><p>Every idea, live in all six poses.</p></div>
<div class="mc"><span class="on">All</span>${CATS.map((c) => `<span style="--c:${COL[c.id].bg}"><b></b>${c.label}</span>`).join("")}</div>
<div class="feed"><div class="sec-h"><i>01</i><b>Music</b></div>${mcard(exById("cajon"), -7)}${mcard(exById("sampler"))}<div class="sec-h"><i>02</i><b>Games</b></div>${mcard(exById("battleships"))}</div>`,
  { width: 390 }
);

writeFileSync(new URL("home.html", out), home);
writeFileSync(new URL("example.html", out), example);
writeFileSync(new URL("mobile.html", out), mobile);
console.log("B done");
