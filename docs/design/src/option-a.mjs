// Option A · Lab bench — a refined three-column tool with a spec-sheet feel.
import { writeFileSync, mkdirSync } from "node:fs";
import { POSES, CATS, EXAMPLES, FIT, exById, fit, device, glyph, page_, CAJON_POSES, CAJON_SUMMARY, CAJON_PRINCIPLE } from "./kit.mjs";

const out = new URL("../option-a/", import.meta.url);
mkdirSync(out, { recursive: true });
const FONTS = "family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700";

const CSS = `
:root{--bg:#f4f2ee;--surface:#fff;--s2:#ebe8e2;--s3:#e3dfd7;--ink:#1d1c1a;--ink2:#5d5a54;--ink3:#8f8b84;--line:#dcd8d0;--line2:#e8e4dc;--accent:#d2552a;--accent-soft:#f6e1d6;
  --sans:Inter,ui-sans-serif,system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
body{background:var(--bg);color:var(--ink);font:13px/1.45 var(--sans)}
.mono{font-family:var(--mono)}
.cap{font:600 10.5px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink3)}
.app{display:grid;grid-template-columns:248px minmax(0,1fr) 352px;grid-template-rows:52px minmax(0,1fr);height:960px}
.top{grid-column:1/-1;display:flex;align-items:center;gap:18px;padding:0 18px;border-bottom:1px solid var(--line);background:var(--bg)}
.wm{font:800 17px/1 var(--sans);letter-spacing:-.02em;display:flex;align-items:center;gap:9px}
.wm b{color:var(--accent)}
.wm svg{color:var(--ink)}
.ver{font:500 10.5px/1 var(--mono);padding:4px 6px;border:1px solid var(--line);border-radius:4px;color:var(--ink2)}
.search{margin-left:12px;width:320px;height:30px;border-radius:7px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;gap:8px;padding:0 10px;color:var(--ink3)}
.search kbd{margin-left:auto;font:500 10.5px/1 var(--mono);padding:3px 5px;border-radius:4px;background:var(--s2);color:var(--ink2)}
.top nav{margin-left:auto;display:flex;gap:18px;color:var(--ink2);font-weight:500}
.top nav a{text-decoration:none;color:inherit}
.top nav a.on{color:var(--ink)}
.spec{font:500 10.5px/1 var(--mono);color:var(--ink3);padding-left:18px;border-left:1px solid var(--line)}

.rail{border-right:1px solid var(--line);overflow:hidden;padding:14px 10px}
.rail .cap{display:flex;justify-content:space-between;padding:14px 8px 6px}
.rail .cap:first-child{padding-top:2px}
.ri{display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:7px;color:var(--ink)}
.ri svg{color:var(--ink3);flex:none}
.ri .n{flex:1;font-weight:500}
.ri .dots{display:flex;gap:2px}
.ri .dots i{width:4px;height:10px;border-radius:1px;background:var(--line)}
.ri .dots i.l2{background:#bdb7ac}.ri .dots i.l3{background:var(--accent)}
.ri.on{background:var(--ink);color:#fff}.ri.on svg{color:#fff}
.ri.on .dots i{background:#555}.ri.on .dots i.l2{background:#999}.ri.on .dots i.l3{background:#f07a4a}
.rail .foot{margin:18px 8px 0;padding-top:12px;border-top:1px solid var(--line);color:var(--ink3);font-size:11.5px}

.main{overflow:hidden;display:flex;flex-direction:column;min-width:0}
.panel{border-left:1px solid var(--line);background:var(--surface);overflow:hidden;display:flex;flex-direction:column}
.sec{padding:14px 20px;border-bottom:1px solid var(--line2)}
.sec .cap{margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}
.kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:12.5px}
.kv dt{color:var(--ink3);font-family:var(--mono);font-size:11px;padding-top:1px}
.kv dd{margin:0;font-weight:500}
.cite{display:inline-flex;align-items:center;gap:5px;font:600 10.5px/1 var(--mono);color:var(--accent);background:var(--accent-soft);padding:4px 7px;border-radius:4px;white-space:nowrap;text-decoration:none;vertical-align:1px}
.btn{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:7px;border:1px solid var(--line);background:var(--surface);font-weight:600;font-size:12.5px;color:var(--ink)}
.btn.pri{background:var(--ink);color:#fff;border-color:var(--ink)}

/* matrix */
.mh{display:flex;align-items:flex-end;gap:16px;padding:18px 28px 14px;border-bottom:1px solid var(--line)}
.mh h1{margin:0;font:700 24px/1.1 var(--sans);letter-spacing:-.02em}
.mh p{margin:6px 0 0;color:var(--ink2)}
.seg{display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden;background:var(--surface);margin-left:auto}
.seg span{white-space:nowrap;padding:7px 12px;font-weight:600;font-size:12px;color:var(--ink2);border-left:1px solid var(--line)}
.seg span:first-child{border-left:0}.seg span.on{background:var(--ink);color:#fff}
table.mx{width:100%;border-collapse:collapse}
.mx th{position:sticky;top:0;background:var(--bg);font:600 10.5px/1.2 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);text-align:center;padding:10px 6px;border-bottom:1px solid var(--line)}
.mx th svg{display:block;margin:0 auto 5px;color:var(--ink2)}
.mx th.l{text-align:left;padding-left:28px}
.mx td{border-bottom:1px solid var(--line2);padding:0 6px;height:47px;text-align:center}
.mx td.ex{text-align:left;padding-left:20px}
.mx .exc{display:flex;align-items:center;gap:12px}
.mx .th{width:38px;height:38px;border-radius:8px;background:var(--s2);display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none}
.mx .exc b{display:block;font-weight:600;font-size:13px}
.mx .exc span{display:block;color:var(--ink3);font-size:11.5px;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mx tr.cat td{height:28px;text-align:left;padding-left:28px;background:var(--bg);font:600 10.5px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink2)}
.mx tr.cat td em{font-style:normal;color:var(--ink3);text-transform:none;letter-spacing:0;font-family:var(--sans);font-weight:400;margin-left:10px}
.mx tr.sel td{background:#fff8f4}
.mx tr.sel td.ex{box-shadow:inset 3px 0 0 var(--accent)}
.fit{display:inline-block;width:12px;height:12px;border-radius:50%}
.f1{box-shadow:inset 0 0 0 1.5px #c6c0b5}
.f2{background:#8f8b84}
.f3{background:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.mx .ref{font:500 10.5px/1 var(--mono);color:var(--ink2)}
.legend{display:flex;gap:18px;align-items:center;padding:12px 28px;border-top:1px solid var(--line);color:var(--ink2);font-size:11.5px;margin-top:auto;background:var(--bg)}
.legend span{display:flex;align-items:center;gap:6px}

/* bench */
.crumb{display:flex;align-items:center;gap:10px;padding:14px 24px;border-bottom:1px solid var(--line)}
.crumb .cap{color:var(--ink3)}
.crumb h1{margin:0;font:700 20px/1 var(--sans);letter-spacing:-.02em}
.badge{display:inline-flex;align-items:center;gap:5px;font:600 11px/1 var(--mono);padding:5px 8px;border-radius:5px;background:var(--accent-soft);color:var(--accent)}
.tools{margin-left:auto;display:flex;gap:8px;align-items:center}
.tg{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink2);padding:0 4px}
.tg i{width:26px;height:15px;border-radius:8px;background:var(--line);position:relative}
.tg i::after{content:"";position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.tg i.on{background:var(--ink)}.tg i.on::after{left:13px}
.stage{flex:1;position:relative;min-height:0;background:
  radial-gradient(circle,#d6d1c7 1px,transparent 1.2px) 0 0/20px 20px,var(--bg);display:flex;align-items:center;justify-content:center}
.stage .dev{position:relative}
.dim{position:absolute;font:500 10.5px/1 var(--mono);color:var(--accent);display:flex;align-items:center;gap:6px;white-space:nowrap}
.dim.h{height:14px}
.dim.h::before,.dim.h::after{content:"";flex:1;height:1px;background:var(--accent)}
.dim.v{flex-direction:column;width:14px}
.dim.v::before,.dim.v::after{content:"";flex:1;width:1px;background:var(--accent)}
.dim.v span{writing-mode:vertical-rl;transform:rotate(180deg)}
.call{position:absolute;width:150px;font-size:11.5px;line-height:1.35;color:var(--ink2);padding-left:52px}
.call b{display:block;margin-bottom:3px;font:600 10.5px/1 var(--mono);letter-spacing:.08em;color:var(--ink);text-transform:uppercase}
.call::before{content:"";position:absolute;left:0;top:5px;width:44px;height:1px;background:var(--ink3)}
.call::after{content:"";position:absolute;left:-3px;top:2px;width:7px;height:7px;border-radius:50%;background:var(--accent)}
.call.l{padding:0 52px 0 0;text-align:right}
.call.l::before{left:auto;right:0}.call.l::after{left:auto;right:-3px}
.corner{position:absolute;font:500 10.5px/1.6 var(--mono);color:var(--ink3)}
.timeline{border-top:1px solid var(--line);background:var(--surface);padding:12px 24px 14px}
.poses{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.pz{border:1px solid var(--line);border-radius:9px;padding:9px 10px;display:flex;gap:10px;align-items:center;background:var(--bg)}
.pz svg{color:var(--ink2);flex:none}
.pz b{display:block;font-size:12px;font-weight:600}
.pz span{display:block;font:500 10.5px/1.3 var(--mono);color:var(--ink3)}
.pz .fm{margin-left:auto;display:flex;gap:2px}
.pz .fm i{width:4px;height:12px;border-radius:1px;background:var(--line)}
.pz .fm i.a{background:var(--accent)}.pz .fm i.b{background:#8f8b84}
.pz.on{background:var(--ink);border-color:var(--ink);color:#fff}
.pz.on svg{color:#fff}.pz.on span{color:#aaa}
.track{position:relative;height:40px;margin:12px 6px 0}
.track .ax{position:absolute;left:0;right:0;top:16px;height:2px;background:var(--line);border-radius:1px}
.track .rng{position:absolute;top:15px;height:4px;background:var(--accent-soft);border-radius:2px}
.track .tk{position:absolute;top:26px;font:500 10px/1 var(--mono);color:var(--ink3);transform:translateX(-50%)}
.track .mk{position:absolute;top:10px;width:1px;height:14px;background:var(--ink3)}
.track .mk em{position:absolute;bottom:17px;left:50%;transform:translateX(-50%);font:600 10px/1 var(--mono);color:var(--ink2);font-style:normal;white-space:nowrap}
.track .th{position:absolute;top:8px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px var(--accent),0 2px 6px rgba(0,0,0,.2)}
.sheet{width:100%;border-collapse:collapse;font-size:11.5px;line-height:1.4}
.sheet td{padding:5px 0;border-top:1px solid var(--line2);vertical-align:top}
.sheet td:first-child{width:24px;color:var(--ink3);padding-top:6px}
.sheet td:nth-child(2){width:84px;font-weight:600}
.sheet td:last-child{color:var(--ink2)}
.sheet tr.on td{color:var(--ink)}
.sheet tr.on td:first-child{color:var(--accent)}
.sheet tr.on td:nth-child(2){color:var(--accent)}
.lead{font-size:14px;line-height:1.5;margin:0}
.note{font-size:12.5px;color:var(--ink2);margin:10px 0 0;line-height:1.5}
.cred{font-size:12px;color:var(--ink2);margin:0;padding-left:14px}
.cred li{margin:3px 0}.cred b{color:var(--ink);font-weight:600}
.regions{display:flex;gap:6px;flex-wrap:wrap}
.regions span{font:500 10.5px/1 var(--mono);padding:5px 7px;border:1px dashed var(--ink3);border-radius:4px;color:var(--ink2)}
`;

