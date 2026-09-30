---
status: planned
since: 2026-09-30
note: "Open the explorer on an actual iPhone Duo and the examples run on the device itself, following its real fold."
---

# On a real Duo

The explorer is a web page, and the Duo has a browser. When it is opened on a
foldable, the emulator should step aside and run the example on the real
screens: CSS viewport segments (`horizontal-viewport-segments`,
`vertical-viewport-segments`, `env(viewport-segment-*)`) to find the halves,
and the Device Posture API (`navigator.devicePosture`) to know when it is
folded. The example contract does not change — the screens just become real.

**Done when.** On an iPhone Duo in Safari, an example opened from the explorer
fills the device, follows the real fold between book, table and flat, and the
Cajón is playable with two thumbs in table pose.

**Deliberately open.**

- *Whether Safari on the Duo exposes viewport segments or device posture at
  all.* Unknown until tried on a device; if it does not, the fallback is the
  aspect ratio of the viewport plus an on-screen pose switch.
