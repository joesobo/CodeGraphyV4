# Contributing

CodeGraphy accepts focused changes through pull requests against `main`.

## Setup

### Prerequisites

- Node.js 20 through 22; use the repository-pinned Node 22 runtime
- pnpm 10+
- VS Code 1.85+

### Getting started

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   nvm use
   pnpm install
   ```
3. Build the project:
   ```bash
   pnpm run build
   ```
4. Run the test suite:
   ```bash
   pnpm test
   ```

### Development workflow

1. Create a branch:
   ```bash
   git switch -c feat/your-feature
   ```

2. Start watch mode:
   ```bash
   pnpm run dev
   ```

3. Press F5 in VS Code to launch the Extension Development Host

4. Make the change. Add a failing test first for production behavior.

5. Run the checks that cover the change before committing:
   ```bash
   pnpm run lint
   pnpm run typecheck
   pnpm test
   ```

## Code style

- Follow the package and feature boundaries described in [`AGENTS.md`](./AGENTS.md).
- Prefer explicit TypeScript types for arrays, objects, and component data.
- Keep one reason to change per source file and give files role-based names.
- Put dependencies in the package that imports them.

## Documentation

- Document current behavior in the closest user, package, or developer reference.
- Record durable technical decisions under `docs/adr/`.
- Keep implementation plans, investigation notes, and handoffs in the task, Trello card, or PR. Do not commit plan documents.
- Add a changeset only for a user-facing package change. Docs-only changes do not need one.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code restructuring
- `test:` adding or modifying tests
- `chore:` tooling, deps, CI

Examples:
```
feat: add search functionality to graph view
fix: resolve node flickering on data update
docs: update README with installation instructions
```

## Pull requests

1. Create PRs against `main`.
2. Explain the behavior change and the checks you ran.
3. Request review after CI passes.

### PR checklist

- [ ] Tests added/updated for new functionality
- [ ] Documentation updated if needed
- [ ] No lint errors
- [ ] Type checking passes
- [ ] All tests pass
- [ ] Relevant Playwright acceptance tests pass

## Testing

- Write a failing behavior test before production code.
- Keep tests in the owning package's test tree.
- Run mutation testing on the changed module when behavior changes.

```bash
pnpm test             # Unit and Playwright suites that CI trusts
pnpm run test:unit    # All package Vitest suites
pnpm run test:playwright  # Browser/webview E2E suite
pnpm run test:vscode      # Local VS Code acceptance path
pnpm --filter @codegraphy-dev/extension exec playwright install chromium  # Browser install
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/path/to/file.test.ts
```

The repo pins Node in [`.nvmrc`](./.nvmrc) and [`.node-version`](./.node-version). Use that exact runtime before running release or quality-tool commands.

## Reporting bugs

When reporting bugs, please include:

1. CodeGraphy version
2. VS Code version
3. Operating system
4. Steps to reproduce
5. Expected vs actual behavior
6. Screenshots if applicable

## Feature requests

Check the [CodeGraphy Trello board](https://trello.com/b/wG65Lfrb/codegraphy) first. Describe the user problem and the result you want, without prescribing an implementation unless the constraint matters.
