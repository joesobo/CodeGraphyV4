# CLAUDE.md

This file provides guidance to Claude Code (and similar coding agents) for this repository.

## Core Commands

```bash
pnpm install
pnpm run build
pnpm run dev
pnpm run test
pnpm run lint
pnpm run typecheck
```

Common targeted commands:

```bash
pnpm --filter @codegraphy/extension test
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/SettingsPanel.test.tsx
pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/GraphViewProvider.test.ts
```

## Architecture Orientation

There is no dedicated architecture map file in this repo. Start from package boundaries and follow module-local docs/comments.

Primary locations:
- `packages/extension/src/extension/` (VS Code extension host)
- `packages/extension/src/core/` (discovery, registry, views, colors)
- `packages/extension/src/webview/` (React webview UI)
- `packages/extension/src/shared/` (shared protocol/types)
- `packages/plugin-api/src/` (plugin API contracts)
- `packages/plugin-*/src/` (built-in language plugins)
- `docs/plugin-api/` (plugin API docs + diagrams)

## Testing Guidance

- Extension and webview tests: `packages/extension/tests/`
- Plugin tests: `packages/plugin-*/__tests__/`
- Prefer targeted test runs while iterating, then run full `pnpm run test`.
- Pre-commit runs lint-staged + typecheck, so keep staged changes clean.

## Changeset Workflow

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation.

### When to add a changeset

Add a changeset when a PR includes **user-facing changes**: new features, bug fixes, behavior changes, or removed functionality. Skip changesets for internal refactors, test-only changes, CI updates, or documentation fixes that don't affect the product.

### How to add a changeset

Run `pnpm changeset` and follow the prompts, or create a file manually in `.changeset/`:

```md
---
"@codegraphy/extension": minor
---

Add node size toggle to the toolbar with four sizing modes
```

Bump types:
- `patch` — bug fixes, small tweaks
- `minor` — new features, enhancements
- `major` — breaking changes

### Writing good changeset descriptions

- Write from the **user's perspective**, not implementation details.
- One clear sentence describing what changed and why it matters.
- Good: "Add node size toggle to the toolbar with four sizing modes"
- Bad: "Refactor NodeSizeToggle.tsx to use postMessage and extract to toolbar/ directory"

### Updating changesets

If a PR is updated after the changeset was written, update the changeset file to reflect the final state of the change. The changeset should describe the PR as merged, not the incremental steps.

## Trello Task Execution Workflow

When assigned a Trello card, follow this process end-to-end:

1. Discuss before implementation: review the card with the user first, covering implementation approach, risks/concerns, and open questions.
2. Plan after alignment: create an implementation plan once details are clarified.
3. Split for parallelization: break work into small, independent tasks that can be delegated to individual subagents where safe.
4. Use branch + worktree isolation: execute each task in its own branch/worktree.
5. Commit frequently: commit often, at minimum whenever subagent work is merged into the main task branch.
6. Deliver via PR: push all commits and open a GitHub PR with a clear description for human review.

## Worktree Safety (Mandatory)

- Treat the user's currently open worktree as protected.
- Never run `git switch`, `git checkout <branch>`, `git rebase`, or other branch-changing commands in the protected worktree.
- Before any branch/worktree operations, create and move into a separate agent worktree; do branch switches only there.
- If a branch was changed in the protected worktree by mistake, immediately restore it and report what happened.

## Playwright PR Image Upload Workflow

Use this flow to attach screenshots/GIFs to PR comments via GitHub UI attachments (without committing media files):

1. Prepare the Playwright CLI wrapper:
```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
```

2. One-time login using a persistent profile:
```bash
mkdir -p "$HOME/.codex/playwright/profiles/github-ui"
"$PWCLI" open https://github.com/login --persistent --profile "$HOME/.codex/playwright/profiles/github-ui" --headed
```

3. Reuse that authenticated profile for a PR page:
```bash
"$PWCLI" open https://github.com/<owner>/<repo>/pull/<number> --persistent --profile "$HOME/.codex/playwright/profiles/github-ui"
```

4. Upload a local image into the PR comment box:
```bash
"$PWCLI" run-code 'async (page) => {
  const input = page.locator("form.js-new-comment-form input[type=file]").first();
  await input.setInputFiles("/absolute/path/to/image.png");
}'
```

5. Submit the comment. GitHub inserts a `github.com/user-attachments/...` URL automatically.

Notes:
- Keep capture artifacts local (`.playwright-cli/`, `output/playwright/`).
- Do not commit PR proof screenshots unless explicitly requested.
