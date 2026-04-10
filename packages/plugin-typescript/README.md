# CodeGraphy TypeScript/JavaScript

Adds TypeScript and JavaScript enrichment to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Core extension: [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- Marketplace plugin: [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript)
- Plugin API: [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Install

1. Install the core `codegraphy.codegraphy` extension.
2. Install this plugin extension.
3. Open CodeGraphy and index your workspace.

## Detection coverage

The core extension now handles the base Tree-sitter pass for JS/TS files.
This plugin adds supplemental JS/TS-only coverage on top:

- dynamic imports
- CommonJS `require()`
- focused-imports view tooling

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-typescript)
