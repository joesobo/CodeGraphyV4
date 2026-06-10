# Trello 196 C++ Upgrade Handoff

## Current State

- State: setup verified; human grill gate active; no implementation started.
- Trello card: https://trello.com/c/pSAys9YA/196-c-upgrade
- Card title: C++ Upgrade
- Branch: `codex/196-cpp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/196-cpp-upgrade/CodeGraphyV4`
- Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/263
- Heavy-check host: `codegraphy-mini` has isolated worktree `/Users/poleski/.codex/worktrees/196-cpp-upgrade/CodeGraphyV4` on `codex/196-cpp-upgrade`.
- Next route after human gate: Specifier.

## Human Gates

- Grill before implementation.
- Specifier should make proposed human-owned acceptance spec Markdown changes locally in the worktree for review, but must not commit them. The user wants to review, approve, and make any needed edits before committing those spec changes themselves.
- Heavy Playwright and mutation checks must run in the verified remote worktree on `codegraphy-mini` or in a remote Codex thread on that host, not on the MacBook.

## Setup Verification

- `AGENTS.md`, `CONTEXT.md`, `docs/agents/codegraphy-loop.md`, and role loop contracts were read before setup.
- Trello API credentials are present.
- Trello card `pSAys9YA` is open, titled `C++ Upgrade`, was in `Todo` during setup verification, and was moved to `In Progress` after the draft PR was created.
- PR #261 `Add CodeGraphy loop contracts` is merged and its checks were green before this pilot branch was created.
- Protected checkout `/Users/poleski/Desktop/Projects/CodeGraphyV4` remained on `main` after worktree creation.
- No existing `196` branch, worktree, PR, or handoff file was found before setup.
- Local `codegraphy status .` reports a fresh Graph Cache.
- A CodeGraphy MCP tool surface was not exposed in this Codex thread; use the local CLI and source inspection unless later tools become available.
- `codegraphy-mini` sanity check succeeded with Node `v22.22.2` and pnpm `10.32.0`; its stale main checkout was left alone, and an isolated remote worktree was created from `origin/codex/196-cpp-upgrade`.
- Git reported a background gc warning about unreachable loose objects during `git fetch`; no destructive cleanup was run.
- Codex thread title/pin tools are available, but searching recent threads by this card text did not return the current live thread; no thread title or pin change was attempted.

## Event Log

### 2026-06-10T20:27:18Z - Orchestrator Setup Verification

- Source: user request to run the CodeGraphy Loop for Trello card 196 as the first manual pilot.
- Target: Orchestrator.
- Result: verified loop docs, Trello state, PR #261 prerequisite, protected checkout, local CodeGraphy CLI status, and remote mini baseline.
- Files changed: this handoff file only.
- Commands run:
  - `rg -n "CodeGraphy Loop|Loop|Orchestrator|orchestrator|Trello card|pSAys9YA|c\\+\\+|C\\+\\+|upgrade" ...`
  - `git status --short --branch`
  - `curl ... /1/cards/pSAys9YA ... | jq ...`
  - `git worktree list --porcelain`
  - `gh pr view 261 --json ...`
  - `codegraphy status .`
  - `ssh codegraphy-mini '... node --version; pnpm --version; git status --short --branch'`
  - `git worktree add -b codex/196-cpp-upgrade /Users/poleski/.codex/worktrees/196-cpp-upgrade/CodeGraphyV4 origin/main`
- Evidence:
  - Trello card goal is the C++ example workspace upgrade after PR #261.
  - `origin/main` and the protected checkout were both at `7d372d7725b8977a112c9c044a6df1d060fc6ac7`.
  - PR #261 was merged at `2026-06-10T20:22:24Z`.
  - Local Graph Cache state was `fresh`.
- Open blocker:
  - Human grill gate must resolve the first scope decision before Specifier dispatch or implementation work.

### 2026-06-10T20:28:32Z - Orchestrator Draft PR And Trello Sync

- Source: Orchestrator.
- Target: Trello and draft PR setup.
- Result: draft PR opened and Trello moved to `In Progress`.
- PR: https://github.com/joesobo/CodeGraphyV4/pull/263
- Trello update:
  - Card moved to `In Progress`.
  - Comment added with PR, branch, worktree, handoff path, and current human gate.
- Files changed: this handoff file.
- Commands run:
  - `gh pr create --draft --title "Trello 196: C++ Upgrade" ...`
  - `curl -s -X PUT ... /1/cards/pSAys9YA ... idList=69af003346ade5ee06fa328c`
  - `curl -s -X POST ... /1/cards/pSAys9YA/actions/comments ...`
- Open blocker:
  - Human grill gate still active before Specifier dispatch or implementation work.

### 2026-06-10T20:29:37Z - Orchestrator Thread Management Check

