// Option C · Storyboard — one example at a time, all six poses side by side.
import { writeFileSync, mkdirSync } from "node:fs";
import { POSES, CATS, EXAMPLES, FIT, exById, fit, glyph, page_, CAJON_POSES, CAJON_SUMMARY, CAJON_PRINCIPLE } from "./kit.mjs";

const out = new URL("../option-c/", import.meta.url);
mkdirSync(out, { recursive: true });
const FONTS = "family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600";

const CSS = `
:root{--bg:#0d0d0f;--p1:#151518;--p2:#1c1c20;--p3:#26262b;--ink:#efece6;--ink2:#a9a59c;--ink3:#6d6a64;--line:#2a2a2f;--amber:#ffb03a;--amber-soft:rgba(255,176,58,.14);
  --cond:"IBM Plex Sans Condensed",system-ui,sans-serif;--sans:"IBM Plex Sans",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace}
body{background:var(--bg);color:var(--ink);font:14px/1.45 var(--sans)}
.mono{font-family:var(--mono)}
.lbl{font:500 10.5px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}
.bar{display:flex;align-items:center;gap:22px;height:56px;padding:0 32px;border-bottom:1px solid var(--line)}
.brand{font:600 15px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;display:flex;align-items:center;gap:10px}
.brand i{width:10px;height:10px;border-radius:50%;background:var(--amber);box-shadow:0 0 12px var(--amber)}
.bar nav{display:flex;gap:4px;margin-left:20px}
.bar nav span{padding:7px 12px;border-radius:6px;font:500 12px/1 var(--mono);letter-spacing:.06em;color:var(--ink2)}
.bar nav span.on{background:var(--p3);color:var(--ink)}
.bar .r{margin-left:auto;display:flex;gap:16px;align-items:center;font:500 12px/1 var(--mono);color:var(--ink2)}
.key{display:inline-flex;min-width:22px;height:22px;align-items:center;justify-content:center;border-radius:5px;border:1px solid var(--line);background:var(--p2);font:500 11px/1 var(--mono);color:var(--ink2);padding:0 5px}
/* film sprockets */
.sprk{height:12px;background:radial-gradient(circle at 50% 50%,var(--bg) 0 3px,transparent 3.5px) 0 0/18px 12px repeat-x,var(--p1)}
.frame{position:relative;background:radial-gradient(ellipse at 50% 55%,#2a2a30 0%,#18181b 70%);border-radius:6px;overflow:hidden}
.frame.best{box-shadow:0 0 0 2px var(--amber),0 0 40px -8px rgba(255,176,58,.45)}
.fm{display:inline-flex;gap:2px}
.fm i{width:5px;height:12px;border-radius:1px;background:var(--p3)}
.fm i.b{background:var(--ink2)}.fm i.a{background:var(--amber)}
`;

const meter = (f) => `<span class="fm">${[1, 2, 3].map((k) => `<i class="${k <= f ? (f === 3 ? "a" : "b") : ""}"></i>`).join("")}</span>`;

