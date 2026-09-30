---
status: built
since: 2026-09-30
note: "Two leaves on a hinge in CSS 3D; six poses from one table in src/core/poses.ts, with the transforms unit-tested. Not yet checked on a phone."
---

# The emulated Duo

A browser drawing of the iPhone Duo that can be put in every pose Apple names —
closed, closed on its side, open flat, open and turned tall, book, and table —
and moved between them with the fold animating. The outer display is the back
of one leaf; the inner display is the fronts of both, split by the fold.

Everything the explorer knows about the device lives in one table,
`src/core/poses.ts`: which display is lit, the size classes (HIG checklist §1),
the default hinge angle, and which reserved regions are active. The emulator,
the examples and the side panel all read it, so a pose cannot mean one thing to
the picture and another to the example.

**Done when.** Every pose in Apple's HIG page can be selected, the book and
table poses take a hinge angle from 30° to 175°, the reserved regions (fold,
outer camera) can be shown, and a tap on the lit display reaches the example —
on desktop Chrome, Safari and Firefox, and on an iPhone in Safari.

**Deliberately open.**

- *Real dimensions.* Apple has not published point sizes for either display;
  `LEAF` is 300×380 by eye from the press images. Replace it when Apple, a
  simulator measurement or a device says otherwise — it is one constant.
- *Which side the outer bars go on.* The HIG says the trailing edge; one tech
  talk says "the right side". The pattern examples draw them trailing. See the
  checklist's Tensions §1.
