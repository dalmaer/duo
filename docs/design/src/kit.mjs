// Shared kit for the design-direction mockups: the Duo drawn in CSS, the
// screen contents of each example, pose glyphs and catalog data.
// Everything is drawn at explorer points (one leaf = 300 x 380, as in
// src/core/poses.ts) and scaled with `zoom` where it is used.

export const POSES = [
  { id: "closed", label: "Closed", short: "Closed", hinge: 0, display: "Outer", split: "—", size: "C / R", pts: "300 × 380" },
  { id: "closed-landscape", label: "Closed · landscape", short: "Landscape", hinge: 0, display: "Outer", split: "—", size: "C / C", pts: "380 × 300" },
  { id: "open", label: "Open", short: "Open", hinge: 180, display: "Inner", split: "Side by side", size: "R / R", pts: "600 × 380" },
  { id: "open-portrait", label: "Open · portrait", short: "Portrait", hinge: 180, display: "Inner", split: "Stacked", size: "R / R", pts: "380 × 600" },
  { id: "book", label: "Book", short: "Book", hinge: 120, display: "Inner", split: "Side by side", size: "R / R", pts: "600 × 380" },
  { id: "table", label: "Table", short: "Table", hinge: 105, display: "Inner", split: "Stacked", size: "R / R", pts: "380 × 600" },
];
export const poseById = (id) => POSES.find((p) => p.id === id);

export const CATS = [
  { id: "music", label: "Music", blurb: "Instruments that use the fold as a stand: play below, see it above." },
  { id: "games", label: "Games", blurb: "Folding is a move, the hinge is a controller, each half has a job." },
  { id: "retro", label: "Retro", blurb: "Old folding objects, redrawn: Walkmans, handhelds, field guides." },
  { id: "productivity", label: "Productivity", blurb: "Reading, drawing and working, where two facing pages are the point." },
  { id: "learning", label: "Learning", blurb: "The fold hides the answer until you open it." },
  { id: "patterns", label: "Patterns", blurb: "Apple's HIG layouts, running live in every pose." },
];

export const CAJON_POSES = {
  closed: "A single pad with the box as a strip above it. Playable, but it is waiting for you to open it.",
  "closed-landscape": "Two thumbs: left hand on the left, right hand on the right, like Ritmo's phone layout.",
  open: "The box on the left page, the plate on the right. Everything works; it just isn't how you'd hold one.",
  "open-portrait": "The same split as table pose, lying flat.",
  book: "Box left, plate right — handy for watching someone else play.",
  table: "The bottom half is the plate and the fold is its top edge: slap near the hinge, bass lower down. The top half shows the instrument and the play-along lane.",
};
export const CAJON_FIT = { closed: 1, "closed-landscape": 2, open: 2, "open-portrait": 2, book: 2, table: 3 };
export const CAJON_SUMMARY =
  "Set the Duo down like a tiny laptop and it becomes a cajón: play the bottom half, and the top half shows the box answering — the plate flexing where you hit, the snare wires buzzing — with a groove to play along to.";
export const CAJON_PRINCIPLE =
  "Table pose puts content you watch on top and controls you touch on the stable bottom half — the destination Apple gives for at-a-distance content and tappable controls.";

/* ---------------------------------------------------------------- device */

