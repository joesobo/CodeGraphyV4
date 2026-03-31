# CodeGraphy TypeScript/JavaScript

Adds TypeScript and JavaScript dependency analysis to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Core extension: [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- Marketplace plugin: [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript)
- Plugin API: [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Install

1. Install the core `codegraphy.codegraphy` extension.
2. Install this plugin extension.
3. Open CodeGraphy and let it analyze your workspace.

## Detection coverage

- ES module imports and exports
- re-exports
- dynamic imports
- CommonJS `require()`

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-typescript)
