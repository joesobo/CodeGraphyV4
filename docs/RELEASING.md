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

Before the first local publish from this release setup, verify the authenticated publisher:

```bash
vsce ls-publishers
vsce verify-pat codegraphy
```

## First publish checklist

1. Confirm the `codegraphy` publisher in the VS Code Marketplace is the one you own.
2. Sign `vsce` into `codegraphy`.
3. Confirm `vsce ls-publishers` shows `codegraphy`.
4. Confirm `vsce verify-pat codegraphy` succeeds.
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
11. Verify the existing `codegraphy.codegraphy` listing has been updated in place to the new V4 release metadata.

## GitHub Actions

Use the `Release` workflow with `workflow_dispatch`.

- `mode=package` builds and uploads VSIX artifacts.
- `target` can be `core`, `typescript`, `python`, `csharp`, `godot`, `plugin-api`, or `all`.
- `mode=publish` runs the same checks, packages VSIX files, publishes the selected VS Code extension target, and publishes `@codegraphy/plugin-api` when requested.

Required secrets:

- `VSCE_PAT` for Marketplace publishing
- `NPM_TOKEN` for `@codegraphy/plugin-api`

## Marketplace migration note

V4 is prepared to publish as `codegraphy.codegraphy`.

The existing Marketplace identifier is `codegraphy.codegraphy`. Marketplace ownership and publisher ID are different things: the owner account can be Joseph Soboleski while the immutable extension identifier still uses the publisher ID `codegraphy`.

That means the core V4 release can update the existing Marketplace listing in place, while the language plugins publish as new listings under the same `codegraphy` publisher.

If you ever move the core to a different publisher later, that would require a new Marketplace listing.
