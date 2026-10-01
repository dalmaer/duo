# Duo Explorer

**What an app can do on iPhone Duo, in every pose.** → **[dalmaer.github.io/duo](https://dalmaer.github.io/duo/)**

The iPhone Duo folds: an outer display for when it is shut, and an inner
display that opens to twice the width — flat, half-folded like a book, set
down like a tiny laptop, or stood on its edge facing someone. Duo Explorer is a catalog of example apps running on an
emulated Duo you can put in each of those poses, so you can see what an app
*should* do when it is closed, open, standing, or on the table.

Start with the **Cajón**: set the Duo down in table pose, play the flat bottom
half like the drum's front plate, and watch the instrument answer on the
standing top half — [#cajon/table](https://dalmaer.github.io/duo/#cajon/table).

| Music | Games | Retro | Productivity | Learning | Patterns |
| --- | --- | --- | --- | --- | --- |
| Cajón<br>Crate Sampler<br>Accordion<br>Music Box<br>DJ Decks | Battleships<br>Hinge Guess<br>Pinball<br>Poker<br>Chomp<br>Fishing<br>Mini-golf | Pocket Console<br>Duo-Man<br>Critterdex<br>Split-flap Clock<br>Etch-a-sketch<br>Typewriter<br>Pocket Pal<br>Instant Camera | E-ink Reader<br>Sketchbook<br>Translator<br>Teleprompter<br>Recipe<br>Planner | Fold Cards<br>Pop-up Storybook<br>Quiz Buzzers<br>Anatomy Layers | List and Detail<br>Watch Above, Play Below<br>Subject Preview<br>Laptop Editor<br>Overlay Map |

Every example says what it does in each pose, names the Apple guideline it
demonstrates, and credits whoever had the idea first. See [SPEC.md](SPEC.md)
for the whole design, and [docs/research/sources.md](docs/research/sources.md)
for the posts and repos it draws on.

## Poses

| | Pose | Display | Size classes |
| --- | --- | --- | --- |
| ▯ | Closed | outer | compact / regular |
| ▭ | Closed · landscape | outer | compact / compact |
| ◫ | Open | inner, fold vertical | regular / regular |
| ⊟ | Open · portrait | inner, fold horizontal | regular / regular |
| 📖 | Book | inner, partly folded, 30–175° | regular / regular |
| 💻 | Table | inner, partly folded, bottom flat | regular / regular |
| ⛺ | Standing | inner, stood on its edge — the outer display faces the other person | regular / regular |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173/duo/
npm run check      # tests, typecheck, roadmap, build — what CI runs
```

Node 24 (`.nvmrc`). No framework and no runtime dependencies.

## Add an example

One file in `src/examples/`, one line in `src/examples/index.ts`. The contract
is [src/core/example.ts](src/core/example.ts) and the reference is
[src/examples/cajon.ts](src/examples/cajon.ts). Agents: the `duo-explorer`
skill walks through it, and the `apple-hig` skill has Apple's rules. Ideas
waiting to be built are [issues labelled `example`](https://github.com/dalmaer/duo/issues?q=is%3Aissue+label%3Aexample).

## How the work is run

Phases, each with its status in its own front matter →
[docs/ROADMAP.md](docs/ROADMAP.md) (generated). Every unfinished phase has a
GitHub issue. Design options live on the project's
[isocan](https://isocan.io) canvas (`.isocan/project.json`) and in
[docs/design/](docs/design/). Working rules for people and agents:
[AGENTS.md](AGENTS.md).

## Credits

Ideas from @viditb (Duo-Man), @javilosana, @MiruDaws, @MarioSaputra,
@elvin_not_11, @stvnzhangshuhan (CRATE), @acooldora, @anshuc, and
[erkamyaman/hinge-guess](https://github.com/erkamyaman/hinge-guess). Apple's
guidance via [justinwetch/HIGAgentSkills](https://github.com/justinwetch/HIGAgentSkills).
Cajón voices and grooves from Ritmo ([dalmaer/cajones](https://github.com/dalmaer/cajones)).
All examples are original reimplementations; no one's code or art is copied.
