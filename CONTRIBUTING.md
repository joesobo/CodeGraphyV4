# Contributing

Thanks for your interest in contributing to CodeGraphy!

## Setup

### Prerequisites

- Node.js 20+
- npm
- VS Code 1.85+

### Getting started

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run tests to verify:
   ```bash
   npm test
   ```

### Development workflow

1. Create a branch:
   ```bash
   git checkout -b feat/your-feature
   ```

2. Start watch mode:
   ```bash
   npm run dev
   ```

3. Press F5 in VS Code to launch the Extension Development Host

4. Make your changes and test them

5. Run all checks before committing:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

## Code style

- TypeScript for all code
- Follow existing formatting (Prettier defaults)
- Meaningful variable and function names
- Keep functions small and focused

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

1. Create PRs against the `main` branch
2. Ensure CI passes (lint, typecheck, tests, build)
3. Request review from maintainers

### PR checklist

- [ ] Tests added/updated for new functionality
- [ ] Documentation updated if needed
- [ ] No lint errors
- [ ] Type checking passes
- [ ] All tests pass

## Testing

- Write tests for new functionality
- Place tests in `tests/` mirroring the `src/` structure
- Use Vitest with jsdom environment
- Aim for meaningful coverage, not 100%

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npx vitest run tests/path/to/file.test.ts  # Single file
```

## Reporting issues

When reporting bugs, please include:

1. CodeGraphy version
2. VS Code version
3. Operating system
4. Steps to reproduce
5. Expected vs actual behavior
6. Screenshots if applicable

## Feature requests

We welcome suggestions! Please check existing issues first, describe the use case, and explain why it would benefit users.
