---
status: planned
since: 2026-09-30
note: "Audio start on iOS, multi-touch pads, and latency good enough to play the cajón in time."
---

# Sound and touch

The music examples are only as good as their latency. Ritmo already learned the
iOS rules — ask the audio session for playback, unlock on `pointerup`, strike on
`pointerdown` after that — and `src/lib/audio.ts` carries them. What is not yet
proven here is playing on a phone: two thumbs at once, pads inside a 3D
transform, and whether the play-along scoring is fair.

**Done when.** On an iPhone in Safari the Cajón sounds with the silent switch
on, two simultaneous pad hits both sound, and a steady 90 bpm groove played by
a drummer scores as in time.
