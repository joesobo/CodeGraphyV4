# CodeGraphy C#

Adds C# namespace and type-usage enrichment to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Core extension: [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- Marketplace plugin: [CodeGraphy C#](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp)
- Plugin API: [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Install

1. Install the core `codegraphy.codegraphy` extension.
2. Install this plugin extension.
3. Open CodeGraphy and index your workspace.

## What It Provides

The core extension already handles baseline C# Tree-sitter analysis.
This plugin keeps the richer C# semantics that still matter on top:

- namespace-aware file resolution for `using` directives
- same-namespace and type-usage reference edges
- C#-focused file colors and default ignore filters

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-csharp)
