// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const sketchbookExample: Example = {
  id: "sketchbook",
  title: "Sketchbook",
  category: "productivity",
  summary: "Coming soon.",
  bestPose: "table",
  poses: { table: "Coming soon." },
  create(screens) {
    screens.start.textContent = "Sketchbook — coming soon";
    return { render() {}, destroy() {} };
  },
};
