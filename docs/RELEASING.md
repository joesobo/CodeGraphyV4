# Releasing

## Release surfaces

Release-facing metadata is not all in one package:

- Core extension marketplace metadata lives in the repo root [`package.json`](../package.json)
- Core extension versioning lives in [`packages/extension/package.json`](../packages/extension/package.json)
- `@codegraphy-dev/core` npm metadata lives in [`packages/core/package.json`](../packages/core/package.json)
- Language plugin npm metadata lives in each `packages/plugin-*/package.json`
- Plugin API npm metadata lives in [`packages/plugin-api/package.json`](../packages/plugin-api/package.json)
- The canonical Agent Skill source lives in [`skills/codegraphy`](../skills/codegraphy/SKILL.md) and is published through the separate public `codegraphy/skills` repository
- The VS Code extension icon source lives at [`assets/icon.svg`](../assets/icon.svg)
- Each published plugin ships its own badged icon at `packages/plugin-*/assets/icon.svg`

## Recommended release flow

After merging release-ready changes to `main`, run the release from a clean checkout with npm auth and `VSCE_PAT` configured:

```bash
pnpm install
pnpm run version-packages
pnpm run release:publish all
```

The repo-root [`package.json`](../package.json) is workspace metadata for the monorepo and stays pinned. The Marketplace extension release version comes from [`packages/extension/package.json`](../packages/extension/package.json), while the root manifest still provides the marketplace metadata and packaged file list for extension releases.

`all` discovers the publishable workspace packages from package metadata, publishes npm packages before Marketplace packages, and skips npm versions that already exist.

The `Release` workflow makes the Marketplace job wait for npm publishing when
`all` is selected. A direct `extension` or `vsce` run skips the npm job and
continues to the Marketplace matrix.

## Agent Skill release

The skill can be validated before any public release. From this repository,
the Skills CLI can discover the canonical source directly:

```bash
npx skills@latest add ./skills/codegraphy --list
```

Use that local source plus a locally built or packed Core CLI for agent demos.
Publishing is required only to validate the final remote install experience.

Before advertising the public command:

1. Authenticate as an account with write access to the `codegraphy` GitHub user and create the public `codegraphy/skills` repository.
2. Copy this repository's complete `skills/codegraphy` directory to `skills/codegraphy` in that repository, preserving `SKILL.md` and `agents/openai.yaml`.
3. From a clean workspace, verify discovery with `npx skills@latest add codegraphy/skills --list`.
4. Verify a workspace install with `npx skills@latest add codegraphy/skills` and a global install with `npx skills@latest add codegraphy/skills --global`.
5. Confirm the installed skill tells an agent how to install `@codegraphy-dev/core` when `codegraphy` is absent.

Until that external repository exists, contributors can install from a clone
with `npx skills@latest add ./skills/codegraphy`. The `codegraphy/skills`
repository is not created by this monorepo's npm or Marketplace workflow.

The core VS Code extension release publishes platform-specific VSIX targets for
the native SQLite and Tree-sitter runtimes:

- `linux-x64`
- `darwin-arm64`
- `win32-x64`

Each target is built on its matching release runner so the `libsql` Node-API
binary and Tree-sitter native bindings match the VSIX target. `libsql` is
Node-API based, so it does not need to be rebuilt for VS Code's Electron V8 ABI.

To dry-run extension packaging before publishing, run:

```bash
pnpm run package:vsix
pnpm run check:vsix-native-artifacts
```

This writes target-specific VSIX artifacts under `artifacts/vsix/`. If you
inspect `extension/dist/node_modules/@libsql/<platform>/index.node` inside each
VSIX, Linux should be ELF x86-64, macOS should be Mach-O arm64, and Windows
should be PE32+ x86-64. The extension runtime check also opens an in-memory
database and performs a write/read round trip through the vendored package.

Use split publishing only when you want a manual checkpoint between npm and Marketplace:

```bash
pnpm run release:publish npm
pnpm run release:publish extension
```

## Publish commands

```bash
pnpm run release:publish all
pnpm run release:publish npm
pnpm run release:publish extension
pnpm run release:publish graph-renderer
pnpm run release:publish plugin-api
pnpm run release:publish plugin-markdown
pnpm run release:publish plugin-particles
pnpm run release:publish core
pnpm run release:publish plugin-typescript
pnpm run release:publish plugin-godot
pnpm run release:publish plugin-unity
pnpm run release:publish plugin-vue
pnpm run release:publish plugin-svelte
```