export const DEVICE_CSS = `
.duo{position:relative;display:inline-block;flex:none;font-family:-apple-system,"SF Pro Text",Inter,system-ui,sans-serif}
.duo .sh{position:relative;padding:10px;border-radius:44px;background:linear-gradient(150deg,#55555c 0%,#2a2a2e 30%,#1b1b1e 70%,#2c2c31 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.12),inset 0 2px 0 rgba(255,255,255,.18),0 40px 60px -30px rgba(0,0,0,.55),0 6px 14px -4px rgba(0,0,0,.35)}
.duo .scr{position:relative;width:100%;height:100%;border-radius:34px;overflow:hidden;background:#000;display:flex}
.duo .scr.col{flex-direction:column}
.duo .half{position:relative;flex:1 1 0;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.duo .island{position:absolute;z-index:5;top:22px;left:50%;width:78px;height:22px;margin-left:-39px;border-radius:12px;background:#000;box-shadow:0 0 0 1px rgba(255,255,255,.05)}
.duo .cam{position:absolute;z-index:5;top:18px;width:12px;height:12px;border-radius:50%;background:#050505;box-shadow:0 0 0 1px rgba(255,255,255,.07)}
.duo .crease{position:absolute;z-index:6;pointer-events:none}
.duo .crease.v{top:0;bottom:0;left:50%;width:14px;margin-left:-7px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.05) 35%,rgba(0,0,0,.28) 50%,rgba(255,255,255,.05) 65%,transparent)}
.duo .crease.h{left:0;right:0;top:50%;height:14px;margin-top:-7px;background:linear-gradient(180deg,transparent,rgba(255,255,255,.05) 35%,rgba(0,0,0,.28) 50%,rgba(255,255,255,.05) 65%,transparent)}
.duo .glare{position:absolute;inset:0;z-index:7;pointer-events:none;border-radius:inherit;background:linear-gradient(115deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 28%)}

.p-closed .sh{width:300px;height:380px}
.p-closed-landscape .sh{width:380px;height:300px}
.p-closed .scr>:first-child{padding-top:58px}
.p-closed-landscape .scr>:first-child{padding-left:56px}
.p-closed-landscape .island{top:50%;left:22px;width:22px;height:78px;margin:-39px 0 0 0}
.p-open .sh{width:600px;height:380px}
.p-open-portrait .sh{width:380px;height:600px}

.p-book{width:600px;height:400px;display:flex;align-items:center;justify-content:center;perspective:1500px;perspective-origin:50% 40%}
.p-book .sh{width:300px;height:380px;flex:none}
.p-book .l{border-radius:44px 10px 10px 44px;transform-origin:right center;transform:rotateY(28deg)}
.p-book .r{border-radius:10px 44px 44px 10px;transform-origin:left center;transform:rotateY(-28deg)}
.p-book .l .scr{border-radius:34px 4px 4px 34px}
.p-book .r .scr{border-radius:4px 34px 34px 4px}
.p-book .spine{position:absolute;z-index:3;left:50%;top:10px;bottom:10px;width:12px;margin-left:-6px;border-radius:6px;background:linear-gradient(90deg,#141416,#3a3a40,#141416)}

.p-table{width:480px;height:548px;display:flex;flex-direction:column;align-items:center;perspective:1300px;perspective-origin:50% 10%}
.p-table .t{width:380px;height:300px;flex:none;border-radius:44px 44px 10px 10px;transform-origin:50% 100%;transform:rotateX(5deg)}
.p-table .b{width:380px;height:300px;flex:none;border-radius:10px 10px 44px 44px;transform-origin:50% 0;transform:rotateX(62deg)}
.p-table .t .scr{border-radius:34px 34px 4px 4px}
.p-table .b .scr{border-radius:4px 4px 34px 34px}
.p-table .knuckle{position:absolute;z-index:4;left:50%;top:292px;width:370px;height:14px;margin-left:-185px;border-radius:7px;background:linear-gradient(180deg,#3d3d43,#141416 60%,#2a2a2e)}
.p-table .floor{position:absolute;z-index:-1;left:50%;top:330px;width:520px;height:190px;margin-left:-260px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.28),rgba(0,0,0,0))}
.p-book .floor{position:absolute;z-index:-1;left:50%;bottom:-38px;width:620px;height:70px;margin-left:-310px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.22),rgba(0,0,0,0))}
`;

/** The Duo in a pose, with an example's content on its displays. */
export function device(poseId, ex, extra = "") {
  const A = ex.half(poseId, "a");
  const B = ex.half(poseId, "b");
  switch (poseId) {
    case "closed":
      return `<div class="duo p-closed ${extra}"><div class="sh"><div class="scr">${ex.outer()}</div><i class="island"></i><i class="glare"></i></div></div>`;
    case "closed-landscape":
      return `<div class="duo p-closed-landscape ${extra}"><div class="sh"><div class="scr">${(ex.land || ex.outer)()}</div><i class="island"></i><i class="glare"></i></div></div>`;
    case "open":
      return `<div class="duo p-open ${extra}"><div class="sh"><div class="scr"><div class="half">${A}</div><div class="half">${B}</div><i class="crease v"></i></div><i class="cam" style="left:150px"></i><i class="glare"></i></div></div>`;
    case "open-portrait":
      return `<div class="duo p-open-portrait ${extra}"><div class="sh"><div class="scr col"><div class="half">${A}</div><div class="half">${B}</div><i class="crease h"></i></div><i class="cam" style="left:184px"></i><i class="glare"></i></div></div>`;
    case "book":
      return `<div class="duo p-book ${extra}"><i class="floor"></i><div class="sh l"><div class="scr"><div class="half">${A}</div></div><i class="glare"></i></div><i class="spine"></i><div class="sh r"><div class="scr"><div class="half">${B}</div></div><i class="cam" style="left:40px"></i></div></div>`;
    case "table":
      return `<div class="duo p-table ${extra}"><i class="floor"></i><div class="sh t"><div class="scr"><div class="half">${A}</div></div><i class="cam" style="left:184px"></i><i class="glare"></i></div><i class="knuckle"></i><div class="sh b"><div class="scr"><div class="half">${B}</div></div></div></div>`;
  }
}

/** Box a device render into a fixed w x h slot, scaled to fit. */
export const NATURAL = { closed: [300, 380], "closed-landscape": [380, 300], open: [600, 380], "open-portrait": [380, 600], book: [600, 400], table: [480, 548] };
export function fit(poseId, ex, w, h, extra = "") {
  const [nw, nh] = NATURAL[poseId];
  const z = Math.min(w / nw, h / nh);
  return `<div class="fit" style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center"><div style="zoom:${z.toFixed(4)}">${device(poseId, ex, extra)}</div></div>`;
}

/* ------------------------------------------------------------ pose glyphs */

