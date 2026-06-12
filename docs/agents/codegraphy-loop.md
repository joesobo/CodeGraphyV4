# CodeGraphy Loop

The CodeGraphy Loop is a role-based workflow for taking one Trello card, bug
report, or explicit user request from informal intent to a PR that is ready for
human review.

The loop is orchestrated by one main Codex thread. For each role step, the
Orchestrator dispatches an in-thread Codex subagent with the selected role,
bounded task, current handoff state, and role contract. The role subagent writes
the substantive handoff entry for its boundary and returns control to the
Orchestrator.

## Roles

CodeGraphy uses one Orchestrator and four role subagents:

- Orchestrator: owns state, routing, human gates, Trello, PR state, and keeping
  the handoff current.
- Specifier: turns informal intent into an acceptance contract.
- Coder: writes or updates tests and implementation until behavior is green.
- Refactorer: runs quality loops and performs cleanup.
- Architect: handles mutation, architecture review, release hygiene, and final
  CI readiness.

Each role has its own loop contract under `docs/agents/loops/`. When a matching
Codex role setup exists, the Orchestrator uses that role setup when dispatching
the in-thread subagent.

The Orchestrator is the visible control surface for the loop. The handoff file
is the shared state record between the Orchestrator and role subagents.

## Setup And Alignment

Before the first role loop begins, the Orchestrator creates the shared loop
context: a dedicated branch, isolated worktree, draft PR, handoff file, and
Trello/PR breadcrumbs. This setup is not role work; it gives the human and
future role subagents one public anchor for the loop.

After setup, the Orchestrator updates the handoff with the request, branch,
worktree, PR, known human gates, and the context it read. Context must include:

- `AGENTS.md`
- `CONTEXT.md`
- `docs/agents/codegraphy-loop.md`
- `docs/agents/loops/orchestrator.md`
- `docs/agents/acceptance-specs.md`
- the Trello card text and comments
- relevant example, acceptance spec, plugin, Core, Extension, MCP, docs, or
  quality-tool files for the specific card
- prior handoffs, pilot notes, or related PRs when they exist

It then runs a short alignment gate with the human before dispatching the first
role subagent.

Use `grill-with-docs` for this gate when the request is broad, exploratory,
language-support related, architecture-sensitive, acceptance-spec sensitive, or
explicitly asks to grill. The Orchestrator asks one question at a time,
grounded in the repo docs and current code, until the scope, acceptance shape,
human gates, and first route are clear.

Do not dispatch the first role subagent before this alignment gate passes,
unless the human explicitly asks to skip alignment for the current loop.

## Heavy Work

Run focus-stealing work on `codegraphy-mini` unless the user explicitly
approves a local run.

This includes:

- VS Code Playwright acceptance runs
- mutation runs
- long quality commands that monopolize CPU or steal focus

Prepare the mini only when the next role needs it. The remote thread uses the
PR branch in an isolated worktree and verifies GitHub auth before seed-backed
mutation work.

## State Machine

```mermaid
flowchart TD
    P["Orchestrator reads request card docs and repo state"]
    O["Orchestrator creates or reads loop setup"]
    G["Setup context and alignment grill"]
    S["Specifier loop"]
    C["Coder loop"]
    R["Refactorer loop"]
    A["Architect loop"]
    H["Human review"]
    D["Ready to merge or Done"]

    P --> O
    O --> G
    G --> S
    S --> O
    O --> C
    C --> O
    O --> R
    R --> O
    O --> A
    A --> O
    O --> H
    H --> O
    H --> D
```

Default route: Specifier, Coder, Refactorer, Architect, Human review.

The orchestrator may route backward after any handoff. A role subagent keeps
looping while it is making measurable progress inside its bounded role task.

When the orchestrator routes backward, downstream approvals are stale. For
example, routing back to Specifier means the loop must pass through Coder,
Refactorer, and Architect again before returning to human review.

## Commit Policy

Role-owned commits use role prefixes:

```text
specifier: draft graph scope acceptance contract
coder: add graph scope search presets
refactorer: pass organize for graph scope presets
architect: cover graph scope preset mutation survivors
```

Each role contract owns its commit timing. The Orchestrator commits handoff
changes at role boundaries, human gates, public PR or Trello changes, and final
readiness. It does not commit every grill question, internal decision, or status
note.

## Examples And Docs

Examples belong to the role that owns the reason they are needed:

- Specifier owns example shape because examples usually become the first
  concrete acceptance fixture for the work. It may draft or update example
  source files when examples define the acceptance contract.
- Coder implements production behavior and executable test support needed to
  make the accepted example pass.
- Architect updates release-facing docs, README prose, screenshots, changesets,
  PR body notes, and final example polish.
- Specifier may draft example expectations when they are part of the acceptance
  contract, but human-owned acceptance spec Markdown still requires approval.

The orchestrator decides which role receives example work by reading the card,
handoff log, and current PR state.
