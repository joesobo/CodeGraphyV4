# SQLite Graph Cache, Intelligent Indexing, And Agent CLI

## Status

Proposed for review. This plan replaces the earlier MCP upgrade direction.

## Goal

Build the simplest dependable CodeGraphy foundation for local coding agents:

- replace LadybugDB with SQLite behind the existing Core storage contracts;
- make `codegraphy index` intelligently update only invalidated cached analysis
  when safe;
- expose Graph Query through small, bounded Core CLI commands;
- publish one Agent Skills-compatible `codegraphy` skill for global or
  workspace installation;
- delete the MCP package and MCP-specific product surface.

The VS Code Extension, CLI, and Agent Skill all consume the same Core engine and
workspace-local Graph Cache.

## Product Workflow

### Agent

```text
enter workspace
  -> run codegraphy index
  -> query the Graph Cache through top-level codegraphy report commands
  -> edit files
  -> run codegraphy index again when cached knowledge may have changed
  -> continue querying
```

The agent uses its task context to decide when Indexing is needed. Frequent
Indexing must be cheap because Core reconciles the workspace against SQLite and
updates only the invalidated analysis set when safe.

### VS Code Extension

```text
first use
  -> explicit Indexing creates graph.sqlite

saved file or relevant configuration event
  -> extension passes the change to Core
  -> Core applies the fastest correct incremental update
  -> extension updates the Graph Cache and Visible Graph
```

The extension does not shell out to the CLI and does not run a full rebuild for
ordinary saved-file changes.

### Human CLI Use

Humans can run the same Indexing and Graph Query commands without installing an
agent integration.

## Settled Decisions

### 1. SQLite Is A Storage-Package Swap

SQLite replaces LadybugDB as the only Graph Cache persistence engine. Preserve
the existing Core storage API, in-memory Graph Query, Graph Scope, filtering,
traversal, graph projection, and Visible Graph behavior.

The canonical cache path becomes:

```text
<workspace-root>/.codegraphy/graph.sqlite
```

Existing `graph.lbug` files are rebuildable cache artifacts. The first Indexing
run creates `graph.sqlite`; do not keep a permanent dual-reader path.

Core and the extension use `libsql` 0.5.29 for the local SQLite-compatible
binding. Its synchronous API preserves the existing storage contract, while
its platform packages use Node-API so the VSIX is not tied to the V8 ABI of the
Node process that assembled it. Do not use a V8-ABI-specific binding in the
extension package.

### 2. Index Is The Single Make-Current Operation

`codegraphy index [workspace]` always means “make this CodeGraphy Workspace's
Graph Cache current.” Core chooses the implementation:

- missing, legacy, corrupt, interrupted, or incompatible cache: full Indexing;
- existing compatible cache: reconcile the workspace and update only the safe
  invalidation set;
- unsafe or unbounded invalidation: fall back to full Indexing.

The caller never chooses full versus incremental behavior.

### 3. No Normal Staleness Workflow

Core may retain changed paths, signatures, and invalidation reasons internally,
but agents do not manage a public stale-cache state machine.

The Agent Skill teaches the agent to run Indexing before trusting cached
knowledge and after relevant workspace changes. `codegraphy index` makes that
safe and inexpensive.

`codegraphy status` may remain for humans and diagnostics, but it is not part of
the normal Agent Skill workflow and its internal stale detail should not be
placed into normal agent context.

### 4. CLI And Skill Replace MCP

Delete `@codegraphy-dev/mcp` and all MCP-specific adapters, documentation,
tests, configuration, skills, and release wiring. Do not retain a deprecated
parallel package in the monorepo.

Graph Query remains a public Core API, so a future protocol adapter can be built
again if an actual no-shell, remote, or shared-server use case justifies it.

### 5. The Skill Is Generalized And Distributed

Rename the repo skill from `codegraphy-mcp` to `codegraphy`. It follows the
Agent Skills format and assumes only:

- the agent can run shell commands;
- the `codegraphy` CLI is installed;
- the workspace is accessible locally.

It must not mention Codex-specific tools, MCP tool names, or VS Code focus.

## Current Implementation Evidence

Core CLI already publishes:

```text
codegraphy setup
codegraphy status [workspace]
codegraphy index [workspace]
codegraphy plugins <register|link|list|enable|disable>
```

