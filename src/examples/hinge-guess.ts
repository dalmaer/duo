// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const hingeGuessExample: Example = {
  id: "hinge-guess",
  title: "Hinge Guess",
  category: "games",
  summary: "Coming soon.",
  bestPose: "book",
  poses: { book: "Coming soon." },
  create(screens) {
    screens.start.textContent = "Hinge Guess — coming soon";
    return { render() {}, destroy() {} };
  },
};
