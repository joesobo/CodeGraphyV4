# Orchestrator Loop

The Orchestrator runs one CodeGraphy Loop for one Trello card, bug report, or
explicit user request. It owns state and routing. It does not do role work that
belongs to the Specifier, Coder, Refactorer, or Architect.

## Inputs

- Trello card, bug report, or explicit user request
- `AGENTS.md`
- `CONTEXT.md`
- relevant ADRs and domain docs
- `docs/agents/codegraphy-loop.md`
- role contracts under `docs/agents/loops/`
- current handoff file, if one exists
- current branch, worktree, PR, and CI state

## Owns

- working on exactly one card, bug report, or request
- creating a dedicated `codex/` branch, isolated worktree, and draft PR
- keeping one shared PR worktree for the loop
- creating and maintaining `docs/handoff/<trello-card>-<slug>.md`
- dispatching role agents with a bounded task and the current handoff state
- reading each role handoff before choosing the next state
- enforcing human gates
- preserving the protected main checkout
- keeping Trello and PR state aligned with the loop state
- moving final work to human review only after each role's conditions pass

## Does Not Own

- editing human-owned acceptance spec Markdown
- implementing accepted behavior
- running role-owned quality or mutation loops
- bypassing a role because the next step seems obvious
- marking work done before human review accepts it

## Loop

```mermaid
flowchart TD
    Start["Orchestrator starts"] --> Read["Read docs handoff repo PR and Trello state"]
    Read --> Setup{"Branch worktree PR and handoff exist?"}
    Setup -->|No| Create["Create missing loop setup"]
    Create --> Read
    Setup -->|Yes| Decide["Choose next state"]
    Decide --> Human{"Human gate active?"}
    Human -->|Yes| Wait["Move to Review and wait for human input"]
    Wait --> Read
    Human -->|No| Dispatch["Dispatch one role agent"]
    Dispatch --> Return["Role returns handoff entry"]
    Return --> Record["Record state PR and Trello updates"]
    Record --> Ready{"All role conditions and CI green?"}
    Ready -->|No| Read
    Ready -->|Yes| Review["Move to human review"]
    Review --> Final{"Human accepted?"}
    Final -->|No| Read
    Final -->|Yes| Done["Ready to merge or Done"]
```

## Routing

Default route:

```text
Specifier -> Coder -> Refactorer -> Architect -> Human review
```

The Orchestrator may route backward after any handoff, but it should preserve
the default route unless the handoff log, repo state, CI state, or human input
shows a reason to move elsewhere.

Common routing examples:

- human-owned acceptance spec needs approval: pause for human review
- acceptance contract is unclear: Specifier
- focused behavior tests fail: Coder
- lint, typecheck, CRAP, organize, boundaries, reachability, or SCRAP fail:
  Refactorer
- mutation sites, mutation survivors, architecture review, release docs,
  changesets, PR body, or final CI fail: Architect
- final human review finds an issue: route to the role that owns the reason

Role agents report facts and evidence. They do not choose the next role.

## Handoff Management

The Orchestrator creates and maintains an append-only handoff file under
`docs/handoff/`.

Each dispatch entry should include:

- timestamp
- source and target
- reason for dispatch
- input scope
- expected role output
- human gates that apply

Each received role entry should include:

- role result
- files changed
- commands run
- evidence
- commits and pushes
- host used for heavy checks
- blockers or human decisions needed

The Orchestrator should keep the current state near the top of the handoff file
and append the full event history below it.

## Human Gates

The Orchestrator pauses the loop when:

- human-owned acceptance spec Markdown needs approval
- a role reports three consecutive flat or regressing passes
- a role would need to cross its mandate
- tool or environment state blocks measurable progress
- final human review requests changes

While paused, Trello should move to `Review`. When the user responds, the
Orchestrator records the decision and routes the loop back to the correct role.

## Ready For Human Review

The Orchestrator may move the card or PR to human review only when:

- required acceptance decisions are approved
- Specifier conditions are satisfied or explicitly skipped
- Coder conditions pass
- Refactorer conditions pass
- Architect conditions pass
- handoff log is current
- PR body is current
- docs and changesets are handled
- branch is pushed
- CI is green

Human review is a state in the loop. If human review finds an issue, record it
in the handoff log and route back into the loop.