These commands already use JSON stdout and send Indexing progress to stderr.

Core already contains:

- persisted per-file analysis records with mtimes and sizes;
- cache hit/miss behavior during file analysis;
- a long-lived workspace engine with `applyChangedFiles`;
- changed-file and plugin invalidation logic;
- targeted Graph Cache row patching;
- full-index fallback when incremental refresh is unsafe.

However, the short-lived CLI Indexing path initializes an empty in-memory cache
instead of loading the persisted Graph Cache. It therefore cannot reuse cached
analysis across CLI processes yet.

Core Graph Query APIs already support node, edge, Relationship, symbol, and path
reports. The CLI does not currently expose them.

## Intelligent CLI Indexing

### Reconciliation

On `codegraphy index [workspace]`:

1. Resolve settings and enabled Plugins.
2. Open the existing SQLite Graph Cache when compatible.
3. Discover current workspace files using existing include, ignore, and maximum
   file rules.
4. Compare discovered files with cached records.
5. Classify added, changed, deleted, and reusable files.
6. Expand invalidation through Core and Plugin Analysis requirements.
7. Reanalyze only invalidated files when safe.
8. Patch affected file, symbol, and Relationship rows transactionally.
9. Rebuild the in-memory Relationship Graph through existing Core projection.
10. Persist current metadata and report counts.

### File Change Detection

Use cached path, mtime, and size for the cheap first pass. Define a content-hash
fallback for ambiguous metadata and for environments where timestamp precision
cannot safely distinguish changes.

Discovery must still inspect the workspace file set to detect additions and
deletions. The goal is to avoid reparsing unchanged files, not to avoid all
filesystem enumeration.

### Invalidation

A changed file may invalidate more than its own row. Core must account for:

- removed or renamed files;
- imports and resolution targets;
- project-aware configuration such as `tsconfig`;
- Plugin `notifyFilesChanged` results and additional file requests;
- Plugin pre-analysis indexes;
- settings, plugin, and analysis-version changes;
- symbol declarations and Relationship evidence owned by the changed file.

Use the existing full-refresh fallback whenever the invalidation closure cannot
be proven safe.

### Output

Successful Indexing returns compact JSON on stdout:

```json
{
  "workspaceRoot": "/workspace",
  "mode": "incremental",
  "discoveredFiles": 2555,
  "analyzedFiles": 1,
  "reusedFiles": 2554,
  "deletedFiles": 0
}
```

Progress and verbose diagnostics go to stderr. The agent does not need internal
invalidation reasons in normal output.

## Graph Query CLI

The final CLI cleanup also adds strict unknown/extra-argument errors,
command-scoped help, `--version`, compact status JSON, and concise Indexing
progress. Indexing keeps one automatic `codegraphy index [workspace]` contract;
there are no public full/incremental mode flags.

### Command Shape

Expose the existing Graph Query reports as concise top-level commands:

```text
codegraphy nodes [workspace]
codegraphy edges [workspace]
codegraphy relationships [workspace]
codegraphy symbols [workspace]
codegraphy paths [workspace]
```

The workspace remains an optional positional path, matching existing CLI
commands. Omission means the exact current working directory.

### Narrow Inputs

Start with report-specific flags rather than a generic filter language:

```text
codegraphy nodes --search executeGraphQuery --limit 20

codegraphy edges \
  --from packages/core/src/graphQuery/execute.ts \
  --type call \
  --limit 100

codegraphy relationships \
  --from packages/core/src/graphQuery/execute.ts \
  --to packages/core/src/graphQuery/reports.ts

codegraphy symbols \
  --file packages/core/src/graphQuery/execute.ts \
  --search executeGraphQuery

codegraphy paths \
  --from packages/core/src/cli/query/command.ts \
  --to packages/core/src/graphQuery/reports.ts \
  --depth 4 \
  --limit 10
```

### Output Contract

- JSON is the canonical output; no `--json` flag is required.
- stdout contains exactly one JSON result.
- progress, warnings, and diagnostics go to stderr.
- invalid flags and ambiguous paths fail nonzero instead of broadening a query.
- default and maximum limits are bounded.
- results include workspace-relative `file:line` locations where source ranges
  exist.
- deterministic ordering makes results reproducible.
- broken-pipe output is handled without turning a successful query into a
  failure when an agent intentionally truncates it.

