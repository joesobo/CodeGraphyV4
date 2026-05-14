# CodeGraphy Python

Adds Python ecosystem defaults to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy/plugin-python`](https://www.npmjs.com/package/@codegraphy/plugin-python)
- Plugin API: [`@codegraphy/plugin-api`](https://www.npmjs.com/package/@codegraphy/plugin-api)

## Install

```bash
npm i -g @codegraphy/plugin-python
codegraphy plugins refresh
codegraphy plugins enable @codegraphy/plugin-python
codegraphy index
```

## What It Provides

The built-in Tree-sitter plugin now owns Python analysis inside `@codegraphy/core`.
This plugin is intentionally lightweight and only adds:

- Python ecosystem ignore filters
- plugin install / enable / disable state for Python-specific defaults

Core CodeGraphy now owns the default Python icons and colors through Material Icon Theme.
This plugin no longer ships general file theming.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-python)