const catCount = (c) => EXAMPLES.filter((e) => e.cat === c).length;
const fitBars = (id) => FIT[id].map((f) => `<i class="l${f}"></i>`).join("");

const top = (active) => `<header class="top">
  <div class="wm">${glyph("table", 20)}<span>Duo <b>Explorer</b></span></div><span class="ver">v1 · HIG 2026-09</span>
  <div class="search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>Search examples, poses, HIG…<kbd>⌘K</kbd></div>
  <nav><a class="${active === "catalog" ? "on" : ""}">Catalog</a><a class="${active === "bench" ? "on" : ""}">Bench</a><a>Poses</a><a>HIG</a><a>Roadmap</a><a>GitHub</a></nav>
  <span class="spec">iPhone Duo · emulated · leaf 300×380 pt</span></header>`;

const rail = (sel) => `<aside class="rail">${CATS.map(
  (c, i) => `<div class="cap"><span>${c.label}</span><span>${String(catCount(c.id)).padStart(2, "0")}</span></div>${EXAMPLES.filter((e) => e.cat === c.id)
    .map((e) => `<div class="ri ${e.id === sel ? "on" : ""}">${glyph(e.best, 16)}<span class="n">${e.title}</span><span class="dots">${fitBars(e.id)}</span></div>`)
    .join("")}`
).join("")}<div class="foot">Bars = fit in each of the six poses, closed → table.</div></aside>`;

