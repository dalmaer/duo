// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const critterdexExample: Example = {
  id: "critterdex",
  title: "Critterdex",
  category: "retro",
  summary: "Coming soon.",
  bestPose: "book",
  poses: { book: "Coming soon." },
  create(screens) {
    screens.start.textContent = "Critterdex — coming soon";
    return { render() {}, destroy() {} };
  },
};
