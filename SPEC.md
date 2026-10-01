# Duo Explorer — Spec

An explorer for the iPhone Duo: what an app *can do* on a phone that folds,
shown by running examples on an emulated Duo that you can put in every pose.

This document is the reasoning. Where the project stands is in
[docs/ROADMAP.md](docs/ROADMAP.md), generated from [docs/phases/](docs/phases/).
How to work here is [AGENTS.md](AGENTS.md).

---

## 1. Why this exists

The iPhone Duo shipped in September 2026 with an outer display for when it is
shut and an inner display that opens to twice the width. Within two weeks
people had built a Walkman you "insert" a cassette into by closing the phone, a
red creature field guide that went viral, an e-ink reader with facing pages, a
sampler you play by folding, flash cards you answer by unfolding, and a game
where the hinge *is* the controller.

The ideas are scattered across videos on X and hackathon repos. None of them
can be tried without a Duo, and a video shows one pose at a time. The question
an app designer actually has — *what should my app do when it is closed, open,
standing like a book, or set down like a laptop?* — is answered best by
**seeing the same app in every pose, side by side, and switching between them.**

That is the whole product: a catalog of examples, grouped by type, each running
on an emulated Duo with a pose switch under it and a panel saying what it does
in each pose and which of Apple's rules it demonstrates.

It starts with one example that is personal: a **cajón**. Set the Duo down in
table pose and the flat bottom half is the drum's front plate — slap near the
fold, bass lower down — while the standing top half shows the box answering and
a groove scrolling past to play along with. Everything else follows the same
shape.

## 2. The device

Facts from Apple's HIG page *Designing for iPhone Duo* (dated 9 Sep 2026,
captured 12 Sep) and the six iPhone Duo tech talks, as distilled in the
`apple-hig` skill vendored at [.agents/skills/apple-hig](.agents/skills/apple-hig)
(`references/hig/designing-for-iphone-duo.md` and
`references/duo-checklist.md`).

- **Two displays.** The *outer* display is used closed. The *inner* display is
  used open; a center hinge lets it partly fold, and the fold divides it into
  two usable regions. The user's-eye description — "one outside and two inside
  screens that fold to become one big one" — is the right mental model, and the
  explorer draws it that way: the inner display is two halves that are one
  display when flat.
- **Size classes drive layout**, not poses: outer portrait is compact width /
  regular height, outer landscape compact/compact, inner regular/regular.
- **The outer display is wider and shorter than other iPhones**, so toolbars,
  tab bars, the status bar and the Dynamic Island move to its trailing edge,
  top to bottom in that order. Inner landscape keeps side controls; inner
  portrait keeps horizontal bars.
- **Reserved regions.** The *outer camera* is always present in a corner. The
  *inner camera* is hidden until it runs, and UI moves aside when it does. The
  *folding region* is active only when partly open, and excludes the center.
  Alerts, sheets, menus and standard split views avoid it automatically; custom
  layouts use the reserved-region APIs.
- **Arrangements.** `ArrangementView` (iOS 27.1) holds a primary and secondary
  view as a *split* (side by side or stacked, by aspect) or an *overlay*
  (layered; separate sides when folded).
- **The hinge** is readable (`onHingeChange` / `UIHingeInteraction`) — for
  interactions and effects, **never for layout**.
- **Continuity.** The same features, state and hierarchy in every pose;
  controls in the same relative place; nothing interactive in the fold or under
  the bars.

### 2.1 Poses, as the explorer models them

One table, [src/core/poses.ts](src/core/poses.ts), is the single source of
truth. The explorer's points are proportions, not measurements — Apple has not
published point sizes (phase 0, *Deliberately open*).

| Pose | Display | Fold | Hinge | Size classes | How it is held |
| --- | --- | --- | --- | --- | --- |
| **Closed** | outer | — | 0° | C / R | Shut, one hand, like any iPhone. |
| **Closed · landscape** | outer | — | 0° | C / C | Shut, on its side. Bars on the trailing edge; overflow happens most here. |
| **Open** | inner | vertical | 180° | R / R | Flat, two hands, one big display. |
| **Open · portrait** | inner | horizontal | 180° | R / R | Flat and turned tall. |
| **Book** | inner | vertical | 30–175° (120°) | R / R | Partly folded, held like a paperback or stood on its edge. |
| **Table** | inner | horizontal | 30–175° (105°) | R / R | Partly folded and set down like a laptop: bottom flat, top standing. |
| **Standing** | inner | vertical | 30–175° (95°) | R / R | Partly open and stood on its edge like a greeting card: hands free, the outer display facing whoever is across from you. |

Apple's list is "closed, fully open, partially folded / book-like,
surface-resting, and edge-standing". Edge-standing was first modelled as book
pose; it became its own pose (phase 12) when the translator and presenter ideas
needed the outer display facing someone else — which is exactly what the table
said would happen: a seventh row, and nothing else changed.

