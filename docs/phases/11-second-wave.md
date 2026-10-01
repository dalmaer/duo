---
status: built
since: 2026-09-30
issue: 19
note: "All twenty-three built, each handling all seven poses, with no runtime errors in any pose and real taps reaching them in every pose. Not yet played through by a person; sound unheard by anyone but its synthesis code."
---

# The second wave of examples

The first catalog proved the contract. This wave is chosen by a sharper test:
**does it use the fold in a way a flat phone cannot copy?** Every idea leans on
one of four tricks:

1. **The hinge as an input** — a bellows, a reel, a pop-up that rises with the angle.
2. **Opening and closing as the move** — reveal, erase, start, stop, tuck in.
3. **The standing half as a wall** — a backglass, a privacy screen, a stage.
4. **The outer display facing someone else** while you use the inner one (phase 12).

Each idea is an issue labelled `example` and its category; the issue holds the
pose-by-pose sketch, and closes when the example is in the catalog.

### Wave A — the five that most need a fold, plus the music box (building now)

| Example | Category | The trick | Issue |
| --- | --- | --- | --- |
| **Pinball** `pinball` | games | The flat half is the playfield, the standing half the backglass — art, score, TILT. | [#21](https://github.com/dalmaer/duo/issues/21) |
| **Poker with a privacy wall** `poker` | games | Table pose as a privacy screen: your hand lies on the flat half, shielded by the standing half from people across the table; community cards and pot stand on top. | [#22](https://github.com/dalmaer/duo/issues/22) |
| **Pop-up storybook** `popup-book` | learning | The hinge angle raises paper cut-outs: open the phone and the castle stands up; fold it and it lies flat. Hinge for effects, never layout. | [#23](https://github.com/dalmaer/duo/issues/23) |
| **Split-flap clock and board** `split-flap` | retro | A split-flap display whose flaps flip over the real fold. Closed: the time. Table: a desk clock or departures board. | [#24](https://github.com/dalmaer/duo/issues/24) |
| **Accordion** `accordion` | music | The hinge is the bellows: folding and unfolding pushes air, button rows on each half, squeeze speed sets volume. | [#25](https://github.com/dalmaer/duo/issues/25) |
| **Music box** `music-box` | music | Closed it is an ornate lid; open it and the tune starts — a dancer on the standing half, the pin cylinder on the flat half, wound by a circular drag. Close it and it stops mid-note. | [#26](https://github.com/dalmaer/duo/issues/26) |

### Wave B — opening and closing as the move

| Example | Category | The trick | Issue |
| --- | --- | --- | --- |
| **Chomp** `chomp` | games | Crocodile dentist: the phone is the jaw. Press teeth on the bottom half; the wrong one snaps it shut. | [#27](https://github.com/dalmaer/duo/issues/27) |
| **Fishing** `fishing` | games | Cast with a flick, fold and unfold to reel; line tension on the standing half. | [#28](https://github.com/dalmaer/duo/issues/28) |
| **Mini-golf** `mini-golf` | games | Putt on the flat half; the ball rolls up onto the standing half, where the hole is. | [#29](https://github.com/dalmaer/duo/issues/29) |
| **Etch-a-sketch** `etch-sketch` | retro | Knobs on the bottom, screen on top — and closing the phone shakes it clean. | [#30](https://github.com/dalmaer/duo/issues/30) |
| **Typewriter** `typewriter` | retro | Paper on the standing half, keys on the flat half; carriage return dings and the page feeds up. | [#31](https://github.com/dalmaer/duo/issues/31) |
| **Virtual pet** `virtual-pet` | retro | Closed it is the egg-shaped device; open it and see its little house; fold it to tuck it in to sleep. | [#32](https://github.com/dalmaer/duo/issues/32) |
| **Instant camera** `instant-camera` | retro | Closed is the camera; open it and the print develops on the inner display. | [#33](https://github.com/dalmaer/duo/issues/33) |
| **DJ decks** `dj-decks` | music | Open flat, one turntable per half and the crossfader at the fold; table pose stands the waveforms up. | [#34](https://github.com/dalmaer/duo/issues/34) |

### Wave C — both sides at once (needs phase 12)

| Example | Category | The trick | Issue |
| --- | --- | --- | --- |
| **Translator** `translator` | productivity | You speak and read inside; the person across reads the translation on the outer display, stood on its edge. | [#35](https://github.com/dalmaer/duo/issues/35) |
| **Teleprompter and presenter** `teleprompter` | productivity | Notes inside facing you; the current slide on the outer display facing the room. | [#36](https://github.com/dalmaer/duo/issues/36) |
| **Camera subject preview** `subject-preview` | patterns | Frame the shot inside while your subject sees themselves on the outer display — Apple's sceneAccessory. | [#37](https://github.com/dalmaer/duo/issues/37) |
| **Quiz-show buzzers** `quiz-buzzers` | learning | Two players race on one half each; the question shows on the outer display for an audience. | [#38](https://github.com/dalmaer/duo/issues/38) |

### Wave D — work and Apple's arrangements

| Example | Category | The trick | Issue |
| --- | --- | --- | --- |
| **Kitchen recipe** `recipe` | productivity | Table pose on the counter: the current step stands up big, timers and checklist lie flat, with big targets for messy hands. | [#39](https://github.com/dalmaer/duo/issues/39) |
| **Planner** `planner` | productivity | The day on the left page, notes on the right; the week when closed. | [#40](https://github.com/dalmaer/duo/issues/40) |
| **Laptop text editor** `laptop-editor` | patterns | Inner portrait with the keyboard on the bottom half and the document on top. | [#41](https://github.com/dalmaer/duo/issues/41) |
| **Overlay map** `overlay-map` | patterns | Apple's overlay arrangement: a sheet over the map when flat, its own side when folded. | [#42](https://github.com/dalmaer/duo/issues/42) |
| **Anatomy layers** `anatomy` | learning | An overlay arrangement where folding peels the skin layer away from the skeleton. | [#43](https://github.com/dalmaer/duo/issues/43) |

**Done when.** Every example above is in the catalog, handles every pose
including the standing pose from phase 12, and its issue is closed.

**Deliberately open.**

- *Catalog size.* Thirty-five examples is a lot for a sidebar. If it stops
  being browsable, that is an argument for the Storyboard or Gallery direction
  (phase 4), not for cutting examples.
- *Motion sensors.* Fishing and Mini-golf would like a flick or a tilt; the
  emulator has neither. They use drags until it does.