/* ---------------- home: the pose matrix */
const matrix = () => `<table class="mx"><thead><tr><th class="l">Example</th>${POSES.map((p) => `<th>${glyph(p.id, 20)}${p.short}</th>`).join("")}<th>Hinge</th><th>HIG</th></tr></thead><tbody>
${CATS.map(
  (c) => `<tr class="cat"><td colspan="9">${c.label}<em>${c.blurb}</em></td></tr>` +
    EXAMPLES.filter((e) => e.cat === c.id)
      .map(
        (e) => `<tr class="${e.id === "cajon" ? "sel" : ""}"><td class="ex"><div class="exc"><div class="th">${fit(e.best, e, 38, 38)}</div><div><b>${e.title}</b><span>${e.line}</span></div></div></td>
      ${FIT[e.id].map((f) => `<td><i class="fit f${f}"></i></td>`).join("")}<td class="ref">${e.best === "table" ? "105°" : e.best === "book" ? "120°" : e.best === "open" ? "180°" : "0°"}</td><td class="ref">${{ table: "§6", book: "§4", open: "§3", closed: "§2" }[e.best]}</td></tr>`
      )
      .join("")
).join("")}</tbody></table>`;

const home = page_(
  "Duo Explorer — Catalog",
  FONTS,
  CSS + `.mxwrap{flex:1;overflow:hidden;min-height:0}`,
  `<div class="app">${top("catalog")}${rail("cajon")}
<main class="main"><div class="mh"><div><div class="cap">Catalog · 12 examples × 6 poses</div><h1>What each app does in every pose</h1><p>Scan across a row to see where an idea comes alive; scan down a column to see what a pose is for.</p></div>
<div class="seg"><span class="on">Matrix</span><span>Cards</span><span>By pose</span></div></div>
<div class="mxwrap">${matrix()}</div>
<div class="legend"><span><i class="fit f3"></i> Best pose — built for it</span><span><i class="fit f2"></i> Works — adapts sensibly</span><span><i class="fit f1"></i> Waits — asks you to change pose</span><span style="margin-left:auto" class="mono">HIG § = “Designing for iPhone Duo” checklist section</span></div></main>
<aside class="panel">
  <div class="sec" style="background:var(--bg);padding:0;border-bottom:1px solid var(--line)"><div style="display:flex;justify-content:center;padding:18px 0 6px">${fit("table", exById("cajon"), 250, 270)}</div></div>
  <div class="sec"><div class="cap"><span>Selected · Music</span><span class="badge">${glyph("table", 13)} Best: Table</span></div><h2 style="margin:0 0 8px;font:700 20px/1.1 var(--sans);letter-spacing:-.02em">Cajón</h2><p class="lead" style="font-size:13px;color:var(--ink2)">${CAJON_SUMMARY}</p></div>
  <div class="sec"><div class="cap">Spec</div><dl class="kv"><dt>display</dt><dd>Inner, stacked</dd><dt>hinge</dt><dd>105° default · 30–175°</dd><dt>size class</dt><dd>Regular / Regular</dd><dt>halves</dt><dd>Top: box · Bottom: plate</dd><dt>principle</dt><dd>Destination follows purpose <span class="cite">HIG §6 ↗</span></dd></dl></div>
  <div class="sec" style="border:0;display:flex;gap:8px"><span class="btn pri">Open on the bench →</span><span class="btn">Compare poses</span></div>
</aside></div>`
);

