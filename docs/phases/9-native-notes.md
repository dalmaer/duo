---
status: planned
since: 2026-09-30
issue: 8
note: "For each example, how you would build it natively: which iOS 27.1 API does the work."
---

# Native notes

The explorer shows what an app should do; developers then have to build it in
SwiftUI or UIKit. Each example gets a short note naming the native pieces:
`ArrangementView` split or overlay, `reservedRegion` on `GeometryProxy`,
`onHingeChange`, `sceneAccessory`, toolbar visibility priority — using only
names from the HIG references in `.agents/skills/apple-hig`, and marked
unverified until checked against the SDK.

**Done when.** Every example's side panel has a "Build it natively" section
whose API names all appear in Apple's documentation.
