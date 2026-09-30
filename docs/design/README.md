# Duo Explorer — three design directions

Static mockups for comparing directions for the explorer. Each option has
three screens:

| | Home / browse | Example (Cajón, table pose) | Mobile (390 px) |
|---|---|---|---|
| **A · Lab bench** | `option-a/home.html` | `option-a/example.html` | `option-a/mobile.html` |
| **B · Gallery wall** | `option-b/home.html` | `option-b/example.html` | `option-b/mobile.html` |
| **C · Storyboard** | `option-c/home.html` | `option-c/example.html` | `option-c/mobile.html` |

Every file is self-contained: inline CSS, the Duo drawn in CSS 3D, no images.
The only external request is Google Fonts, and each option falls back to
system fonts without it. Desktop screens are drawn for 1440 × 960 (B's home
is taller, 1440 × 1500); mobile is 390 wide.

The screens are generated from `src/` so the three directions draw the same
device and screen contents. `src/kit.mjs` holds the device (one leaf is
300 × 380 explorer points, as in `src/core/poses.ts`), the pose glyphs, the
screen contents for all twelve examples and the pose-fit data. Rebuild with:

```sh
cd docs/design/src && node option-a.mjs && node option-b.mjs && node option-c.mjs
```

All three are also on the isocan canvas **duo**, one row per direction.

---

## A · Lab bench

*A dense, precise tool with the look of a spec sheet. It refines v0.*

- **Home is a pose matrix.** Each row is an example and each column is a
  pose; a dot shows the fit (best / works / waits). Scan a row to see where an
  idea comes alive, or scan a column to see what a pose is for. Each example
  has a small thumbnail in its best pose. A right panel previews the selected
  row with its spec and HIG reference.
- **The example page is the bench.** The catalog rail stays on the left, with
  a six-bar fit sparkline on every entry. The device sits on a dotted
  engineering grid with dimension lines (380 pt, 300 pt) and callouts. Under
  it is a **pose timeline**: six pose cells above a 0–180° hinge track, with
  closed, table 105°, book 120° and open 180° marked on it and the draggable
  range shaded. The panel on the right has the pose notes, the principle, and
  **HIG citations inline** (`HIG §6 ↗`). It also has a pose sheet covering all
  six poses, the reserved regions and the credits.
- **Mobile** stacks the device, a six-way pose control, the hinge slider and a
  bottom sheet with tabs.

**Strengths:** it has the most information per pixel and it is honest about
what the explorer is: a reference for designers building for the Duo. The
matrix does something neither of the other options does, because it lets you
compare *across examples*. It is the closest to v0, so it costs the least to
build.
**Weaknesses:** it is the least delightful and it looks like a developer
tool. The device is one element among many. First-time visitors meet a table
before they meet a drum.

## B · Gallery wall

*Editorial and playful, built around a lot of devices.*

- **Home is a wall of live cards.** Each category has a colour and a big serif
  poster (01 Music, 02 Games…). Each card shows its device cycling through
  closed → open → its best pose, with a ticker and pips that follow the
  cycle. The cards are staggered, so at any moment the wall shows many
  different poses. There is a hero ("Twelve apps, one *fold.*") and a pose
  marquee.
- **The example page is a focused, full-bleed poster** in the category colour.
  It has a huge title, a one-line subtitle ("a drum you set on the table"),
  and the in-pose description set in large serif type. There are six big pose
  chips and a large device with sticker callouts ("slap by the hinge"). The
  HIG line is a pull-quote, and a card links to the next example.
- **Mobile** is a vertical feed of the same live cards under category
  headings.

**Strengths:** it has the most charm and the most shareable screenshots, and it
sells the *idea* of the Duo to people who have never heard of it. The motion
explains folding without any words.
**Weaknesses:** it spends a lot of space on each example. You compare poses
over time, not side by side. The HIG reasoning is reduced to a quote, and
twelve animated 3D devices on one page need care for performance and
`prefers-reduced-motion`.

## C · Storyboard

*One example at a time, all six poses at once.*

- **Home is a contact sheet.** Each example is a *chapter*, and each chapter
  has a filmstrip of its six poses with sprocket edges. The pose it was built
  for is outlined in amber, and fit bars sit on every frame. A chapter index
  on the left groups chapters into Parts (Music, Games…).
- **The example page is the storyboard.** Six panels (SC 01–06) sit in a 3 × 2
  grid, and each has its hinge, display and size class in the corner. The
  caption for each pose sits right under its frame. Table is marked
  "★ BUILT FOR THIS". Under the grid, an **"Across the fold" table** shows
  where each part of the app goes in each pose (the box: strip → centre →
  left page → top half…). J and K step through chapters, and 1–6 focus a pose.
- **Mobile** shows one frame at a time, with neighbours peeking in a swipe
  row. Below it are the caption, a 3 × 2 contact sheet of all six poses, and a
  "Next chapter" bar.

**Strengths:** it best answers the explorer's central question, "what does
this app do in each pose?", in one glance with no interaction. The
"across the fold" row makes the adaptation logic explicit. The chapter model
suits a catalog that will grow.
**Weaknesses:** the frames are small, so the example is harder to *play*.
This is a comparison view, and you still need a single large, interactive
device. A dark cinematic theme is a strong stylistic choice.

---

## Recommendation

**Build C as the spine, with A's bench as its interactive mode and B's live
cards as its front door.**

- The explorer exists to show what an app does in *each pose*. Only the
  storyboard shows that without clicks. Make it the default view of an
  example.
- Clicking a storyboard frame should expand it into A's bench: one big,
  playable device, the hinge timeline, dimensions and the HIG citations. The
  bench is where you *use* the example, and the storyboard is where you
  *understand* it.
- Keep A's pose matrix as a secondary "Compare" view across the catalog. It is
  the one place where you compare examples with each other.
- Borrow B's energy for the home page only. Use live cycling cards (with
  reduced motion respected) as the first thing a newcomer sees, then send
  them into chapters.

If only one direction is built, build **C**. Its home and example pages
cost about the same as A's, and it gives the project a distinctive identity
that says what the project is about.

## Notes and open questions

- Most examples are still "Coming soon" in code. Their screen contents here
  are illustrative, and their pose-fit ratings (`FIT` in `src/kit.mjs`) are
  guesses to be replaced by the real ones.
- `src/examples/video.ts` titles the pattern "Watch Below, Play Above". The
  brief and the HIG pattern are *watch above, play below* (you watch the
  standing half and touch the flat half), so the mockups use that. The title
  in code is probably backwards.
- The HIG section numbers (§1–§6) follow the checklist cited in
  `src/core/poses.ts` and `cajon.ts`. Only §6 (Cajón) is confirmed in code.
