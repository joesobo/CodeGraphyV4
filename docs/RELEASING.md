# Releasing

CodeGraphy publishes one VS Code extension plus Core and plugin npm packages. The Agent Skill currently ships as source in this repository and is prepared for a future dedicated repository.

## Release Surfaces

| Surface | Source of version and metadata |
|---|---|
| VS Code extension | Root `package.json` supplies Marketplace metadata; `packages/extension/package.json` supplies the release version. |
| Core CLI | `packages/core/package.json` |
| Graph renderer | `packages/graph-renderer/package.json` |
| Plugin API | `packages/plugin-api/package.json` |
| Plugins | Each `packages/plugin-*/package.json` |
| Agent Skill | `skills/codegraphy/` in this repo, copied to the separate `codegraphy/skills` repository when that repository is published. |

The root package version stays pinned as monorepo workspace metadata. `scripts/release-core.mjs` builds the Marketplace manifest with the extension package version.

## Prepare a Release

Use a clean checkout of `main` with the repository-pinned Node and pnpm versions.

```bash
pnpm install --frozen-lockfile
pnpm run test:release
pnpm run version-packages
```

Changesets belong only to unreleased user-facing package changes. `pnpm run version-packages` consumes them and updates package versions and changelogs. Do not archive shipped changeset files or keep a second release-history tree.

Review the generated versions and changelog entries, then commit them before publishing.

## Publish

Publish all npm packages before the Marketplace extension:

```bash
pnpm run release:publish all
```

`all` discovers publishable workspace packages from their manifests, skips npm versions that already exist, publishes npm packages, and then publishes the extension.

Use split targets when a manual checkpoint is needed:

```bash
pnpm run release:publish npm
pnpm run release:publish vsce
```

`extension` is an alias for the Marketplace extension target. Individual package targets use their release IDs, including `core`, `graph-renderer`, `plugin-api`, `plugin-markdown`, `plugin-particles`, `plugin-typescript`, `plugin-godot`, `plugin-unity`, `plugin-vue`, and `plugin-svelte`.

Required credentials:

- `NPM_TOKEN` for the `@codegraphy-dev` npm scope
- `VSCE_PAT` for the `codegraphy` Marketplace publisher

Confirm Marketplace authentication before a local publish:

```bash
vsce ls-publishers
vsce verify-pat codegraphy
```

## VSIX Packaging

The extension publishes native runtime targets for:

- `linux-x64`
- `darwin-arm64`
- `win32-x64`

Each target must build on a matching runner so Tree-sitter native bindings and the `libsql` Node-API binary match the artifact platform.

Dry-run packaging and native validation:

```bash
pnpm run package:vsix
pnpm run check:vsix-native-artifacts
pnpm run check:vsix-activation
```

VSIX files go under `artifacts/vsix/`. Native validation checks the packaged binary format and runs an in-memory SQLite write/read round trip.

## GitHub Actions

Run the `Release` workflow with `workflow_dispatch`.

- `all` runs npm publishing first and makes the Marketplace job wait for it.
- `npm` publishes all npm targets.
- `vsce` or `extension` publishes Marketplace targets without an npm job.
- A package release ID publishes one package.

The workflow uses `NPM_TOKEN` and `VSCE_PAT` repository secrets.

## Agent Skill

The canonical skill source is [`skills/codegraphy`](../skills/codegraphy/SKILL.md). Validate it from this checkout:

```bash
npx skills@latest add ./skills/codegraphy --list
npx skills@latest add ./skills/codegraphy
```

The public `codegraphy/skills` repository does not exist yet. Do not advertise the remote install command until the repository is live and these checks pass from a clean workspace:

```bash
npx skills@latest add codegraphy/skills --list
npx skills@latest add codegraphy/skills
npx skills@latest add codegraphy/skills --global
```

Copy the complete `skills/codegraphy` directory, including `SKILL.md` and `agents/openai.yaml`, into that repository. Confirm the installed skill explains how to install `@codegraphy-dev/core` when the CLI is absent.

## Post-Release Verification

1. Confirm each selected npm package reports the expected version and README.
2. Install the Core CLI into a clean environment and run `codegraphy --version`, `doctor`, `index`, and one bounded query.
3. Install the Marketplace extension into a clean VS Code profile and open a real workspace.
4. Verify the listing version, icon, README images, supported platforms, and installation text.
5. Run the Agent Skill remote-install checks only after its public repository exists.

Public listings:

- [VS Code extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [Core CLI](https://www.npmjs.com/package/@codegraphy-dev/core)
- [Graph renderer](https://www.npmjs.com/package/@codegraphy-dev/graph-renderer)
- [Plugin API](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)
- [TypeScript/JavaScript plugin](https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript)
- [Godot plugin](https://www.npmjs.com/package/@codegraphy-dev/plugin-godot)
- [Unity plugin](https://www.npmjs.com/package/@codegraphy-dev/plugin-unity)
- [Markdown plugin](https://www.npmjs.com/package/@codegraphy-dev/plugin-markdown)
- [Particles plugin](https://www.npmjs.com/package/@codegraphy-dev/plugin-particles)
- [Vue plugin](https://www.npmjs.com/package/@codegraphy-dev/plugin-vue)
- [Svelte plugin](https://www.npmjs.com/package/@codegraphy-dev/plugin-svelte)