/* ---------------- home: chapter index with filmstrips */
const H_CSS = `
.wrap{display:grid;grid-template-columns:300px 1fr;height:904px}
.toc{border-right:1px solid var(--line);padding:26px 24px;overflow:hidden}
.toc h1{margin:0 0 6px;font:600 40px/1 var(--cond);letter-spacing:-.01em}
.toc p{margin:0 0 22px;color:var(--ink2);font-size:13.5px}
.part{margin-top:16px}
.part .lbl{display:block;margin-bottom:6px}
.ch{display:flex;gap:10px;align-items:baseline;padding:5px 0;color:var(--ink2);font-size:13.5px}
.ch b{font:500 11px/1 var(--mono);color:var(--ink3);width:20px}
.ch.on{color:var(--ink)}.ch.on b{color:var(--amber)}
.reel{overflow:hidden;padding:22px 32px}
.reel-h{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px}
.reel-h .lbl{color:var(--ink2)}
.strip{display:grid;grid-template-columns:230px 1fr;gap:20px;padding:14px 0 18px;border-top:1px solid var(--line)}
.strip.on{background:linear-gradient(90deg,var(--amber-soft),transparent 60%);margin:0 -32px;padding-left:32px;padding-right:32px;border-top-color:rgba(255,176,58,.4)}
.si{display:flex;flex-direction:column;gap:6px;padding-top:4px}
.si .n{font:500 12px/1 var(--mono);color:var(--amber)}
.si h2{margin:0;font:600 30px/1 var(--cond)}
.si p{margin:2px 0 0;color:var(--ink2);font-size:13px;line-height:1.4}
.si .play{margin-top:auto;display:inline-flex;align-items:center;gap:8px;font:500 12px/1 var(--mono);color:var(--ink)}
.film{background:var(--p1);border-radius:8px;overflow:hidden}
.film .row{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:6px}
.film .frame{height:118px;display:flex;align-items:center;justify-content:center;padding-bottom:6px}
.film .cap{position:absolute;left:7px;right:7px;bottom:6px;display:flex;justify-content:space-between;align-items:center;font:500 9.5px/1 var(--mono);letter-spacing:.06em;color:var(--ink2);text-transform:uppercase}
.film .num{position:absolute;left:7px;top:6px;font:500 9.5px/1 var(--mono);color:var(--ink3)}
.film .frame.best .num{color:var(--amber)}
`;
const strip = (ex, n, on) => `<div class="strip ${on ? "on" : ""}"><div class="si"><span class="n">CH. ${String(n).padStart(2, "0")} · ${CATS.find((c) => c.id === ex.cat).label.toUpperCase()}</span><h2>${ex.title}</h2><p>${ex.line}</p><span class="play"><span class="key">↵</span> Play chapter</span></div>
  <div class="film"><div class="sprk"></div><div class="row">${POSES.map((p, i) => `<div class="frame ${ex.best === p.id ? "best" : ""}"><span class="num">${String(i + 1).padStart(2, "0")}${ex.best === p.id ? " ★" : ""}</span>${fit(p.id, ex, 140, 76)}<div class="cap"><span>${p.short}</span>${meter(FIT[ex.id][i])}</div></div>`).join("")}</div><div class="sprk"></div></div></div>`;

let n = 0;
const home = page_(
  "Duo Explorer — Storyboards",
  FONTS,
  CSS + H_CSS,
  `<header class="bar"><span class="brand"><i></i>Duo Explorer</span><nav><span class="on">Storyboards</span><span>Poses</span><span>HIG notes</span><span>About</span></nav><div class="r"><span><span class="key">J</span> <span class="key">K</span> chapter</span><span><span class="key">1</span>–<span class="key">6</span> pose</span><span>GitHub ↗</span></div></header>
<div class="wrap"><aside class="toc"><div class="lbl" style="margin-bottom:10px">12 chapters · 6 poses each</div><h1>Every idea,<br>every pose.</h1><p>Each chapter is one app, shot six ways. Read across to see what the fold changes.</p>
  ${CATS.map((c, pi) => `<div class="part"><span class="lbl">Part ${["I", "II", "III", "IV", "V", "VI"][pi]} · ${c.label}</span>${EXAMPLES.filter((e) => e.cat === c.id).map((e) => `<div class="ch ${e.id === "cajon" ? "on" : ""}"><b>${String(EXAMPLES.indexOf(e) + 1).padStart(2, "0")}</b>${e.title}</div>`).join("")}</div>`).join("")}</aside>
<main class="reel"><div class="reel-h"><div><span class="lbl">Contact sheet</span></div><span class="lbl">★ = the pose it was built for · bars = fit</span></div>
${EXAMPLES.slice(0, 5).map((e, i) => strip(e, i + 1, i === 0)).join("")}</main></div>`
);

