# Releasing

## Local release commands

Run the full release gate first:

```bash
pnpm run release:check
```

Package VSIX files locally:

```bash
pnpm run release:package core
pnpm run release:package typescript
pnpm run release:package python
pnpm run release:package csharp
pnpm run release:package godot
pnpm run release:package all
```

Publish from a machine that already has `VSCE_PAT` and npm auth configured:

```bash
pnpm run release:publish plugin-api
pnpm run release:publish core
pnpm run release:publish typescript
pnpm run release:publish python
pnpm run release:publish csharp
pnpm run release:publish godot
pnpm run release:publish all
```

Before the first local publish of the new Marketplace identity, verify the authenticated publisher:

```bash
vsce ls-publishers
vsce verify-pat joesobo
```

## First publish checklist

1. Create or confirm the `joesobo` publisher in the VS Code Marketplace.
2. Sign `vsce` into `joesobo`.
3. Confirm `vsce ls-publishers` shows `joesobo`.
4. Confirm `vsce verify-pat joesobo` succeeds.
5. Run `pnpm install`.
6. Run `pnpm run release:check`.
7. Publish `@codegraphy/plugin-api` with `pnpm run release:publish plugin-api`.
8. Publish the core extension with `pnpm run release:publish core`.
9. Publish each plugin extension separately:
   - `pnpm run release:publish typescript`
   - `pnpm run release:publish python`
   - `pnpm run release:publish csharp`
   - `pnpm run release:publish godot`
10. Open each Marketplace listing and verify the dependency text, README, icon, and version.
11. Update the old `codegraphy.codegraphy` listing to point users at `joesobo.codegraphy`.

## GitHub Actions

Use the `Release` workflow with `workflow_dispatch`.

- `mode=package` builds and uploads VSIX artifacts.
- `target` can be `core`, `typescript`, `python`, `csharp`, `godot`, `plugin-api`, or `all`.
- `mode=publish` runs the same checks, packages VSIX files, publishes the selected VS Code extension target, and publishes `@codegraphy/plugin-api` when requested.

Required secrets:

- `VSCE_PAT` for Marketplace publishing
- `NPM_TOKEN` for `@codegraphy/plugin-api`

## Marketplace migration note

V4 is prepared to publish as `joesobo.codegraphy`.

The existing Marketplace identifier is still `codegraphy.codegraphy`. Marketplace ownership and publisher ID are different things: the owner account can be Joseph Soboleski while the immutable extension identifier still uses the publisher ID `codegraphy`.

Publishing `joesobo.codegraphy` therefore requires a new publisher ID and a new Marketplace listing.

After the new listing is live, deprecate the old extension in favor of the new one.
