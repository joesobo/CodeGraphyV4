# Trello 196 C++ Upgrade Handoff

## Current State

- State: Task Queue Runner concept selected; Core capability/scope decisions continuing; no implementation started.
- Trello card: https://trello.com/c/pSAys9YA/196-c-upgrade
- Card title: C++ Upgrade
- Branch: `codex/196-cpp-upgrade`
- Worktree: `/Users/poleski/.codex/worktrees/196-cpp-upgrade/CodeGraphyV4`
- Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/263
- Heavy-check host: `codegraphy-mini` has isolated worktree `/Users/poleski/.codex/worktrees/196-cpp-upgrade/CodeGraphyV4` on `codex/196-cpp-upgrade`.
- Next route: Human decision gate for C++ symbol/variable/Core-upgrade scope, then Specifier plan draft.

## Human Gates

- Grill before implementation: complete as of `2026-06-10T21:25:48Z`.
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

### 2026-06-10T21:16:42Z - Orchestrator Grill Decision 7

- Source: user answer to grill question 7.
- Target: visible C++ Graph Scope toggle coverage.
- Result: every visible C++ Graph Scope toggle for the example workspace must be demonstrated by the chosen example and acceptance contract.
- User decision:
  - The chosen C++ example should demonstrate every visible C++ Node Type and Edge Type toggle.
  - If a visible toggle cannot naturally change the graph in the chosen example, that is evidence to adjust the example, adjust the capability/control, or mark the behavior out of scope for this card.
  - Do not leave visible C++ toggles as decorative controls with no acceptance proof.
- Routing implication:
  - Specifier should list all expected visible C++ node/edge toggles and map each one to at least one observable graph change.
  - The acceptance draft should verify each visible C++ toggle through nodes or connections.
- Next route:
  - Continue grill before dispatching Specifier.

### 2026-06-10T21:19:40Z - Orchestrator Grill Decision 8

- Source: user answer to grill question 8.
- Target: Specifier first-pass work order.
- Result: Specifier should baseline current C++ graph behavior first, then research C++ AST-level gaps.
- User decision:
  - Start with a baseline check of current `examples/example-cpp` behavior.
  - The baseline should record visible Graph Scope Node Type and Edge Type toggles when the C++ example folder is open.
  - The baseline should record whether toggling each visible control actually changes the graph through nodes or connections.
  - After the baseline, research C++ support needs around symbols, variables, and edges.
  - Compare that research against what CodeGraphy supports today.
  - The research should stay grounded in Tree-sitter AST structure and reasonable Core analysis.
  - Deep C++ semantics that require compiler, macro, template-instantiation, build-system, or project-aware understanding stay out of Core and belong to future Plugin Analysis.
- Routing implication:
  - Specifier first handoff should include:
    - current visible C++ Graph Scope controls and observed graph effects
    - C++ support matrix for symbols, variables, and edges
    - `showcase now`, `reasonable Core upgrade`, and `out of scope` buckets
    - 2-3 candidate real-feeling project concepts mapped to the matrix
  - Heavy VS Code baseline checks should run on `codegraphy-mini` from the verified remote worktree.
- Next route:
  - Continue grill before dispatching Specifier.

### 2026-06-10T21:24:18Z - Orchestrator Grill Decision 9

- Source: user answer to grill question 9.
- Target: criteria for new generic Graph Scope control proposals.
- Result: Specifier may propose new generic Graph Scope controls when Tree-sitter C++ can reliably find the construct.
- User decision:
  - Allow proposals for new generic Graph Scope controls.
  - A C++ construct is eligible for Core consideration when the `tree-sitter-cpp` package can find it from the AST.
  - If Tree-sitter C++ can find the construct, the user is happy for Core to support showing it in CodeGraphy.
  - The analysis should still stay Tree-sitter-backed rather than compiler, build-system, macro expansion, template instantiation, or project-aware semantic inference.
- Routing implication:
  - Specifier should not reject a potential Graph Scope control only because C++ is the first language needing it.
  - Specifier should separate "Tree-sitter can find this AST construct" from "requires C++ compiler semantics" in the support matrix.
  - Coder may implement new Core controls only after the chosen plan identifies them as Tree-sitter-backed reasonable Core upgrades and red-first tests define the gap.
