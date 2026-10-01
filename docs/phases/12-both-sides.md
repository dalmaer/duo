---
status: built
since: 2026-09-30
issue: 20
note: "Accessory flag and state, Turn around, and the standing pose, used by the Translator, Teleprompter, Subject preview and Quiz buzzers. Real taps reach the outer display when turned round. Not yet checked on a phone."
---

# Both sides at once

On the real Duo an app can show extra UI on the other display while it is open
— Apple's `sceneAccessory` (HIG checklist §9, *Scene accessories*): the system
can toggle it, so the app observes whether it is available. Partly open and
stood on a table, the outer display faces whoever is across from you. That one
fact makes a category: translators, presenters, a subject seeing themselves in
the camera, a quiz host's audience.

The emulator cannot show it yet: the outer display is on the back of a leaf and
only lit when closed. This phase adds:

1. **An accessory flag on examples** — `accessory: "what the other side shows"` —
   and `state.accessory` telling the example when the outer display is lit while
   open.
2. **Turn it around** — a control that rotates the emulated device to show its
   back, where the outer display can be seen and tapped, and back again.
3. **A standing pose** — partly open and stood on its edge on a table, hands
   free: Apple's "edge-standing" pose, until now modelled as book (SPEC §2.1).

**Done when.** The translator example draws your side inside and theirs on the
outer display, the explorer turns the device round to show and use theirs, and
"Standing" is a pose every example handles.

**Deliberately open.**

- *Whether the outer display can take touch while the inner one is in use.* The
  HIG names the accessory as extra UI, not as a second input surface. The
  emulator allows taps there; an example that depends on it says so.
