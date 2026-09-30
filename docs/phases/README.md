# Phases

One file per phase. The front matter is the source of truth for where it
stands; [`../ROADMAP.md`](../ROADMAP.md) is generated from it and CI fails when
the two disagree.

```yaml
---
status: planned | designed | partial | built | lived-in | superseded
since: 2026-09-30        # when it entered this status
issue: 12                # optional, the GitHub issue that follows the work
note: "one line on why it stands where it does"
---
```

`lived-in` is the one that matters, and it is a judgement rather than a date:
people have used the thing and it held. `built` — the code exists and has been
run — is deliberately not the end state.

Each file says **Done when** in one checkable sentence (CI fails without one),
and lists anything **Deliberately open**: decisions postponed on purpose, so a
later session makes them deliberately rather than improvising mid-task. Settle
one in place, with the date and what settled it.

Every phase that is not `built` or `lived-in` has a GitHub issue, and the issue
number lives here, in `issue:`. The issue carries the conversation; the phase
file carries the verdict.

After editing any of this, run:

```bash
npm run roadmap
```
