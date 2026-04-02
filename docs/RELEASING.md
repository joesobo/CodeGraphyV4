# Releasing

## Release surfaces

Release-facing metadata is not all in one package:

- Core extension marketplace metadata lives in the repo root [`package.json`](../package.json)
- Core extension versioning lives in [`packages/extension/package.json`](../packages/extension/package.json)
- Plugin extension marketplace metadata lives in each `packages/plugin-*/package.json`
- Plugin API npm metadata lives in [`packages/plugin-api/package.json`](../packages/plugin-api/package.json)
- The core extension icon source lives at [`assets/icon.svg`](../assets/icon.svg)
- Each published plugin ships its own badged icon at `packages/plugin-*/assets/icon.svg`

## Local release commands

Version the pending workspace releases first:

```bash
pnpm run version-packages
```

The repo-root [`package.json`](../package.json) is workspace metadata for the monorepo and stays pinned. The core Marketplace extension release version comes from [`packages/extension/package.json`](../packages/extension/package.json), while the root manifest still provides the marketplace metadata and packaged file list for `core` releases.

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

`core` release packaging rebuilds `@codegraphy/extension` from source first, so it does not rely on whatever `dist/` happened to be left in the repo.

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

`pnpm run release:publish core` also rebuilds the core extension before staging and publishing.

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
6. Add changesets only for unreleased user-facing workspace packages. Archive shipped changesets under [`docs/archive/changesets/`](./archive/changesets/).
7. Run `pnpm run version-packages`.
8. If the core Marketplace extension changed, verify `packages/extension/package.json` and [`packages/extension/CHANGELOG.md`](../packages/extension/CHANGELOG.md) have matching top entries.
9. Commit the generated version and changelog updates.
10. Run `pnpm run release:check`.
11. Publish `@codegraphy-vscode/plugin-api` with `pnpm run release:publish plugin-api`.
12. Publish the core extension with `pnpm run release:publish core`.
13. Publish each plugin extension separately:
   - `pnpm run release:publish typescript`
   - `pnpm run release:publish python`
   - `pnpm run release:publish csharp`
   - `pnpm run release:publish godot`
14. Open each Marketplace listing and verify the dependency text, README, icon, gallery banner, and version.
15. Verify the existing `codegraphy.codegraphy` listing has been updated in place to the new V4 release metadata.
16. Open the npm package page for [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api) and verify the README and repository links.

## GitHub Actions

Use the `Release` workflow with `workflow_dispatch`.

- `mode=package` builds and uploads VSIX artifacts.
- `target` can be `core`, `typescript`, `python`, `csharp`, `godot`, `plugin-api`, or `all`.
- `mode=publish` runs the same checks, packages VSIX files, publishes the selected VS Code extension target, and publishes `@codegraphy-vscode/plugin-api` when requested.

Required secrets:

- `VSCE_PAT` for Marketplace publishing
- `NPM_TOKEN` for `@codegraphy-vscode/plugin-api`

## Marketplace migration note

V4 is prepared to publish as `codegraphy.codegraphy`.

The existing Marketplace identifier is `codegraphy.codegraphy`. Marketplace ownership and publisher ID are different things: the owner account can be Joseph Soboleski while the immutable extension identifier still uses the publisher ID `codegraphy`.

That means the core V4 release can update the existing Marketplace listing in place, while the language plugins publish as new listings under the same `codegraphy` publisher.

If you ever move the core to a different publisher later, that would require a new Marketplace listing.

## Current public listings

- Core: <https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy>
- TypeScript/JavaScript plugin: <https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript>
- Python plugin: <https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python>
- C# plugin: <https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp>
- GDScript plugin: <https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot>
- Plugin API: <https://www.npmjs.com/package/@codegraphy-vscode/plugin-api>