### Lessons From Graphify

Adopt:

- a small set of memorable query verbs;
- bounded output designed for agent context;
- paths as an explicit first-class operation;
- source locations with results;
- provenance that distinguishes parsed/plugin-resolved evidence when useful;
- incremental update as the normal repeated workflow.

Defer:

- natural-language graph questions;
- inferred/model-generated relationships;
- communities, centrality, PR dashboards, and work memory;
- MCP and HTTP servers;
- token-budget estimation beyond hard result limits;
- `explain` until its exact output is grounded in existing Core facts.

## Agent Skill

### Canonical Source

```text
skills/codegraphy/SKILL.md
skills/codegraphy/agents/openai.yaml
```

Keep `SKILL.md` concise. It teaches:

1. Use CodeGraphy first for repository structure, Relationship, symbol, and
   bounded path questions.
2. Run `codegraphy index` before trusting cached knowledge when entering a
   workspace or after relevant changes.
3. Prefer the narrowest top-level graph report command.
4. Use bounded limits.
5. Read source after CodeGraphy identifies the relevant files/symbols; the Graph
   Cache is structure memory, not a replacement for implementation details.
6. If the CLI is missing, install the current Core package globally or use the
   documented `npx` prefix. Report the supported Node/npm prerequisite when
   installation cannot proceed.

### Installation

The open Skills CLI accepts GitHub repository sources, so publish the skill from
a dedicated public `codegraphy/skills` repository. This follows the same source
shape as `mattpocock/skills` and gives CodeGraphy a short, ecosystem-native
install command without requiring registry alias support.

Post-publication canonical installation:

```bash
# workspace installation
npx skills@latest add codegraphy/skills

# global installation
npx skills@latest add codegraphy/skills --global
```

The installer detects supported agents and can target one explicitly with
`--agent`.

During development, validate the in-monorepo canonical source before it is
published to the dedicated repository:

```bash
npx skills@latest add ./skills/codegraphy
```

The CodeGraphy monorepo owns the canonical skill source until the release
process publishes or synchronizes it to `codegraphy/skills`. Do not build an
agent-directory copier into Core; use the Agent Skills ecosystem as the
installation abstraction.

The public repository does not exist at implementation time. Creating it,
synchronizing this canonical source, and smoke-testing the GitHub install are
explicit release prerequisites; documentation must not claim the remote
command is live before those steps complete.

## Delete MCP

Remove in the implementation PR:

- `packages/mcp/`;
- `@codegraphy-dev/mcp` workspace and lockfile entries;
- MCP package build, test, release, and changeset configuration;
- MCP sections from root, Core, extension, and plugin documentation;
- `docs/MCP.md`;
- MCP-only tests, examples, skills, and configuration;
- `skills/codegraphy-mcp/` after its useful guidance moves to
  `skills/codegraphy/`;
- MCP terminology from the current domain glossary;
- published-package recommendations and badges.

Delete the source package and repository wiring before the SQLite integration
work, so the migration does not spend effort updating an adapter that has no
future in this design. The published npm package is deprecated only when the
replacement CLI and Agent Skill ship.

At release time, deprecate the published npm package with a short pointer to the
Core CLI and Agent Skill. Package deprecation is a release operation, not a
reason to keep dead source in the monorepo.

## Work Plan

### Phase 0: Contract Fixtures

1. Capture storage parity fixtures for files, symbols, Relationships, metadata,
   and representative Graph Query results.
2. Add CLI parsing contracts for the five query reports and narrow flags.
3. Define compact Indexing and query JSON schemas and exit codes.
4. Record baseline full and one-file Indexing timings for representative small
   and monorepo workspaces.

### Phase 1: Select And Package SQLite

1. Use `libsql` 0.5.29 and verify its Node-API platform packages on the Core
   CLI's supported Node 20 and 22 releases and the supported VSIX platforms.
2. Verify npm, VSIX, Core CLI, transactions, WAL, foreign keys, and integrity
   checks.
3. Record the binding choice in an ADR.

### Phase 2: Delete MCP Source

1. Move reusable agent guidance from `skills/codegraphy-mcp` into the planned
   generalized skill source.
2. Delete `packages/mcp`, MCP-only tests, configuration, documentation, and
   workspace/release wiring.
