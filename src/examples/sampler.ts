// STUB — replaced by the real example. See cajon.ts for the pattern.
import type { Example } from "../core/example.ts";

export const samplerExample: Example = {
  id: "sampler",
  title: "Crate Sampler",
  category: "music",
  summary: "Coming soon.",
  bestPose: "table",
  poses: { table: "Coming soon." },
  create(screens) {
    screens.start.textContent = "Crate Sampler — coming soon";
    return { render() {}, destroy() {} };
  },
};