- Next route:
  - Continue grill before dispatching Specifier.

### 2026-06-10T21:25:48Z - Orchestrator Grill Complete And Specifier Dispatch

- Source: user answer to grill question 10.
- Target: Specifier role.
- Result: user approved Specifier dispatch.
- Dispatch scope:
  - Baseline current `examples/example-cpp` Graph Scope behavior.
  - Research Tree-sitter-backed C++ support needs for symbols, variables, and edges.
  - Compare desired support against current CodeGraphy support.
  - Produce `showcase now`, `reasonable Core upgrade`, and `out of scope` buckets.
  - Propose 2-3 believable C++ project concepts, each mapped to visible Graph Scope Node Type and Edge Type toggles and observable graph changes.
- Hard stops:
  - No production implementation.
  - No example edits.
  - No acceptance spec edits.
  - No commits or pushes by Specifier.
  - If local plan drafting becomes appropriate, draft under `docs/plans/` only after concept/support matrix selection.
- Heavy check rule:
  - Use `codegraphy-mini:/Users/poleski/.codex/worktrees/196-cpp-upgrade/CodeGraphyV4` for VS Code/Playwright baseline work.
- Expected Specifier output:
  - Structured handoff summary for Orchestrator review.
  - Commands run and host used.
  - Current visible C++ controls and observed graph effects.
  - C++ support matrix and concept candidates.
  - Open questions or approval gates.

### 2026-06-10T21:27:01Z - Orchestrator Spawned Specifier Agent

- Source: Orchestrator.
- Target: Specifier role agent.
- Result: Specifier role agent spawned.
- Agent:
  - ID: `019eb36e-55ab-7283-a068-b47ca653016a`
  - Nickname: `Bernoulli`
- Note:
  - Initial spawn attempt with explicit inherited settings was rejected by the tool; retry succeeded without overrides.
- Next route:
  - Wait for Specifier handoff, then verify before choosing the next loop state.

### 2026-06-10T21:41:30Z - Specifier Returned And Orchestrator Verified

- Source: Specifier agent `019eb36e-55ab-7283-a068-b47ca653016a` (`Bernoulli`).
- Target: Orchestrator.
- Result: needs human acceptance.
- Verification by Orchestrator:
  - Local worktree status clean at `c8cdd2a5`.
  - `codegraphy-mini` worktree status clean at `c8cdd2a5`.
  - Draft PR #263 open, draft, merge state clean.
  - PR #263 CI rollup green at verification time.
- Specifier reported commands and hosts:
  - Local MacBook: read docs/specs/source with `sed`, `rg`, and `fd`; inspected C++ analyzer, capabilities, and acceptance steps.
  - `codegraphy-mini`: verified host/worktree/Node, installed dependencies, built VS Code target, ran focused C++ Playwright, ran temporary stdin probes with `pnpm exec tsx -`.
  - Passed: `pnpm --filter @codegraphy-dev/extension run build:vscode`.
  - Passed: focused Playwright grep for the C++ example scenario.
  - Skipped: full `test:vscode`, unit tests, mutation.
- Current visible C++ Node Type controls:
  - `File`, `Folder`, `Package`, `Symbol`, `Function`, `Class`, `Type`, `Struct`, `Enum`.
  - Current tiny example effects with no edge types:
    - `File`: `6 nodes / 0 connections`.
    - `Folder`: `9 / 0`, adds `(root)`, `src`, `src/lib`.
    - `Package`: `7 / 0`, adds `pkg:vector`.
    - `Symbol`: `6 / 0`, parent alone has no effect.
    - `Function`: `13 / 0`.
    - `Class`: `8 / 0`.
    - `Type`, `Struct`, `Enum`: no effect in the current tiny example.
- Current visible C++ Edge Type controls:
  - `Imports`, `References`, `Calls`, `Inherits`, `Contains`, `Overrides`.
  - Current tiny example effects with file nodes only:
    - `Imports`: `6 / 2`.
    - `References`: `6 / 0`, no current effect.
    - `Calls`: `6 / 2`.
    - `Inherits`: `6 / 1`.
    - `Contains`: `6 / 0`, needs symbol nodes.
    - `Overrides`: `6 / 1`.
  - With all current C++ symbol rows enabled:
    - Baseline: `15 / 0`.
    - `Calls`: `3`.
    - `Inherits`: `1`.
    - `Contains`: `9`.
    - `Overrides`: `1`.
    - `References`: `0`.