3. Remove current-domain MCP terminology and obsolete package recommendations.
4. Keep Graph Query APIs in Core and verify their non-MCP consumers remain
   represented by contract fixtures.

### Phase 3: Replace LadybugDB

1. Add SQLite connection, transaction, migration, and integrity modules.
2. Port full save/load behavior behind the existing storage API.
3. Port incremental patch behavior.
4. Port symbol and Relationship snapshot reads.
5. Change the cache path to `graph.sqlite`.
6. Detect `graph.lbug` as a legacy rebuild condition.
7. Remove Ladybug code, dependencies, vendoring, and tests.
8. Prove storage and Graph Query parity.

### Phase 4: Make CLI Indexing Intelligent

1. Load compatible persisted cache data into a short-lived Indexing engine.
2. Reconcile discovered and cached files.
3. Reuse existing cache-hit analysis for unchanged files.
4. Apply changed/deleted/plugin invalidation.
5. Patch only affected SQLite facts when safe.
6. Preserve full Indexing fallback.
7. Return compact mode and file-count results.

### Phase 5: Add Graph Query CLI

1. Add `query` parsing and help.
2. Add nodes, edges, Relationships, symbols, and paths subcommands.
3. Route commands directly to Core Graph Query APIs.
4. Add strict report-specific flags and bounded output.
5. Add source locations and evidence already present in Core facts.
6. Prove invalid narrow inputs never become broad queries.

### Phase 6: Publish The Agent Skill

1. Rename and rewrite the skill as `skills/codegraphy`.
2. Remove all MCP and client-specific language.
3. Validate Agent Skills metadata.
4. Exercise global and workspace installs through the Skills CLI.
5. Publish or synchronize the canonical source to `codegraphy/skills`.
6. Smoke-test `npx skills@latest add codegraphy/skills` from a clean workspace.
7. Promote that command from post-publication guidance to the live default.

### Phase 7: Release

1. Confirm architecture/domain docs make CLI plus Agent Skill the agent
   interface.
2. Keep Graph Cache, incremental Indexing/plugin contract, and Graph Query CLI
   changes in separate user-focused changesets.
3. Publish npm packages before the platform-specific extension releases.
4. Publish and smoke-test `codegraphy/skills`.
5. Deprecate `@codegraphy-dev/mcp` on npm with migration guidance after the
   replacement CLI and skill are live.

## Quality Gates For Implementation

- storage parity tests;
- red/green tests for one-file, added-file, deleted-file, plugin-expanded, and
  full-fallback Indexing;
- CLI parse and execution tests;
- clean global Core CLI installation on supported Node/platform matrix;
- VSIX clean-install and saved-file incremental update coverage;
- Agent Skill validation and install smoke checks;
- full repo lint, typecheck, build, unit, acceptance, complexity, and targeted
  mutation gates required by repository policy.

## Deferred Capabilities Lost With MCP

Removing MCP means CodeGraphy will not initially support:

- agents without shell access;
- MCP-native tool discovery and JSON Schema validation;
- per-tool client permission UI;
- protocol cancellation/progress notifications;
- a persistent process that amortizes Node and database startup;
- shared Streamable HTTP or remote graph access;
- MCP resources and automatic tool routing.

For local coding agents with shell access, the Agent Skill, strict CLI parsing,
JSON stdout, stderr diagnostics, and bounded outputs cover the intended MVP.
Graph Query remains in Core so a future thin protocol adapter can be added
without restoring MCP-owned storage or analysis behavior.

## Remaining Review Questions

1. Which example workspace should be the canonical one-file incremental
   performance fixture?

The accepted initial query surface remains under the single `query` group with
plural report names. Agent-facing JSON is compact by default to minimize output
tokens; a human-readable formatting option can be added without changing the
machine contract.

## Exit Criteria

- no production or repository path depends on LadybugDB;
- no MCP package or MCP-specific product documentation remains;
- extension and CLI share one SQLite Graph Cache;
- repeated `codegraphy index` reuses unchanged analysis and patches safe
  invalidations;
- Core CLI exposes all current Graph Query reports with strict bounded JSON;
- the generalized CodeGraphy Agent Skill installs globally and per workspace
  through the open Skills CLI;
- the skill consistently drives agents through Indexing, narrow Graph Query,
  and focused source reads;
- full repository quality and distribution gates pass.
