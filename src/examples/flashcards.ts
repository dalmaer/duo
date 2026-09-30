// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const flashcardsExample: Example = {
  id: "flashcards",
  title: "Fold Cards",
  category: "learning",
  summary: "Coming soon.",
  bestPose: "closed",
  poses: { closed: "Coming soon." },
  create(screens) {
    screens.start.textContent = "Fold Cards — coming soon";
    return { render() {}, destroy() {} };
  },
};