/* ---------------- example: Cajón on the bench, table pose */
const cj = exById("cajon");
const tl = () => {
  const x = (deg) => (deg / 180) * 100;
  return `<div class="poses">${POSES.map((p, i) => {
    const f = [1, 2, 2, 2, 2, 3][i];
    return `<div class="pz ${p.id === "table" ? "on" : ""}">${glyph(p.id, 22)}<div><b>${p.short}</b><span>${p.hinge}°</span></div><div class="fm">${[1, 2, 3].map((k) => `<i class="${k <= f ? (f === 3 ? "a" : "b") : ""}"></i>`).join("")}</div></div>`;
  }).join("")}</div>
  <div class="track"><div class="ax"></div><div class="rng" style="left:${x(30)}%;width:${x(145)}%"></div>
  ${[0, 30, 60, 90, 120, 150, 180].map((d) => `<span class="tk" style="left:${x(d)}%">${d}°</span>`).join("")}
  <span class="mk" style="left:0"><em>closed</em></span><span class="mk" style="left:${x(105)}%"><em style="color:var(--accent)">table 105°</em></span><span class="mk" style="left:${x(120)}%"><em style="transform:translateX(-10%)">book 120°</em></span><span class="mk" style="left:100%"><em style="transform:translateX(-90%)">open 180°</em></span>
  <span class="th" style="left:${x(105)}%"></span></div>`;
};

