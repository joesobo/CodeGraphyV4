# Plugin Development Guide

> Archived historical guide. Use the current plugin API docs under `docs/plugin-api/` for live behavior.

This guide covers the older v1 language-plugin shape and the transition notes that were relevant before the current plugin-api split.

![Plugins panel](../media/plugins-panel.png)

## Overview

Each plugin is responsible for:

1. Declaring which file extensions it supports
2. Detecting connections (imports/dependencies) in source files
3. Declaring detection rules that users can toggle individually

Runtime toggle state is persisted in VS Code settings:
- `codegraphy.disabledPlugins` for whole-plugin toggles
- `codegraphy.disabledRules` for per-rule toggles (`<pluginId>:<ruleId>`)

## Plugin structure

Every plugin follows the same directory layout:

```text
packages/plugin-my-language/
  codegraphy.json
  src/
    index.ts
    PathResolver.ts
    rules/
      rule-a.ts
      rule-b.ts
```

See `packages/plugin-typescript/` for the reference implementation.

## Notes

The current plugin lifecycle, event, and type contracts live in:

- `docs/plugin-api/LIFECYCLE.md`
- `docs/plugin-api/EVENTS.md`
- `docs/plugin-api/TYPES.md`
