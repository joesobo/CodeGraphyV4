# Extract Core From Extension Package

## Trello

- https://trello.com/c/GUCBeHpV/139-extract-core-from-extension-package
- Related: https://trello.com/c/2Un0AStJ/mcp-shouldnt-need-to-focus-vscode-window-to-run

## Goal

Move CodeGraphy's engine out of the VS Code extension package and into shared npm packages so VS Code, MCP, and CLI all use the same Indexing and Graph Query behavior.

The intended product split is:

- `@codegraphy-dev/core` processes folders and owns the engine.
- The VS Code extension visualizes and integrates with VS Code.
- MCP/CLI operates on CodeGraphy Workspaces, runs explicit commands, and returns Graph Query results to agents.
- MCP/CLI commands operate on the current folder or an explicit path instead of requiring prior selection.
- The Core Package npm install provides the terminal `codegraphy` command for normal CLI workflows.
- MCP is the optional agent interface into core.
- `@codegraphy-dev/plugin-api` is the programmer interface for plugin authors to create plugins that work with core.

## Current Problem

CodeGraphy now has more than one access path:

- people use the VS Code extension for visualization
- agents use MCP for focused graph questions
- CLI commands are becoming part of the setup and validation story

The current architecture still treats the VS Code extension as the owner of the core engine. `docs/MCP.md` currently says MCP asks the Core Extension to run Indexing and Graph Query. That makes MCP depend on VS Code even when the agent only needs local graph data.

This also causes user-facing friction: MCP can focus or open a VS Code window just to make the extension do engine work. The core extraction should remove that focus-jank by letting MCP talk directly to `@codegraphy-dev/core`.

## Existing Evidence

- `CONTEXT.md` currently defines `CodeGraphy MCP` as a local MCP server and CLI that ask the Core Extension to run Indexing and Graph Query.
- `docs/MCP.md` currently says the Core Extension owns Indexing, Graph Cache access, plugin wiring, and Graph Query execution.
- `docs/PLUGINS.md` currently says third-party plugins should ship as VS Code extensions, while plugin implementations may live in shared library packages.
- `packages/codegraphy-mcp` is already a public npm package with the `codegraphy` binary.
- `packages/plugin-api` is already a public npm package.
- `packages/plugin-typescript` and `packages/plugin-godot` are currently VS Code extension packages.
- `packages/plugin-markdown` is currently a private workspace package.
- The VS Code extension already vendors native/runtime packages into the VSIX through `packages/extension/scripts/runtimePackages.ts`.

## Settled Decisions

### 1. Core Owns The Full Indexing Pipeline

`@codegraphy-dev/core` should own the full Indexing pipeline, not only Graph Query over an existing Graph Cache.

`@codegraphy-dev/core` owns:

- File Discovery contracts that are not tied to VS Code APIs
- Tree-sitter Analysis
- Plugin Analysis runtime for pure analysis plugins
- Graph Projection
- Graph Cache read/write
- Graph Query execution

This makes the VS Code extension one adapter over the core engine instead of the owner of the engine.

### 2. VS Code Owns Visualization And Editor Integration

The VS Code extension owns:

- Graph View and timeline UI
- webviews, commands, menus, keybindings, and URI handling
- VS Code theme integration
- VS Code workspace save/file-watch events
- VS Code-specific plugin wrappers, if any remain
- Marketplace packaging as `codegraphy.codegraphy`

The extension should not be the place where general CodeGraphy engine behavior lives.

### 3. Core Is The Central Engine With Multiple Interfaces

The Core Package is the central CodeGraphy engine. Other packages are interfaces into that engine:

- the VS Code extension is the user interface for visualization and editor integration
- the `codegraphy` CLI is the terminal interface for users and scripts
- MCP is the agent interface for Graph Query and indexing requests
- `@codegraphy-dev/plugin-api` is the programmer interface for creating plugins that interact with core

These interfaces should not own independent engine behavior or duplicate core responsibilities.

### 4. The Core Package Owns The CodeGraphy CLI

The terminal `codegraphy` command should come from the Core Package npm package.

The VS Code extension depends on the Core Package to run CodeGraphy behavior, but the extension remains the VS Code Marketplace install surface. Users who want terminal commands install the Core Package npm package; users who do not care about MCP should not have to install the MCP package just to run Indexing, status, plugin discovery, or plugin enablement commands.

The base install flow is: install the VS Code extension, use its bundled Core Package for the graph experience, and install the Core Package globally only when the user wants terminal workflows such as plugin management. From there, plugin installation follows the global npm package model.

Core-owned CLI commands include:

- `codegraphy setup`
- `codegraphy status [workspace]`
- `codegraphy index [workspace]`
- `codegraphy plugins register <package>`
- `codegraphy plugins list [workspace]`
- `codegraphy plugins enable <package> [workspace]`
- `codegraphy plugins disable <package> [workspace]`

The MCP package should be optional and should not be the owner of non-MCP CLI workflows. The Core Package should not know about MCP clients or MCP server startup.

`codegraphy setup` decision:

- `codegraphy setup` belongs to the Core Package
- it prepares CodeGraphy's own user state, such as the root CodeGraphy directory and user-level settings/registry files
- it should not configure Codex, Claude, Cursor, or any other MCP client
- agent-specific MCP client configuration belongs in MCP docs and examples, not in Core setup

Package install decision:

- installing only the Core Package should expose `codegraphy`
- installing the MCP package should expose the agent-agnostic `codegraphy-mcp` MCP server command owned by `@codegraphy-dev/mcp`
- installing `@codegraphy-dev/mcp` should install `@codegraphy-dev/core` as a runtime dependency so the MCP server has the same core engine
- the MCP server command should work with Codex, Claude, Cursor, or any other MCP-capable agent
- do not expose `codegraphy mcp`; extending the Core-owned `codegraphy` binary after install would require Core to know about MCP or the MCP package to publish a competing `codegraphy` binary
- do not make Core dispatch `codegraphy mcp`

### 5. MCP/CLI Can Explicitly Invoke Indexing

MCP/CLI should be able to tell `@codegraphy-dev/core` to run Indexing and Graph Query operations for the current folder or an explicit CodeGraphy Workspace path.

Indexing must be explicit, not hidden inside every query.

Expected command/tool shape:

- index a CodeGraphy Workspace
- query Relationship Graph data
- report Graph Cache missing, stale, or unusable states clearly
- MCP tools should mirror CLI command semantics and call Core APIs directly instead of shelling out to `codegraphy`
- MCP should be agent-agnostic; no MCP tool or server startup path should assume Codex specifically

Query tools should fail clearly when the Graph Cache is missing and point to the explicit indexing command.

### 6. Use One Workspace-Local Graph Cache

VS Code, MCP, and CLI should all read and write the same Graph Cache:

```text
<workspace-root>/.codegraphy/graph.lbug
```

Do not create a separate MCP cache or snapshot. A separate cache would recreate split-brain behavior between VS Code and MCP.

The same workspace-local behavior must work with only `@codegraphy-dev/core` and the VS Code extension installed. MCP is optional.

### 7. Use CodeGraphy Workspace As The Core Term

Use **CodeGraphy Workspace** as the canonical product/core/MCP term for a folder CodeGraphy can analyze, before or after Indexing has run.

Do not say repo-local when the behavior is not Git-specific. A CodeGraphy Workspace does not have to be a Git repo root or a Git repo at all.

Supporting terms:

- **Workspace Root**: the folder path for a CodeGraphy Workspace
- **Workspace Settings**: workspace-specific CodeGraphy settings at `<workspace-root>/.codegraphy/settings.json`
- **Indexed Workspace**: a CodeGraphy Workspace with a current Graph Cache
- **Unindexed Workspace**: a CodeGraphy Workspace before Graph Cache creation, or after the Graph Cache is removed

Use **Workspace Folder** only when specifically discussing VS Code APIs or VS Code integration behavior.

Git-aware behavior such as timeline/history can still talk about repos when the feature actually depends on Git.

### 8. Bundle Core Into The VSIX

The VS Code extension should get `@codegraphy-dev/core` as a normal npm dependency at build/package time and ship it inside the published VSIX.

Do not use VS Code `extensionDependencies` for `@codegraphy-dev/core`. That manifest field is for other VS Code extensions, not npm packages.

Do not run `npm install` during extension activation. A Marketplace install should not depend on:

- the user having npm available
- network access
- npm registry availability
- write permissions
- remote host quirks

Implementation direction:

- add `@codegraphy-dev/core` as a workspace dependency of the extension package
- bundle/import the core entrypoints the extension needs
- keep explicit vendoring/copy behavior only for native/runtime packages that cannot be bundled cleanly
- verify the final VSIX works from a clean install without package-manager commands

Relevant VS Code docs:

- https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- https://code.visualstudio.com/api/working-with-extensions/bundling-extension
- https://code.visualstudio.com/api/references/extension-manifest

### 9. First-Party Language Plugins Become Npm Packages

Move first-party language plugins off the VS Code Extension Marketplace and republish them as npm packages.

Scope: language plugins only.

Target model:

- language plugin implementations ship as npm packages consumed by `@codegraphy-dev/core`
- MCP/CLI can load the same language plugins without launching VS Code
- the VS Code extension gets language plugin behavior through bundled/default npm dependencies
- separate first-party language extensions leave the normal Marketplace install story

This is especially important because plugins are headless analysis packages. VS Code-specific UI, commands, menus, and webviews belong in `@codegraphy-dev/extension`, not in plugin packages.

### 10. Standardize Package Names Under `@codegraphy/*`

Use the npm scope `@codegraphy/*` for product packages.

Target names:

- `@codegraphy-dev/core`
- `@codegraphy-dev/mcp`
- `@codegraphy-dev/plugin-api`
- `@codegraphy-dev/plugin-typescript`
- `@codegraphy-dev/plugin-godot`
- `@codegraphy-dev/plugin-markdown`

