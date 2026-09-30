import "./styles.css";
import { Duo } from "./emulator/duo.ts";
import { POSES, POSE_IDS, isPoseId, halfNames, type PoseId } from "./core/poses.ts";
import { CATEGORIES, CATEGORY_BLURB, CATEGORY_LABEL, type Example, type Instance } from "./core/example.ts";
import { EXAMPLES, byId } from "./examples/index.ts";
import { POSE_ICONS } from "./ui/icons.ts";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const catalog = $("#catalog");
const host = $("#device");
const poseBar = $("#poses");
const panel = $("#panel");

const duo = new Duo(host);
let example: Example = EXAMPLES[0]!;
let instance: Instance | null = null;

/* ---------- catalog ---------- */
for (const cat of CATEGORIES) {
  const items = EXAMPLES.filter((e) => e.category === cat);
  if (!items.length) continue;
  const h = document.createElement("h2");
  h.textContent = CATEGORY_LABEL[cat];
  const p = document.createElement("p");
  p.className = "app-blurb";
  p.textContent = CATEGORY_BLURB[cat];
  catalog.append(h, p);
  for (const ex of items) {
    const b = document.createElement("button");
    b.dataset.id = ex.id;
    b.innerHTML = `${ex.title}<small>Best ${POSES[ex.bestPose].label.toLowerCase()}</small>`;
    b.onclick = () => open(ex.id);
    catalog.append(b);
  }
}

/* ---------- pose bar ---------- */
const poseButtons = new Map<PoseId, HTMLButtonElement>();
for (const id of POSE_IDS) {
  const b = document.createElement("button");
  b.innerHTML = `${POSE_ICONS[id]}<span>${POSES[id].label}</span><span class="app-best"></span>`;
  b.title = POSES[id].holding;
  b.onclick = () => duo.setPose(id);
  poseButtons.set(id, b);
  poseBar.append(b);
}
const hingeRow = document.createElement("label");
hingeRow.className = "app-hinge";
hingeRow.innerHTML = `Hinge <input type="range" min="30" max="175" step="1" aria-label="Hinge angle"><output></output>`;
const hingeInput = hingeRow.querySelector("input")!;
const hingeOut = hingeRow.querySelector("output")!;
hingeInput.oninput = () => duo.setHinge(Number(hingeInput.value));
const regions = document.createElement("label");
regions.className = "app-toggle";
regions.innerHTML = `<input type="checkbox"> Show reserved regions`;
regions.querySelector("input")!.onchange = (e) => host.classList.toggle("show-regions", (e.target as HTMLInputElement).checked);
poseBar.append(hingeRow, regions);

/* ---------- side panel ---------- */
function renderPanel(): void {
  const { pose, hinge } = duo.current;
  const halves = halfNames(pose);
  const rows = POSE_IDS.map((id) => {
    const text = example.poses[id] ?? "Nothing special — it adapts like any well-behaved app.";
    return `<li><button data-pose="${id}" aria-current="${id === pose.id}"><b>${POSES[id].label}</b><span>${text}</span></button></li>`;
  }).join("");
  const credits = example.credits?.length
    ? `<h3>Inspired by</h3><ul class="app-credits">${example.credits
        .map((c) => `<li><a href="${c.url}" target="_blank" rel="noopener">${c.who}</a> — ${c.what}</li>`)
        .join("")}</ul>`
    : "";
  panel.innerHTML = `
    <span class="app-chip">${CATEGORY_LABEL[example.category]}</span>
    <h1>${example.title}</h1>
    <p class="app-summary">${example.summary}</p>
    ${example.principle ? `<div class="app-principle">${example.principle}</div>` : ""}
    <h3>In each pose</h3>
    <ol>${rows}</ol>
    ${credits}
    <h3>Right now</h3>
    <p class="app-facts">${pose.label} · ${pose.display} display · ${pose.size.width}/${pose.size.height}${
      halves ? ` · halves ${halves.start}/${halves.end}` : ""
    }${pose.adjustable ? ` · hinge ${hinge}°` : ""}</p>`;
  for (const b of panel.querySelectorAll<HTMLButtonElement>("ol button")) {
    b.onclick = () => duo.setPose(b.dataset.pose as PoseId);
  }
}

/* ---------- wiring ---------- */
function syncChrome(): void {
  const { pose, hinge } = duo.current;
  for (const [id, b] of poseButtons) {
    b.setAttribute("aria-pressed", String(id === pose.id));
    b.querySelector(".app-best")!.textContent = id === example.bestPose ? "best" : "";
  }
  hingeRow.hidden = !pose.adjustable;
  hingeInput.value = String(hinge);
  hingeOut.textContent = `${hinge}°`;
  for (const b of catalog.querySelectorAll<HTMLButtonElement>("button")) {
    b.setAttribute("aria-current", String(b.dataset.id === example.id));
  }
  renderPanel();
  const hash = `#${example.id}/${pose.id}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
}

let lastPose: PoseId | null = null;
duo.onChange((state) => {
  if (state.pose.id !== lastPose) instance?.render(state);
  else instance?.hinge?.(state);
  lastPose = state.pose.id;
  syncChrome();
});

function open(id: string, poseId?: PoseId): void {
  instance?.destroy();
  // Null it before setPose: the pose listener would otherwise render the
  // instance we just destroyed.
  instance = null;
  for (const s of Object.values(duo.screens)) s.replaceChildren();
  example = byId(id) ?? EXAMPLES[0]!;
  const target = poseId ?? example.bestPose;
  lastPose = null;
  // Set the pose first so the example is created into the right-sized screens.
  duo.setPose(target);
  instance = example.create(duo.screens, duo.current);
  instance.render(duo.current);
  lastPose = duo.current.pose.id;
  syncChrome();
}

function fromHash(): void {
  const [id, p] = location.hash.slice(1).split("/");
  open(id && byId(id) ? id : EXAMPLES[0]!.id, isPoseId(p) ? p : undefined);
}
window.addEventListener("hashchange", () => {
  const [id, p] = location.hash.slice(1).split("/");
  if (id !== example.id) fromHash();
  else if (isPoseId(p) && p !== duo.current.pose.id) duo.setPose(p);
});
fromHash();
