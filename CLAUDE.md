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

## Architecture Source Of Truth

Read `docs/ARCHITECTURE.md` first. It is the living map of the monorepo.

## Playwright PR Image Upload Workflow

Use this when you need to attach screenshots/GIFs to GitHub PR comments without committing artifacts to the repo.

1. Use a persistent Playwright profile and log in once (headed):
```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
mkdir -p "$HOME/.codex/playwright/profiles/github-ui"
"$PWCLI" open https://github.com/login --persistent --profile "$HOME/.codex/playwright/profiles/github-ui" --headed
```

2. Reuse that profile for PR interactions:
```bash
"$PWCLI" open https://github.com/<owner>/<repo>/pull/<number> --persistent --profile "$HOME/.codex/playwright/profiles/github-ui"
```

3. Upload a local image into the PR comment via the hidden file input (GitHub-hosted attachment):
```bash
"$PWCLI" run-code 'async (page) => {
  const input = page.locator("form.js-new-comment-form input[type=file]").first();
  await input.setInputFiles("/absolute/path/to/image.png");
}'
```

4. Submit the comment (the attachment URL is auto-inserted by GitHub in the textbox).

Notes:
- Keep generated media in local-only paths (for example `.playwright-cli/` or `output/playwright/`).
- Do not commit proof screenshots for PR comments unless explicitly requested.

## Architecture

## Testing Guidance

- Extension and webview tests: `packages/extension/tests/`
- Plugin tests: `packages/plugin-*/__tests__/`
- Prefer targeted test runs while iterating, then run full `pnpm run test`.
- Pre-commit runs lint-staged + typecheck, so keep staged changes clean.

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
