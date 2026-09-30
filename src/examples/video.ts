// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const videoExample: Example = {
  id: "video",
  title: "Watch Below, Play Above",
  category: "patterns",
  summary: "Coming soon.",
  bestPose: "table",
  poses: { table: "Coming soon." },
  create(screens) {
    screens.start.textContent = "Watch Below, Play Above — coming soon";
    return { render() {}, destroy() {} };
  },
};
