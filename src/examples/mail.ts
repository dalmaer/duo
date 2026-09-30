// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const mailExample: Example = {
  id: "mail",
  title: "List and Detail",
  category: "patterns",
  summary: "Coming soon.",
  bestPose: "open",
  poses: { open: "Coming soon." },
  create(screens) {
    screens.start.textContent = "List and Detail — coming soon";
    return { render() {}, destroy() {} };
  },
};
