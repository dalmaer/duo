/**
 * **The emulated iPhone Duo.**
 *
 * Two leaves on a hinge, drawn with CSS 3D transforms. The outer display is
 * the back of the first leaf; the inner display is the fronts of both. Folding
 * is a rotation about the shared edge, so every pose — shut, flat, a book, a
 * tiny laptop — is the same two elements at different angles, and the move
 * between poses animates for free.
 *
 * There are two frames, because content has to stay upright:
 *   book    — leaves side by side, fold vertical   (closed, open, book)
 *   stacked — leaves one above the other, fold horizontal (closed-landscape, open-portrait, table)
 *
 * The screens are created once and handed to each example; the emulator never
 * replaces them. See src/core/example.ts for why that matters.
 */

import { LEAF, POSES, activeRegions, clampHinge, type Pose, type PoseId } from "../core/poses.ts";
import type { DuoState, Screens } from "../core/example.ts";

type Frame = "book" | "stacked";

function frameOf(p: Pose): Frame {
  return p.split === "side-by-side" || p.id === "closed" ? "book" : "stacked";
}

export interface LeafTransforms {
  start: string;
  end: string;
  device: string;
}

/**
 * The transforms for a pose, as strings, so they can be tested without a DOM.
 *
 * Book: the two leaves fold symmetrically toward the viewer about the vertical
 * hinge, like an open paperback. Table: the base leans toward the viewer by
 * half the fold plus a little, and the top leaf stands up by the rest, so both
 * stay legible — a real laptop seen from a chair would show its keyboard
 * almost edge-on, which is faithful and useless.
 */
export function transformsFor(p: Pose, hinge: number): LeafTransforms {
  const fold = 180 - hinge;
  switch (p.id) {
    case "closed":
      return { start: "rotateY(180deg)", end: "rotateY(0deg)", device: `translateX(${-LEAF.width / 2}px)` };
    case "closed-landscape":
      return { start: "rotateX(-180deg)", end: "rotateX(0deg)", device: `translateY(${-LEAF.width / 2}px)` };
    case "open":
      return { start: "rotateY(0deg)", end: "rotateY(0deg)", device: "none" };
    case "open-portrait":
      return { start: "rotateX(0deg)", end: "rotateX(0deg)", device: "none" };
    case "book":
      return { start: `rotateY(${fold / 2}deg)`, end: `rotateY(${-fold / 2}deg)`, device: "rotateX(6deg)" };
    case "table": {
      const base = fold / 2 + 10;
      return { start: `rotateX(${base - fold}deg)`, end: `rotateX(${base}deg)`, device: "none" };
    }
  }
}

export class Duo {
  readonly el: HTMLElement;
  readonly screens: Screens;
  private device: HTMLElement;
  private leafStart: HTMLElement;
  private leafEnd: HTMLElement;
  private foldMarks: HTMLElement[];
  private state: DuoState;
  private listeners = new Set<(s: DuoState) => void>();

  constructor(host: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "duo-stage";
    this.el.innerHTML = `
      <div class="duo-scale"><div class="duo" data-frame="book">
        <div class="leaf start">
          <div class="face front"><div class="screen" data-screen="start"></div><i class="fold-mark"></i></div>
          <div class="face back"><div class="screen" data-screen="outer"></div><i class="camera outer-camera" title="Outer camera — always reserved"></i></div>
        </div>
        <div class="leaf end">
          <div class="face front"><div class="screen" data-screen="end"></div><i class="fold-mark"></i></div>
          <div class="face back shell"></div>
        </div>
      </div></div>`;
    host.append(this.el);
    this.device = this.el.querySelector(".duo")!;
    this.leafStart = this.el.querySelector(".leaf.start")!;
    this.leafEnd = this.el.querySelector(".leaf.end")!;
    this.foldMarks = [...this.el.querySelectorAll<HTMLElement>(".fold-mark")];
    this.screens = {
      outer: this.el.querySelector('[data-screen="outer"]')!,
      start: this.el.querySelector('[data-screen="start"]')!,
      end: this.el.querySelector('[data-screen="end"]')!,
    };
    this.state = { pose: POSES.open, hinge: 180 };
    new ResizeObserver(() => this.fit()).observe(host);
    this.apply();
  }

  get current(): DuoState {
    return this.state;
  }

  onChange(fn: (s: DuoState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setPose(id: PoseId, hinge?: number): void {
    const pose = POSES[id];
    const angle = pose.adjustable ? clampHinge(hinge ?? pose.hinge) : pose.hinge;
    this.state = { pose, hinge: angle };
    this.apply();
    for (const fn of this.listeners) fn(this.state);
  }

  setHinge(angle: number): void {
    if (!this.state.pose.adjustable) return;
    this.state = { ...this.state, hinge: clampHinge(angle) };
    this.apply();
    for (const fn of this.listeners) fn(this.state);
  }

  private apply(): void {
    const { pose, hinge } = this.state;
    const frame = frameOf(pose);
    const t = transformsFor(pose, hinge);
    this.device.dataset.frame = frame;
    this.device.dataset.pose = pose.id;
    this.device.dataset.display = pose.display;
    this.device.style.transform = t.device;
    this.leafStart.style.transform = t.start;
    this.leafEnd.style.transform = t.end;
    const regions = activeRegions(pose, hinge);
    for (const m of this.foldMarks) m.hidden = !regions.includes("fold");
    // Only the lit display takes input; a leaf facing away must not catch taps.
    this.screens.outer.inert = pose.display !== "outer";
    this.screens.start.inert = pose.display !== "inner";
    this.screens.end.inert = pose.display !== "inner";
    for (const [name, s] of Object.entries(this.screens)) {
      s.dataset.lit = String(name === "outer" ? pose.display === "outer" : pose.display === "inner");
    }
    this.fit();
  }

  /** Scale the device to fit its host, whatever the pose's footprint. */
  private fit(): void {
    const host = this.el.parentElement;
    if (!host) return;
    const { pose } = this.state;
    // Folded poses reach toward the viewer, and perspective makes the near
    // edge larger than its points; leave room for it.
    const reach = pose.adjustable ? 1.25 : 1;
    const w = pose.points.width * reach + 60;
    const h = pose.points.height * reach + 60;
    const scale = Math.min(1.15, host.clientWidth / w, host.clientHeight / h);
    this.el.style.setProperty("--scale", String(Math.max(0.3, scale)));
  }
}
