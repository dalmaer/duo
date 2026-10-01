---
name: duo-explorer
description: >
  Add or improve an example in Duo Explorer — the web app that emulates the
  folding iPhone Duo and runs example apps in every pose (closed,
  closed-landscape, open, open-portrait, book, table). Use when asked to build a
  new Duo example, flesh out an idea from an `example` issue, fix how an example
  behaves in a pose, or review an example against Apple's iPhone Duo guidance.
---

# Duo Explorer examples

Read `AGENTS.md` first, then `src/core/example.ts` and `src/examples/cajon.ts`.

## 1. Design it per pose before writing code

Write one sentence for each of the seven poses: what the example does there. Use
this rule of thumb and Apple's guidance (`.agents/skills/apple-hig`,
`references/duo-checklist.md` and `references/hig/designing-for-iphone-duo.md`):

| Pose | Screens you get | Default thinking |
| --- | --- | --- |
| closed | `outer` 300×380 | The phone app. Compact width. Often: a teaser that invites opening. |
| closed-landscape | `outer` 380×300 | Compact/compact. Bars on the trailing edge. Thumbs at the sides. |
| open | `start` (left) + `end` (right), 300×380 each | Expand: list + detail, two pages. Never a stretched phone app. |
| open-portrait | `start` (top) + `end` (bottom), 380×300 each | Same split, stacked. Horizontal bars. |
| book | as open, partly folded | Two facing pages. Nothing interactive in the fold. |
| table | `start` (top, standing) + `end` (bottom, flat) | **Watch on top, touch on the bottom.** |
| stand | as book, stood on its edge on a table | Hands free. With `accessory`, the outer display faces the person across. |

**Both sides at once.** Set `accessory: "<what the other side shows>"` and,
when `state.accessory` is true (any inner pose), draw the other person's view
into `screens.outer` as well. It must still work one-way without it.
`translator.ts` is the reference.

Where the pose is the mechanic (close to listen, unfold to reveal), react in
`render` by comparing the new pose with the previous one you stored.

## 2. Build it

- One file, `src/examples/<id>.ts`, exporting `<camelId>Example: Example`.
- State in closure variables. `render(state)` clears `screens.outer`,
  `screens.start`, `screens.end` and redraws **from state**.
- One injected `<style>`; every class prefixed (`.cj-…` for cajón). Remove it in
  `destroy()`, with every timer, animation frame and sound.
- `hinge(state)` only if the angle drives an effect. Never layout.
- Sound via `src/lib/audio.ts`; call `ready()` inside a pointer handler first.
- Screens are `container-type: size`, so `cqw`/`cqh` units work.
- No assets from elsewhere, no dependencies, no copied code or art.
- Register it in `src/examples/index.ts` under its category.

## 3. Describe it

`summary` (the idea), `poses` (all six), `principle` (the Apple rule, cited as
"HIG checklist §N" or "HIG, <section>"), `credits` (who had the idea, with a
link — an issue that cites a post or repo must be credited).

## 4. Check it

1. `npm run dev`, open `http://localhost:5173/duo/#<id>/<bestPose>`.
2. Use it, then move through all seven poses **mid-use**. Nothing may be lost.
3. In book and table, move the hinge slider across its range.
4. Turn on *Show reserved regions*: nothing tappable under the hatching.
5. `npm run check`.
6. If it came from an issue, say `Closes #N` in the PR.
