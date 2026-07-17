# Agent-Facing CLI Conventions

## Question

Which established command-line conventions would make CodeGraphy reliable for agents without turning its small `index -> filter/scope -> query` interface into a generic query language?

## Standards Baseline

- POSIX Utility Syntax Guideline 10 reserves `--` as the end-of-options delimiter, so operands that begin with `-` remain representable. POSIX also expects invalid options and missing option arguments to produce a diagnostic on standard error and a nonzero status. [POSIX Utility Syntax Guidelines](https://pubs.opengroup.org/onlinepubs/9699919799.orig/basedefs/V1_chap12.html#tag_12_02), [POSIX utility introduction](https://pubs.opengroup.org/onlinepubs/9699919799.2016edition/utilities/V3_chap01.html)
- GNU's command-line standards recommend consistent long option names and require `--help` and `--version`. `--help` should print brief invocation documentation to standard output and succeed without performing the command's normal work. [GNU command-line interfaces](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html), [GNU `--help`](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html)
- Cobra's official flag guidance says cross-cutting options should be global only when they truly apply throughout the command tree, while behavior-specific options should remain local. It also recommends validating option relationships before execution. [Cobra flag guidance](https://cobra.dev/docs/how-to-guides/working-with-flags/)
- GitHub CLI documents `0` for success and nonzero statuses for distinct failure classes, puts verbose diagnostics on standard error, supports disabling prompts for automation, and exposes bounded list size through a conventional `--limit` option. [GitHub CLI exit codes](https://cli.github.com/manual/gh_help_exit-codes), [GitHub CLI environment](https://cli.github.com/manual/gh_help_environment), [GitHub CLI search command](https://cli.github.com/manual/gh_search_code)
- JSON is an unordered structured interchange format. Consumers must parse fields rather than depend on object-member order. A newline after one JSON document is valid insignificant whitespace. [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html)
- Node recommends assigning `process.exitCode` and allowing a graceful exit instead of calling `process.exit()`, because forced exit can truncate pending standard output or standard error writes. [Node.js process documentation](https://nodejs.org/api/process.html#processexitcode)

## What CodeGraphy Already Gets Right

- `packages/core/src/cli/help/command.ts` provides root and command-level help with purpose, arguments, effects, output, and examples.
- `packages/core/src/cli/run.ts` keeps successful data on stdout, failures on stderr, and uses nonzero statuses. `--verbose` diagnostics also stay on stderr, so JSON data is not mixed with logs.
- `packages/core/src/cli/main.ts` assigns `process.exitCode`; it does not force a potentially truncating exit.
- `-C, --workspace` and `--verbose` are genuinely global. The settings and query vocabulary stays positional and intentionally small.
- Data results use one JSON document and a common success/failure envelope. Help and version remain plain text.

## Add Now

### 1. Make the envelope name the public command that was invoked

The current formatter derives `command` from the internal graph report. As a result, `search` is reported as `nodes`, `dependencies` and `dependents` are reported as `edges`, and `path` is reported as `paths`. An unknown command is reported as `help` because parse failure falls back to the help command internally.

Preserve the public command identity separately from its internal report and use it in every envelope:

```json
{"ok":true,"command":"dependencies","data":{}}
{"ok":false,"command":"search","error":{"code":"invalid_arguments","message":"search requires <text>","action":"Run `codegraphy search --help`."}}
```

This is a correctness fix for the machine contract, not a new command or flag. Invalid-argument envelopes should include the relevant command-level help action so an agent can recover without guessing.

### 2. Document the stream and exit-status contract in root help

The implementation currently uses a useful three-class policy, but the exact contract is not self-contained in help:

| Status | Meaning |
|---|---|
| `0` | Command succeeded and any data is on stdout. |
| `1` | The command ran but failed, or `doctor` found an unhealthy workspace. |
| `2` | The invocation was invalid. |

Root help should also say that failures use the JSON envelope on stderr and verbose diagnostics never appear in stdout. Keep detailed failure identity in `error.code`; do not proliferate process exit codes for every cache or plugin condition.

`codegraphy --version` should identify itself as well as its version, for example `codegraphy 3.0.0`, matching the GNU convention for a canonical program name plus version.

### 3. Accept `--` before operands

The parser currently rejects every query operand beginning with `-` and treats a standalone `--` as another positional argument. Accept the POSIX delimiter at the command parser boundary, including nested settings actions:

```text
codegraphy search -- -generated
codegraphy dependencies -- -entry.ts
codegraphy filter add -- '-draft/**'
```

Keep exact option parsing and do not enable command or option prefix abbreviations. The existing GNU-style convenience of accepting the two global options before or after the subcommand can remain, but `--` must stop further option recognition.

### 4. Make every bounded result visibly complete or resumable

The public list commands always request 100 results. Their page metadata exposes `offset`, `limit`, `returned`, and `total`, but the CLI rejects pagination options, so an agent can detect truncation but cannot request the next page. Core already supports `offset` and `limit` and sorts node and edge reports deterministically.

Add the same two local transport options to `nodes`, `search`, `edges`, `dependencies`, and `dependents`:

```text
--limit <count>    Maximum results to return (default: 100)
--offset <count>   Zero-based result offset (default: 0)
```

Validate non-negative integers before execution. Add `nextOffset` as a number or `null` to page metadata so continuation does not require agents to reimplement pagination arithmetic. These are transport controls, not report-specific graph selectors, so they preserve the approved command boundary and do not duplicate settings.

`path` is also bounded, but its response only echoes `maxDepth` and `maxPaths`. Add a boolean such as `truncated` or `complete` so an empty result means either "no path within an exhaustive search" or "the configured bound stopped the search," never an ambiguous absence. Defer public path-tuning flags until real workflows need them.

### 5. Fix stale examples while changing help

`docs/DIAGNOSTICS.md` still shows `codegraphy --verbose index /absolute/path/to/workspace`, even though positional workspace arguments were retired. It should use `codegraphy --verbose --workspace /absolute/path/to/workspace index` (or `-C`). `docs/PLUGINS.md` contains another positional `codegraphy index /path/to/indexed-folder` example. Agent-facing documentation must agree with the strict parser.

## Defer or Avoid

- **Do not add `--json`.** Data commands are already JSON by default. A redundant flag creates two apparent modes without adding capability.
- **Do not embed `--jq` or templates.** CodeGraphy should return stable structured data; agents can use the installed `jq` tool when they need projection.
- **Do not add a generic `--dry-run`.** Indexing writes rebuildable cache data, and settings mutations are already explicit. Add dry-run only if a future command has a costly or destructive plan worth previewing.
- **Do not add `resolve` yet.** `search` already finds candidate Nodes, while dependency and path commands accept workspace-relative file paths or exact Node IDs. Improve structured `node_not_found` and ambiguous-selector errors with candidates or a `search` action first. A separate resolver is justified only if one selector syntax must be shared by several commands and real ambiguity remains.
- **Do not add color, pager, prompt, `--quiet`, shell completion, or output-format controls now.** The current CLI is non-interactive, uncolored, unpaged, and quiet unless `--verbose` is requested. Those controls solve problems it does not have.
- **Do not add an envelope `schemaVersion` without a compatibility policy.** Package semver plus additive object fields is enough for the current single-document API. Introduce a schema version only alongside documented compatibility and migration rules.

## Recommended Boundary

Keep the public vocabulary unchanged:

```text
index -> filter / scope / plugins -> nodes / search / edges / dependencies / dependents / path
```

The immediate standards work is therefore small: correct command identity, self-contained recovery and exit documentation, POSIX `--`, resumable bounded lists, explicit path completeness, and removal of stale examples. None of it expands CodeGraphy into a generic graph query language.
