# Extension Plugin API types

`@codegraphy-dev/extension-plugin-api` contains contracts for:

- Extension plugin factories and lifecycle;
- webview scripts, styles, and assets;
- Extension event payloads;
- Graph View runtime, projection, force, drag, menu, panel, and UI contributions.

```ts
import type {
  ExtensionGraphViewContributionSet,
  IExtensionPlugin,
} from '@codegraphy-dev/extension-plugin-api';
```

The current Extension host API version is `2.0.0`. Plugin descriptors use a
semver range such as `^2.0.0`. This value does not track the npm package
version.

The Extension decides how to style and render semantic Core data. A different
interface can define a different API and render the same Core data another way.

See the [Core Plugin API types](../plugin-api/TYPES.md) for headless analysis
and semantic Relationship Graph contracts.
