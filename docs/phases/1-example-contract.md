---
status: built
since: 2026-09-30
note: "Example contract in src/core/example.ts and the reference example, Cajón, playable in all six poses."
---

# The example contract, and Cajón

An example is one idea for the Duo, written so the explorer can run it in every
pose and explain what it does in each. The emulator owns three screens — outer,
start half, end half — and never replaces them; the example owns what is drawn
inside, and redraws from its own state when the pose changes. That is Apple's
continuity rule made structural: state cannot be lost in a fold because it was
never kept in the screens.

Cajón is the reference, and the reason the project exists: set the Duo down in
table pose and the flat bottom half is the tapa — slap near the fold, bass
lower down — while the standing top half shows the box answering and a groove
to play along to. Voices, strokes and grooves are Ritmo's
([dalmaer/cajones](https://github.com/dalmaer/cajones)).

**Done when.** A new example can be added by writing one file and one line in
`src/examples/index.ts`, without touching the emulator, and `npm test` checks
that it names a real category, a best pose, and what it does there.

**Settled (2026-09-30).** Examples draw with the DOM, SVG or canvas as they
like, and scope their CSS by injecting a `<style>` with prefixed class names
that they remove on destroy. Shadow DOM was considered and dropped: it would
hide the examples from the page's container queries and from the explorer's
"show reserved regions" overlay.