export function glyph(id, size = 22) {
  const s = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"`;
  const g = {
    closed: `<rect x="7" y="3.5" width="10" height="17" rx="2.4"/><path d="M10.5 5.6h3"/>`,
    "closed-landscape": `<rect x="3.5" y="7" width="17" height="10" rx="2.4"/><path d="M5.6 10.5v3"/>`,
    open: `<rect x="2.5" y="6" width="19" height="12" rx="2.2"/><path d="M12 6v12" stroke-dasharray="1.6 1.8"/>`,
    "open-portrait": `<rect x="6" y="2.5" width="12" height="19" rx="2.2"/><path d="M6 12h12" stroke-dasharray="1.6 1.8"/>`,
    book: `<path d="M12 5.5v14M12 5.5 4 3.5v14l8 2M12 5.5l8-2v14l-8 2"/>`,
    table: `<path d="M6 3.5h12v9H6zM6 12.5l-2.8 7.5h17.6L18 12.5"/>`,
  }[id];
  return `<svg ${s}>${g}</svg>`;
}

/* ------------------------------------------------------ example contents */

const lines = (n, cls = "", widths = [100, 96, 100, 88, 98, 72, 100, 93, 100, 60]) =>
  Array.from({ length: n }, (_, i) => `<i class="${cls}" style="width:${widths[i % widths.length]}%"></i>`).join("");