- Support matrix summary:
  - Showcase now: local `#include` as Imports; external include as Package; functions/methods/classes/structs/enums; `typedef` aliases as Type; file-to-symbol Contains; class inheritance; method overrides; calls to included declarations/types.
  - Reasonable Core upgrade candidates: `using Name = Type` alias declarations as Type; C++ Union visibility; meaningful C++ References for uniquely resolvable local/included type usages; same-file C++ calls for unique functions/methods; file/namespace-scope Global/Constant variables; possible generic Namespace node type.
  - Out of scope: macro expansion; conditional compilation; compiler include paths; `compile_commands.json`; template instantiation; overload resolution; ADL; namespace import semantics; full system header indexing; local variable/data-flow graphs; C++ concepts/requires as first-class Core semantics.
- Candidate concepts:
  - `Telemetry Packet Monitor` (recommended): natural union/enum/struct territory; maps to packet structs, payload union, `PacketKind`, `using PacketId`, `Reporter`/`ConsoleReporter`, `decode_packet`, constants, and references through packet types.
  - `Task Queue Runner`: believable CLI queue; maps to `Task`, `TaskSpec`, `TaskStatus`, `TaskRunner`, `Worker` inheritance, calls, aliases, and constants; union less natural unless task payloads matter.
  - `Scene Renderer`: small rendering loop; maps to `Renderer`, `ConsoleRenderer`, `Frame`, `RenderMode`, `using FrameList`, overrides, calls, and includes; union/variable coverage possible but less central.
- Human approval gates:
  - Choose one concept.
  - Decide which Core upgrades belong in this card, especially `References`, `Union`, `using` aliases, variables, and `Namespace`.
  - After that, route back to Specifier to draft `docs/plans/...` and local acceptance-spec Markdown changes for user review only.
- Orchestrator tracker/PR updates:
  - Trello card moved to `Review`.
  - Trello comment added with current gate and recommended concept.
  - PR #263 body updated with current state and verification summary.
- Commands run by Orchestrator:
  - `git status --short --branch`
  - `ssh codegraphy-mini '... git status --short --branch ...'`
  - `gh pr view 263 --json ...`
  - `curl ... /1/boards/69af002961713864de1a93ff/lists ...`
  - `curl -s -X PUT ... /1/cards/pSAys9YA ... idList=6a29af2905c2bc5ffdd5f647`
  - `curl -s -X POST ... /1/cards/pSAys9YA/actions/comments ...`
  - `gh pr edit 263 --body ...`
- Next route:
  - Human decision gate.

### 2026-06-10T21:51:39Z - Orchestrator Human Concept And Scope Decisions

- Source: user decision after Specifier handoff.
- Target: selected concept and Graph Scope/Core capability direction.
- Result: Task Queue Runner selected; several Graph Scope decisions recorded.
- User decisions:
  - Select `Task Queue Runner` as the C++ example concept.
  - The example should actually work, not only exist as illustrative source.
  - Includes should be represented as an edge for C++.
  - Class should be allowed for C++.
  - Do not reuse/alias other languages' generic `Type` behavior for C++ `using` aliases.
  - Add a new C++-visible `Using` toggle for `using Name = Type` aliases.
  - Hide `Type` for the C++ example if the only planned use is `using` aliases.
- Parser research basis:
  - `tree-sitter-cpp` package version observed on `codegraphy-mini`: `0.23.4`.
  - Its `src/node-types.json` exposes C++ AST node types for classes, structs, unions, enums, namespaces, aliases, declarations, declarators, parameters, fields, structured bindings, lambda captures, and related constructs.
- Open gate:
  - User requested a list of symbols and variables supported by Tree-sitter C++ before finalizing the Core upgrade set.

### 2026-06-10T22:00:46Z - Orchestrator Target C++ Graph Scope Controls