/* ---------------- example: chapter 01 Cajón */
const cj = exById("cajon");
const BOX = { closed: "Strip, top", "closed-landscape": "Centre", open: "Left page", "open-portrait": "Top half", book: "Left page", table: "Standing half" };
const PLATE = { closed: "One pad", "closed-landscape": "Two thumbs", open: "Right page", "open-portrait": "Bottom half", book: "Right page", table: "Flat half" };
const E_CSS = `
.chap{display:flex;align-items:flex-end;gap:28px;padding:18px 32px 16px}
.chap .no{font:600 88px/.8 var(--cond);color:var(--amber);letter-spacing:-.02em}
.chap h1{margin:0;font:600 52px/.95 var(--cond);letter-spacing:-.01em}
.chap .meta{display:flex;gap:10px;margin-top:10px;align-items:center}
.chap .meta span{font:500 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);padding:5px 8px;border:1px solid var(--line);border-radius:4px}
.chap p{max-width:520px;margin:0 0 4px auto;color:var(--ink2);font-size:14px;line-height:1.5}
.nav2{display:flex;gap:8px;margin-left:24px}
.nav2 span{display:flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:8px;background:var(--p2);font:500 12px/1 var(--mono);color:var(--ink2);white-space:nowrap}
.nav2 span.n{background:var(--ink);color:var(--bg)}
.board{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:0 32px}
.panel{display:flex;flex-direction:column;gap:9px}
.panel .frame{height:236px;display:flex;align-items:center;justify-content:center}
.ph{display:flex;align-items:center;gap:8px;font:500 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
.ph b{color:var(--ink);font-weight:600}
.ph .sc{color:var(--ink3)}
.ph .fm{margin-left:auto}
.panel.best .ph b,.panel.best .ph .sc{color:var(--amber)}
.panel p{margin:0;font-size:13px;line-height:1.45;color:var(--ink2);min-height:38px}
.panel.best p{color:var(--ink)}
.tag{position:absolute;z-index:3;right:10px;top:10px;font:600 10px/1 var(--mono);letter-spacing:.12em;color:#1a1204;background:var(--amber);padding:5px 7px;border-radius:3px}
.hingeln{position:absolute;left:10px;top:10px;font:500 10px/1 var(--mono);color:var(--ink3)}
.diff{margin:16px 32px 0;border:1px solid var(--line);border-radius:8px;overflow:hidden;display:grid;grid-template-columns:160px repeat(6,1fr)}
.diff div{padding:9px 12px;border-left:1px solid var(--line);border-top:1px solid var(--line);font-size:12.5px;color:var(--ink2)}
.diff div.h{font:500 10.5px/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);background:var(--p1);display:flex;align-items:center;gap:6px}
.diff div.k{border-left:0;font:500 11px/1.2 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink3)}
.diff div.hl{background:var(--amber-soft);color:var(--ink)}
.diff .top{border-top:0}
.foot{display:flex;align-items:center;gap:14px;margin:14px 32px 0;font-size:12.5px;color:var(--ink2)}
.foot .hig{display:inline-flex;gap:6px;align-items:center;font:500 11px/1 var(--mono);color:var(--amber);border:1px solid rgba(255,176,58,.4);padding:5px 8px;border-radius:4px;white-space:nowrap}
.progress{display:flex;gap:4px;margin-left:auto}
.progress i{width:22px;height:4px;border-radius:2px;background:var(--p3)}
.progress i.on{background:var(--amber)}
`;
const example = page_(
  "Duo Explorer — Ch. 01 Cajón",
  FONTS,
  CSS + E_CSS,
  `<header class="bar"><span class="brand"><i></i>Duo Explorer</span><nav><span class="on">Storyboards</span><span>Poses</span><span>HIG notes</span><span>About</span></nav><div class="r"><span>Part I · Music</span><span class="progress">${EXAMPLES.map((e, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("")}</span></div></header>
<section class="chap"><span class="no">01</span><div><h1>Cajón</h1><div class="meta"><span>Music</span><span>★ Table</span><span>Hinge 105°</span></div></div><p>${CAJON_SUMMARY}</p><div class="nav2"><span><span class="key">J</span> Prev</span><span class="n">Next · Crate Sampler <span class="key" style="background:transparent;border-color:#bbb;color:var(--bg)">K</span></span></div></section>
<section class="board">${POSES.map((p, i) => {
    const best = p.id === "table";
    return `<div class="panel ${best ? "best" : ""}"><div class="ph"><span class="sc">SC ${String(i + 1).padStart(2, "0")}</span><b>${p.label}</b>${glyph(p.id, 14)}${meter([1, 2, 2, 2, 2, 3][i])}</div>
    <div class="frame ${best ? "best" : ""}"><span class="hingeln">${p.hinge}° · ${p.display.toLowerCase()} · ${p.size}</span>${best ? '<span class="tag">★ BUILT FOR THIS</span>' : ""}${fit(p.id, cj, p.id === "closed-landscape" ? 250 : 300, p.id === "closed-landscape" ? 190 : 214)}</div>
    <p>${CAJON_POSES[p.id]}</p></div>`;
  }).join("")}</section>
<section class="diff"><div class="h top k" style="background:var(--p1)">Across the fold</div>${POSES.map((p) => `<div class="h top ${p.id === "table" ? "hl" : ""}">${glyph(p.id, 13)}${p.short}</div>`).join("")}
  <div class="k">The box</div>${POSES.map((p) => `<div class="${p.id === "table" ? "hl" : ""}">${BOX[p.id]}</div>`).join("")}
  <div class="k">The plate</div>${POSES.map((p) => `<div class="${p.id === "table" ? "hl" : ""}">${PLATE[p.id]}</div>`).join("")}</section>
<div class="foot"><span class="hig">HIG §6 · Destination follows purpose ↗</span><span>${CAJON_PRINCIPLE}</span></div>`
);

