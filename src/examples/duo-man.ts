// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const duoManExample: Example = {
  id: "duo-man",
  title: "Duo-Man",
  category: "retro",
  summary: "Coming soon.",
  bestPose: "closed",
  poses: { closed: "Coming soon." },
  create(screens) {
    screens.start.textContent = "Duo-Man — coming soon";
    return { render() {}, destroy() {} };
  },
};
