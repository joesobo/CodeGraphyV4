# CLI and Agent Skill replace MCP

**Status:** Accepted

CodeGraphy's agent interface will use the Core-owned `codegraphy` CLI and a distributable Agent Skill. Delete the `@codegraphy-dev/mcp` package and MCP-specific product surface.

**Considered Options**

- Repair MCP and require its self-describing tools. This option provides native tool discovery and supports clients without shell access. It also adds a second executable, packaging boundary, protocol lifecycle, and persistent server to a deterministic local workflow that Core already provides.
- Keep MCP beside a new Graph Query CLI. This option preserves protocol access but creates two agent interfaces that must keep the same behavior and documentation.
- Complete the Core CLI and teach agents to use it through the shared Agent Skills format. Local coding agents already have shell access, so this option keeps one implementation path.

**Decision**

Add a small positional JSON Graph Query surface to the Core CLI. Expose the extension's persisted Graph Scope, Filter, and plugin controls through the same workspace settings. Make `codegraphy index` reuse and patch compatible persisted cache data. Publish a general `codegraphy` Agent Skill and delete MCP.

The public Graph Query vocabulary is `nodes`, `search`, `edges`, `dependencies`, `dependents`, and `path`. Symbols remain Node Types, and Relationships remain Edges. `nodes`, `search`, `edges`, `dependencies`, and `dependents` use a default limit of 100 and accept `--limit` plus `--offset` for bounded continuation. `path` uses fixed depth and path-count bounds instead of pagination. Commands target the current directory unless the global `-C, --workspace <path>` option selects another CodeGraphy Workspace.

Every query accepts repeatable, comma-separated `--filter`, `--node-type`, and `--edge-type` options. These are one-off projections layered over persisted workspace settings for that invocation. A child `--node-type` enables the parent Node Types needed to evaluate Graph Scope. Node Type matching follows the Graph Scope hierarchy and symbol meaning: a parent includes matching descendants, and overlapping types can match the same symbol. Each result keeps its most specific stored `nodeType`. These options do not write `.codegraphy/settings.json`; durable changes still use `codegraphy filter` and `codegraphy scope`.

Successful data commands return `{ ok: true, command, data }`. Failed data commands return `{ ok: false, command, error }` on standard error and use a nonzero exit code. The two top-level result shapes do not overlap. An unhealthy `doctor` command puts its completed checks in `error.details`. Its Graph Cache check reports schema compatibility, SQLite integrity, foreign-key health, cache state, and File, Node, Symbol, and Edge counts separately.

The Agent Skill lives at `skills/codegraphy` in this repository. Users can install it globally or per workspace from a local checkout. A future public skill repository is outside the accepted runtime contract.

**Consequences**

- One Core CLI owns terminal and agent workflows.
- Agents with shell access can use CodeGraphy without a persistent server.
- Agents without shell access and remote/shared MCP use cases are unsupported.
- Concise skill guidance, strict CLI parsing, exclusive JSON result envelopes, bounded resumable results, and documented exit codes replace typed protocol discovery.
- CLI settings writes must preserve the complete workspace settings document. Terminal Graph Scope, Filter, and plugin changes must not erase extension-owned presentation settings.
- Graph Query remains a Core API. Evidence can support a future protocol adapter.
- The MCP package was never published. Its dead source is not retained in the monorepo.