- Source: user target list plus Orchestrator source check.
- Target: C++ Graph Scope symbol/variable controls.
- Result: target controls recorded; separation needs validation before implementation.
- User target symbols visible for the C++ example:
  - `Namespace`
  - `Class`
  - `Enum`
  - `Callable`
  - `Method`
  - `Alias`
  - `Template`
- User target variables visible for the C++ example:
  - `Namespace`
  - `Constant`
  - `Field`
  - `Parameter`
  - `Local`
- User caveat:
  - Double-check whether these are actually separate concepts/controls, especially `Namespace`, `Field`, and `Local`.
- Current implementation validation:
  - Existing shared symbol controls include `Function`, `Prototype`, `Class`, `Interface`, `Type`, `Struct`, `Union`, `Enum`, and `Typedef`.
  - Existing `Function` control matches both `function` and `method` symbol kinds.
  - Existing variable controls include `Variable`, `Constant`, `Global`, plus plugin-owned Godot class_name.
  - Existing settings prune old `symbol:method`, `symbol:namespace`, `symbol:property`, and `symbol:variable` keys.
  - Therefore the requested C++ controls require deliberate Graph Scope/control-model changes, not only analyzer changes.
- Parser support note:
  - `tree-sitter-cpp@0.23.4` exposes AST nodes for all requested categories in some form, but CodeGraphy still needs product-level decisions about which become durable Core node controls.
- Commands run:
  - `sed -n ... packages/core/src/graphControls/defaults/symbolNodeTypes.ts`
  - `sed -n ... packages/core/src/graphControls/defaults/variableNodeTypes.ts`
  - `sed -n ... packages/extension/src/shared/graphControls/settings.ts`
  - `rg -n "symbol:namespace|symbol:method|symbol:property|symbol:variable|..." packages/core packages/extension packages/plugin-api ...`
- Next route:
  - Human decision gate, then route to Specifier for local plan draft under `docs/plans/`.

### 2026-06-10T22:04:14Z - Orchestrator Target C++ Edge Controls

- Source: user follow-up after target symbol/variable controls.
- Target: C++ edge controls and variable naming.
- Result: variable `Namespace` target renamed to `Global`; edge research summarized for next decision.
- User decision:
  - Use `Global` instead of variable `Namespace`.
  - Other target symbol/variable controls look good pending validation.
- Current Core edge vocabulary:
  - `Include`
  - `Imports`
  - `References`
  - `Calls`
  - `Inherits`
  - `Contains`
  - `Overrides`
  - plus structural `Nests` and other non-C++-specific edge kinds.
- C++ edge direction to validate:
  - Prefer visible `Include` for C++ `#include` relationships instead of generic `Imports`.
  - Keep `Class` and symbol controls separate from edge naming.
- Tree-sitter C++ AST support observed for edge candidates:
  - Include/import-like syntax: `preproc_include`, `using_declaration`, `namespace_alias_definition`, `alias_declaration`.
  - Calls: `call_expression`, `field_expression`, `new_expression`, `template_function`, `template_method`.
  - Inheritance: `base_class_clause` under `class_specifier` / `struct_specifier`.
  - References: `identifier`, `type_identifier`, `qualified_identifier`, `field_identifier`, `template_type`, `dependent_type`, `type_descriptor`.
  - Contains/ownership: `declaration_list`, `field_declaration_list`, `parameter_list`, `enumerator_list`, `compound_statement`.
- Orchestrator recommendation for C++ example edge controls:
  - `Include`
  - `References`
  - `Calls`
  - `Inherits`
  - `Contains`
  - `Overrides`
  - Treat folder `Nests` as structural Graph Scope behavior, not part of the C++ language edge contract.
- Likely out-of-scope C++ edge ideas:
  - Template instantiates, overload resolves, ADL dispatches, macro expands, compile-database include resolution, namespace import semantics, field access/data-flow, and local variable flow.
- Commands run:
  - `rg -n "...GraphEdgeKind..." packages/plugin-api packages/core packages/extension/src/shared ...`
  - `node` script against `tree-sitter-cpp@0.23.4` `src/node-types.json` on `codegraphy-mini`.
  - `sed -n ... packages/extension/src/shared/graphControls/defaults/edgeTypes.ts`
- Next route:
  - Human decision gate for C++ edge controls, then route to Specifier for local plan draft under `docs/plans/`.