### 2.3 Both sides at once

An app can show extra UI on the outer display while it runs inside — Apple's
`sceneAccessory` (checklist §9). An example opts in with `accessory: "<what the
other side shows>"`; in any inner pose `state.accessory` is then true and it
draws the other person's view into `screens.outer`. **Turn around** rotates the
emulated device to show that side and take taps there; the inner side goes
inert while it faces away. The system can switch the accessory off, so an
example must still work one-way without it.

### 2.2 The halves

Examples never see "left" and "right" — they get **start** and **end**:

| Fold | start | end |
| --- | --- | --- |
| vertical (open, book) | left | right |
| horizontal (open · portrait, table) | top | bottom |

**In table pose, what you watch goes in `start` (standing) and what you touch
goes in `end` (flat on the table).** That is Apple's own rule — "at-a-distance
content goes up top, and tappable controls go at the bottom" (checklist §6) —
and it is the pattern behind most of the catalog.

## 3. The explorer

### 3.1 What you see

- **Catalog** — examples grouped by category, each with the pose it is best in.
- **The device** — the emulated Duo, drawn in CSS 3D. Changing pose animates
  the fold. In book and table a **hinge slider** sets the angle (30–175°).
  **Show reserved regions** hatches the fold and marks the outer camera.
- **Pose bar** — seven poses with line drawings; the example's best pose is marked.
- **Panel** — the example's idea, the HIG principle it shows, what it does in
  *each* pose (tap a row to go there), who it is inspired by, and the current
  pose's facts (display, size classes, halves, hinge).
- **Deep links** — `#<example>/<pose>`, e.g. `#cajon/table`, so a particular
  example in a particular pose can be sent to someone.

The visual direction is phase 4: three options are on the isocan canvas and in
[docs/design/](docs/design/README.md).

### 3.2 The emulator

Two leaves on a hinge. The outer display is the back of the first leaf; the
inner display is the fronts of both. Every pose is the same two elements at
different angles, so moving between poses animates for free and the screens are
never recreated. Two frames keep content upright: *book* (leaves side by side)
and *stacked* (one above the other). The transforms are pure functions of pose
and hinge, tested in [src/emulator/duo.test.ts](src/emulator/duo.test.ts) —
including that the angle between the leaves is always `180 − hinge`.

Only the lit display takes input: a leaf facing away is `inert`.

### 3.3 The example contract

[src/core/example.ts](src/core/example.ts). An example provides metadata —
`id`, `title`, `category`, `summary`, `bestPose`, a sentence per pose,
`principle`, `credits` — and `create(screens, state)`, returning `render(state)`
for pose changes, optional `hinge(state)` for live hinge movement, and
`destroy()`.

**The emulator owns the screens; the example owns their contents; the state
lives in the example.** Redrawing from state on every pose change is what makes
continuity the default rather than something each example has to remember.

Examples are plain TypeScript with the DOM, SVG or canvas; no framework, no
external assets, no network. Each scopes its CSS with a prefixed injected
`<style>`, removed on destroy. Sound goes through
[src/lib/audio.ts](src/lib/audio.ts), which carries Ritmo's iOS rules: request
the playback audio session, unlock on a trusted gesture, strike on
`pointerdown` once running.

## 4. Categories and examples

Grouped by what people are looking for. Each example credits where the idea
came from; the posts and repos are catalogued in
[docs/research/sources.md](docs/research/sources.md).

### Music — *play below, see it above*

**Cajón** *(best: table)* — The flat bottom half is the tapa; the fold is its
top edge. Six zones: accent slap nearest the fold, soft slap, bass lowest; left
hand left, right hand right. The standing top half is the box: the plate
ripples where you strike, the snare wires buzz on slaps, it thumps on bass. Play
along: Ritmo's *The first beat* and *Find the backbeat* scroll toward a hit
line at 64–128 bpm, and strokes in time count. Closed: pads with the box as a
strip. Closed · landscape: two thumbs, like Ritmo's phone layout. Open/book:
box on one page, plate on the other. *Source: Ritmo (dalmaer/cajones).*

**Crate Sampler** *(best: table)* — Finger-drum pads below, a 16-step sequencer
above; record into steps as it runs. The hinge is a performance control: folding
flatter opens a low-pass filter, and snapping from shut-ish to flat fires a drop.
*Source: CRATE, YC × Bitrig hackathon winner; a Duo music studio by @acooldora.*

### Games — *folding is a move*

**Battleships** *(best: table)* — The physical game's folding case, digitized:
the standing half is your targeting board, the flat half your fleet, against a
CPU. Open/book: both boards side by side. Closed: the state of the war and an
invitation to open.

**Hinge Guess** *(best: book)* — Fold to a target angle, then measure; a
protractor whose pivot sits on the fold. The hinge is the instrument. Closed
asks you to open, because the outer display has no hinge to read.
*Source: erkamyaman/hinge-guess.*

