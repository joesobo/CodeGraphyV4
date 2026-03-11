# AGENTS.md

This file provides guidance to coding agents (including Codex) for this repository.

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
