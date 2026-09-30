# Sources

Everything the explorer draws on, what each showed, and what it became.
Gathered 30 Sep 2026, two to three weeks after the iPhone Duo launched. Posts
are summarized, not quoted; the ideas are reimplemented, never copied.

## Posts on X

| Who | Post | What it showed | Became |
| --- | --- | --- | --- |
| @viditb | [Duo-Man](https://x.com/viditb/status/2104103592726765722) · 27 Sep · 2.2M views | A Walkman: open to pick and insert a cassette, close to listen. Real Walkman clicks and static, recorded. Built at a Bitrig hack. | **Duo-Man** (retro) |
| @javilosana | [the red field guide](https://x.com/javilosana/status/2104946938659623313) · 29 Sep · 417K views | A red clamshell creature-encyclopedia app with the big blue lens. Replies call it the Duo's killer app. | **Critterdex** (retro), with original creatures |
| @MiruDaws | [e-ink reader](https://x.com/MiruDaws/status/2104637597645742208) · 28 Sep | A paper-like e-ink reader for the Duo, built with Rork; *Walden* on the cover. | **E-ink Reader** (productivity) |
| @MarioSaputra | [drawing app idea](https://x.com/MarioSaputra/status/2104777486932574454) · 28 Sep · 95K views | A drawing app across the open Duo, palette along the bottom. | **Sketchbook** (productivity) |
| @anshuc | [Letters Abroad redesign](https://x.com/anshuc/status/2103598854801084824) · 25 Sep | An agent redesigned a language-learning app for every Duo mode and rendered a demo video in Blender, unprompted. | Backlog: letters/pen-pal example; evidence that agents can do this work |
| @elvin_not_11 | flash cards · 18 Sep · 165K views | Test your memory folded; unfold to reveal the answer. | **Fold Cards** (learning) |
| @stvnzhangshuhan | CRATE · 28 Sep | First place, YC × Bitrig hackathon: a foldable AI sampler. Finger drums on the bottom screen, sequencer on top, "build and drop with the hinge". | **Crate Sampler** (music) |
| @acooldora | music studio · 28 Sep | Tap a vintage kit, build a beat on a drum machine, record piano over it. | **Crate Sampler** credit; backlog: piano |
| @rork | Duo in Rork · 28 Sep | Build for both screens and test on a live Duo in a 3D simulator. | Context: the emulator idea is in the air |
| @DesignByMoein | iPhone Duo UI skill · 12 Sep | A skill turning any app screenshot into a foldable Duo UI with a 3D preview (github.com/moiensaboohi/iphone-duo-ui-skill). | Context for the design options |
| @zacbowden | Windows Central · 10 Sep | The Duo's multitasking copies the Surface Duo's window model almost 1:1. | SPEC §2 background |
| @ModernNotoriety | "Three ways to game on the iPhone Duo" · 9 Sep | Gaming poses from a launch segment. | Games category |

## Repositories

| Repo | What it is | How it is used here |
| --- | --- | --- |
| [erkamyaman/hinge-guess](https://github.com/erkamyaman/hinge-guess) (MIT) | Ionic/Capacitor game: fold to a target hinge angle, then measure. Protractor pivot on the crease. Documents how the hinge plugin behaves (iOS pauses the web view while moving between displays, so it polls). | **Hinge Guess** reimplements the game. Vendored as a submodule at `vendor/hinge-guess` for reference. |
| [justinwetch/HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills) | The `apple-hig` agent skill: 157 distilled HIG references updated for iPhone Duo and OS 27, a `/duo` redesign workflow, and a Duo checklist from Apple's six tech talks. | Submodule at `.agents/skills/apple-hig`, linked into `.claude/skills/` and `.claude/commands/duo.md`. The source of every Apple rule this project cites. No licence file, so it is referenced, not copied. |
| [dalmaer/cajones](https://github.com/dalmaer/cajones) (Ritmo) | A cajón practice room: synthesized bass/slap/accent voices, thirteen grooves, iOS audio fixes. | **Cajón** ports its voices, two grooves and the iOS audio-unlock rule into `src/lib/audio.ts`. |
| [dalmaer/ledger](https://github.com/dalmaer/ledger) | A personal task ledger. | The way the work is run: phases with status in front matter, the derived roadmap and its CI check, lessons, AGENTS.md. |

## Apple

- *Designing for iPhone Duo*, Human Interface Guidelines, 9 Sep 2026 — via
  `.agents/skills/apple-hig/references/hig/designing-for-iphone-duo.md`.
- Tech talks 111461–111466 (*Prepare your app*, *Raise the bar*, *Strike a pose*,
  *Leverage multiple displays*, *Build a great camera experience*, *Design for
  iPhone Duo*) — summarized in `references/duo-checklist.md`.
