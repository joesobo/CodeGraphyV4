# Contributing to CodeGraphy

Thank you for your interest in contributing to CodeGraphy! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 20 or later
- npm
- VS Code (for extension development)

### Getting Started

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run tests to verify setup:
   ```bash
   npm test
   ```

### Development Workflow

1. Create a branch for your feature/fix:
   ```bash
   git checkout -b feat/your-feature
   ```

2. Start watch mode for development:
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

## Project Structure

```
CodeGraphy/
├── src/
│   ├── extension/     # VSCode extension host code (Node.js)
│   │   ├── index.ts           # Extension entry point
│   │   └── GraphViewProvider.ts
│   ├── shared/        # Code shared between extension and webview
│   │   ├── types.ts           # TypeScript interfaces
│   │   └── mockData.ts        # Mock data for development
│   └── webview/       # React app for the sidebar (browser)
│       ├── App.tsx            # Main React component
│       └── components/        # React components
├── tests/             # Test files (mirror src/ structure)
├── assets/            # Icons and static assets
├── docs/              # Documentation
└── dist/              # Build output (gitignored)
```

## Code Style

- Use TypeScript for all code
- Follow existing code formatting (Prettier defaults)
- Use meaningful variable and function names
- Add JSDoc comments for public interfaces and functions
- Keep functions small and focused

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `test:` - Adding or modifying tests
- `ci:` - CI/CD changes
- `chore:` - Other changes that don't modify src or tests

Examples:
```
feat: add search functionality to graph view
fix: resolve node flickering on data update
docs: update README with installation instructions
```

## Pull Requests

1. Create PRs against the `main` branch
2. Fill out the PR template
3. Ensure CI passes (lint, typecheck, tests, build)
4. Request review from maintainers
5. Address review feedback

### PR Checklist

- [ ] Tests added/updated for new functionality
- [ ] Documentation updated if needed
- [ ] No lint errors
- [ ] Type checking passes
- [ ] All tests pass

## Testing

- Write tests for new functionality
- Place tests in `tests/` mirroring the `src/` structure
- Use Vitest for testing
- Aim for meaningful coverage, not 100%

Run tests:
```bash
npm test           # Run once
npm run test:watch # Watch mode
```

## Reporting Issues

When reporting bugs, please include:

1. CodeGraphy version
2. VS Code version
3. Operating system
4. Steps to reproduce
5. Expected vs actual behavior
6. Screenshots if applicable

## Feature Requests

We welcome feature suggestions! Please:

1. Check existing issues first
2. Describe the use case
3. Explain why it would benefit users
4. Consider implementation complexity

## Questions?

- Check the [documentation](./docs/)
- Open a discussion on GitHub
- Join our community (coming soon)

Thank you for contributing! 🐳
