# CodeGraphy TypeScript/JavaScript

Adds TypeScript and JavaScript ecosystem metadata to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Core extension: [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- Marketplace plugin: [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript)
- Plugin API: [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Install

1. Install the core `codegraphy.codegraphy` extension.
2. Install this plugin extension.
3. Open CodeGraphy and index your workspace.

## What It Provides

The built-in Tree-sitter plugin now handles JS/TS analysis inside the core extension.
This plugin keeps the TypeScript/JavaScript ecosystem defaults that are still useful on top:

- default ignore filters for common build output and package folders
- plugin install / enable / disable state for TypeScript/JavaScript-specific defaults

Core CodeGraphy now owns the default JS/TS icons and colors through Material Icon Theme.
This plugin no longer ships general file theming.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-typescript)
