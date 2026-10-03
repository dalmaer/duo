# duo under keel: what stayed its own

Written by `keel adopt` on practice 0.5.0. Keel switched on only the practices this project already satisfies; where it has its own version, nothing was installed and a proposal is recorded here and in `.keel/keel.json` (`local`). The project's gate is `npm run check`.

Decide each proposal in review: keep yours (eject), take keel's, or send yours upstream as a lesson.

## Practices

| Practice | State | Why |
| --- | --- | --- |
| base | on | the project satisfies it |
| agents-md | on | the project satisfies it |
| phases | local | 13 phase files of 13 fail keel's parser (missing goal); no docs/goals.json; proposal: migration 0003 adds goal, docs/goals.json and keel's missing sections (marked as added), and applies only once every built phase names evidence — 6 built phases owe it (0-emulator.md, 1-example-contract.md, 2-catalog.md, 3-publish.md, 11-second-wave.md, 12-both-sides.md): write the evidence when each is next checked, or step it back to partial; 0003 never writes placeholder evidence; scripts/roadmap.ts, docs/phases/README.md are the project's own (the project's own roadmap; keel's scripts/roadmap.mjs is not installed beside it); proposal: keep yours (eject), take keel's, or send yours upstream as a lesson |
| evidence | local | 6 built phases name no evidence (0-emulator.md, 1-example-contract.md, 2-catalog.md, 3-publish.md, 11-second-wave.md, 12-both-sides.md); proposal: write evidence when each is next checked, or step it back to partial — never invent it |
| lessons | on | the project satisfies it |
| conduct | on | the project satisfies it |
| ci | local | the project has workflows (claude.yml, deploy.yml, test.yml); keel's check.yml is not added beside them, since that would run the gate twice; proposal: point the workflow that gates pushes at `npm run check`, or replace it with keel's check.yml |
| night | on | the project satisfies it |
| claude | local | .github/workflows/claude.yml is the project's own (differs from keel's); proposal: keep yours (eject), take keel's, or send yours upstream as a lesson |
| renovate | local | renovate.json is the project's own (differs from keel's); proposal: keep yours (eject), take keel's, or send yours upstream as a lesson |
| loop | off | optional, and there is no .stitch.json: no Loop workspace to triage |

## Local variants and proposals

### phases

13 phase files of 13 fail keel's parser (missing goal); no docs/goals.json; proposal: migration 0003 adds goal, docs/goals.json and keel's missing sections (marked as added), and applies only once every built phase names evidence — 6 built phases owe it (0-emulator.md, 1-example-contract.md, 2-catalog.md, 3-publish.md, 11-second-wave.md, 12-both-sides.md): write the evidence when each is next checked, or step it back to partial; 0003 never writes placeholder evidence; scripts/roadmap.ts, docs/phases/README.md are the project's own (the project's own roadmap; keel's scripts/roadmap.mjs is not installed beside it); proposal: keep yours (eject), take keel's, or send yours upstream as a lesson

### evidence

6 built phases name no evidence (0-emulator.md, 1-example-contract.md, 2-catalog.md, 3-publish.md, 11-second-wave.md, 12-both-sides.md); proposal: write evidence when each is next checked, or step it back to partial — never invent it

### ci

the project has workflows (claude.yml, deploy.yml, test.yml); keel's check.yml is not added beside them, since that would run the gate twice; proposal: point the workflow that gates pushes at `npm run check`, or replace it with keel's check.yml

### claude

.github/workflows/claude.yml is the project's own (differs from keel's); proposal: keep yours (eject), take keel's, or send yours upstream as a lesson

### renovate

renovate.json is the project's own (differs from keel's); proposal: keep yours (eject), take keel's, or send yours upstream as a lesson

## Files kept as the project's own

- `package.json` (base)
- `.nvmrc` (base)
- `.gitignore` (base)
- `AGENTS.md` (agents-md)
- `scripts/roadmap.ts` (phases) — the project's own roadmap; keel's scripts/roadmap.mjs is not installed beside it
- `docs/phases/README.md` (phases) — differs from keel's
- `docs/lessons.md` (lessons)
- `.github/workflows/claude.yml` (claude) — differs from keel's
- `renovate.json` (renovate) — differs from keel's

## Blocks not appended

- `AGENTS.md#lessons` — the project's AGENTS.md already states this rule (`blocksSkipped` in `.keel/keel.json`)

## Conflicts

None.
