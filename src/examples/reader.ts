// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const readerExample: Example = {
  id: "reader",
  title: "E-ink Reader",
  category: "productivity",
  summary: "Coming soon.",
  bestPose: "book",
  poses: { book: "Coming soon." },
  create(screens) {
    screens.start.textContent = "E-ink Reader — coming soon";
    return { render() {}, destroy() {} };
  },
};