export const CONTENT_CSS = `
/* cajón */
.wood{background:repeating-linear-gradient(90deg,rgba(90,45,12,.10) 0 1px,transparent 1px 9px),repeating-linear-gradient(88deg,rgba(255,232,196,.10) 0 3px,transparent 3px 23px),linear-gradient(180deg,#dba46c,#b8763d)}
.cj-top{flex:1;display:flex;flex-direction:column;gap:10px;padding:14px;background:#1c130d}
.cj-face{flex:1;position:relative;border-radius:8px;box-shadow:inset 0 0 0 4px rgba(70,34,10,.45),inset 0 0 26px rgba(70,34,10,.4)}
.cj-wires{position:absolute;left:14%;right:14%;top:12%;height:13%;background:repeating-linear-gradient(180deg,rgba(45,22,6,.55) 0 2px,transparent 2px 8px)}
.cj-ring{position:absolute;left:30%;top:24%;width:34%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,244,222,.55),rgba(255,244,222,0) 62%);box-shadow:0 0 0 2px rgba(255,244,222,.45),0 0 0 12px rgba(255,244,222,.12)}
.cj-name{position:absolute;left:0;right:0;bottom:8%;text-align:center;font:700 11px/1 ui-sans-serif,system-ui;letter-spacing:.38em;color:rgba(55,27,8,.7)}
.cj-bar{display:flex;align-items:center;gap:6px}
.cj-chip{font:600 11px/1 ui-sans-serif,system-ui;padding:6px 10px;border-radius:99px;background:#f3e3cc;color:#2a1a0e;white-space:nowrap}
.cj-chip.o{background:transparent;color:#f3e3cc;box-shadow:inset 0 0 0 1.5px rgba(243,227,204,.35)}
.cj-lane{display:flex;gap:4px;height:22px}
.cj-lane b{flex:1;border-radius:4px;background:rgba(255,255,255,.07);font:700 10px/22px ui-monospace,monospace;color:#f3d9b8;text-align:center}
.cj-lane b.on{background:#f07a4a;color:#1c130d}
.cj-lane b.x{background:rgba(255,255,255,.03);color:transparent}
.cj-plate{flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:7px;padding:10px;background:#1c130d}
.cj-plate.one{grid-template-columns:1fr;grid-template-rows:1fr}
.cj-plate.thumbs{grid-template-columns:1fr;grid-template-rows:1fr 1fr}
.cj-pad{position:relative;border-radius:7px;box-shadow:inset 0 0 0 1.5px rgba(70,34,10,.35)}
.cj-pad span{position:absolute;left:10px;bottom:8px;font:700 10px/1 ui-sans-serif,system-ui;letter-spacing:.16em;color:rgba(45,22,6,.72)}
.cj-pad.hit::after{content:"";position:absolute;inset:0;border-radius:7px;background:radial-gradient(circle at 45% 35%,rgba(255,246,226,.75),rgba(255,246,226,0) 58%)}
.cj-strip{height:26%;margin:10px 10px 0;border-radius:8px;position:relative}
.cj-land{flex:1;display:flex;gap:8px;padding:10px 10px 10px 50px;background:#1c130d}
.cj-land .cj-plate{padding:0}
.cj-land .mid{width:30%;display:flex;flex-direction:column;gap:8px}

/* sampler */
.sm{flex:1;background:#0f1012;display:flex;flex-direction:column;padding:14px;gap:8px}
.sm-row{display:flex;gap:3px;flex:1}
.sm-row i{flex:1;border-radius:3px;background:#24262b}
.sm-row i.on{background:var(--c)}
.sm-pads{flex:1;background:#0f1012;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px}
.sm-pads i{border-radius:8px;background:#23252a;box-shadow:inset 0 -3px 0 rgba(0,0,0,.35)}
.sm-pads i.on{background:var(--c);box-shadow:0 0 18px var(--c)}
.sm-filter{font:700 11px/1 ui-monospace,monospace;color:#8ef0c8;letter-spacing:.08em;display:flex;justify-content:space-between}
.sm-wave{height:40px;background:repeating-linear-gradient(90deg,#8ef0c8 0 2px,transparent 2px 6px);-webkit-mask:linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent);opacity:.8;border-radius:4px}

/* battleships */
.bs{flex:1;background:#0b2340;padding:16px;display:flex;flex-direction:column;gap:8px}
.bs.own{background:#11304f}
.bs-h{font:700 11px/1 ui-monospace,monospace;letter-spacing:.14em;color:#8fb6de}
.bs-g{flex:1;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);gap:3px}
.bs-g i{border-radius:50%;background:rgba(143,182,222,.16);margin:22%}
.bs-g i.h{background:#ff4d3d;margin:14%;box-shadow:0 0 8px #ff4d3d}
.bs-g i.m{background:#e8eef5;margin:26%}
.bs-g i.s{border-radius:4px;margin:0;background:#8a98a8}

/* hinge guess */
.hg{flex:1;background:#fff4e0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#2b1d0e}
.hg b{font:800 64px/1 ui-sans-serif,system-ui;letter-spacing:-.04em}
.hg span{font:600 12px/1 ui-sans-serif,system-ui;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.hg-k{flex:1;background:#ffb547;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:16px}
.hg-k i{border-radius:12px;background:rgba(255,255,255,.55);font:800 20px/1 ui-sans-serif,system-ui;display:flex;align-items:center;justify-content:center;font-style:normal;color:#2b1d0e}

/* pocket console */
.pc-lcd{flex:1;background:#3d4a2a;padding:14px;display:flex}
.pc-lcd div{flex:1;background:#9bbc0f;border-radius:4px;position:relative;overflow:hidden;box-shadow:inset 0 0 0 3px #8bac0f}
.pc-lcd .gnd{position:absolute;left:0;right:0;bottom:0;height:18%;background:repeating-linear-gradient(90deg,#306230 0 12px,#0f380f 12px 24px)}
.pc-lcd .hero{position:absolute;left:24%;bottom:18%;width:9%;aspect-ratio:.8;background:#0f380f;box-shadow:0 -8px 0 -2px #0f380f}
.pc-lcd .blk{position:absolute;width:10%;aspect-ratio:1;background:#306230;box-shadow:inset 0 0 0 3px #0f380f}
.pc-lcd .cl{position:absolute;height:6%;width:18%;border-radius:99px;background:#8bac0f;box-shadow:inset 0 0 0 2px #306230}
.pc-body{flex:1;background:linear-gradient(180deg,#d6d1c8,#c3bdb2);position:relative}
.pc-dpad{position:absolute;left:14%;top:50%;width:26%;aspect-ratio:1;transform:translateY(-50%);background:linear-gradient(#26262a,#26262a) center/34% 100% no-repeat,linear-gradient(#26262a,#26262a) center/100% 34% no-repeat}
.pc-ab{position:absolute;right:12%;top:50%;transform:translateY(-50%) rotate(-24deg);display:flex;gap:10px}
.pc-ab i{width:44px;height:44px;border-radius:50%;background:#9a2448;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25)}
.pc-ss{position:absolute;left:50%;bottom:12%;transform:translateX(-50%);display:flex;gap:12px}
.pc-ss i{width:34px;height:9px;border-radius:5px;background:#8d877d;transform:rotate(-24deg)}

/* duo-man */
.dm{flex:1;background:linear-gradient(160deg,#c9cdd3,#9aa1ab);display:flex;flex-direction:column;padding:18px;gap:12px;color:#1c2330}
.dm-win{flex:1;border-radius:10px;background:#1a1c22;padding:12px;display:flex;flex-direction:column;justify-content:center;gap:8px;box-shadow:inset 0 2px 8px rgba(0,0,0,.6)}
.dm-cas{border-radius:8px;background:linear-gradient(180deg,#f2efe6,#dcd6c6);padding:10px;display:flex;flex-direction:column;gap:6px}
.dm-lbl{height:12px;border-radius:2px;background:linear-gradient(90deg,#e8553b 0 30%,#f6c343 30% 60%,#3aa3a0 60%)}
.dm-reels{display:flex;justify-content:space-between;align-items:center;background:#2a2c33;border-radius:6px;padding:6px 16px}
.dm-reels i{width:30px;height:30px;border-radius:50%;background:repeating-conic-gradient(#f2efe6 0 20deg,#6b5a45 20deg 60deg);box-shadow:0 0 0 5px #3b2a1a}
.dm-t{font:700 12px/1.2 ui-sans-serif,system-ui;letter-spacing:.04em;display:flex;justify-content:space-between}
.dm-t span{opacity:.6;font-weight:600}
.dm-btns{display:flex;gap:8px}
.dm-btns i{flex:1;height:36px;border-radius:6px;background:linear-gradient(180deg,#eef0f3,#b9bec6);box-shadow:inset 0 -3px 0 rgba(0,0,0,.2);font:700 13px/36px ui-sans-serif;text-align:center;font-style:normal;color:#1c2330}
.dm-btns i.p{background:linear-gradient(180deg,#ff8a3d,#e0561c);color:#fff}
.dm-slot{flex:1;border-radius:10px;border:3px dashed rgba(28,35,48,.35);display:flex;align-items:center;justify-content:center;font:700 12px/1 ui-sans-serif;letter-spacing:.14em;color:rgba(28,35,48,.55)}

/* critterdex */
.cx{flex:1;background:#c8102e;padding:16px;display:flex;flex-direction:column;gap:10px}
.cx-scr{flex:1;border-radius:8px;background:#dfe9d0;box-shadow:inset 0 0 0 5px #f4f4f4,inset 0 0 0 7px #1d1d1d;display:flex;align-items:center;justify-content:center;position:relative}
.cx-scr span{position:absolute;left:14px;top:12px;font:700 11px/1 ui-monospace,monospace;color:#2f3a24}
.cx-lights{display:flex;gap:8px;align-items:center}
.cx-lights i{width:14px;height:14px;border-radius:50%;background:#ffcc00}
.cx-lights i:first-child{width:30px;height:30px;background:radial-gradient(circle at 35% 35%,#bfe7ff,#1b8fdc);box-shadow:0 0 0 4px #fff}
.cx-lights i:nth-child(3){background:#35c759}
.cx-txt{flex:1;border-radius:8px;background:#16324f;padding:14px;display:flex;flex-direction:column;gap:9px}
.cx-txt b{font:700 15px/1 ui-monospace,monospace;color:#bff0ff}
.cx-txt i{height:7px;border-radius:4px;background:rgba(191,240,255,.35)}

/* e-ink reader */
.rd{flex:1;background:#ecebe4;padding:28px 24px 18px;display:flex;flex-direction:column;gap:9px;color:#222}
.rd h6{margin:0 0 6px;font:600 17px/1.2 Georgia,serif;color:#222}
.rd i{height:6px;border-radius:2px;background:#9b9a93}
.rd em{margin-top:auto;font:12px/1 Georgia,serif;color:#777;text-align:center;font-style:normal}
.rd .dc{float:left}

/* sketchbook */
.sk{flex:1;background:#fbf8f1;display:flex;align-items:center;justify-content:center}
.sk-tools{flex:1;background:#efe9dd;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:16px}
.sk-sw{display:flex;gap:10px;justify-content:center}
.sk-sw i{width:34px;height:34px;border-radius:50%;background:var(--c);box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}
.sk-sw i.on{box-shadow:0 0 0 3px #efe9dd,0 0 0 5px #222}
.sk-br{display:flex;gap:10px;justify-content:center}
.sk-br i{width:52px;height:14px;border-radius:7px;background:#d9d1c1}
.sk-br i.on{background:#2b2b2b}

/* fold cards */
.fc{flex:1;background:#f7f1ff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:18px;color:#2b1f47}
.fc small{font:700 11px/1 ui-sans-serif;letter-spacing:.16em;text-transform:uppercase;opacity:.55}
.fc b{font:600 30px/1.1 Georgia,serif;text-align:center}
.fc.ans{background:#6b46f0;color:#fff}
.fc-btn{display:flex;gap:8px}
.fc-btn i{padding:9px 16px;border-radius:99px;background:rgba(255,255,255,.2);font:700 12px/1 ui-sans-serif;font-style:normal}
.fc-btn i:last-child{background:#fff;color:#6b46f0}

/* list & detail */
.ld{flex:1;background:#f2f2f7;display:flex;flex-direction:column}
.ld-bar{padding:40px 16px 10px;font:800 22px/1 -apple-system,system-ui;color:#111}
.ld-row{margin:0 10px;padding:11px 12px;border-radius:10px;display:flex;gap:10px;align-items:center}
.ld-row.sel{background:#0a84ff}
.ld-row i{width:28px;height:28px;border-radius:50%;background:var(--c);flex:none}
.ld-row div{flex:1;display:flex;flex-direction:column;gap:5px}
.ld-row b{height:7px;border-radius:4px;background:#1c1c1e;width:60%}
.ld-row s{height:6px;border-radius:4px;background:#a1a1a6;width:90%;text-decoration:none}
.ld-row.sel b,.ld-row.sel s{background:rgba(255,255,255,.85)}
.ld-det{flex:1;background:#fff;padding:40px 22px 16px;display:flex;flex-direction:column;gap:10px}
.ld-det h6{margin:0;font:800 19px/1.2 -apple-system,system-ui;color:#111}
.ld-det i{height:6px;border-radius:3px;background:#c7c7cc}
.ld-det .img{height:34%;border-radius:12px;background:linear-gradient(135deg,#ffb86b,#ff5e62 60%,#7b4397)}

/* watch above, play below */
.vd{flex:1;background:#000;display:flex;flex-direction:column;justify-content:center;position:relative}
.vd-frame{position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,#ffd98a 0 8%,transparent 9%),linear-gradient(180deg,#27406b 0%,#f08a5d 62%,#2a1a33 63%,#120c1a 100%)}
.vd-bar{position:absolute;left:16px;right:16px;bottom:14px;height:4px;border-radius:2px;background:rgba(255,255,255,.3)}
.vd-bar::before{content:"";position:absolute;left:0;top:0;bottom:0;width:38%;border-radius:2px;background:#fff}
.vd-ctl{flex:1;background:#1c1c1e;display:flex;flex-direction:column;justify-content:center;gap:16px;padding:18px}
.vd-btns{display:flex;justify-content:center;gap:26px;align-items:center}
.vd-btns i{width:34px;height:34px;border-radius:50%;background:#3a3a3c}
.vd-btns i.pl{width:58px;height:58px;background:#fff}
.vd-chat{display:flex;flex-direction:column;gap:7px}
.vd-chat i{height:8px;border-radius:4px;background:#3a3a3c}
`;

