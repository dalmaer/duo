---
status: partial
since: 2026-09-30
issue: 9
note: "An @claude workflow answers issues and PRs; issues map to phases. Needs the CLAUDE_CODE_OAUTH_TOKEN secret before it can run."
---

# The project builds itself

The work is run through GitHub: every phase not yet built has an issue, and the
issue number lives in the phase's front matter. Mention `@claude` on an issue
or pull request and `.github/workflows/claude.yml` picks it up, working in the
repo with `AGENTS.md` and the skills in `.agents/skills/` as its context, and
opens a pull request. CI checks it like any other change, and a person merges.

**Done when.** An `example` issue, labelled and mentioned, turns into a merged
pull request that adds the example and deploys it — with a person reviewing,
and no one else touching the code.

**Deliberately open.**

- *Scheduled agents.* Ledger runs agents on a clock. Nothing here needs one yet;
  an agent opening PRs on its own would be noise until the review loop is proven.