- Source: Orchestrator.
- Target: Codex thread setup.
- Result: thread management tools were discovered, but the current live thread was not returned by card-text searches.
- Commands run:
  - `tool_search` for `set_thread_title` and `set_thread_pinned`.
  - `list_threads` queries for `pSAys9YA 196 C++ Upgrade CodeGraphy Loop` and `Run the CodeGraphy Loop`.
- Decision:
  - Do not rename or pin a guessed thread.
- Open blocker:
  - If the user wants the orchestrator thread pinned, retry with a reliable current-thread identifier or a broader thread-listing pass.

### 2026-06-10T20:56:52Z - Orchestrator Remote Worktree And Grill Decision

- Source: user answer to grill question 1 and Orchestrator remote setup.
- Target: pilot setup and Specifier routing contract.
- Result: remote heavy-check wrinkle handled; first acceptance-contract decision recorded.
- Remote worktree:
  - Host: `codegraphy-mini`
  - Path: `/Users/poleski/.codex/worktrees/196-cpp-upgrade/CodeGraphyV4`
  - Branch: `codex/196-cpp-upgrade`
  - Created from `origin/codex/196-cpp-upgrade`; fetch and fast-forward this worktree before each heavy command.
  - Runtime: Node `v22.22.2`, pnpm `10.32.0`
- User decision:
  - Before upgrading the example, first identify what C++ support should include: symbols, variables, edges, and related graph expectations.
  - Compare that desired C++ support matrix against what CodeGraphy already supports.
  - Then upgrade `examples/example-cpp` into a real-feeling C++ project that intentionally demonstrates the supported C++ features.
  - After the example shape is right, modify the C++ acceptance test like the C acceptance test so it maps to the example and verifies the expected behavior.
  - Specifier should draft acceptance spec Markdown changes locally in the worktree for user review, but must not commit them; the user will review, approve, edit if needed, and commit those spec changes themselves.
- Commands run:
  - `ssh codegraphy-mini '... git fetch origin codex/196-cpp-upgrade:refs/remotes/origin/codex/196-cpp-upgrade ... git worktree add -B codex/196-cpp-upgrade /Users/poleski/.codex/worktrees/196-cpp-upgrade/CodeGraphyV4 origin/codex/196-cpp-upgrade ...'`
- Next route:
  - Continue grill before dispatching Specifier.

### 2026-06-10T20:59:23Z - Orchestrator Preliminary C++ Support Scan

- Source: Orchestrator code scan before grill question 2.
- Target: current C++ support baseline.
- Result: identified current analyzer and acceptance-test shape; no files changed outside this handoff.
- Current acceptance shape:
  - `packages/extension/tests/acceptance/specs/c-example.md` has two scenarios: file-level edges and symbol-scope coverage.
  - `packages/extension/tests/acceptance/specs/cpp-example.md` has one mixed scenario covering file nodes, Imports, Class/Contains, Inherits, Overrides, and Calls.
- Current C++ example shape:
  - `examples/example-cpp` is a tiny `Widget`/`Runner` project with `CMakeLists.txt`, `src/app.cpp`, `src/lib/widget.hpp`, and `src/lib/widget.cpp`.
- Current analyzer support observed from source and tests:
  - Local `#include` relationships.
  - File-level Calls edges to declarations/types found in included headers.
  - Inherits edges from C++ base clauses, including structs, templates, and multiple bases.
  - Overrides edges from methods marked `override`, resolved against included inherited declarations.
  - Symbol extraction for functions, methods, classes, structs, unions, enums, namespaces, and type aliases.
- Current Graph Scope capability advertisement observed:
  - C++ edge capabilities: Imports, Calls, Contains, Inherits, Overrides.
  - C++ node capabilities: Function, Class, Struct, Enum, Type.
  - Method symbols are covered by the Function node definition.
  - Union symbols are emitted by the analyzer but are not currently advertised for C++ capabilities.
  - Namespace symbols are emitted by the analyzer but there is no obvious default Namespace node type in the shared symbol definitions.
- Commands run:
  - `fd -a 'cpp|cfamily|c-example|cpp-example' ...`
  - `sed -n ... packages/extension/tests/acceptance/specs/c-example.md`
  - `sed -n ... packages/extension/tests/acceptance/specs/cpp-example.md`
  - `sed -n ... packages/core/src/treeSitter/runtime/analyzeCpp/file.ts`
  - `sed -n ... packages/core/src/treeSitter/runtime/analyzeCFamily/...`
  - `sed -n ... packages/core/tests/treeSitter/cpp/analyze.test.ts`
  - `sed -n ... packages/core/src/treeSitter/runtime/capabilities.ts`
  - `sed -n ... packages/core/src/graphControls/defaults/symbolNodeTypes.ts`
  - `sed -n ... packages/core/src/graphControls/defaults/variableNodeTypes.ts`