/* ---------------- mobile */
const M_CSS = `
body{width:390px;overflow-x:hidden}
.mb{display:flex;align-items:center;justify-content:space-between;height:52px;padding:0 16px;border-bottom:1px solid var(--line)}
.mb .brand{font-size:12.5px}
.mch{padding:16px 16px 10px;display:flex;align-items:flex-end;gap:14px}
.mch .no{font:600 60px/.8 var(--cond);color:var(--amber)}
.mch h1{margin:0;font:600 38px/.95 var(--cond)}
.mch .lbl{display:block;margin-bottom:6px}
.snap{display:flex;gap:10px;padding:0 16px;overflow:hidden;margin-left:-281px}
.snap .panel{flex:none;width:300px;display:flex;flex-direction:column;gap:8px}
.snap .frame{height:300px;display:flex;align-items:center;justify-content:center}
.snap .panel.dim{opacity:.35}
.ph{display:flex;align-items:center;gap:8px;font:500 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
.ph b{color:var(--amber)}
.ph .fm{margin-left:auto}
.tag{position:absolute;z-index:3;right:10px;top:10px;font:600 10px/1 var(--mono);letter-spacing:.12em;color:#1a1204;background:var(--amber);padding:5px 7px;border-radius:3px}
.dots{display:flex;justify-content:center;gap:6px;padding:14px 0 4px}
.dots i{width:6px;height:6px;border-radius:50%;background:var(--p3)}
.dots i.on{width:20px;border-radius:3px;background:var(--amber)}
.mcap{padding:6px 16px 0;font-size:15px;line-height:1.5}
.sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:16px 16px 0}
.sheet .frame{height:92px}
.sheet .cap{position:absolute;left:6px;bottom:5px;font:500 9px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)}
.mfoot{position:fixed;left:0;bottom:0;width:390px;display:flex;gap:8px;padding:10px 16px 18px;background:linear-gradient(180deg,rgba(13,13,15,0),var(--bg) 30%)}
.mfoot span{flex:1;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--p2);font:500 12.5px/1 var(--mono);color:var(--ink2)}
.mfoot span.n{flex:1.6;background:var(--ink);color:var(--bg)}
`;
const order = ["book", "table", "closed"];
const mobile = page_(
  "Duo Explorer — Ch. 01 Cajón (mobile)",
  FONTS,
  CSS + M_CSS,
  `<div class="mb"><span class="brand"><i></i>Duo Explorer</span><span class="progress" style="display:flex;gap:3px">${EXAMPLES.map((e, i) => `<i style="width:12px;height:3px;border-radius:2px;background:${i === 0 ? "var(--amber)" : "var(--p3)"}"></i>`).join("")}</span></div>
<div class="mch"><span class="no">01</span><div><span class="lbl">Part I · Music</span><h1>Cajón</h1></div></div>
<div class="snap">${order.map((id) => {
    const p = POSES.find((x) => x.id === id);
    const i = POSES.indexOf(p);
    return `<div class="panel ${id !== "table" ? "dim" : ""}"><div class="ph">SC ${String(i + 1).padStart(2, "0")} <b>${p.label}</b> ${meter([1, 2, 2, 2, 2, 3][i])}</div><div class="frame ${id === "table" ? "best" : ""}">${id === "table" ? '<span class="tag">★ BUILT FOR THIS</span>' : ""}${fit(id, cj, 270, 280)}</div></div>`;
  }).join("")}</div>
<div class="dots">${POSES.map((p) => `<i class="${p.id === "table" ? "on" : ""}"></i>`).join("")}</div>
<p class="mcap">${CAJON_POSES.table}</p>
<div class="sheet">${POSES.map((p, i) => `<div class="frame ${p.id === "table" ? "best" : ""}">${fit(p.id, cj, 100, 76)}<span class="cap">${String(i + 1).padStart(2, "0")} ${p.short}</span></div>`).join("")}</div>
<div class="mfoot"><span>← 12</span><span class="n">Next · Crate Sampler →</span></div>`,
  { width: 390 }
);

writeFileSync(new URL("home.html", out), home);
writeFileSync(new URL("example.html", out), example);
writeFileSync(new URL("mobile.html", out), mobile);
console.log("C done");