function cajonHalf(pose, which) {
  const box = `<div class="cj-top"><div class="cj-face wood"><i class="cj-wires"></i><i class="cj-ring"></i><span class="cj-name">CAJÓN</span></div>
    <div class="cj-bar"><span class="cj-chip">Play along</span><span class="cj-chip o">The first beat</span><span class="cj-chip o">84 bpm</span></div>
    <div class="cj-lane"><b class="on">B</b><b class="x">·</b><b>s</b><b class="x">·</b><b>B</b><b class="x">·</b><b>s</b><b class="x">·</b></div></div>`;
  const plate = `<div class="cj-plate">
    <div class="cj-pad wood"><span>L · ACCENT</span></div><div class="cj-pad wood"><span>R · ACCENT</span></div>
    <div class="cj-pad wood hit"><span>L · SLAP</span></div><div class="cj-pad wood"><span>R · SLAP</span></div>
    <div class="cj-pad wood"><span>L · BASS</span></div><div class="cj-pad wood"><span>R · BASS</span></div></div>`;
  return which === "a" ? box : plate;
}

const sampSeq = () => {
  const cols = ["#ff5d8f", "#ffb547", "#8ef0c8", "#7aa7ff"];
  const pat = ["1000100010001010", "0010000100100001", "1010101010101010", "0000100000001000"];
  return `<div class="sm">${pat.map((r, j) => `<div class="sm-row" style="--c:${cols[j]}">${[...r].map((c, i) => `<i class="${c === "1" ? "on" : ""}" ${i === 6 ? 'style="outline:2px solid #fff;outline-offset:-2px"' : ""}></i>`).join("")}</div>`).join("")}<div class="sm-filter"><span>HINGE → LPF</span><span>1.2 kHz</span></div></div>`;
};
const sampPads = () => {
  const cols = ["#ff5d8f", "#ffb547", "#8ef0c8", "#7aa7ff"];
  return `<div class="sm-pads">${Array.from({ length: 16 }, (_, i) => `<i style="--c:${cols[i % 4]}" class="${[1, 6, 11].includes(i) ? "on" : ""}"></i>`).join("")}</div>`;
};
const bsGrid = (own) => {
  const hits = [10, 11, 27, 44], miss = [3, 20, 33, 38, 50, 61], ships = [9, 10, 11, 12, 29, 37, 45, 52, 53, 54];
  return `<div class="bs ${own ? "own" : ""}"><span class="bs-h">${own ? "YOUR FLEET" : "TARGET · ROUND 7"}</span><div class="bs-g">${Array.from({ length: 64 }, (_, i) => {
    const c = own ? (ships.includes(i) ? (i === 37 ? "h" : "s") : miss.includes(i + 1) ? "m" : "") : hits.includes(i) ? "h" : miss.includes(i) ? "m" : "";
    return `<i class="${c}"></i>`;
  }).join("")}</div></div>`;
};
const pcLcd = () => `<div class="pc-lcd"><div><i class="cl" style="left:12%;top:14%"></i><i class="cl" style="left:62%;top:24%"></i><i class="blk" style="left:52%;bottom:40%"></i><i class="blk" style="left:62%;bottom:40%"></i><i class="blk" style="left:80%;bottom:18%"></i><i class="hero"></i><i class="gnd"></i></div></div>`;
const pcBody = () => `<div class="pc-body"><i class="pc-dpad"></i><div class="pc-ab"><i></i><i></i></div><div class="pc-ss"><i></i><i></i></div></div>`;
const critter = (s = 120) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="M20 72c-6-26 8-50 30-50s36 24 30 50c-2 8-10 12-30 12S22 80 20 72z" fill="#2f3a24"/><path d="M28 30 20 10l18 14M72 30l8-20-18 14" fill="#2f3a24"/><circle cx="40" cy="52" r="6" fill="#dfe9d0"/><circle cx="62" cy="52" r="6" fill="#dfe9d0"/><circle cx="41" cy="53" r="2.6" fill="#2f3a24"/><circle cx="63" cy="53" r="2.6" fill="#2f3a24"/><path d="M44 68q7 5 14 0" stroke="#dfe9d0" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
const cxScr = () => `<div class="cx"><div class="cx-lights"><i></i><i></i><i></i><i></i></div><div class="cx-scr"><span>#025 EMBERKIT</span>${critter()}</div></div>`;
const cxTxt = () => `<div class="cx" style="background:#b00d27"><div class="cx-txt"><b>EMBERKIT</b><i style="width:90%"></i><i style="width:76%"></i><i style="width:84%"></i><i style="width:52%"></i><b style="margin-top:8px;color:#ffcc00">HT 0.4m · WT 6kg</b></div></div>`;
const page = (title, n, pg) => `<div class="rd">${title ? `<h6>${title}</h6>` : ""}${lines(n, "")}<em>${pg}</em></div>`;
const sketch = () => `<div class="sk"><svg width="80%" height="80%" viewBox="0 0 200 160" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 120c20-50 40-80 70-80s40 40 20 60-60 10-40-20 60-30 90 10" stroke="#2b2b2b" stroke-width="3"/><path d="M40 138c30-6 80-6 130 0" stroke="#e2572b" stroke-width="5" opacity=".75"/><circle cx="150" cy="40" r="16" stroke="#2f6bff" stroke-width="3"/></svg></div>`;
const skTools = () => `<div class="sk-tools"><div class="sk-sw">${["#2b2b2b", "#e2572b", "#2f6bff", "#f2b90c", "#1f8a5b"].map((c, i) => `<i style="--c:${c}" class="${i === 1 ? "on" : ""}"></i>`).join("")}</div><div class="sk-br"><i></i><i class="on"></i><i></i></div></div>`;
const ldList = () => `<div class="ld"><div class="ld-bar">Inbox</div>${["#ff9f0a", "#30d158", "#0a84ff", "#bf5af2", "#ff375f", "#64d2ff"].map((c, i) => `<div class="ld-row ${i === 1 ? "sel" : ""}" style="--c:${c}"><i></i><div><b></b><s></s></div></div>`).join("")}</div>`;
const ldDet = () => `<div class="ld-det"><h6>Trip photos from the coast</h6><div class="img"></div>${lines(6)}</div>`;
const vdFrame = () => `<div class="vd"><i class="vd-frame"></i><i class="vd-bar"></i></div>`;
const vdCtl = () => `<div class="vd-ctl"><div class="vd-btns"><i></i><i class="pl"></i><i></i></div><div class="vd-chat"><i style="width:80%"></i><i style="width:60%"></i><i style="width:70%"></i></div></div>`;

