# Lessons

Failure modes this repo has actually produced, and what now catches each one.
Not a style guide and not a wish list — every entry happened, and the guard is
the thing that would have caught it.

The point is the pattern, not the incident. A bug that can only happen once is
not a lesson; a bug whose *shape* recurs is. Read this before adding a guard,
because the shape is usually already here. Lessons inherited from
[dalmaer/ledger](https://github.com/dalmaer/ledger/blob/main/docs/lessons.md)
that apply here are marked *(ledger)*.

| # | The shape of it | What it cost | Guard |
| --- | --- | --- | --- |
| 1 | **Status written in more than one place drifts, and both copies look authoritative.** *(ledger 6)* | In ledger, README and SPEC disagreed about which phase was done, both edited the same day. | Status lives in each phase's front matter; `docs/ROADMAP.md` is derived, and `npm run roadmap -- --check` fails CI when it is stale or a phase has no verdict or no **Done when**. |
| 2 | **A guard that fires into a room nobody is in.** *(ledger 8)* | In ledger, CI was red on three commits and production served an eight-hour-old build; both found by accident. | The deploy job fetches the live page after deploying and fails if it is not serving the build it just made. A red deploy is a failed workflow on `main`, which GitHub emails about. |
| 3 | **A tool built for one version of a service, silently incompatible with the next.** | The global `isocan` CLI could not create a canvas on isocan.io ("This canvas uses groups. Update isocan") and `isocan upgrade` refused because the release channel lagged the home. The project's canvas was created by running the CLI from a worktree at the exact commit the home reported. | When a CLI speaks to a hosted home, check `home` for the version the home runs before diagnosing anything else. Recorded in AGENTS.md under *Design on the canvas*. |
| 4 | **A test that dispatches events to an element proves the handler, not that a person can reach it.** Every agent checked its example with `element.click()` or synthetic pointer events, which go straight to the target. | Real mouse and touch input in book, table and standing — every partly folded pose — landed on the leaf's face, not the app inside it: Chromium's input hit-testing stopped at the first element that flattened the 3D context, although `elementsFromPoint` named the right button. Twenty-five examples had shipped "verified" in poses where nobody could tap them. Found only when a real `Input.dispatchMouseEvent` was tried. | Leaves are `transform-style: flat`; the emulator says which face shows (`data-shows`) instead of relying on `backface-visibility`, and lifts the shut leaf 1px off the other. The check is real input, in every pose: drive the page with CDP `Input.dispatchMouseEvent` at the element's centre and assert where `pointerdown` lands — run before shipping any change to the emulator. |