### Retro — *old folding objects, redrawn*

**Pocket Console** *(best: table)* — A green-screen handheld: the screen on the
standing half, D-pad and buttons on the flat half, a real game of Snake.
Closed · landscape: the horizontal handheld layout. The canonical *controls
below, screen above* example.

**Duo-Man** *(best: closed)* — Open to pick a tape from the shelf and insert it;
close the phone to listen, reels turning in the window. *Source: @viditb.*

**Critterdex** *(best: book)* — A red clamshell field guide with original
creatures: lens and scan on the lid, art on the left page, the entry on the
right. *Source: the viral video posted by @javilosana.*

### Productivity — *two facing pages*

**E-ink Reader** *(best: book)* — Warm paper, serif type, a refresh flash on
page turn; a two-page spread open, one page closed, with your place kept.
Public-domain text (Walden). *Source: @MiruDaws.*

**Sketchbook** *(best: table)* — Draw on the flat half like paper on a desk,
with a reference to copy standing above. The drawing is kept as strokes, so it
redraws at any size in any pose. *Source: @MarioSaputra.*

### Learning — *fold to hide, unfold to reveal*

**Fold Cards** *(best: closed)* — The question on the outer display; open the
phone to reveal the answer, grade yourself, close for the next card.
*Source: @elvin_not_11.*

### Patterns — *Apple's own adaptations*

**List and Detail** *(best: open)* — Mail's adaptation exactly as the HIG
describes it: list *or* message closed, both open; bars vertical on the outer
display's trailing edge; nothing interactive in the fold.

**Watch Above, Play Below** *(best: table)* — Video on the standing half,
scrubber and details on the flat half; playback continues across every pose.

### 4.1 The user's four seeds

The brief named four ideas to flesh out; each is in the catalog:

| Seed | Where |
| --- | --- |
| Cajón played on the bottom half, instrument on top, folded sitting | **Cajón**, table pose |
| Battleships folded | **Battleships**, table pose |
| Retro folded items, digitized | **Retro**: Duo-Man, Critterdex, Pocket Console |
| Controls on the bottom, screen on top, folded | **Pocket Console**, **Watch Above, Play Below**, and the pattern behind Cajón and the Sampler |

### 4.2 Backlog

Ideas worth an example, each an issue labelled `example`: a dual-screen
Game & Watch-style handheld; a flip phone; a piano with sheet music above; a
camera in table pose as its own tripod; Calculator's 4×5 → 5×4 reflow on the
outer display; a pen-pal letters app in the manner of Letters Abroad; a
face-to-face two-player game standing on its edge; a map with directions below.

## 5. Principles

1. **Every example earns every pose.** A pose an example does nothing special
   in says so in plain words ("adapts like any well-behaved app") rather than
   being left blank — the absence is information.
2. **Follow Apple where Apple has spoken, and say so.** Each example cites the
   rule it demonstrates. Where the HIG and the tech talks disagree (bar side,
   per-pose layouts, fold scope — checklist *Tensions*), say which one the
   example follows.
3. **The hinge is for interaction, never layout.** Layout follows the pose's
   size classes; the angle drives effects (a filter, a protractor), not where
   things go.
4. **Credit the idea.** Every example drawn from someone's post or repo names
   them and links it. Nothing is copied that is not licensed for it: the
   explorer reimplements ideas, uses public-domain text, and draws its own art.
5. **Original, not lookalike.** Retro examples evoke famous objects without
   their names, logos or characters.
6. **Static and fast.** No backend, no accounts, no analytics, no external
   assets. The site is a folder on GitHub Pages.

## 6. Non-goals

- A pixel-accurate simulator. Xcode's Device Hub is that; this is a sketchbook
  of ideas you can touch.
- Native code. Phase 9 adds notes on how each example would be built natively;
  the explorer itself stays web.
- User accounts, saving, sharing beyond links.

## 7. Stack

- **Vite + TypeScript**, no UI framework. `npm run dev` serves at
  `http://localhost:5173/duo/`; `base` is `/duo/` to match Pages.
- **Tests** with `node --test` on Node 24 (types stripped natively): the pose
  table, the emulator transforms, the example registry, and the roadmap.
- **CI** in GitHub Actions: tests, typecheck, roadmap check, build; deploy to
  Pages on `main`; a smoke check that the live page serves the build just made.
- **Agents**: `AGENTS.md`; the `apple-hig` skill (submodule) for Apple's rules;
  the `duo-explorer` skill for adding examples; `@claude` on issues and PRs.
- **Design** happens on the isocan canvas named in `.isocan/project.json`.

## 8. Sources

[docs/research/sources.md](docs/research/sources.md) lists every post and repo
this draws on, what each showed, and which example it became.
