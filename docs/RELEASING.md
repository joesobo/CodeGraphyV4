# Releasing

## Local release commands

Run the full release gate first:

```bash
pnpm run release:check
```

Package VSIX files locally:

```bash
pnpm run release:package:core
pnpm run release:package:plugins
pnpm run release:package:all
```

Publish from a machine that already has `VSCE_PAT` and npm auth configured:

```bash
pnpm run release:publish:plugin-api
pnpm run release:publish:core
pnpm run release:publish:plugins
pnpm run release:publish:all
```

Before the first local publish of the new Marketplace identity, verify the authenticated publisher:

```bash
vsce ls-publishers
vsce verify-pat joesobo
```

## GitHub Actions

Use the `Release` workflow with `workflow_dispatch`.

- `mode=package` builds and uploads VSIX artifacts.
- `mode=publish` runs the same checks, packages VSIX files, publishes the selected VS Code extensions, and optionally publishes `@codegraphy/plugin-api`.

Required secrets:

- `VSCE_PAT` for Marketplace publishing
- `NPM_TOKEN` for `@codegraphy/plugin-api`

## Marketplace migration note

V4 is prepared to publish as `joesobo.codegraphy`.

If you want to steer users away from the legacy `codegraphy.codegraphy` listing, deprecate the old extension after the new listing is live.
