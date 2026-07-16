# CLI And Agent Skill Replace MCP

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

Add strict JSON Graph Query commands to the Core CLI, make `codegraphy index`
reuse and incrementally patch compatible persisted cache data, publish a
generalized `codegraphy` Agent Skill, and delete MCP completely.

The Agent Skill is installed globally or per workspace through the open Skills
CLI. The exact desired `npx skills@latest add codegraphy` shorthand is not
currently supported by that CLI's source resolution and requires an ecosystem
alias mechanism; initial installation uses the repository source and skill
name.

**Consequences**

- One Core CLI owns terminal and agent workflows.
- Agents with shell access can use CodeGraphy without a persistent server.
- Agents without shell access and remote/shared MCP use cases are unsupported.
- Typed protocol discovery is replaced by concise skill guidance, strict CLI
  parsing, stable JSON stdout, bounded results, and documented exit codes.
- Graph Query remains a Core API, so a future protocol adapter can be introduced
  if evidence justifies it.
- The published MCP package is deprecated during release, but dead MCP source is
  not retained in the monorepo.