Keep the Marketplace extension id as `codegraphy.codegraphy`.

`@codegraphy-dev/extension` can remain the private workspace package used to build the VS Code extension. It should stay private unless there is a concrete npm-consumer use case. The public install surface for that package is the VS Code Marketplace, not npm.

Avoid `@codegraphy-vscode/*` for packages that are no longer VS Code-specific.

### 11. Plugins Are Enabled Per CodeGraphy Workspace

Do not create a "default plugins" bundle or have `@codegraphy-dev/core` auto-load first-party language plugins by magic.

Instead, treat plugin installation and plugin enablement as separate states:

- install CodeGraphy as an npm package
- install CodeGraphy plugin npm packages
- installing a plugin package makes it available to CodeGraphy
- enabling a plugin makes it active for a specific CodeGraphy Workspace
- disabling a plugin for a CodeGraphy Workspace keeps the package installed but inactive for that CodeGraphy Workspace
- the VS Code extension, MCP, and CLI can all enable or disable plugins for a CodeGraphy Workspace

The Markdown plugin should also become its own package, even if it feels built-in today. It can be included or suggested by the normal setup path, but it should still follow the plugin package model.

This is intentionally closer to the Obsidian ecosystem than to VS Code extension dependencies. Obsidian's model has useful parallels:

- a vault is a folder with local `.obsidian` configuration
- community plugins are installed, then separately enabled
- installed plugins can be toggled off without uninstalling
- restricted mode can ignore installed plugins without deleting them

CodeGraphy should adapt that pattern to CodeGraphy Workspaces and npm packages instead of copying Obsidian's GitHub-release delivery system exactly.

Suggested CodeGraphy model:

- user-level Plugin Registry: which globally installed plugin packages are available to CodeGraphy on the machine
- workspace-local enabled plugin set: which installed plugins are active for that CodeGraphy Workspace
- workspace-local plugin configuration: plugin-specific settings for that CodeGraphy Workspace
- core plugin runtime: `@codegraphy-dev/core` defines how plugins integrate with analysis, events, signals, and Graph Query behavior through `@codegraphy-dev/plugin-api`
- core load plan: `@codegraphy-dev/core` reads the enabled plugin set for the CodeGraphy Workspace, resolves installed plugin packages, loads them, and runs Indexing
- CodeGraphy packages and plugins should not be installed into the user's source project by default
- the user's project code should not depend on CodeGraphy packages

Research references:

- https://obsidian.md/help/community-plugins
- https://obsidian.md/help/data-storage
- https://obsidian.md/help/configuration-folder
- https://obsidian.md/help/plugin-security

### 12. Commands Operate On A Path, Not A Prior Selection

Do not require users or agents to select/open a CodeGraphy Workspace before running Indexing or Graph Query commands.

CLI command model:

- `codegraphy index` indexes `process.cwd()`
- `codegraphy index <path>` indexes the given folder
- query commands should follow the same rule: no path means current folder; the optional trailing path argument means that CodeGraphy Workspace
- `codegraphy plugins enable <package>` and `codegraphy plugins disable <package>` target `process.cwd()` when no workspace path is provided
- `codegraphy plugins enable <package> <path>` and `codegraphy plugins disable <package> <path>` use the trailing positional path as the CodeGraphy Workspace, not a `--workspace` flag
- repo-local CLI commands should not walk upward to find a parent repo or existing `.codegraphy` folder

MCP tool model:

- tools should not require a previous `select` or `open` call
- tools should accept an optional CodeGraphy Workspace path when the target is not obvious
- when the MCP host can provide a working directory, default to that folder
- if no current folder is available and no path is provided, return a clear error asking for `workspace`

A user-level workspace history can still exist, but it should not be required for normal command execution.

This replaces the current MCP/CLI shape where `codegraphy index` depends on an active repo from the registry and MCP tools require `codegraphy_open_repo` before querying.

### 13. Consolidate Workspace Plugin Settings Under `plugins`

Per-workspace plugin state should live under one `plugins` section in `<workspace-root>/.codegraphy/settings.json`.

This should replace the current spread of top-level plugin settings:

- `pluginOrder`
- `disabledPlugins`
- `disabledPluginFilterPatterns`

Those legacy top-level names should not be preserved in the new model. `disabledPlugins` is replaced by plugin entry presence in the `plugins` array. `disabledFilterPatterns` is acceptable inside a plugin entry because it represents a delta from that plugin's default filter patterns.

Target shape:

```json
{
  "plugins": [
    {
      "package": "@codegraphy-dev/plugin-markdown"
    },
    {
      "package": "@codegraphy-dev/plugin-typescript",
      "disabledFilterPatterns": [],
      "options": {}
    }
  ]
}
```

Guidelines:

- plugin install state is not stored in the CodeGraphy Workspace settings
- plugin enablement is workspace-local and represented by presence in the `plugins` array
- plugin ordering is workspace-local and represented by array order
- plugin-specific disabled filter patterns are workspace-local
- plugin-specific options belong under the plugin entry
- absent plugin entry means the plugin package is available but not enabled for that CodeGraphy Workspace, unless a later setup flow explicitly creates entries
- explicit disables are represented by removing the plugin entry from the workspace `plugins` array

This makes the settings model read like the plugin product model: a CodeGraphy Workspace has an ordered list of active plugin entries, and each entry owns its filters and options.

Install behavior:

- installing a plugin package should not enable it anywhere
- install can leave CodeGraphy Workspace settings untouched
- enablement creates or updates the plugin entry for that CodeGraphy Workspace
- disabled-by-default is the intended behavior on install

This mirrors the important part of the Obsidian feel: install first, then choose where to enable and configure the plugin.

### 14. Plugin Registry And Settings Levels

Do not rely on npm `postinstall` scripts or plugin packages self-registering during installation.

Installing a plugin package is passive. CodeGraphy records available plugin packages in the user-level Plugin Registry at `~/.codegraphy/plugins.json`.

`@codegraphy-dev/core` owns plugin integration. It should work with the VS Code extension even when MCP is not installed. MCP and CLI are consumers of core plugin behavior, not the owners of it.

CLI command model:

- plain npm global install should also be supported:
  - `npm i -g @codegraphy-dev/core`
  - `npm i -g @codegraphy-dev/plugin-typescript`
- `codegraphy plugins register <package>` resolves one named globally installed plugin package, validates its CodeGraphy plugin metadata, and writes it to the user-level Plugin Registry at `~/.codegraphy/plugins.json`
- `codegraphy plugins link <package-root>` records a local package checkout directly in the Plugin Registry, which is the preferred local-development path for private plugins
- all plugin packages use the same `plugins register` validation path; CodeGraphy plugin metadata is the boundary
- `codegraphy plugins list` lists registered plugin packages and workspace-local enablement state
- `codegraphy plugins enable <plugin> [path]` enables a registered plugin for the current or explicit CodeGraphy Workspace
- `codegraphy plugins disable <plugin> [path]` disables it for the current or explicit CodeGraphy Workspace

VS Code extension behavior:

- the Plugins popup reads the user-level Plugin Registry
- the Plugins popup writes workspace-local enablement/configuration to the current CodeGraphy Workspace
- the Plugins popup should distinguish installed/available plugins from enabled plugins for the current CodeGraphy Workspace

This keeps plugin installation safe and passive while preserving the expected "I installed it, now I can toggle it in this workspace" UX.

User-level CodeGraphy state:

- `~/.codegraphy/plugins.json`: Plugin Registry, including package names, versions, and resolved package locations
- `~/.codegraphy/settings.json`: user-level CodeGraphy defaults

Workspace-specific CodeGraphy state:

- `<workspace-root>/.codegraphy/settings.json`: Workspace Settings, including plugin enablement/configuration
- `<workspace-root>/.codegraphy/graph.lbug`: Graph Cache for an Indexed Workspace

This mirrors the useful VS Code split between user settings and workspace settings without making CodeGraphy packages part of the user's application dependencies.

Primary plugin install path:

```bash
npm i -g @codegraphy-dev/core
npm i -g @codegraphy-dev/plugin-typescript
codegraphy plugins register @codegraphy-dev/plugin-typescript
codegraphy plugins enable @codegraphy-dev/plugin-typescript
```

Do not add a first-pass `codegraphy plugins install <package>` wrapper. Keeping npm install visible makes the package model honest and avoids making CodeGraphy responsible for package-manager behavior.

There is no first-pass broad `codegraphy plugins refresh` command. Users register installed plugin packages by name so the global Plugin Registry stays simple, explicit, and metadata-driven. `plugins register` should not enable plugins in any CodeGraphy Workspace.

A plugin gallery or install browser similar to Obsidian's community plugin browser is useful future product work, but out of scope for the core extraction decision.

### 15. Plugin Packages Declare A CodeGraphy Manifest

An npm package should prove it is a CodeGraphy plugin with explicit package metadata, not by requiring CodeGraphy to import arbitrary packages and inspect their runtime shape.

Add a `codegraphy` field to plugin `package.json` files. The npm package's normal `exports` field should define how the plugin runtime is imported, so CodeGraphy does not need a separate `codegraphy.entry` field when the package's default export is the plugin runtime.

```json
{
  "name": "@codegraphy-dev/plugin-typescript",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "codegraphy": {
    "type": "plugin",
    "apiVersion": "2",
    "defaultOptions": {
      "includeSceneResources": true,
      "includeAutoloads": true,
      "includeClassNameUsage": true
    }
  }
}
```

The manifest should tell CodeGraphy:

- this package is a CodeGraphy plugin
- which `@codegraphy-dev/plugin-api` version the plugin was built for
- what default plugin `options` the plugin starts with

This enables proper plugin versioning, compatibility checks, default option materialization, and safer plugin registration. `plugins register` can validate metadata before importing any runtime code.

Resolved package-manifest decisions:

- do not add `codegraphy.entry` unless a future real use case appears; default to importing the package through npm `exports`
- do not add `./options.schema` or `./options.defaults` entries to npm `exports`
- inline `defaultOptions` in the `codegraphy` manifest for the first slice
- skip `optionsSchema` until a plugin really needs richer validation or UI metadata
- `defaultOptions` is optional; a plugin with no configurable options can omit it
- the core should reject a package if the `package.json` metadata says it is a CodeGraphy plugin but the runtime export does not satisfy the plugin API contract

Plugin options metadata decision:

- plugin packages can optionally declare inline `defaultOptions`
- CodeGraphy should be able to inspect options metadata without runtime-importing the plugin
- when a plugin is enabled, CodeGraphy should copy `defaultOptions` into that workspace plugin entry's `options`
- this makes workspace behavior explicit and protects the workspace from silent behavior changes when plugin defaults change in a later package version
- options schema support can be added later when concrete plugin options prove it is worth the extra metadata

### 16. Obsidian Plugin Ecosystem Lessons

Sources checked:

- Obsidian blog: [The future of Obsidian plugins](https://obsidian.md/blog/future-of-plugins/)
- Obsidian Help: [Community plugins](https://obsidian.md/help/community-plugins)
- Obsidian Help: [Plugin security](https://obsidian.md/help/plugin-security)
- Obsidian Developer Docs: [Manifest](https://docs.obsidian.md/Reference/Manifest)
- Obsidian Developer Docs: [Versions](https://docs.obsidian.md/Reference/Versions)
- Obsidian Developer Docs: [Store secrets](https://docs.obsidian.md/plugins/guides/secret-storage)
- Obsidian Changelog: [Obsidian 1.11.4 Desktop](https://obsidian.md/changelog/2026-01-07-desktop-v1.11.4/)
- Obsidian sample plugin: [main.ts](https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/main.ts), [manifest.json](https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/manifest.json), [versions.json](https://raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/versions.json)

Obsidian's useful shape:

- installed does not mean enabled
- plugins are enabled per vault, which maps well to CodeGraphy enabling plugins per CodeGraphy Workspace
- installed plugins can be disabled without uninstalling
- community plugins are treated as third-party code with an explicit trust boundary
- Restricted Mode can ignore installed plugins, which gives users a recovery path when a plugin causes trouble
- the plugin manifest stays small and focuses on identity, compatibility, and user-visible metadata
- `versions.json` gives Obsidian a compatibility fallback when newer plugin versions require newer app APIs
- plugin settings are not declared as a manifest schema; the plugin code registers a `PluginSettingTab`, loads defaults with `loadData()`, and persists settings with `saveData()`
- the plugin browser distinguishes discovery, installation, enablement, settings, hotkeys, funding, uninstall, refresh, and search
- the new Community site adds categories, sorting, screenshots, detail pages, project profiles, automated reviews, scorecards, official labels, paid/free labels, and a developer dashboard
- the new automated review system checks every version, not just initial submissions
- Obsidian recently added shared SecretStorage so plugins can reference named secrets instead of duplicating sensitive values in each plugin's settings

CodeGraphy should bring over:

- installation and enablement as separate operations
- disabled-by-default plugins
- workspace-local enablement/configuration
- a user-level Plugin Registry
- a no-plugin recovery path, such as `codegraphy --no-plugins`, `CODEGRAPHY_DISABLE_PLUGINS=1`, or an equivalent safe-mode command
- explicit plugin compatibility metadata, at least `apiVersion`; possibly also `coreVersion` or `coreRange`
- optional user-visible disclosures for plugins that use network access, external processes, writes outside the CodeGraphy Workspace, or secrets
- declarative options metadata, even though Obsidian does not use a settings schema, because CodeGraphy plugin options must work outside the VS Code UI
- a future plugin directory/gallery that reads the same metadata used by `plugins register`
- a manual update posture for plugin packages; CodeGraphy should not silently upgrade globally installed plugin packages
- centralized secret references if future plugins need tokens or API keys

CodeGraphy should not copy:

- copying plugin bundles into each workspace; the settled direction is user/tool-level npm installation with workspace-local enablement
- UI-only settings tabs; CodeGraphy settings need to work through VS Code, CLI, and MCP
- requiring an active app window or selected repo before commands can run
- relying only on initial plugin review; if CodeGraphy eventually has a registry, every release needs the same metadata and safety checks

Recommended next design direction:

- treat Obsidian's current ecosystem as the north star for lifecycle and trust UX, not its exact packaging format
- use npm for distribution, CodeGraphy metadata for discovery/compatibility, workspace settings for enablement, and a future registry/gallery for richer review and browse experiences
- design settings as headless-first metadata so the VS Code extension can render a UI, the CLI can validate config, and MCP can explain or modify config safely

### 17. Plugin Capability Disclosures

Capability disclosures are not plugin settings. They are static package metadata that tells CodeGraphy and the user what kinds of side effects or sensitive access a plugin may need.

Baseline plugin capability:

- analyze files that the user already asked CodeGraphy to index inside the current CodeGraphy Workspace
- emit Relationship Graph nodes, edges, symbols, colors, filters, and source metadata
- keep temporary in-memory state while Indexing runs

The baseline capability does not need a scary warning. It is what CodeGraphy plugins are for.

Disclosures are only for behavior beyond that baseline:

- `network`: the plugin may call the internet or local network
- `secrets`: the plugin may need tokens, API keys, credentials, or named secret references
- `externalProcesses`: the plugin may run tools such as `tsc`, `dotnet`, `python`, `godot`, package managers, language servers, or CLIs
- `workspaceWrites`: the plugin may write files inside the CodeGraphy Workspace
- `outsideWorkspaceWrites`: the plugin may write somewhere outside the CodeGraphy Workspace
- `extraFileReads`: the plugin may read files that were not part of the Indexed Workspace file set

How this fits current first-party plugins:

- TypeScript plugin: no extra disclosure; it currently contributes ecosystem metadata such as file colors and default filters
- Python plugin: no extra disclosure; it currently contributes ecosystem metadata such as file colors and default filters
- C# plugin: no extra disclosure; it currently contributes ecosystem metadata such as file colors and default filters
- Markdown plugin: no extra disclosure; it analyzes local Markdown content for wikilinks and uses an in-memory path resolver
- Godot plugin: no extra disclosure; it analyzes local GDScript, `.tscn`, `.tres`, and `project.godot` content using in-memory indexes

What disclosures would catch in future plugins:

- a dependency-health plugin that queries npm/PyPI/GitHub would declare `network`
- a cloud-symbol-enrichment plugin would declare `network` and maybe `secrets`
- a coverage plugin that reads a local coverage report outside the indexed workspace would declare `extraFileReads`
- a generated-docs plugin that writes Markdown summaries into the workspace would declare `workspaceWrites`
- a build-system plugin that shells out to `dotnet`, `tsc`, or `godot` would declare `externalProcesses`

Recommended first slice:

- keep `disclosures` optional
- default missing `disclosures` to baseline local analysis only
- require `disclosures` before accepting a plugin into any future official gallery
- show non-baseline disclosures when enabling a plugin in a CodeGraphy Workspace
- do not block npm-installed plugins based on disclosures in the first implementation

### 18. Analysis Capability Paths

The plugin model should make it easy for analyzers to use the right relationship-evidence source for each job. This is related to disclosures, but it is not the same thing. Disclosures describe side effects and sensitive access. Analysis capability paths describe how relationship evidence is produced.

Recommended paths:

1. Core Structured Analysis
   - owned by `@codegraphy-dev/core`
   - implemented as the core-owned built-in `codegraphy.treesitter` plugin
   - uses bundled Tree-sitter grammars and CodeGraphy-owned extractors
   - produces baseline relationships for broadly useful languages
   - should stay shallow, predictable, and dependency-light

2. Plugin Structured Analysis
   - owned by a plugin package
   - uses a language-specific parser, AST, compiler API, language server, or framework-aware analyzer
   - produces deeper relationships for a language or ecosystem than the core should own
   - may or may not need disclosures depending on how it works

3. Plugin Text Analysis
   - owned by a plugin package
   - uses raw text, line scanning, regular expressions, or lightweight token matching
   - useful for simple formats, fallback behavior, early plugins, and narrow relationship sources
   - often cheap to start, but expensive to maintain when language semantics become more complex

This keeps the core from becoming responsible for every language's deepest semantics while still letting plugins move beyond line-by-line parsing.

These paths are not mutually exclusive plugin categories. A single plugin may use multiple analysis paths in one package:

- a plugin can rely on the core-owned Tree-sitter plugin producing baseline graph evidence before optional workspace package plugins run
- a plugin can add parser-backed Plugin Structured Analysis for relationships that need deeper language knowledge
- a plugin can keep Plugin Text Analysis for narrow cases, unusual file formats, or relationships not covered by the parser
- a plugin can move relationship sources from text analysis to structured analysis over time without becoming a different kind of plugin

Do not add an `analysisTier` field to the plugin manifest. The manifest should describe compatibility, settings, and non-baseline disclosures. Analysis capability is expressed by which core lifecycle hooks and plugin APIs the plugin uses.

Godot is the best current showcase:

- current `@codegraphy-dev/plugin-godot` behavior is mostly Plugin Text Analysis
- it line-scans GDScript for `preload`, `load`, `extends`, `class_name`, type usage, and static access
- it line-scans Godot text resources such as `.tscn`, `.tres`, and `project.godot`
- it maintains in-memory maps for class names, resource UIDs, and project roots
- this is valuable but forces the plugin to keep reimplementing pieces of a parser

Potential Godot upgrade paths:

- `@codegraphy-dev/plugin-godot` could become a Plugin Structured Analysis package by using a GDScript parser and a Godot resource parser
- `@gdquest/lezer-gdscript` exists as a JavaScript GDScript parser option
- `@fernforestgames/godot-resource-parser` exists as a JavaScript parser for Godot 4 `.tscn` and `.tres` files
- Godot exposes a GDScript language server; using it would be a deeper semantic path, but it would likely require `externalProcesses` and possibly local `network` disclosures because the plugin would connect to or start Godot's language-server process

Recommended Godot showcase plugin:

- keep `@codegraphy-dev/plugin-godot` as the first showcase for Plugin Structured Analysis
- first move most GDScript relationship sources to parser-backed Plugin Structured Analysis
- keep Plugin Text Analysis fallbacks for anything the structured parser path cannot support yet
- then move `.tscn`, `.tres`, and `project.godot` relationship sources to parser-backed resource extraction where practical
- keep relationship outputs identical first, then add deeper Godot-specific relationships once the parser-backed path is stable
- avoid Godot LSP in the first structured rewrite because it changes runtime requirements and forces external-process/local-network UX immediately
- consider a later optional `@codegraphy-dev/plugin-godot-lsp` or `@codegraphy-dev/plugin-godot-semantic` package if compiler-accurate relationships become worth the extra dependency

How disclosures apply to these paths:

- Core Structured Analysis: no plugin disclosures; it is core behavior
- Plugin Structured Analysis with pure npm parser dependencies: usually no extra disclosure
- Plugin Structured Analysis using Godot's language server: disclose `externalProcesses` and possibly local `network`
- Plugin Text Analysis reading only indexed workspace files: no extra disclosure
- Any analysis path that calls cloud services, reads outside the CodeGraphy Workspace, writes files, runs external processes, or needs secrets should declare the matching disclosure

### 19. Plugin Lifecycle Shape

Current plugin API inventory:

- `initialize(workspaceRoot)`
- `onPreAnalyze(files, workspaceRoot, context?)`
- `analyzeFile(filePath, content, workspaceRoot, context?)`
- `onFilesChanged(files, workspaceRoot, context?)`
- `onPostAnalyze(graph)`
- `onGraphRebuild(graph)`
- `onWorkspaceReady(graph)`
- `onUnload()`
- `contributeNodeTypes()`
- `contributeEdgeTypes()`
- static runtime fields such as `supportedExtensions`, `sources`, `fileColors`, and `defaultFilters`

Current lifecycle order in practice:

1. plugin is registered
2. `initialize(workspaceRoot)` runs once per plugin/workspace initialization
3. File Discovery runs
4. `onPreAnalyze(...)` receives discovered files and content
5. the core-owned `codegraphy.treesitter` plugin analyzes matching files where coverage exists
6. enabled npm plugin packages run `analyzeFile(...)` per matching file in workspace order
7. Graph Projection builds the Relationship Graph
8. `onPostAnalyze(graph)` runs after graph build
9. `onWorkspaceReady(graph)` is notified or replayed
10. `onGraphRebuild(graph)` runs on later graph rebuilds
11. `onFilesChanged(...)` runs for Live Updates and may request additional files or force a full re-index
12. `onUnload()` runs during plugin unregistration/disposal

Lifecycle constraints from the core extraction:

- analysis hooks must work in `@codegraphy-dev/core` without VS Code, MCP, or a webview
- VS Code UI hooks must not be required for CLI or MCP indexing/querying
- MCP should be able to call core directly without selecting or focusing a VS Code window
- plugins may combine core structured results, plugin structured analysis, and plugin text analysis inside one package
- plugin settings must be readable and editable from VS Code, CLI, and MCP
- lifecycle hooks should be explicit enough for plugin authors without turning CodeGraphy into a generic VS Code extension host

Open lifecycle question:

- Should the plugin API split headless core hooks from UI/webview hooks, while still allowing one plugin package to export both?

Decision:

- no; that still gives plugins a VS Code-aware surface they do not need
- keep plugins headless
- keep one npm plugin package and one plugin manifest
- `@codegraphy-dev/core` owns its own lifecycle and plugin runtime
- `@codegraphy-dev/extension` hooks into the core lifecycle while also participating in the VS Code extension lifecycle
- plugin packages communicate with core only
- plugin packages do not communicate with VS Code and should not know whether the caller is the VS Code extension, CLI, or MCP
- the VS Code extension communicates with both VS Code and core
- MCP and CLI communicate with core only
- define a core plugin lifecycle that always works in `@codegraphy-dev/core`: settings, discovery metadata, `initialize`, `onPreAnalyze`, `analyzeFile`, `onFilesChanged`, `onPostAnalyze`, graph/source/type contributions, and unload
- move VS Code-specific toolbar actions, context menu items, decorations, webview contributions, and webview readiness out of the core plugin API
- preserve visualization customization as extension-owned behavior, not plugin-owned behavior, unless a future separate extension API is deliberately designed
- make non-baseline plugin capabilities visible through disclosures, especially `workspaceWrites`, `outsideWorkspaceWrites`, `externalProcesses`, `network`, `secrets`, and `extraFileReads`

### 20. Core Tree-sitter Output Is Normalized Before Graph Projection

Decision:

- plugins should not consume raw core Tree-sitter ASTs
- the core-owned Tree-sitter plugin emits normalized CodeGraphy analysis results
- normalized analysis can include symbols, relations, node/type contributions, relationship sources, and other stable CodeGraphy-owned analysis data
- if a plugin wants deeper AST access, the plugin should own its parser dependency and parser-version choices
- this keeps core Tree-sitter runtime internals replaceable and avoids coupling plugin packages to core grammar versions
- optional npm plugins enrich the graph by emitting their own normalized analysis results after the built-in Tree-sitter plugin runs
- this PR does not expose raw Tree-sitter trees or a separate baseline-result parameter to plugin packages

Merge authority decision:

- plugin analysis is additive in the first implementation
- plugins can add relationships, symbols, nodes, metadata, node types, edge types, file colors, filters, and relationship evidence
- plugins should not directly mutate, delete, or suppress relationships emitted by the core-owned Tree-sitter plugin
- if a plugin finds a more specific relationship, it should add that relationship with its own provenance instead of erasing core output
- this keeps Graph Cache provenance deterministic and prevents plugin order from becoming hidden semantic authority
- a future explicit suppression API can be designed later if real examples prove it is necessary

Plugin ordering decision:

- keep plugin order, but demote its semantic importance
- the core-owned Tree-sitter plugin runs before optional npm plugin packages
- enabled npm plugin packages run in workspace-configured order
- plugin order is for stable Graph Cache output, predictable provenance ordering, display defaults, and deterministic conflict resolution when plugins emit the same ids
- plugin order should not decide whether core relationships survive
- if two plugins emit the same node, symbol, node type, edge type, or metadata id, the merge rules should be explicit and deterministic
- later plugin order may resolve display-ish defaults, but it should not silently delete relationships or evidence from earlier analysis

Plugin order storage decision:

- Plugin Registry is user-level
- plugin enablement, plugin configuration, and enabled-plugin array order are workspace-level
- `~/.codegraphy/plugins.json` should know which plugin packages are registered and where they resolve from
- `<workspace-root>/.codegraphy/settings.json` should contain an ordered `plugins` array for plugins enabled in that CodeGraphy Workspace
- user-level plugin order should not silently affect graph output across unrelated CodeGraphy Workspaces
- this preserves the Obsidian-style split: installed globally for the user/tool, enabled and configured per workspace

Workspace settings sharing decision:

- `<workspace-root>/.codegraphy/settings.json` should be commit-friendly but not required to be committed
- plugin enablement, plugin array order, and plugin configuration belong there because they affect graph output for that CodeGraphy Workspace
- teams can commit workspace settings when they want shared CodeGraphy behavior
- individual users can leave workspace settings local when they want personal graph preferences
- secrets, tokens, credentials, and machine-specific paths should not live in workspace settings
- secret values should live in user-level state or OS-backed secret storage later, with workspace settings storing only references when needed

Graph Cache sharing decision:

- `<workspace-root>/.codegraphy/graph.lbug` is generated output and should be ignored/local by default
- Graph Cache can be large, stale, branch-sensitive, plugin-version-sensitive, and machine/path-sensitive
- teams should commit workspace settings when desired, not the Graph Cache
- `codegraphy index` should regenerate Graph Cache for the current CodeGraphy Workspace
- recommended default ignore entry:

```gitignore
.codegraphy/*
```

- teams that want shared workspace settings should add `!.codegraphy/settings.json`

Graph Cache staleness decision:

- Graph Cache should store or be paired with an analysis fingerprint
- stale status should be based on the analysis inputs that affect graph output
- fingerprint inputs should include:
  - `@codegraphy-dev/core` package version
  - Graph Cache schema version
  - enabled plugin package names and versions
  - enabled plugin array order
  - workspace plugin settings
  - relevant core analysis settings and filters
  - workspace root identity or path hash
  - git commit/branch metadata when timeline/history analysis is involved
- installing a plugin package does not make a workspace Graph Cache stale by itself
- enabling, disabling, reordering, reconfiguring, or version-changing an enabled plugin should make that workspace Graph Cache stale
- this keeps user-level plugin installation passive while preserving deterministic workspace graph output

Stale cache behavior decision:

- CodeGraphy should report stale Graph Cache state, not automatically re-index
- explicit `codegraphy index` or the VS Code index action should rebuild the Graph Cache
- `codegraphy status`, Graph Query, MCP query tools, and VS Code graph UI should surface stale state without triggering surprise heavy work
- the VS Code extension can show stale state as a small yellow status indicator on or near the index button
- MCP tools should include stale status in their responses so agents can decide whether to call an explicit indexing tool

Plugin toggle behavior decision:

- enabling, disabling, reordering, or reconfiguring a plugin should mark the Graph Cache stale
- plugin toggles should not automatically run Indexing
- toggling remains a cheap workspace settings edit
- users can enable several plugins before one explicit Indexing run
- the UI should make the explicit next action obvious, such as a yellow stale indicator on the index button

Plugin enablement validation decision:

- the VS Code plugin popup and CLI enable commands should operate from the installed-plugin records CodeGraphy already knows about
- there is no separate need to validate that a plugin exists in `~/.codegraphy/plugins.json` at enable time; if it is not installed/discovered, it should not appear as enableable
- enabling should validate package metadata and compatibility, not execute the plugin runtime
- enable-time validation should cover package resolution, `codegraphy.type === "plugin"`, compatible `apiVersion`, declared disclosures, and readable options metadata when present
- runtime import/load failures should be reported during explicit Indexing
- this keeps plugin enablement metadata-safe and avoids executing arbitrary plugin code from a settings toggle
- `plugins enable` should not scan global npm installs
- if a globally installed plugin is not in CodeGraphy's Plugin Registry, `plugins enable` should fail with a helpful message telling the user to run `codegraphy plugins register <package>`
- this keeps plugin discovery and workspace settings mutation as separate command responsibilities

Plugin install behavior decision:

- `codegraphy plugins install <package>` is intentionally not part of the first command model
- plugin packages are installed through npm, then recorded in the user-level Plugin Registry through `codegraphy plugins register <package>`
- enablement stays explicit through `codegraphy plugins enable <package> [workspace]`
- this preserves the Obsidian-style distinction between available plugins and workspace-enabled plugins

Plugin list behavior decision:

- `codegraphy plugins list` should be workspace-aware by default when run inside or against a CodeGraphy Workspace
- list output should separate enabled plugins for the workspace from installed plugins that are disabled for that workspace
- enabled plugins should display in workspace array order
- output should make the distinction between user-level installed state and workspace-level enablement hard to miss
- useful future flags:
  - `--registered`: show the user-level Plugin Registry only
  - `--workspace`: show current workspace plugin enablement/config only
  - `--json`: structured output for MCP and automation

Workspace status decision:

- `codegraphy status [path]` should be the primary truth surface for CodeGraphy state in a workspace
- status should show:
  - Workspace Root
  - Indexed or Unindexed Workspace state
  - Graph Cache path
  - fresh, stale, or missing Graph Cache status
  - stale reason when available
  - enabled plugin count and names
  - enabled plugin compatibility problems when present
  - `@codegraphy-dev/core` version
  - Graph Cache schema version
  - last indexed time
  - file count and relationship count when cache exists
- status should recommend `codegraphy index` when the Graph Cache is missing or stale
- MCP status tools should return the same information in structured form

MCP tool model decision:

- MCP tools should follow the new CodeGraphy Workspace model directly
- MCP should not require `select_repo`, `list_repos`, or a prior active selection as the primary workflow
- MCP tools should default to the caller/current working directory when available
- MCP tools should accept an explicit optional `path`
- MCP should not focus or require a VS Code window for indexing/querying
- new MCP tool shapes should mirror CLI command semantics, for example:
  - `codegraphy_status(path?)`
  - `codegraphy_index(path?)`
  - `codegraphy_query(path?, query)`
  - `codegraphy_file_dependencies(path?, file)`
  - `codegraphy_plugins_enable(path?, plugin)`
- update MCP to the new model instead of preserving repo-selection as the primary mental model

Workspace root decision:

- no `init` workflow is part of the current design
- a CodeGraphy Workspace Root is exactly the folder the user indexes or explicitly passes to a command
- `codegraphy index packages/foo` makes `packages/foo` the CodeGraphy Workspace Root
- that workspace's settings and Graph Cache live under `packages/foo/.codegraphy/`
- CodeGraphy should not walk upward to a git root or infer a repository root for workspace identity
- `codegraphy index` with no path uses the current working directory as the CodeGraphy Workspace Root
- `codegraphy plugins enable <package>` with no path uses the current working directory as the CodeGraphy Workspace Root
- `codegraphy plugins enable <package> <path>` uses `<path>` as the CodeGraphy Workspace Root

Default plugin enablement decision:

- if a CodeGraphy Workspace has no `.codegraphy/settings.json`, no plugins are enabled for that workspace
- installed user-level plugins are available, not active
- absent workspace plugin entries mean disabled
- default Indexing runs core analysis only
- this keeps global plugin installation from changing behavior for random folders

Markdown bootstrap exception:

- Markdown should still be its own npm plugin package
- `@codegraphy-dev/core` installation should include/install `@codegraphy-dev/plugin-markdown`
- CodeGraphy should enable the Markdown plugin by default for new CodeGraphy Workspaces
- this gives a new CodeGraphy user one useful plugin-backed relationship source immediately
- other plugin packages remain disabled by default until explicitly enabled for a workspace
- Markdown can still be enabled or disabled like any other plugin; it is just installed and enabled by default
- if a workspace explicitly disables Markdown by removing it from the workspace `plugins` array, that workspace setting should win
- Markdown's default enablement should be represented as a core-provided default workspace setting, not as implicit absence behavior
- on first Indexing of a workspace with no settings file, core should materialize effective settings that enable `@codegraphy-dev/plugin-markdown`
- absent entries still mean disabled for normal plugins
- plugin order should be represented by the `plugins` array order, not by a numeric `order` field
- avoid a top-level `disabledPlugins` model; disabled plugin state is represented by absence from the `plugins` array
- `disabledFilterPatterns` is acceptable inside a plugin entry because plugin packages can contribute default filter patterns and the workspace needs a compact way to turn specific defaults off
- first materialized settings should look like:

```json
{
  "plugins": [
    {
      "package": "@codegraphy-dev/plugin-markdown"
    }
  ]
}
```

Plugin filter-pattern decision:

- plugin packages can define `defaultFilterPatterns`
- workspace plugin entries can define `disabledFilterPatterns` to turn off specific plugin-provided defaults
- user-created workspace filters should not live inside plugin entries
- custom workspace filters belong in a separate workspace-owned filter section
- this keeps plugin-owned ecosystem defaults separate from workspace-owned rules

Plugin options decision:

- plugin-specific settings should live under the plugin entry's `options` object
- CodeGraphy-owned plugin entry fields should stay reserved, such as `package` and `disabledFilterPatterns`
- plugin package `defaultOptions` should be copied into `options` when a plugin is enabled
- schema validation for options is deferred until a real plugin needs richer validation or generated UI metadata
- the VS Code extension should show plugin options as per-plugin configuration
- plugin options should only be visible when the plugin is enabled, or inside an Obsidian-style plugin details/settings view for that enabled plugin
- plugin options should not clutter global CodeGraphy settings surfaces

Plugin option update decision:

- plugin updates should not automatically rewrite existing workspace settings
- runtime should compute effective plugin options from plugin `defaultOptions` plus workspace entry `options`
- workspace entry `options` should win over `defaultOptions`
- if a plugin update adds a new default option, existing workspaces can use it at runtime without rewriting `.codegraphy/settings.json`
- settings files should change only when the user or an explicit command saves settings
- enabling a plugin is an intentional settings write, so CodeGraphy should copy that plugin package's current `defaultOptions` into the workspace entry at enable time
- later plugin updates merge new defaults at runtime but do not rewrite the workspace file until the user or an explicit command saves settings

Diagram:

- [CodeGraphy core package lifecycle Excalidraw](./2026-05-13-core-package-lifecycle.excalidraw)

## Architecture Sketch

```text
                 VS Code Marketplace
                         |
                         v
              codegraphy.codegraphy VSIX
                         |
                         v
       packages/extension imports @codegraphy-dev/core
                         |
                         v
                 @codegraphy-dev/core
          /             |              \
         v              v               v
 File Discovery   Plugin Analysis   Graph Query
 Tree-sitter      Graph Projection  Graph Cache
 Analysis         Cache read/write
         \              |               /
          v             v              v
           <workspace>/.codegraphy/graph.lbug
                         ^
                         |
              @codegraphy-dev/mcp and CLI
```

## Naming Corrections Needed

Replace or narrow these phrases where they are inaccurate:

- repo-local Graph Cache -> workspace-local Graph Cache
- repo -> CodeGraphy Workspace, unless Git behavior is required
- Core Extension owns Indexing -> `@codegraphy-dev/core` owns Indexing
- Core Extension owns Graph Query -> `@codegraphy-dev/core` owns Graph Query
- top-level `pluginOrder`, `disabledPlugins`, and `disabledPluginFilterPatterns` -> workspace-local `plugins` entries
- `@codegraphy-vscode/mcp` -> `@codegraphy-dev/mcp`
- `@codegraphy-vscode/plugin-api` -> `@codegraphy-dev/plugin-api`

Keep these terms:

- Relationship Graph
- Graph Cache
- Graph Query
- Graph Scope
- CodeGraphy Workspace
- Visible Graph

## Docs To Rewrite

- `CONTEXT.md`
  - define CodeGraphy Workspace
  - update Agent Access language
  - change Graph Cache definition from repo-local to workspace-local
  - replace Core Extension ownership language with core package ownership language
- `docs/MCP.md`
  - rewrite package roles around `@codegraphy-dev/core` and `@codegraphy-dev/mcp`
  - remove VS Code focus/open requirement from normal query/indexing flow
  - make explicit indexing tools call core directly
  - rename repo-centric tool language where appropriate
  - remove prior select/open requirements from normal command and tool flow
- `docs/PLUGINS.md`
  - describe language plugin npm packages
  - describe plugins as headless core analysis packages
  - make clear plugins communicate with `@codegraphy-dev/core`, not VS Code
  - update first-party plugin publishing story
- `docs/SETTINGS.md`
  - replace top-level plugin settings with the consolidated `plugins` section
  - describe workspace-local plugin enablement and configuration
- `docs/RELEASING.md`
  - update npm release targets and package names
  - retire first-party language VSIX release flow
- package READMEs
  - add new install and migration guidance for renamed packages

## Execution Sequence

Run the goal as a sequence of small PRs. Each step should leave the repo in a shippable state and preserve existing graph behavior unless the step explicitly changes the product model.

## Implementation Progress

- 2026-05-14: Draft PR opened from `codex/core-package-extraction` with this runbook as the tracking artifact.
- 2026-05-14: Step 1 package identity groundwork completed.
  - Added public `@codegraphy-dev/core` workspace package with build, lint, typecheck, test, package exports, README, and LICENSE.
  - Renamed public package metadata from `@codegraphy-vscode/plugin-api` to `@codegraphy-dev/plugin-api`.
  - Renamed public package metadata from `@codegraphy-vscode/mcp` to `@codegraphy-dev/mcp`.
  - Repointed workspace package dependencies and imports to `@codegraphy-dev/plugin-api`.
  - Updated release target discovery so `core` resolves to the npm `@codegraphy-dev/core` package and `extension` / `vsix` / `marketplace` resolves to the VSIX release.
  - Validation: `node --test tests/release/releaseScript.test.mjs`, `pnpm --filter @codegraphy-dev/core lint`, `pnpm --filter @codegraphy-dev/core test`, `pnpm --filter @codegraphy-dev/core build`, `pnpm run typecheck:plugins`, `pnpm --filter @codegraphy-dev/mcp test`, and targeted extension import-analysis tests.
- 2026-05-14: Step 2 core Graph Cache and Graph Query API completed.
  - Moved Graph Query execution into `@codegraphy-dev/core` and removed the duplicate extension-local Graph Query implementation.
  - Moved workspace Graph Cache path/status/storage contracts into `@codegraphy-dev/core`.
  - Moved LadybugDB Graph Cache unit coverage from the extension package to the core package.
  - Kept the VS Code extension as an adapter over `@codegraphy-dev/core` for Graph Query and Graph Cache storage.
  - Validation: `pnpm --filter @codegraphy-dev/core test`, `pnpm --filter @codegraphy-dev/core lint`, `pnpm --filter @codegraphy-dev/core build`, `pnpm --filter @codegraphy-dev/extension typecheck`, targeted extension Graph Query/agent bridge/public API tests, and targeted extension pipeline cache/lifecycle tests.
- 2026-05-14: Step 3 first slice completed: File Discovery moved into `@codegraphy-dev/core`.
  - Moved discovery contracts, path matching, gitignore loading, directory walking, and `FileDiscovery` into the core package.
  - Moved discovery unit coverage from the extension package to the core package.
  - Repointed VS Code pipeline and workspace watcher imports to `@codegraphy-dev/core`.
  - Validation: `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/discovery`, `pnpm --filter @codegraphy-dev/core test`, `pnpm --filter @codegraphy-dev/core lint`, `pnpm --filter @codegraphy-dev/core build`, `pnpm --filter @codegraphy-dev/extension typecheck`, `pnpm --filter @codegraphy-dev/extension lint`, targeted extension workspace-file and pipeline tests, and `pnpm run test:release`.
- 2026-05-14: Step 3 second slice completed: cache-aware File Analysis moved into `@codegraphy-dev/core`.
  - Moved workspace analysis abort handling, per-file analysis orchestration, symbol enrichment, target symbol resolution, and relationship projection helpers into the core package.
  - Moved File Analysis unit coverage from the extension package to the core package.
  - Kept the VS Code extension import surface as adapter exports over `@codegraphy-dev/core` so the remaining extension pipeline can migrate incrementally.
  - Validation: `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/analysis`, `pnpm --filter @codegraphy-dev/core typecheck`, `pnpm --filter @codegraphy-dev/core build`, `pnpm --filter @codegraphy-dev/extension typecheck`, and targeted extension pipeline tests.
- 2026-05-14: Step 3 third slice completed: Graph Projection moved into `@codegraphy-dev/core`.
  - Moved file/package/folder/symbol graph node and edge builders into the core package.
  - Moved graph projection unit coverage from the extension package to the core package.
  - Added core graph color and edge identity helpers so Relationship Graph construction no longer depends on extension shared modules.
  - Kept the VS Code extension graph import surface as adapter exports over `@codegraphy-dev/core`.
  - Validation: `pnpm --filter @codegraphy-dev/core typecheck`, `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/graph`, `pnpm --filter @codegraphy-dev/core build`, `pnpm --filter @codegraphy-dev/extension typecheck`, and targeted extension pipeline adapter/service tests.
- 2026-05-14: Step 3 fourth slice completed: workspace analysis orchestration moved into `@codegraphy-dev/core`.
  - Moved discovery filter merging, workspace analysis orchestration, plugin pre-analysis, file-analysis delegation, rebuild state, and analysis cache helpers into the core package.
  - Moved orchestration unit coverage from the extension package to the core package.
  - Kept VS Code-specific warning UI, workspace root lookup, and persistence wiring in extension adapters.
  - Validation: `pnpm --filter @codegraphy-dev/core typecheck`, targeted core workspace analysis tests, `pnpm --filter @codegraphy-dev/core build`, `pnpm --filter @codegraphy-dev/extension typecheck`, and targeted extension analysis/service tests.
- 2026-05-14: Step 3 fifth slice completed: Tree-sitter Analysis moved into `@codegraphy-dev/core`.
  - Moved the Tree-sitter plugin wrapper, parser runtime, language catalog, C# pre-analysis index, path host, and per-language analyzers into the core package.
  - Moved Tree-sitter runtime unit coverage from the extension package to the core package.
  - Added Tree-sitter parser packages to `@codegraphy-dev/core` dependencies while keeping VSIX vendoring in the extension build scripts.
  - Kept the VS Code extension Tree-sitter plugin and Git history path-host imports as adapter exports over `@codegraphy-dev/core`.
  - Validation: `pnpm --filter @codegraphy-dev/core typecheck`, `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/treeSitter`, `pnpm --filter @codegraphy-dev/core build`, and `pnpm --filter @codegraphy-dev/extension typecheck`.
- 2026-05-14: Step 3 sixth slice completed: headless plugin runtime and explicit workspace Indexing added to `@codegraphy-dev/core`.
  - Moved plugin routing, workspace analysis context, pre-analysis lifecycle hooks, file-change hooks, and file-analysis result merging into the core package.
  - Added a core-owned `CorePluginRegistry` for headless analysis plugins without VS Code/webview dependencies.
  - Added `indexCodeGraphyWorkspace(...)` so core can index exactly the requested CodeGraphy Workspace path and write `<workspace-root>/.codegraphy/graph.lbug`.
  - Kept the VS Code extension import surface as adapter exports over `@codegraphy-dev/core` for the moved headless plugin modules.
  - Validation: `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/indexing/workspace.test.ts`, `pnpm --filter @codegraphy-dev/core typecheck`, `pnpm --filter @codegraphy-dev/core lint`, `pnpm --filter @codegraphy-dev/core build`, and `pnpm --filter @codegraphy-dev/extension typecheck`.
- 2026-05-14: Step 4 first slice completed: core Workspace Settings and freshness status added.
  - Added core-owned Workspace Settings read/write/normalization for `<workspace-root>/.codegraphy/settings.json`, including ordered `plugins` entries with `package`, `disabledFilterPatterns`, and `options`.
  - Added workspace metadata, plugin/settings fingerprints, analysis-version fingerprints, and `readCodeGraphyWorkspaceStatus(...)` for fresh/stale/missing Graph Cache state.
  - Updated `indexCodeGraphyWorkspace(...)` to materialize Workspace Settings, use them for Indexing, and persist matching metadata after writing the Graph Cache.
  - Validation: `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/workspace/settings.test.ts tests/workspace/status.test.ts tests/indexing/workspace.test.ts`, `pnpm --filter @codegraphy-dev/core typecheck`, `pnpm --filter @codegraphy-dev/core lint`, and `pnpm --filter @codegraphy-dev/core build`.
- 2026-05-14: Step 5 first slice completed: Plugin Registry metadata cache and CLI plugin commands added.
  - Added core-owned parsing for `package.json#codegraphy` plugin metadata, including Plugin API compatibility, default options, and capability disclosures without importing runtime code.
  - Added user-level Plugin Registry helpers for `~/.codegraphy/plugins.json` plus the user settings path at `~/.codegraphy/settings.json`.
  - Added metadata-only Plugin Registry operations for `plugins register <package>` over explicitly named global packages with CodeGraphy plugin metadata.
  - Added workspace-local plugin enable/disable helpers that mutate only `<workspace-root>/.codegraphy/settings.json` and preserve plugin order as array order.
  - Added CLI commands for `codegraphy plugins register`, `link`, `list`, `enable`, and `disable`; enable fails from the Plugin Registry instead of scanning global npm roots.
  - Validation: `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/plugins/packageManifest.test.ts tests/plugins/installedCache.test.ts tests/workspace/settings.test.ts`, `pnpm --filter @codegraphy-dev/core test`, `pnpm --filter @codegraphy-dev/core typecheck`, `pnpm --filter @codegraphy-dev/core lint`, `pnpm --filter @codegraphy-dev/core build`, `pnpm --filter @codegraphy-dev/mcp exec vitest run --config vitest.config.ts tests/run/parse.test.ts tests/plugins/command.test.ts`, `pnpm --filter @codegraphy-dev/mcp test`, `pnpm --filter @codegraphy-dev/mcp typecheck`, `pnpm --filter @codegraphy-dev/mcp lint`, `pnpm --filter @codegraphy-dev/mcp build`, `pnpm --filter @codegraphy-dev/extension typecheck`, `pnpm run test:release`, and `git diff --check`.
- 2026-05-14: Step 6 completed: Markdown bootstrap added as an explicit plugin package and default workspace setting.
  - Made `@codegraphy-dev/plugin-markdown` a public npm workspace package with package exports, build output, publish metadata, and `package.json#codegraphy` metadata.
  - Added `@codegraphy-dev/plugin-markdown` as a dependency of `@codegraphy-dev/core` so core installs Markdown transitively.
  - Added first-workspace settings materialization so the first Indexing of a workspace with no settings file writes `plugins: [{ package: "@codegraphy-dev/plugin-markdown" }]`.
  - Registered the Markdown plugin from core only when the workspace settings include the Markdown package, so removing the entry disables Markdown for that workspace.
  - Validation: `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/workspace/settings.test.ts tests/indexing/workspace.test.ts`, `pnpm --filter @codegraphy-dev/core test`, `pnpm --filter @codegraphy-dev/plugin-markdown build`, `pnpm --filter @codegraphy-dev/plugin-markdown typecheck`, `pnpm --filter @codegraphy-dev/plugin-markdown lint`, `pnpm --filter @codegraphy-dev/plugin-markdown test`, `pnpm --filter @codegraphy-dev/core typecheck`, `pnpm --filter @codegraphy-dev/core lint`, `pnpm --filter @codegraphy-dev/core build`, `pnpm --filter @codegraphy-dev/extension typecheck`, `pnpm run test:release`, and `git diff --check`.

### Step 1: Package Identity Groundwork

Goal:

- establish the future package names and build targets before moving behavior

Changes:

- add `packages/core`
- name it `@codegraphy-dev/core`
- rename MCP package metadata to `@codegraphy-dev/mcp`
- rename Plugin API package metadata to `@codegraphy-dev/plugin-api`
- keep `@codegraphy-dev/extension` private as the workspace package for the VS Code extension
- keep the Marketplace extension id as `codegraphy.codegraphy`
- establish package exports, build scripts, typecheck scripts, and release discovery

Done when:

- workspace install/build/typecheck sees the new package names
- release/package discovery knows every public `@codegraphy/*` npm target
- no runtime behavior has moved yet

### Step 2: Core Graph Cache And Graph Query API

Goal:

- make `@codegraphy-dev/core` the owner of Graph Cache read/write contracts and Graph Query execution

Changes:

- move Graph Cache storage contracts into core
- move Graph Query execution into core
- expose core entrypoints for `status`, cache reads, and graph queries by CodeGraphy Workspace path
- keep VS Code extension and MCP as adapters over the new core entrypoints

Done when:

- existing graph query behavior passes through core
- querying a Graph Cache does not require VS Code APIs
- stale/missing cache status can be reported from core

### Step 3: Headless Indexing Pipeline Extraction

Goal:

- make `@codegraphy-dev/core` own the full Indexing pipeline

Changes:

- move File Discovery into core
- move Tree-sitter Analysis into core
- move Plugin Analysis orchestration into core
- move Graph Projection into core
- make core index exactly the requested CodeGraphy Workspace path
- do not infer git repo roots
- keep VS Code file watchers/save events as extension adapters that call core

Done when:

- `@codegraphy-dev/core` can index a plain folder without VS Code
- Graph Cache is written to `<workspace-root>/.codegraphy/graph.lbug`
- existing VS Code graph behavior still works through the extension adapter

### Step 4: Staleness And Workspace Settings Model

Goal:

- make workspace-local settings, cache freshness, and explicit indexing behavior stable before plugin packaging changes

Changes:

- implement workspace settings at `<workspace-root>/.codegraphy/settings.json`
- make enabled plugins an ordered `plugins` array
- preserve plugin entry fields such as `package`, `disabledFilterPatterns`, and `options`
- compute analysis fingerprints for Graph Cache freshness
- mark stale on relevant settings/plugin/core/schema changes
- never auto-index because cache is stale
- expose stale state through core status

Done when:

- status reports fresh, stale, or missing cache
- stale reasons are inspectable
- toggling settings marks stale but does not index
- VS Code can show a yellow stale indicator on or near the index button

### Step 5: Core Plugin Runtime And Installed Plugin Cache

Goal:

- move plugin discovery/loading/enablement into core as a headless analysis system

Changes:

- add user-level Plugin Registry at `~/.codegraphy/plugins.json`
- add user-level defaults at `~/.codegraphy/settings.json`
- implement `plugins register`, `plugins list`, `plugins enable`, and `plugins disable`
- keep install/discovery separate from enablement
- keep `plugins enable` from scanning global npm installs
- load plugin runtime only during explicit Indexing
- run the core-owned Tree-sitter plugin through the same plugin runtime before optional npm plugin packages
- keep plugin enrichment additive-only

Done when:

- installed plugins are available but not active
- workspace plugin enablement is stored only in workspace settings
- plugin order is array order
- plugin failures during Indexing are reported without corrupting settings

### Step 6: Markdown Bootstrap

Goal:

- give new CodeGraphy users one useful plugin-backed source while keeping Markdown as a real plugin package

Changes:

- publish/package Markdown as `@codegraphy-dev/plugin-markdown`
- make `@codegraphy-dev/core` install/include Markdown by default
- materialize first workspace settings with Markdown enabled:

```json
{
  "plugins": [
    {
      "package": "@codegraphy-dev/plugin-markdown"
    }
  ]
}
```

- allow users to disable Markdown by removing it from the workspace `plugins` array

Done when:

- first index in a new workspace enables Markdown by explicit settings
- Markdown can still be disabled like any other plugin
- other installed plugins remain disabled until explicitly enabled

### Step 7: Path-First CLI And MCP

Goal:

- remove the selected-repo/VS Code-focus workflow from agents and commands

Changes:

- make CLI commands default to `process.cwd()` or an explicit path
- update MCP tools to accept `path?`
- replace selected-repo workflow with path-first CodeGraphy Workspace tools
- add MCP status/index/query tools backed by core
- make MCP plugin tools mirror `codegraphy plugins register/list/enable/disable`
- make MCP query tools report stale/missing cache instead of silently indexing
- remove normal VS Code focus/open behavior from MCP query and indexing paths

Done when:

- `codegraphy index` indexes the current folder
- `codegraphy index /path/to/folder` indexes the explicit folder
- MCP can status/index/query a workspace path without prior select/open
- MCP can perform plugin registration and workspace enablement through tool calls that match the CLI command behavior
- MCP calls do not focus VS Code

Implementation progress:

- Added core-backed path resolution, status, indexing, and Graph Query helpers under `@codegraphy-dev/mcp`.
- Changed `codegraphy index [workspace]` to index the current folder or explicit CodeGraphy Workspace path through `@codegraphy-dev/core`.
- Added `codegraphy status [workspace]` with JSON workspace status, stale reasons, and enabled plugin package names.
- Replaced normal MCP open/index-repo tools with path-first `codegraphy_status`, `codegraphy_index`, and query tools that accept optional `path`.
- Confirmed MCP query tools can report a missing Graph Cache without opening or focusing VS Code.
- Updated `CONTEXT.md`, `docs/MCP.md`, and the MCP package README to describe the path-first core-backed model.

Validation:

- `pnpm --filter @codegraphy-dev/mcp exec vitest run --config vitest.config.ts tests/run/parse.test.ts tests/index/command.test.ts tests/status/command.test.ts tests/mcp/server.test.ts`
- `pnpm --filter @codegraphy-dev/mcp exec vitest run --config vitest.config.ts tests/workspace/coreBacked.test.ts`
- `pnpm --filter @codegraphy-dev/mcp test`
- `pnpm --filter @codegraphy-dev/mcp typecheck`
- `pnpm --filter @codegraphy-dev/mcp lint`
- `pnpm --filter @codegraphy-dev/mcp build`
- `pnpm --filter @codegraphy-dev/plugin-markdown build`
- `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/workspace/status.test.ts tests/indexing/workspace.test.ts`
- `pnpm --filter @codegraphy-dev/core typecheck`
- `pnpm --filter @codegraphy-dev/core lint`
- `pnpm --filter @codegraphy-dev/core build`
- `pnpm --filter @codegraphy-dev/extension typecheck`
- `pnpm run test:release`
- `git diff --check`

### Step 8: VS Code Extension Adapter And VSIX Packaging

Goal:

- keep the extension focused on visualization and VS Code integration

Changes:

- make the extension import/use `@codegraphy-dev/core`
- keep VS Code lifecycle, commands, webviews, context menus, and editor integration inside the extension
- remove plugin-to-VS-Code communication from the plugin API
- render plugin toggles/options from core workspace state
- show stale status near the index action
- bundle core and required runtime assets into the VSIX

Done when:

- clean VSIX install works without running npm manually
- the extension can index/query/render through core
- plugins do not know about VS Code

Implementation progress:

- Kept `@codegraphy-dev/core` as an npm dependency of `@codegraphy-dev/extension`, not a VS Code `extensionDependencies` entry.
- Split the extension build external list into an explicit package contract so `@codegraphy-dev/core` and the Markdown plugin bundle into `dist/extension.js`, while native/runtime packages remain external and vendored into `dist/node_modules`.
- Routed the VS Code extension's index-status adapter through `readCodeGraphyWorkspaceStatus(...)` so the extension and MCP report fresh/stale/missing Graph Cache state from the same core status model.
- Persisted extension indexing metadata through core workspace metadata persistence so analysis-version and pending-change state stay compatible with MCP/CLI status.
- Preserved VS Code lifecycle, webview, editor commands, graph rendering, and stale-dot presentation in the extension adapter.
- Converted the package-facing architecture diagram reference from SVG to PNG so VSCE packaging accepts the README.

Validation:

- `pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/build/runtimePackages.test.ts`
- `pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/pipeline/service/cache/index.test.ts tests/extension/pipeline/lifecycle.test.ts tests/extension/pipeline/service/base/internal.test.ts tests/extension/build/runtimePackages.test.ts`
- `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/workspace/status.test.ts`
- `pnpm --filter @codegraphy-dev/core build`
- `pnpm --filter @codegraphy-dev/core typecheck`
- `pnpm --filter @codegraphy-dev/extension typecheck`
- `pnpm --filter @codegraphy-dev/core lint`
- `pnpm --filter @codegraphy-dev/extension lint`
- `pnpm --filter @codegraphy-dev/extension build:extension`
- `pnpm run test:release`
- `pnpm run package:vsix`
- `git diff --check`

### Step 9: First-Party Plugin Package Migration

Goal:

- move first-party language plugins out of the VS Code Marketplace extension model and into npm packages

Changes:

- package TypeScript, Python, C#, and Godot under `@codegraphy-dev/plugin-*`
- keep Markdown on the bootstrap plugin path from Step 6
- remove first-party language plugins from the normal VSIX release path
- add `codegraphy` package metadata with `type`, `apiVersion`, optional disclosures, and inline `defaultOptions`
- preserve default filters, Node Types, Edge Types, file colors, and relationship behavior

Done when:

- first-party plugin packages install through npm
- `plugins register` discovers them
- workspace enablement controls them
- existing graph output is preserved for enabled plugins

Implementation progress:

- Renamed the TypeScript, Python, C#, and Godot package manifests to `@codegraphy-dev/plugin-typescript` and `@codegraphy-dev/plugin-godot`.
- Converted those language plugins from VS Code companion extensions to headless npm plugin packages with `type: "module"`, `dist/plugin.js` exports, declaration output, public publish metadata, and `package.json#codegraphy` metadata.
- Removed the language-plugin VS Code activation entrypoints, VSCE publish/package scripts, and `extensionDependencies`.
- Kept plugin runtime behavior in the existing `src/plugin.ts` entrypoints and preserved plugin unit coverage, including Godot relationship/symbol analysis tests.
- Updated release discovery/tests so first-party language plugins publish as npm packages before the VS Code extension instead of as normal VSIX release targets.
- Updated plugin docs, release docs, package READMEs, and package changesets to describe global npm installation, Plugin Registry registration, workspace enablement, and path-first Indexing.

Validation:

- `pnpm --filter @codegraphy-dev/plugin-typescript test`
- `pnpm --filter @codegraphy-dev/plugin-godot test`
- `pnpm run typecheck:plugins`
- `pnpm --filter @codegraphy-dev/plugin-typescript lint`
- `pnpm --filter @codegraphy-dev/plugin-godot lint`
- `pnpm --filter @codegraphy-dev/plugin-typescript build`
- `pnpm --filter @codegraphy-dev/plugin-godot build`
- `pnpm --filter @codegraphy-dev/core exec vitest run --config vitest.config.ts tests/plugins/packageManifest.test.ts tests/plugins/installedCache.test.ts tests/workspace/settings.test.ts`
- `pnpm --filter @codegraphy-dev/mcp exec vitest run --config vitest.config.ts tests/plugins/command.test.ts tests/run/parse.test.ts`
- `pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/pluginIntegration/installed/activation.test.ts tests/extension/pluginIntegration/installed/statuses.test.ts tests/extension/pluginActivation/installed.test.ts`
- `pnpm --filter @codegraphy-dev/extension typecheck`
- `pnpm run test:release`
- `pnpm run release:package plugin-typescript`
- `pnpm run release:package plugin-godot`
- `git diff --check`

### Step 10: Godot Structured Analysis Showcase

Goal:

- demonstrate Plugin Structured Analysis with the Godot plugin

Changes:

- keep `@codegraphy-dev/plugin-godot` as one package
- replace most GDScript line scanning with parser-backed extraction
- keep Plugin Text Analysis fallbacks where parser support is incomplete
- move `.tscn`, `.tres`, and `project.godot` parsing toward structured resource parsing where practical
- preserve existing relationship output first
- add deeper Godot relationships only after parity is stable

Done when:

- Godot plugin output matches previous behavior first
- parser-backed internals reduce plugin line-scanning responsibility
- no Godot LSP/external-process dependency is required in the first structured rewrite

Implementation progress:

- Added `@gdquest/lezer-gdscript` as the plugin-owned GDScript parser dependency.
- Added `@fernforestgames/godot-resource-parser` as the plugin-owned Godot `.tscn` / `.tres` parser dependency.
- Added a parser-backed GDScript syntax adapter that preserves source ranges and line numbers for relationship and Symbol Node extraction.
- Routed GDScript `preload(...)`, `load(...)`, `ResourceLoader.load(...)`, and `class_name` extraction through the GDScript parser before falling back to existing text extractors for parser gaps.
- Routed `.tscn` and `.tres` `ext_resource` extraction and resource-UID registration through the Godot resource parser before falling back to text-resource parsing for unsupported syntax.
- Kept `project.godot` settings on the lightweight text parser because the selected Godot resource parser targets scene/resource files, not project settings.
- Split Godot parsing, path resolution, and plugin orchestration into feature modules so the structured analyzer stays under the mutation-site threshold.
- Kept relationship and Symbol Node output compatible while improving inline-comment handling and bare `uid=` support.
- Avoided Godot LSP, external processes, local network dependencies, and plugin-to-VS-Code communication.

Validation:

- `pnpm --filter @codegraphy-dev/plugin-godot test`
- `pnpm --filter @codegraphy-dev/plugin-godot typecheck`
- `pnpm --filter @codegraphy-dev/plugin-godot lint`
- `pnpm --filter @codegraphy-dev/plugin-godot build`
- `pnpm run boundaries -- plugin-godot --strict`
- `pnpm run crap -- plugin-godot`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/gdscript/className.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/gdscript/classNameLine.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/gdscript/resourceLoadStatements.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/gdscript/resourceLoadSyntax.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/gdscript/resources.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/gdscript/stringLiteral.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/gdscript/syntaxTree.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/textResource/resourceAst.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/projectRoot/collection.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/projectRoot/resolve.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/sources/ext-resource.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/plugin/metadata.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/plugin/symbol/className.ts`
- `pnpm run mutate -- --mutate packages/plugin-godot/src/plugin/symbol/extract.ts`
- `pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/extension/packageIcons.test.ts tests/integration/pluginActivationEvents.test.ts tests/extension/pipeline/adapters.test.ts tests/extension/pipeline/analysis/delegates.test.ts`
- `pnpm --filter @codegraphy-dev/extension typecheck`
- `pnpm --dir ../quality-tools --filter @poleski/quality-tools exec vitest run tests/crap/coverage/profileFactories.test.ts tests/crap/coverage/profiles.test.ts tests/crap/command.test.ts`
- `pnpm --dir ../quality-tools --filter @poleski/quality-tools typecheck`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `git diff --check`

### Step 11: Docs, Changesets, Migration Notes

Goal:

- make the new model teachable and releasable

Changes:

- update `CONTEXT.md`, `docs/MCP.md`, `docs/PLUGINS.md`, `docs/SETTINGS.md`, and `docs/RELEASING.md`
- update package READMEs
- add changesets for public package renames and plugin publishing changes
- document migration from old `@codegraphy-vscode/*` names
- document recommended `.gitignore` entries for generated Graph Cache

Done when:

- docs use CodeGraphy Workspace, Graph Cache, and Graph Query consistently
- release notes explain the package split
- users can follow install, plugin enablement, index, status, and MCP workflows

Implementation progress:

- Updated `CONTEXT.md`, `README.md`, `docs/MCP.md`, `docs/PLUGINS.md`, `docs/SETTINGS.md`, `docs/RELEASING.md`, `docs/INTERACTIONS.md`, and `docs/TIMELINE.md` to use CodeGraphy Workspace, workspace-local Graph Cache, `@codegraphy-dev/core`, and path-first MCP/CLI language.
- Added a package-name migration note for `@codegraphy-vscode/plugin-api` -> `@codegraphy-dev/plugin-api` and `@codegraphy-vscode/mcp` -> `@codegraphy-dev/mcp`.
- Documented recommended `.gitignore` entries for generated Graph Cache output while leaving workspace settings commit-friendly.
- Updated VS Code toolbar and index-status copy from repo-centric labels to workspace-centric labels.
- Confirmed changesets cover the public package split, Markdown bootstrap, path-first MCP, extension/core packaging, first-party plugin npm packages, and Godot structured parsing.

Validation:

- `rg "core extension|Core Extension|Plugin Extension|repo-local|repo-locally|@codegraphy-vscode|extensionDependencies|pluginOrder|disabledPlugins|disabledPluginFilterPatterns|Index Repo|Re-index Repo|Reindex Repo|Indexing Repo|Index the repo|Reindex the repo|repository into" README.md CONTEXT.md docs/MCP.md docs/PLUGINS.md docs/SETTINGS.md docs/RELEASING.md docs/INTERACTIONS.md docs/TIMELINE.md packages/*/README.md -n`
- `rg "Index Repo|Re-index Repo|Reindex Repo|Indexing Repo|Index the repo|Reindex the repo|repo now has a commit" packages/extension/src packages/extension/tests -n`
- `pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/webview/toolbar/actions/refresh.test.ts tests/webview/toolbar/actions/indexAction.test.tsx tests/webview/toolbar/actions/view.test.tsx tests/webview/Toolbar.test.tsx tests/webview/graphIndexStatus/view.test.tsx tests/extension/graphView/analysis/execution/progress.test.ts tests/extension/graphView/analysis/execution/publish.test.ts tests/extension/repoSettings/freshness/details.test.ts tests/extension/repoSettings/freshness/index.test.ts tests/extension/pipeline/service/discoveryFacade.test.ts`

## Validation Ideas

- Index a folder that is not a Git repo through `@codegraphy-dev/core`.
- Index the same CodeGraphy Workspace through VS Code and through MCP, then confirm both produce/read the same Graph Cache path.
- Run `codegraphy index` from a plain folder and confirm it indexes `process.cwd()`.
- Run `codegraphy index /tmp/example-folder` and confirm it indexes the explicit path.
- Run MCP Indexing and Graph Query tools with an explicit CodeGraphy Workspace path without a prior select/open tool call.
- Run MCP queries without focusing or opening VS Code.
- Package a VSIX and install it into a clean Extension Development Host without running npm.
- Confirm first-party language plugin behavior still appears in the VS Code Graph View after removing separate language VSIX dependencies.
- Confirm release automation packages every public `@codegraphy/*` npm package.

## Open Questions

- Should third-party analysis plugins be resolved from npm package names, local paths, or both?
- What compatibility window, if any, should exist for old `@codegraphy-vscode/*` npm package names?
