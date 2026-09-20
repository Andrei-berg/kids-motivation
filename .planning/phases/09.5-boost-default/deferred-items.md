# Deferred Items — Phase 09.5 (boost-default)

## `npm run lint` fails in worktree due to nested-checkout ESLint config conflict

**Discovered during:** Plan 01, Task 3 verification.

**Not caused by this plan's changes.** The worktree
(`.claude/worktrees/agent-a180709bd06e2e096`) lives nested inside the main repo
checkout. `next lint`'s ESLint config resolution walks up parent directories
and finds a second `.eslintrc.json` at the main repo root, which independently
resolves `@next/eslint-plugin-next` from its own `node_modules` — ESLint then
refuses to run ("couldn't determine the plugin `@next/next` uniquely").

This is an environment/infra issue with the worktree-inside-repo layout, not a
regression introduced by `app/kid/actions/boost-style.ts` or
`tests/boost-style-validation.test.ts`. Verified the new files are themselves
lint-clean by running ESLint directly against them with `--no-eslintrc -c
.eslintrc.json --resolve-plugins-relative-to .` (bypasses the parent-directory
config walk-up) — exit 0, zero findings.

**Out of scope for this plan** (worktree tooling layout, not this task's
files). Left for the orchestrator/operator to fix at the worktree-provisioning
level (e.g. `.eslintignore` the `.claude/worktrees/` path from the main repo's
own lint run, or ensure worktrees are provisioned outside the main checkout
tree) if `npm run lint` needs to be green from inside a nested worktree again.