- Next route:
  - Continue grill on how broad the C++ support matrix should be before dispatching Specifier.

### 2026-06-10T21:03:55Z - Orchestrator Grill Decision 2

- Source: user answer to grill question 2.
- Target: C++ support matrix boundary.
- Result: support matrix should include reasonable Core upgrades, while explicitly separating out-of-scope C++ semantics.
- User decision:
  - The Specifier should include `showcase now`, `reasonable Core upgrade`, and `out of scope` buckets.
  - Reasonable Core upgrades are allowed when Tree-sitter can support them as honest baseline C++ or shared C-family structure.
  - Avoid super C++-specific behavior in Core.
  - Prefer Tree-sitter-backed generic analysis rather than compiler, build-system, macro, template-instantiation, or project-aware semantics.
  - Future users should be able to create plugins for deeper C++-specific CodeGraphy support.
- Routing implication:
  - Specifier should define the desired C++ feature matrix before drafting example or acceptance-spec changes.
  - Coder should only implement `reasonable Core upgrade` items after red-first tests prove the gap and after the Orchestrator confirms the item belongs in Core rather than Plugin Analysis.
- Next route:
  - Continue grill before dispatching Specifier.

### 2026-06-10T21:05:54Z - Orchestrator Grill Decision 3

- Source: user answer to grill question 3.
- Target: C++ example project shape.
- Result: example should optimize for a believable small C++ project first, with supported feature coverage woven in.
- User decision:
  - Do not build a pure syntax or feature showroom.
  - Choose a real-feeling small project/domain first.
  - Show off supported C++ features naturally through that project.
- Routing implication:
  - Specifier should propose an example shape that feels like a concise real C++ project a C++ developer would recognize.
  - The support matrix should still prove each showcased feature, but the project should not read as a checklist.
- Next route:
  - Continue grill before dispatching Specifier.

### 2026-06-10T21:07:43Z - Orchestrator Grill Decision 4

- Source: user answer to grill question 4.
- Target: Specifier output shape for C++ example concepting.
- Result: Specifier should present multiple candidate project concepts before example or spec edits.
- User decision:
  - Specifier should bring 2-3 candidate C++ project concepts first.
  - Each candidate should include a support-matrix sketch showing which supported C++ features it naturally demonstrates.
  - Choose one concept before editing `examples/example-cpp` or drafting acceptance spec Markdown.
- Routing implication:
  - Specifier's first handoff should be a concept/support-matrix proposal, not source edits.
- Next route:
  - Continue grill before dispatching Specifier.

### 2026-06-10T21:11:27Z - Orchestrator Grill Decision 5

- Source: user answer to grill question 5.
- Target: local plan artifact location and ownership.
- Result: Specifier should draft a separate local plan under `docs/plans/`.
- User decision:
  - Candidate comparison can happen through the Specifier handoff.
  - After a concept/support matrix is chosen, Specifier should draft a separate local plan file under `docs/plans/`.
  - Prefer a path like `docs/plans/2026-06-10-trello-196-cpp-upgrade.md`.
  - The plan should remain local for review until the user approves the concept and plan direction.
- Routing implication:
  - Do not use `docs/agents/` for the selected implementation plan.
  - Specifier owns drafting the local plan; Orchestrator only records this decision now.
- Next route:
  - Continue grill before dispatching Specifier.

### 2026-06-10T21:14:33Z - Orchestrator Grill Decision 6

- Source: user answer to grill question 6.
- Target: Graph Scope capability gaps and acceptance phrasing.
- Result: Graph Scope capability gaps belong in the C++ support matrix, but they should be framed through the visible user controls and graph changes.
- Clarification:
  - "Emitted but not advertised" was internal shorthand.
  - User-facing phrasing should be: when `examples/example-cpp` is open, Graph Scope shows specific Node Type and Edge Type toggles, and toggling each one visibly changes the graph through nodes or connections.
  - For example, if C++ source supports a symbol kind in analysis but the C++ workspace does not show a matching Graph Scope node toggle, that should be described as a visible capability/control gap.
- User decision:
  - The Specifier should include Graph Scope capability gaps in the support matrix.
  - The support matrix should list the visible node toggles and edge toggles expected for the C++ example workspace.
  - The acceptance contract should prove toggles actually affect the graph by checking resulting nodes and/or connections.
  - Avoid relying on internal analyzer/source wording in user-facing acceptance prose.
- Routing implication:
  - Specifier should propose expected Graph Scope Node Type and Edge Type controls as part of each candidate's support matrix.
  - Coder should prove any Graph Scope capability fix with visible behavior, not just analyzer output.
- Next route:
  - Continue grill before dispatching Specifier.
