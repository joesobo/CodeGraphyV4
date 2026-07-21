# CLI And Agent Skill Replace MCP

**Status:** Accepted

CodeGraphy's agent interface will be the Core-owned `codegraphy` CLI plus a
generalized, distributable Agent Skill. The `@codegraphy-dev/mcp` package and
MCP-specific product surface will be deleted.

**Considered Options**

- Repair MCP and require its self-describing tools. This provides native tool
  discovery and supports clients without shell access, but adds a second
  executable, packaging boundary, protocol lifecycle, and persistent server to
  a local deterministic workflow already available through Core.
- Keep MCP alongside a new Graph Query CLI. This preserves optional protocol
  access but creates two agent interfaces that must remain behaviorally and
  documentationally synchronized.
- Make the Core CLI complete and teach agents to use it through the shared Agent
  Skills format. This uses the execution surface local coding agents already
  have and keeps one implementation path.

**Decision**

Add a small positional JSON Graph Query surface to the Core CLI, expose the
extension's persisted Graph Scope, Filter, and plugin controls through the same
workspace settings, make `codegraphy index` reuse and incrementally patch
compatible persisted cache data, publish a generalized `codegraphy` Agent
Skill, and delete MCP completely.

The public graph query vocabulary is `nodes`, `search`, `edges`,
`dependencies`, `dependents`, and `path`. Symbols remain Node Types rather than
receiving a parallel report command, and Relationships remain Edges rather than
receiving a parallel command. Queries use bounded defaults instead of
report-specific pagination flags. Commands target the current
directory unless the global `-C, --workspace <path>` option selects another
CodeGraphy Workspace.

Every query accepts repeatable, comma-separated `--filter`, `--node-type`, and
`--edge-type` options. These are one-off projections layered over the persisted
workspace settings for that invocation. They do not write
`.codegraphy/settings.json`: durable changes still use `codegraphy filter` and
`codegraphy scope`.

The Agent Skill lives in this repository at `skills/codegraphy`. It can be
installed globally or per workspace from a local checkout. A dedicated public
skill repository may be added later, but it is not part of the accepted runtime
contract.

**Consequences**

- One Core CLI owns terminal and agent workflows.
- Agents with shell access can use CodeGraphy without a persistent server.
- Agents without shell access and remote/shared MCP use cases are unsupported.
- Typed protocol discovery is replaced by concise skill guidance, strict CLI
  parsing, stable JSON stdout, bounded results, and documented exit codes.
- CLI settings writes must preserve the complete workspace settings document so
  terminal Graph Scope, Filter, and plugin changes cannot erase extension-owned
  presentation settings.
- Graph Query remains a Core API, so a future protocol adapter can be introduced
  if evidence justifies it.
- The MCP package was never published. Its dead source is not retained in the
  monorepo.