const EX = [
  {
    id: "cajon", title: "Cajón", cat: "music", best: "table", accent: "#c9864a",
    line: "Set it down like a tiny laptop and play the bottom half; the top half is the box answering.",
    half: (p, w) => cajonHalf(p, w),
    outer: () => `<div style="flex:1;display:flex;flex-direction:column;background:#1c130d"><div class="cj-strip wood"><i class="cj-wires" style="top:20%;height:26%"></i></div><div class="cj-plate one"><div class="cj-pad wood hit"><span>TAP · SLAP HIGH, BASS LOW</span></div></div></div>`,
    land: () => `<div class="cj-land"><div class="cj-plate thumbs"><div class="cj-pad wood"><span>L · SLAP</span></div><div class="cj-pad wood hit"><span>L · BASS</span></div></div><div class="mid"><div class="cj-face wood" style="flex:1"><i class="cj-wires"></i></div><div class="cj-lane"><b class="on">B</b><b>s</b><b>B</b><b>s</b></div></div><div class="cj-plate thumbs"><div class="cj-pad wood"><span>R · SLAP</span></div><div class="cj-pad wood"><span>R · BASS</span></div></div></div>`,
  },
  {
    id: "sampler", title: "Crate Sampler", cat: "music", best: "table", accent: "#ff5d8f",
    line: "Finger drums below, sequencer above — and the hinge angle is the filter.",
    half: (p, w) => (w === "a" ? sampSeq() : sampPads()),
    outer: () => sampPads(),
  },
  {
    id: "battleships", title: "Battleships", cat: "games", best: "table", accent: "#2f6bff",
    line: "The folding travel case, digitized: their ocean stands up, your fleet lies flat.",
    half: (p, w) => bsGrid(w === "b"),
    outer: () => bsGrid(false),
  },
  {
    id: "hinge-guess", title: "Hinge Guess", cat: "games", best: "book", accent: "#ffb547",
    line: "Guess the angle, then fold to it. The hinge is the controller.",
    half: (p, w) => (w === "a" ? `<div class="hg"><span>Fold to</span><b>112°</b><span>you're at 97°</span></div>` : `<div class="hg-k">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<i>${n}</i>`).join("")}</div>`),
    outer: () => `<div class="hg"><span>Open to play</span><b>?°</b></div>`,
  },
  {
    id: "pocket-console", title: "Pocket Console", cat: "retro", best: "table", accent: "#9bbc0f",
    line: "Controls below, screen above — a handheld that folds into your pocket.",
    half: (p, w) => (w === "a" ? pcLcd() : pcBody()),
    outer: () => `<div style="flex:1;display:flex;flex-direction:column;background:#c3bdb2">${pcLcd()}<div style="height:34%;position:relative">${pcBody()}</div></div>`,
  },
  {
    id: "duo-man", title: "Duo-Man", cat: "retro", best: "closed", accent: "#e0561c",
    line: "Open it to insert a cassette. Close it to listen.",
    half: (p, w) => (w === "a" ? `<div class="dm"><div class="dm-t">SLOT <span>open to load</span></div><div class="dm-slot">INSERT TAPE</div></div>` : `<div class="dm" style="justify-content:center"><div class="dm-cas"><div class="dm-lbl"></div><div class="dm-reels"><i></i><i></i></div></div><div class="dm-t">MIXTAPE ’86 <span>C60</span></div></div>`),
    outer: () => `<div class="dm" style="padding-top:56px"><div class="dm-win"><div class="dm-cas"><div class="dm-lbl"></div><div class="dm-reels"><i></i><i></i></div></div></div><div class="dm-t">SIDE A · 03 <span>12:41</span></div><div class="dm-btns"><i>◀◀</i><i class="p">▶</i><i>▶▶</i></div></div>`,
  },
  {
    id: "critterdex", title: "Critterdex", cat: "retro", best: "book", accent: "#c8102e",
    line: "A red clamshell field guide: the creature on one page, its entry on the other.",
    half: (p, w) => (w === "a" ? cxScr() : cxTxt()),
    outer: () => cxScr(),
  },
  {
    id: "reader", title: "E-ink Reader", cat: "productivity", best: "book", accent: "#77756c",
    line: "Two facing pages, paper-grey and still, the way a book is meant to be held.",
    half: (p, w) => (w === "a" ? page("Chapter 3", 13, "42") : page("", 15, "43")),
    outer: () => page("Chapter 3", 13, "42"),
  },
  {
    id: "sketchbook", title: "Sketchbook", cat: "productivity", best: "table", accent: "#e2572b",
    line: "An easel on top, the palette flat under your hand.",
    half: (p, w) => (w === "a" ? sketch() : skTools()),
    outer: () => sketch(),
  },
  {
    id: "flashcards", title: "Fold Cards", cat: "learning", best: "closed", accent: "#6b46f0",
    line: "The question is on the outside. Open it to reveal the answer.",
    half: (p, w) => (w === "a" ? `<div class="fc"><small>Spanish · 12/40</small><b>la mariposa</b></div>` : `<div class="fc ans"><small>Answer</small><b>butterfly</b><div class="fc-btn"><i>Again</i><i>Got it</i></div></div>`),
    outer: () => `<div class="fc"><small>Spanish · 12/40</small><b>la mariposa</b><small style="margin-top:20px">open to check</small></div>`,
  },
  {
    id: "mail", title: "List and Detail", cat: "patterns", best: "open", accent: "#0a84ff",
    line: "HIG's split view: the list on one half, the selected item on the other.",
    half: (p, w) => (w === "a" ? ldList() : ldDet()),
    outer: () => ldList(),
  },
  {
    id: "video", title: "Watch Above, Play Below", cat: "patterns", best: "table", accent: "#f08a5d",
    line: "Content you watch on the standing half, controls you touch on the flat one.",
    half: (p, w) => (w === "a" ? vdFrame() : vdCtl()),
    outer: () => vdFrame(),
  },
];
export const EXAMPLES = EX;
export const exById = (id) => EX.find((e) => e.id === id);

export const RESET = `*{box-sizing:border-box}html,body{margin:0}body{-webkit-font-smoothing:antialiased}`;

export function page_(title, fonts, css, body, { width } = {}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${width ? width : "device-width"},initial-scale=1">
<title>${title}</title>
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">` : ""}
<style>${RESET}${DEVICE_CSS}${CONTENT_CSS}${css}</style></head>
<body>${body}</body></html>
`;
}

/** How well each example fits each pose: 1 waits, 2 works, 3 best. Order follows POSES. */
export const FIT = {
  cajon: [1, 2, 2, 2, 2, 3], sampler: [1, 1, 2, 2, 2, 3], battleships: [1, 1, 2, 2, 2, 3], "hinge-guess": [1, 1, 1, 2, 3, 2],
  "pocket-console": [2, 2, 2, 2, 1, 3], "duo-man": [3, 2, 2, 1, 1, 1], critterdex: [2, 1, 2, 2, 3, 2], reader: [2, 2, 2, 1, 3, 1],
  sketchbook: [2, 1, 2, 2, 2, 3], flashcards: [3, 2, 2, 2, 2, 1], mail: [2, 2, 3, 2, 2, 2], video: [2, 2, 2, 2, 2, 3],
};
