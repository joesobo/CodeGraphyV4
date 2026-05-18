# Releasing

## Release surfaces

Release-facing metadata is not all in one package:

- Core extension marketplace metadata lives in the repo root [`package.json`](../package.json)
- Core extension versioning lives in [`packages/extension/package.json`](../packages/extension/package.json)
- `@codegraphy/core` npm metadata lives in [`packages/core/package.json`](../packages/core/package.json)
- Language plugin npm metadata lives in each `packages/plugin-*/package.json`
- Plugin API npm metadata lives in [`packages/plugin-api/package.json`](../packages/plugin-api/package.json)
- MCP npm metadata lives in [`packages/mcp/package.json`](../packages/mcp/package.json)
- The VS Code extension icon source lives at [`assets/icon.svg`](../assets/icon.svg)
- Each published plugin ships its own badged icon at `packages/plugin-*/assets/icon.svg`

## Recommended release flow

After merging release-ready changes to `main`, run the release from a clean checkout with npm auth and `VSCE_PAT` configured:

```bash
pnpm install
pnpm run version-packages
pnpm run release:check
pnpm run release:publish all
```

The repo-root [`package.json`](../package.json) is workspace metadata for the monorepo and stays pinned. The Marketplace extension release version comes from [`packages/extension/package.json`](../packages/extension/package.json), while the root manifest still provides the marketplace metadata and packaged file list for extension releases.

`all` discovers the publishable workspace packages from package metadata, publishes npm packages before Marketplace packages, and skips npm versions that already exist.

Use split publishing only when you want a manual checkpoint between npm and Marketplace:

```bash
pnpm run release:publish npm
pnpm run release:publish extension
```

## Local packaging

```bash
pnpm run release:package npm
pnpm run release:package vsce
pnpm run release:package all
```

`core` is the `@codegraphy/core` npm package target. `extension`, `vsix`, `marketplace`, and `core-extension` target the VS Code Marketplace extension and rebuild `@codegraphy/extension` from source before staging the VSIX. npm packages are packed into `artifacts/npm/`; VS Code extensions are packed into `artifacts/vsix/`.

Individual targets are available for debugging or partial releases:

```bash
pnpm run release:package core
pnpm run release:package mcp
pnpm run release:package plugin-api
pnpm run release:package plugin-markdown
pnpm run release:package plugin-typescript
pnpm run release:package plugin-python
pnpm run release:package plugin-csharp
pnpm run release:package plugin-godot
pnpm run release:package extension
```

## Publish commands

```bash
pnpm run release:publish all
pnpm run release:publish npm
pnpm run release:publish extension
pnpm run release:publish plugin-api
pnpm run release:publish plugin-markdown
pnpm run release:publish mcp
pnpm run release:publish core
pnpm run release:publish plugin-typescript
pnpm run release:publish plugin-python
pnpm run release:publish plugin-csharp
pnpm run release:publish plugin-godot
```

`pnpm run release:publish core` publishes the `@codegraphy/core` npm package. Use `pnpm run release:publish extension` for the VS Code Marketplace extension.

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
   - Use Node `22.22.0` LTS from [`.nvmrc`](../.nvmrc) / [`.node-version`](../.node-version).
6. Add changesets only for unreleased user-facing workspace packages. Archive shipped changesets under [`docs/archive/changesets/`](./archive/changesets/).
7. Run `pnpm run version-packages`.
8. If the VS Code Marketplace extension changed, verify `packages/extension/package.json` and [`packages/extension/CHANGELOG.md`](../packages/extension/CHANGELOG.md) have matching top entries.
9. Commit the generated version and changelog updates.
10. Run `pnpm run release:check`.
11. Publish every release target with `pnpm run release:publish all`.
12. Or publish npm packages first with `pnpm run release:publish npm`, then publish Marketplace packages with `pnpm run release:publish extension`.
13. To publish separately, publish npm packages before Marketplace packages:
   - `pnpm run release:publish plugin-api`
   - `pnpm run release:publish plugin-markdown`
   - `pnpm run release:publish plugin-typescript`
   - `pnpm run release:publish plugin-python`
   - `pnpm run release:publish plugin-csharp`
   - `pnpm run release:publish plugin-godot`
   - `pnpm run release:publish core`
   - `pnpm run release:publish mcp`
14. Publish the VS Code extension with `pnpm run release:publish extension`.
15. Open the Marketplace listing and verify the dependency text, README, icon, gallery banner, and version.
16. Verify the existing `codegraphy.codegraphy` listing has been updated in place to the new V4 release metadata.
17. Open the npm package pages for the public `@codegraphy/*` packages, then verify the README, package metadata, and repository links.

## GitHub Actions

Use the `Release` workflow with `workflow_dispatch`.

- `mode=package` builds and uploads release artifacts.
- `target` can be `all`, `npm`, `vsce`, `extension`, `core`, `mcp`, `plugin-api`, `plugin-markdown`, `plugin-typescript`, `plugin-python`, `plugin-csharp`, or `plugin-godot`.
- `mode=publish` runs the same checks, packages release artifacts, publishes selected Marketplace targets, and publishes selected npm packages.

Required secrets:

- `VSCE_PAT` for Marketplace publishing
- `NPM_TOKEN` for npm packages under the `@codegraphy` scope

## Marketplace migration note

V4 is prepared to publish as `codegraphy.codegraphy`.

The existing Marketplace identifier is `codegraphy.codegraphy`. Marketplace ownership and publisher ID are different things: the owner account can be Joseph Soboleski while the immutable extension identifier still uses the publisher ID `codegraphy`.

That means the V4 VS Code extension release can update the existing Marketplace listing in place. Language plugins publish as npm packages under the `@codegraphy` scope instead of normal VS Code Marketplace companion extensions.

After the new npm packages and the main VS Code extension are live and verified, manually unpublish or deprecate the old VS Code Marketplace language-plugin extensions. Keep them available until the replacement install path has been tested from a fresh machine or clean profile.

If you ever move the core to a different publisher later, that would require a new Marketplace listing.

## Current public listings

- Core: <https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy>
- Plugin API: <https://www.npmjs.com/package/@codegraphy/plugin-api>
- TypeScript/JavaScript plugin: <https://www.npmjs.com/package/@codegraphy/plugin-typescript>
- Python plugin: <https://www.npmjs.com/package/@codegraphy/plugin-python>
- C# plugin: <https://www.npmjs.com/package/@codegraphy/plugin-csharp>
- Godot plugin: <https://www.npmjs.com/package/@codegraphy/plugin-godot>
- Markdown plugin: <https://www.npmjs.com/package/@codegraphy/plugin-markdown>
- MCP: <https://www.npmjs.com/package/@codegraphy/mcp>
