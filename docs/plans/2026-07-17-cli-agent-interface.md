# CLI Agent Interface

## Goal

Make the `codegraphy` CLI explain and expose the same graph workflow as the
extension without teaching an agent a prescribed search strategy.

The public workflow is:

1. **Index** a CodeGraphy Workspace into its Graph Cache.
2. **Shape** the workspace through persisted settings, including Filters,
   Graph Scope, and Plugins.
3. **Query** the Graph Cache through those settings.

Settings can reduce Indexing work as well as shape later query results. The CLI
must preserve the complete `.codegraphy/settings.json` document when it changes
one setting.

## First PR Scope

### Self-sufficient help

- Make `codegraphy --help` describe the workflow and every command in one line.
- Make `codegraphy <command> --help` explain purpose, usage, arguments, output,
  side effects, and concise examples.
- Add equivalent help for plugin subcommands and Graph Scope actions.
- Keep help as plain text for humans and agents. Data-producing commands remain
  JSON.

### Stable JSON envelope

All non-help, non-version commands use one machine-readable contract.

Success:

```json
{"ok":true,"command":"nodes","data":{}}
```

Failure:

```json
{"ok":false,"command":"nodes","error":{"code":"graph_cache_not_found","message":"This CodeGraphy Workspace has not been indexed.","action":"Run `codegraphy index`, then retry."}}
```

When a failed diagnostic has useful structured results, such as `doctor`, the
envelope may also contain `data`.

- `ok` agrees with the process exit code.
- `command` uses the public command name.
- `data` contains command-specific results without another success wrapper.
- `error.code` is stable and scriptable.
- `error.message` explains the failure.
- `error.action` is an optional executable recovery instruction.
- Progress and verbose diagnostics stay on stderr and never contaminate JSON
  stdout.

### Doctor

Keep the existing `doctor` command. It already checks the Node runtime,
settings, Graph Cache freshness, and Plugins. Move its result into the common
envelope, improve its help, and retain its actionable checks. An unhealthy
workspace remains a nonzero result with the checks available in `data`.

### Generalized Agent Skill

Replace the command tour and search advice with a short workflow guide:

```markdown
# CodeGraphy

Use `codegraphy` to build, shape, and query a CodeGraphy Workspace graph.

1. Run `codegraphy index` to create or update the Graph Cache.
2. Use `codegraphy filter`, `codegraphy scope`, and `codegraphy plugins` to
   update the persisted workspace settings when needed, then index again.
3. Query with `nodes`, `search`, `edges`, `dependencies`, `dependents`, or
   `path`.

Run `codegraphy --help` or `codegraphy <command> --help` for exact arguments,
effects, and output.
```

The CLI help owns command details. The Skill owns only discovery and ordering.

## Explicit Non-goals

- Do not add `--dry-run` in this pass. Indexing writes derived cache data, and
  the settings commands can report their resulting state in the JSON envelope.
- Do not add a raw SQLite command. Graph behavior remains owned by Core.
- Do not add a parallel agent-only workflow or compatibility path.
- Do not add `resolve` until the existing Node selector behavior and ambiguity
  contract have been evaluated as a separate vertical slice.

## Resolve Follow-up

A future `codegraphy resolve <input>` command could convert a human operand
such as a workspace-relative path, unique suffix, display label, or Symbol name
into canonical Graph Node IDs.

- One match returns the canonical Node.
- Multiple matches return structured candidates and do not guess.
- No match returns a stable not-found error and recovery action.
- Query commands can reuse the same resolver so `resolve`, `dependencies`,
  `dependents`, and `path` cannot disagree.

This is useful when repeated `search` calls are only being used to discover the
exact identifier another command accepts. It should not be added merely as an
alias for `search`.

## Proposed Test Seams

These public seams require confirmation before implementation:

1. `codegraphy --help` and `codegraphy <command> --help` text returned through
   the CLI process boundary.
2. JSON written to stdout or stderr plus the process exit code for success,
   argument errors, operational errors, and unhealthy `doctor` results.
3. Settings mutation commands through temporary workspace fixtures, verifying
   both the envelope and preservation of unrelated settings.
4. The published `skills/codegraphy/SKILL.md` content as a concise workflow
   contract.

Implementation will proceed in vertical TDD slices after these seams are
confirmed.

## Validation

- Focused Core CLI tests after each slice.
- Core typecheck, lint, and full package tests.
- CRAP and mutation checks for changed command modules.
- Build and install the CLI, then smoke-test it from a temporary workspace.
- Verify every documented help example against the built binary.
- Add a Core changeset written from the CLI user's perspective.
