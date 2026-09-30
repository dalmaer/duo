---
status: partial
since: 2026-09-30
issue: 2
note: "Tests, typecheck, roadmap check and build run in Actions; every push to main deploys to GitHub Pages. Waiting on the first green deploy."
---

# Publish, and keep it honest

The explorer is a static site at <https://dalmaer.github.io/duo/>, built by
Vite and deployed by GitHub Actions on every push to `main`. The same workflow
that builds it runs the tests, the typecheck and the roadmap check, and after
deploying it fetches the live page and fails if the build it just shipped is not
the one being served.

**Done when.** A push to `main` is on the live site within five minutes, and a
push that breaks the build, a test, or the roadmap never reaches it.

**Deliberately open.**

- *Preview deploys for pull requests.* Pages has one site per repo. If PR
  previews become worth it, they need somewhere else to live.
