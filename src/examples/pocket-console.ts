// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const pocketConsoleExample: Example = {
  id: "pocket-console",
  title: "Pocket Console",
  category: "retro",
  summary: "Coming soon.",
  bestPose: "table",
  poses: { table: "Coming soon." },
  create(screens) {
    screens.start.textContent = "Pocket Console — coming soon";
    return { render() {}, destroy() {} };
  },
};
