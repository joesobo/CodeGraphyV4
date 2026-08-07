# Releasing

CodeGraphy publishes a macOS desktop app, one VS Code extension, Core, and plugin npm packages. The Agent Skill currently ships as source in this repository and is prepared for a future dedicated repository.

## Release Surfaces

| Surface | Source of version and metadata |
|---|---|
| macOS desktop app | `apps/desktop/package.json`, `apps/desktop/src-tauri/Cargo.toml`, and `apps/desktop/src-tauri/tauri.conf.json` must have the same version. |
| VS Code extension | Root `package.json` supplies Marketplace metadata; `packages/extension/package.json` supplies the release version. |
| Core CLI | `packages/core/package.json` |
| Graph renderer | `packages/graph-renderer/package.json` |
| Plugin API | `packages/plugin-api/package.json` |
| Plugins | Each `packages/plugin-*/package.json` |
| Agent Skill | `skills/codegraphy/` in this repo. Copy it to the separate `codegraphy/skills` repository after publishing that repository. |

The root package version stays pinned as monorepo workspace metadata. `scripts/release-core.mjs` builds the Marketplace manifest with the extension package version.

## macOS desktop release

The desktop workflow creates an Apple Silicon DMG for macOS 26 or later. It does not publish the GitHub Release. A maintainer must finish the installed-app check and publish the draft.

### Required release state

- Run from `main` with no uncommitted changes.
- Keep the desktop package, Cargo, and Tauri versions identical.
- Use the `desktop-v<version>` tag, for example `desktop-v0.1.0`.
- Use the protected `desktop-release` GitHub environment.
- Keep the website download control in its pending state until the draft passes the installed-app check and becomes public.

The workflow needs these GitHub environment secrets:

- `APPLE_CERTIFICATE`: base64-encoded Developer ID Application `.p12` file
- `APPLE_CERTIFICATE_PASSWORD`: password for that `.p12` file
- `APPLE_API_ISSUER`: App Store Connect API issuer ID
- `APPLE_API_KEY`: App Store Connect API key ID
- `APPLE_API_KEY_P8`: complete private API key file contents

Only the Apple Developer Account Holder can create the Developer ID Application certificate. Keep the certificate and API private key out of the repository.

### Local package check

The local command uses an ad-hoc identity. It proves the package structure and runtime, but it does not create a distributable artifact.

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  pnpm --filter @codegraphy-dev/desktop build:bundle:ad-hoc
pnpm --filter @codegraphy-dev/desktop check:bundle
```

Use Xcode 26. The workflow runs on GitHub's Apple Silicon `macos-26` image and rejects a different Xcode major version. The verifier requires arm64-only executables, macOS 26.0, matching versions, a valid app and DMG, a mounted-image app, a complete native Core import, and no symbolic links in the bundle.

Never upload the ad-hoc DMG to a release or link it from the website.

### Build the draft

Run the `Desktop release` workflow from `main` and enter the exact desktop tag. The workflow:

1. Confirms the tag, branch, Apple Silicon host, and Xcode 26.
2. Runs desktop unit tests, TypeScript typecheck, and Rust tests.
3. Imports the Developer ID certificate into a temporary keychain.
4. Builds Core and the React app, stages pinned Node 22.23.2, prunes the Core runtime, and signs all native modules with the bundle identity.
5. Builds and signs the app with Hardened Runtime, then notarizes and staples it through Tauri.
6. Signs the final DMG, submits it to `notarytool`, and staples the accepted ticket.
7. Checks nested signatures and team IDs, Gatekeeper, stapling, DMG integrity, mounted-image integrity, architecture, versions, and native module loading.
8. Creates or updates a draft GitHub Release and uploads the verified DMG plus its SHA-256 file.

The workflow refuses an existing non-draft release. It removes the temporary signing keychain even when a previous step fails.

### Installed-app acceptance check

Run this check on the draft asset before you publish it:

1. Download the DMG and `.sha256` file from the draft GitHub Release on another Apple Silicon Mac that runs macOS 26 or later.
2. Verify the SHA-256 file, mount the DMG, and copy `CodeGraphy.app` to `/Applications`.
3. Run `codesign --verify --deep --strict --verbose=2 /Applications/CodeGraphy.app`.
4. Run `spctl --assess --type execute --verbose=4 /Applications/CodeGraphy.app`.
5. Run `xcrun stapler validate /Applications/CodeGraphy.app` and validate the downloaded DMG too.
6. Launch the installed app through Finder. Confirm macOS shows no unsigned or damaged-app warning.
7. Open a real CodeGraphy Workspace. Confirm the File and Folder hierarchy appears.
8. Open a source File, edit it, save it, and confirm Core reports one-File incremental Indexing.
9. Confirm the right pane draws the Core-owned File and Folder Relationship Graph with WebGPU.
10. Filter the File hierarchy, switch Files with only the keyboard, resize both pane separators, and confirm focus stays in the hierarchy.
11. Select a Node, click empty graph background, and confirm the editor File stays open. Verify Zoom In, Zoom Out, and Fit to Screen.
12. Close the editor File and confirm the workspace and Relationship Graph stay open. Repeat with a dirty File and confirm the discard prompt appears.
13. Change the open File outside CodeGraphy, then confirm the app rejects an overwrite until the File is reopened.
14. Close the app and confirm its `codegraphy-core` child process exits.

Keep the release as a draft if any step fails. After all steps pass, publish the GitHub Release, update the website to link the exact public DMG, and verify that link from a clean browser session. The website must not point at a draft, a workflow artifact, or an ad-hoc build.

## Prepare a Release

Use a clean checkout of `main` with an active Node.js LTS release and the repository-pinned pnpm version.

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

`extension` is an alias for the Marketplace extension target. Individual package targets use their release IDs, including `core`, `graph-renderer`, `plugin-api`, `extension-plugin-api`, `plugin-markdown`, `plugin-particles`, `plugin-typescript`, `plugin-godot`, `plugin-unity`, `plugin-vue`, and `plugin-svelte`.

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