const example = page_(
  "Duo Explorer — Cajón · Table",
  FONTS,
  CSS,
  `<div class="app">${top("bench")}${rail("cajon")}
<main class="main">
  <div class="crumb"><span class="cap">Music /</span><h1>Cajón</h1><span class="badge">${glyph("table", 13)} Best in table</span>
    <div class="tools"><span class="tg"><i class="on"></i>Dimensions</span><span class="tg"><i></i>Reserved regions</span><span class="tg"><i></i>Sound</span><span class="btn">↺ Reset</span><span class="btn">Share</span></div></div>
  <div class="stage">
    <span class="corner" style="left:24px;top:18px">POSE&nbsp;&nbsp;table<br>HINGE 105°<br>SPLIT stacked<br>SIZE&nbsp;&nbsp;R / R</span>
    <span class="corner" style="right:24px;top:18px;text-align:right">OUTER off<br>INNER on · 380×600 pt<br>TOP 380×300 · BOTTOM 380×300</span>
    <div class="dev">
      ${fit("table", cj, 480 * 1.02, 548 * 1.02)}
      <span class="dim h" style="left:52px;right:52px;top:-22px"><span>380 pt</span></span>
      <span class="dim v" style="left:18px;top:6px;height:300px"><span>300 pt</span></span>
      <span class="call" style="left:100%;top:110px;margin-left:-60px"><b>Top · watch</b>The box answers; play-along lane below it</span>
      <span class="call" style="left:100%;top:400px;margin-left:-40px"><b>Bottom · touch</b>Six strokes; slap nearest the hinge, bass low</span>
      <span class="call l" style="right:100%;top:298px;margin-right:-44px"><b>Hinge 105°</b>The fold is the plate’s top edge</span>
    </div>
  </div>
  <div class="timeline"><div class="cap" style="display:flex;justify-content:space-between;margin-bottom:10px"><span>Pose timeline</span><span>← → to step · drag the thumb to fold</span></div>${tl()}</div>
</main>
<aside class="panel">
  <div class="sec"><div class="cap"><span>In table pose</span><span class="badge">★ best</span></div><p class="lead">${CAJON_POSES.table}</p></div>
  <div class="sec"><div class="cap">Principle</div><p class="lead" style="font-size:13px">${CAJON_PRINCIPLE} <span class="cite">HIG §6 · Destination follows purpose ↗</span></p>
    <p class="note">Also: keep controls off the crease <span class="cite">§5 ↗</span> · size classes drive layout, not the pose <span class="cite">§1 ↗</span></p></div>
  <div class="sec"><div class="cap">Pose sheet</div><table class="sheet">${POSES.map((p) => `<tr class="${p.id === "table" ? "on" : ""}"><td>${glyph(p.id, 15)}</td><td>${p.short}</td><td>${CAJON_POSES[p.id]}</td></tr>`).join("")}</table></div>
  <div class="sec"><div class="cap">Reserved regions</div><div class="regions"><span>inner camera · top edge</span><span>crease · 14 pt</span><span>home indicator</span></div></div>
  <div class="sec" style="border:0"><div class="cap">Credits</div><ul class="cred"><li><b>Ritmo / dalmaer/cajones</b> — voices, strokes, grooves</li><li><b>CRATE (@stvnzhangshuhan)</b> — drums below, sequencer above</li></ul></div>
</aside></div>`
);

