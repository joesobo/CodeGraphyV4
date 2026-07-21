# CLI and Agent Skill replace MCP

**Status:** Accepted

CodeGraphy's agent interface will use the Core-owned `codegraphy` CLI and a distributable Agent Skill. Delete the `@codegraphy-dev/mcp` package and MCP-specific product surface.

**Considered Options**

- Repair MCP and require its self-describing tools. This option provides native tool discovery and supports clients without shell access. It also adds a second executable, packaging boundary, protocol lifecycle, and persistent server to a deterministic local workflow that Core already provides.
- Keep MCP beside a new Graph Query CLI. This option preserves protocol access but creates two agent interfaces that must keep the same behavior and documentation.
- Complete the Core CLI and teach agents to use it through the shared Agent Skills format. Local coding agents already have shell access, so this option keeps one implementation path.

**Decision**

Add a small positional JSON Graph Query surface to the Core CLI. Expose the extension's persisted Graph Scope, Filter, and plugin controls through the same workspace settings. Make `codegraphy index` reuse and patch compatible persisted cache data. Publish a general `codegraphy` Agent Skill and delete MCP.

The public Graph Query vocabulary is `nodes`, `search`, `edges`, `dependencies`, `dependents`, and `path`. Symbols remain Node Types, and Relationships remain Edges. Queries use bounded defaults without report-specific pagination and selector flags. Commands target the current directory unless the global `-C, --workspace <path>` option selects another CodeGraphy Workspace.

The Agent Skill lives at `skills/codegraphy` in this repository. Users can install it globally or per workspace from a local checkout. A future public skill repository is outside the accepted runtime contract.

**Consequences**

- One Core CLI owns terminal and agent workflows.
- Agents with shell access can use CodeGraphy without a persistent server.
- Agents without shell access and remote/shared MCP use cases are unsupported.
- Concise skill guidance, strict CLI parsing, stable JSON output, bounded results, and documented exit codes replace typed protocol discovery.
- CLI settings writes must preserve the complete workspace settings document. Terminal Graph Scope, Filter, and plugin changes must not erase extension-owned presentation settings.
- Graph Query remains a Core API. Evidence can support a future protocol adapter.
- The MCP package was never published. Its dead source is not retained in the monorepo.
