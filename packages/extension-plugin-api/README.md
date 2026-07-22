# `@codegraphy-dev/extension-plugin-api`

Type definitions for plugins hosted by the CodeGraphy VS Code extension.

Use this API for Extension lifecycle and Graph View behavior. Use
[`@codegraphy-dev/plugin-api`](../plugin-api/README.md) for headless Core
analysis.

## Install

```bash
npm install -D @codegraphy-dev/extension-plugin-api
```

## Minimal plugin

```ts
import type {
  IExtensionPluginFactory,
} from '@codegraphy-dev/extension-plugin-api';

const createPlugin: IExtensionPluginFactory = ({ dataHost, options } = {}) => ({
  id: 'acme.graph-tools',
  name: 'Acme Graph Tools',
  version: '1.0.0',
  apiVersion: '^1.0.0',
  webviewContributions: {
    scripts: ['dist/webview.js'],
  },
});

export default createPlugin;
```

The factory receives merged package defaults and workspace options. It also
receives a data host for state owned by its plugin ID. For example,
`dataHost.saveData({ pinned: true })` stores that state under the plugin's entry
in `.codegraphy/settings.json#pluginData`.

This package is type-only. Use `import type`.

## Package descriptor

The package descriptor uses host `codegraphy.extension`:

```json
{
  "codegraphy": {
    "plugins": [
      {
        "id": "acme.graph-tools",
        "host": "codegraphy.extension",
        "entry": "./dist/plugin.js",
        "apiVersion": "^1.0.0"
      }
    ]
  }
}
```

Core records and activates this descriptor, but it does not import the runtime.
The VS Code extension imports it when the Extension host opens. This means the
plugin stays dormant during a CLI query.

The API includes Extension plugin lifecycle, webview assets, Extension events,
and Graph View contribution types. Rendering and persisted interface data stay
owned by the Extension.

See the [Plugin Guide](../../docs/PLUGINS.md) for the shared installation and
activation model.