/* ---------------- mobile */
const mobile = page_(
  "Duo Explorer — Cajón (mobile)",
  FONTS,
  CSS +
    `
body{width:390px;overflow-x:hidden}
.m-top{height:54px;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--line)}
.m-top .wm{font-size:16px}
.m-top .ic{margin-left:auto;display:flex;gap:14px;color:var(--ink2)}
.m-head{display:flex;align-items:center;gap:10px;padding:14px 16px 0}
.m-head h1{margin:0;font:700 22px/1 var(--sans);letter-spacing:-.02em}
.m-head .cap{margin-left:auto}
.m-stage{position:relative;height:330px;margin-top:6px;background:radial-gradient(circle,#d6d1c7 1px,transparent 1.2px) 0 0/18px 18px,var(--bg);display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--line)}
.m-stage .corner{font-size:10px}
.m-poses{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:12px 16px 0;padding:4px;border-radius:10px;background:var(--s2)}
.m-poses span{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 0 6px;border-radius:7px;font:600 9.5px/1 var(--mono);letter-spacing:.02em;color:var(--ink2)}
.m-poses span.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.m-hinge{display:flex;align-items:center;gap:10px;padding:12px 16px;font:500 11px/1 var(--mono);color:var(--ink2)}
.m-hinge .bar{flex:1;height:4px;border-radius:2px;background:linear-gradient(90deg,var(--line) 0 16%,var(--accent-soft) 16% 97%,var(--line) 97%);position:relative}
.m-hinge .bar i{position:absolute;left:58%;top:-7px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px var(--accent),0 2px 6px rgba(0,0,0,.2)}
.m-sheet{background:var(--surface);border-top:1px solid var(--line);border-radius:16px 16px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.06);padding:8px 16px 90px}
.m-sheet .grab{width:36px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 12px}
.m-tabs{display:flex;gap:18px;border-bottom:1px solid var(--line2);margin-bottom:12px}
.m-tabs span{padding:8px 0;font-weight:600;color:var(--ink3);font-size:13px}
.m-tabs span.on{color:var(--ink);box-shadow:inset 0 -2px 0 var(--ink)}
.m-foot{position:fixed;left:0;bottom:0;width:390px;height:64px;display:flex;align-items:center;gap:10px;padding:0 16px 8px;background:rgba(244,242,238,.92);backdrop-filter:blur(12px);border-top:1px solid var(--line)}
.m-foot .btn{height:36px}
`,
  `<div class="m-top"><div class="wm">${glyph("table", 18)}<span>Duo <b>Explorer</b></span></div><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></div></div>
<div class="m-head"><span class="cap" style="margin:0">Music /</span><h1>Cajón</h1><span class="badge" style="margin-left:auto">${glyph("table", 12)} Best: table</span></div>
<div class="m-stage"><span class="corner" style="left:16px;top:12px">HINGE 105°<br>R / R</span><span class="corner" style="right:16px;top:12px;text-align:right">380×600 pt</span>${fit("table", cj, 290, 320)}</div>
<div class="m-poses">${POSES.map((p) => `<span class="${p.id === "table" ? "on" : ""}">${glyph(p.id, 16)}${p.short}</span>`).join("")}</div>
<div class="m-hinge"><span>30°</span><div class="bar"><i></i></div><span>175°</span></div>
<div class="m-sheet"><div class="grab"></div><div class="m-tabs"><span class="on">This pose</span><span>All poses</span><span>Spec</span><span>Credits</span></div>
<p class="lead">${CAJON_POSES.table}</p><p class="note">${CAJON_PRINCIPLE} <span class="cite">HIG §6 ↗</span></p>
<table class="sheet" style="margin-top:14px">${POSES.slice(0, 3).map((p) => `<tr><td>${glyph(p.id, 15)}</td><td>${p.short}</td><td>${CAJON_POSES[p.id]}</td></tr>`).join("")}</table></div>
<div class="m-foot"><span class="btn">‹</span><span class="btn" style="flex:1;justify-content:center">Catalog · 1 of 12</span><span class="btn">›</span></div>`,
  { width: 390 }
);

writeFileSync(new URL("home.html", out), home);
writeFileSync(new URL("example.html", out), example);
writeFileSync(new URL("mobile.html", out), mobile);
console.log("A done");