`pnpm run release:publish core` publishes the `@codegraphy-dev/core` npm package. Use `pnpm run release:publish extension` for the VS Code Marketplace extension.

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
   - Use the repo-pinned Node runtime from [`.nvmrc`](../.nvmrc) / [`.node-version`](../.node-version).
6. Add changesets only for unreleased user-facing workspace packages. Archive shipped changesets under [`docs/archive/changesets/`](./archive/changesets/).
7. Run `pnpm run version-packages`.
8. If the VS Code Marketplace extension changed, verify `packages/extension/package.json` and [`packages/extension/CHANGELOG.md`](../packages/extension/CHANGELOG.md) have matching top entries.
9. Commit the generated version and changelog updates.
10. Publish every release target with `pnpm run release:publish all`.
11. Or publish npm packages first with `pnpm run release:publish npm`, then publish Marketplace packages with `pnpm run release:publish extension`.
12. To publish separately, publish npm packages before Marketplace packages:
   - `pnpm run release:publish graph-renderer`
   - `pnpm run release:publish plugin-api`
   - `pnpm run release:publish plugin-markdown`
   - `pnpm run release:publish plugin-particles`
   - `pnpm run release:publish plugin-typescript`
   - `pnpm run release:publish plugin-godot`
   - `pnpm run release:publish plugin-unity`
   - `pnpm run release:publish plugin-vue`
   - `pnpm run release:publish plugin-svelte`
   - `pnpm run release:publish core`
13. Publish the VS Code extension with `pnpm run release:publish extension`.
14. Publish and smoke-test `codegraphy/skills` using the Agent Skill release steps above.
15. After the replacement CLI and skill are live, retire the old package with `npm deprecate '@codegraphy-dev/mcp@*' 'Deprecated: install @codegraphy-dev/core and the CodeGraphy Agent Skill from codegraphy/skills.'`.
16. Open the Marketplace listing and verify the dependency text, README, icon, gallery banner, and version.
17. Verify the existing `codegraphy.codegraphy` listing has been updated in place to the new V4 release metadata.
18. Open the npm package pages for the public `@codegraphy-dev/*` packages, then verify the README, package metadata, repository links, and the MCP deprecation notice.

## GitHub Actions

Use the `Release` workflow with `workflow_dispatch`.

- `target` can be `all`, `npm`, `vsce`, `extension`, `core`, `graph-renderer`, `plugin-api`, `plugin-markdown`, `plugin-particles`, `plugin-typescript`, `plugin-godot`, `plugin-unity`, `plugin-vue`, or `plugin-svelte`.
- The workflow publishes the selected Marketplace targets and npm packages.

Required secrets:

- `VSCE_PAT` for Marketplace publishing
- `NPM_TOKEN` for npm packages under the `@codegraphy-dev` scope

## Marketplace migration note

V4 is prepared to publish as `codegraphy.codegraphy`.

The existing Marketplace identifier is `codegraphy.codegraphy`. Marketplace ownership and publisher ID are different things: the owner account can be Joseph Soboleski while the immutable extension identifier still uses the publisher ID `codegraphy`.

That means the V4 VS Code extension release can update the existing Marketplace listing in place. Language plugins publish as npm packages under the `@codegraphy-dev` scope instead of normal VS Code Marketplace companion extensions.

After the new npm packages and the main VS Code extension are live and verified, manually unpublish or deprecate the old VS Code Marketplace language-plugin extensions. Keep them available until the replacement install path has been tested from a fresh machine or clean profile.

If you ever move the core to a different publisher later, that would require a new Marketplace listing.

## Current public listings

- Core extension: <https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy>
- Core CLI: <https://www.npmjs.com/package/@codegraphy-dev/core>
- Graph renderer: <https://www.npmjs.com/package/@codegraphy-dev/graph-renderer>
- Plugin API: <https://www.npmjs.com/package/@codegraphy-dev/plugin-api>
- TypeScript/JavaScript plugin: <https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript>
- Godot plugin: <https://www.npmjs.com/package/@codegraphy-dev/plugin-godot>
- Unity plugin: <https://www.npmjs.com/package/@codegraphy-dev/plugin-unity>
- Markdown plugin: <https://www.npmjs.com/package/@codegraphy-dev/plugin-markdown>
- Particles plugin: <https://www.npmjs.com/package/@codegraphy-dev/plugin-particles>
- Vue plugin: <https://www.npmjs.com/package/@codegraphy-dev/plugin-vue>
- Svelte plugin: <https://www.npmjs.com/package/@codegraphy-dev/plugin-svelte>
