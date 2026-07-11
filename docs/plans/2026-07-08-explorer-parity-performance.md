# VS Code Explorer Parity + Native-Feel Performance Plan

> **For the executor (GPT 5.6, autonomous loop):** This plan runs unattended on a dedicated Mac mini — the machine is yours alone, so heavy perf sweeps, repeated VS Code launches, and long benchmark loops are always allowed; never skip a measurement to save resources. Work the plan as a loop: take the first unchecked `- [ ]` box in phase order, do it, verify its gate, check the box, commit, repeat until every phase's checkpoint table is green. Use Matt Pocock's skills installed in the environment — invoke the relevant skill before each category of work (TypeScript authoring, testing, refactoring) rather than free-styling. When a gate cannot be met after 3 distinct attempts, or a decision requires the owner (anything marked **owner decision**), stop that thread, write up the blocker as a comment on PR #304 and the Trello epic (https://trello.com/c/hmVekNGe), and continue with the next independent unchecked box. Never move Trello cards to Done — only the owner does that. Commit small and often; every perf-affecting commit message must contain before/after numbers from `pnpm perf`.

## Setup

- Trello epic: [Epic: VS Code Explorer parity + native-feel performance](https://trello.com/c/hmVekNGe) — linked child cards are absorbed where noted.
- Branch: `feat/explorer-parity-performance-plan`, base `main` at `6c5eb25a2`.

**Goal:** Anything you can do in the built-in VS Code File Explorer, you can do from the CodeGraphy graph — with matching behavior and validation standards, measured in a real VS Code window. And the graph itself should feel **dynamic, physical, and fast** through the active 10k-file ceiling, with a desktop-grade selection/drag/pan model, scope toggles that never hiccup, and a plugin system modeled on the two best plugin ecosystems in this space (VS Code's and Obsidian's).

**North-star comparisons (both deterministic):**
1. **VS Code File Explorer** — measured live in the same VS Code window as CodeGraphy (ratio gates).
2. **Obsidian graph view** — measured against its documented limits (staff-stated ~25,000-file practical ceiling, single-threaded main-process simulation as the bottleneck, 8–20% idle CPU while a graph pane is open). We gate on beating those numbers, with sources in the research appendix.

**Rendering-stack policy (owner decision, standing):** stay on react-force-graph. The escalation ladder inside it (tuning → LOD/sprites → worker-thread simulation) is fully in scope. Migrating the renderer to PixiJS/WebGL is **not** authorized in this plan — if the ladder is exhausted and a gate is still unreachable, write up the blocker with measurements and stop that thread for owner discussion.

### Execution checkpoint — 2026-07-10

- `0e0355c1e` replaced the fixed 80ms node-scope render delay with latest-wins animation-frame coalescing while leaving settings persistence independently debounced.
- `96c76be2f` retained the last nonempty force runtime through an empty visibility projection, kept the empty-state overlay opaque, and separated visible projection counts from retained runtime topology in performance telemetry.
- One deterministic `medium` cold-open → scope-toggle checkpoint (real VS Code, same environment, no retries/discards) recorded node:file pairwise-worst median **46.74ms**, **0/10 layout resets**, and no settle metrics. This is implementation evidence only; Phase 4-B/4-C remain open until five complete same-machine runs satisfy the variance policy.
- `c3893450a` replaced the biased add/delete/add batch sequence with three balanced add/delete pairs. The report now takes each operation maximum, each pair's slower direction, then the median of three pair maxima; six consecutive correlated operation IDs are mandatory. A real `medium` checkpoint completed all six switches and recorded **152.17ms** incremental-refresh and **197.86ms** watcher-to-graph medians. Strict five-run validation remains pending.
- Exact-head five-run `large` recapture completed with every scenario and Extension Host exiting 0, without retries or discarded samples. The aggregate was rejected solely because `watcherToGraphMs.batch100` measured **809.37 / 237.95 / 251.87 / 230.71 / 235.23ms** (**72.30% CV**, gate <10%); no baseline was adopted. Adjacent evidence was stable: batch incremental refresh **186.90 / 174.83 / 184.17 / 171.07 / 171.36ms**, and node:file scope **98.16 / 97.25 / 109.52 / 92.91 / 100.68ms** with zero layout resets in all five runs. The large warm-scope speed target therefore remains open even though its stability and zero-reset contracts now hold.
- `378468baa` retains the shortest requested debounce when a pending watcher burst mixes 32ms changed-file events with 500ms create/delete events; pure file-operation debounce and directory follow-up behavior remain unchanged. Five targeted fresh `large` cold-open → batch samples recorded watcher medians **222.11 / 224.55 / 227.01 / 221.26 / 221.49ms** (**1.10% CV**), with every host exiting 0 and no retries/discards. This clears the previously failed batch watcher metric in targeted evidence; the earlier full-suite aggregate remains rejected until the next full exact-head recapture.
- A TDD experiment memoized the stable runtime layout fingerprint during projection-only renders; 20 focused Graph/surface/commit tests and `perf:build` passed. Its single permitted direct `large` scope launch produced no measurement: the real VS Code test timed out waiting for `GRAPH_INDEX_STATUS_UPDATED`, wrote no result file, and exited 1. The run was not retried or discarded, the optimization was reverted completely, and no performance claim or baseline was adopted. The next attempt must use the supported same-environment cold-open → scope sequence rather than launching scope against an uninitialized standalone environment.
- The unchanged exact head then validated that supported sequence in one shared `large` environment: cold-open and scope hosts both exited 0 without retries/discards. node:file pair maxima were **670.08 / 622.33 / 94.19 / 91.87 / 73.71ms** (median **94.19ms**) with zero layout resets and zero settles, reproducing the accepted five-run timing shape before any new optimization is introduced.
- The layout-fingerprint memoization was then re-run through that exact supported sequence. Both hosts exited 0; node:file pair maxima were **629.38 / 627.76 / 91.71 / 101.54 / 76.17ms** (median **101.54ms**) with zero layout resets and zero settles. Because the governing median regressed **7.8%** from the exact unchanged-head checkpoint and still missed the 50ms target, the change and its test were reverted; no performance claim or baseline was adopted.

## Phase map

| Phase | Name | Depends on | Exit summary |
| --- | --- | --- | --- |
| 1 | In-window metrics harness & baselines | — | real-VS-Code `pnpm perf`, Explorer lane, baselines, CI gate |
| 2 | Explorer feature parity | 1 | parity inventory: 0 todo rows |
| 3 | Performance: pipeline + dependency maximization | 1 | ratio + absolute gates green; 10k-file gates green |
| 4 | Graph Scope & projection flow | 3 | any toggle ≤ frame-budget gates, no host round-trip on loaded evidence |
| 5 | Desktop interaction model | 3 | marquee/drag/pan/multi-context semantics per spec |
| 6 | Feel & polish | 2, 5 | Explorer-standard behavior gates |
| 7 | Plugin ecosystem | 2 | lifecycle/disposal/manifest/template/docs gates |
| 8 | Proof & showcase | 3–7 | published artifacts incl. Explorer + Obsidian comparisons; owner sign-off |
| 9 | Cleanup & hardening | 8 validated | scaffolding gone, docs current, suites green |

## Monorepo facts (audited 2026-07-09 — trust these, re-verify only if a command fails)

- pnpm workspaces (`packages/*`, `apps/*`, `examples/*`) + **turbo** task orchestration (`turbo run build|test|lint|typecheck`), changesets for versioning, husky + lint-staged.
- Packages: `core`, `extension`, `mcp`, `plugin-api`, `plugin-godot`, `plugin-markdown`, `plugin-particles`, `plugin-svelte`, `plugin-typescript`, `plugin-unity`, `plugin-vue`.
- Extension = esbuild/CJS host + Vite React webview; VSIX via `scripts/release-core.mjs`; native tree-sitter grammars are pnpm `allowBuilds` with a patched `tree-sitter@0.25.0` (see the "Remove temporary tree-sitter Node 23+ build patch" bug card).
- `@vscode/test-electron@^2.5.2` is **already a dependency** of `packages/extension` and a `test:vscode` script exists (`pnpm -r --if-present run test:vscode`) — Phase 1 builds on this, not from scratch.
- Graph Cache: `@ladybugdb/core@^0.15.3` (`packages/core/src/graphCache/database/`).
- Quality tooling is first-party `@poleski/quality-tools`: `pnpm crap`, `pnpm boundaries`, `pnpm reachability`, `pnpm scrap`, `pnpm organize` (structure/organization tool), plus differential mutation via `pnpm mutate` (`scripts/mutate.ts`). Acceptance-spec edits are guarded by `pnpm check:acceptance-specs`.
- **Confirmed perf gaps (code-audited):**
  - tree-sitter incremental parsing is **unused** — no `oldTree`/`tree.edit()` anywhere in `packages/core/src`.
  - Parsers are constructed per call inside analyzers (e.g. `core/src/treeSitter/runtime/analyzeHaskell/file.ts:279`, `analyzeDart/file.ts:192`, `analyzeKotlin/file.ts:188`, `analyzeCpp/relation/include/traversal.ts:66`) — parser/language setup churn on every file.
  - **Zero `worker_threads` usage** in core or extension — indexing and everything else is main-thread.
  - Warm Graph Scope projection is now webview-local: the store updates visibility immediately and rendering publishes node changes on the next animation frame. The separately debounced host message persists `.codegraphy/settings.json` and echoes control state; it does not send `GRAPH_DATA_UPDATED`, rewrite Graph Cache, or re-run analysis. First-time evidence hydration (notably symbols) remains a separate Phase 4 concern.
  - `webview/components/graph/view/layoutKey.ts` joins every node+link id into one string per render; any membership change forces a full physics layout reset (`runtime/use/physics/hook/layout.ts`).
  - Structural refreshes post the **entire `IGraphData`** to the webview (`webview/store/messageHandlers/graphDataMessage/payload.ts` replaces `state.graphData` wholesale); only metric updates (`metricUpdates.ts`) patch in place.

## Monorepo package impact

| Package | Touched in | What changes |
| --- | --- | --- |
| `packages/core` | 1, 3, 4 | diff engine, perf events, incremental tree-sitter + parser reuse + worker pool, cache write scheduling, visibleGraph projection indexes — no public API breaks |
| `packages/extension` (host) | 1–4, 6, 9 | new FS actions, dispatch wiring, watcher/scheduler tuning, settings reads, perf scenario command, scope-evidence hydration protocol |
| `packages/extension` (webview) | 1–6, 8 | menus, keyboard, diff-apply, optimistic layer, webview-local projection, interaction model, inline rename, decorations, render tuning, samplers |
| `packages/plugin-api` | 7 | lifecycle/disposal helpers, manifest schema, load-time budget hooks — additive, versioned via `apiVersion` |
| `packages/plugin-*` | 7 | migrate to new lifecycle helpers as the worked examples; no behavior changes elsewhere |
| `packages/cli` / `packages/mcp` | none | untouched; Phase 9 verifies no core API drift |
| CI / repo root | 1, 8, 9 | `perf/`, perf workflow, demo assets |

Executor rule: a task forcing changes outside its listed packages is a scope signal — flag it on the epic before proceeding.

## Testing strategy (applies to every phase)

Performance execution is capped at 10,000 files. Prefer `small` → `medium` →
`large`; use `huge` (10k) only for phase gates and final verification. The
legacy 30k `giant` fixture is outside this plan's execution matrix: do not
generate it or run giant / giant-symbol scenarios.

1. **Unit (Vitest)** — pure logic; `*.test.ts` beside source; react-force-graph + ResizeObserver mocks exist (`tests/setup.ts`, `tests/__mocks__/`).
2. **Acceptance scenarios** — required for every user-visible behavior; respect `pnpm check:acceptance-specs`.
3. **In-window perf runs (the only performance truth)** — `pnpm perf` launches real VS Code via the existing `@vscode/test-electron` setup with the built extension + fixture workspace; a hidden `codegraphy.perf.runScenario` command drives scenarios and streams timings through the diagnostics event system; webview sampler reports over the bridge. **No headless/jsdom perf measurement anywhere.** The same session times the built-in Explorer for ratio gates.
4. **Playwright webview harness (visual only)** — pixel gates, overlays, decorations, recordings; never timing. Reuses the documented screenshot workflow (build webview → `screenshot.html` + `acquireVsCodeApi` mock → HTTP serve → `postMessage` fixtures).
5. **Dev Host walkthroughs** — after each phase, drive the real Extension Development Host through the phase checklist; capture screenshots as evidence in the PR.
6. **Perf CI** — same in-window runner under xvfb on Linux CI: `small`+`medium` per PR, median of 3, fail >20% vs that runner class's baselines; full sweep on `workflow_dispatch` and before each phase exit. On the Mac mini, run the **full sweep freely and frequently** — it's a dedicated box.

### Quality-tool loop (per task, iterate until clean)

Full-suite mutation testing is **excluded** — too expensive, cost scales with the codebase not the change. Instead, per touched file set: `pnpm crap` (≤ 8) → `pnpm mutate` scoped to touched files → if mutation sites exceed the per-file threshold, treat it as a split-the-file signal, split, then `pnpm organize` to settle structure → `pnpm boundaries` / `pnpm reachability` if module edges moved → re-run. **Multiple loops around this cycle are normal and expected**; a task is done when the tools come back clean, not when the code first works. Phase 9 runs one final scoped pass over the epic's hot modules only.

---

## Research appendix (integrated findings — cite these, don't re-derive)

### Obsidian graph view (inspiration + the bar to beat)

- **Rendering:** PixiJS on WebGL (confirmed via shipped-code stack traces: https://forum.obsidian.md/t/v1-4-5-graph-view-does-not-render-nodes-pixiejs-shaders-broken/66621). GPU handles the sprites; that is *not* where it dies.
- **The actual bottleneck is layout, not rendering:** staff state "no hard limit but performance degrades," practical ceiling ~**25,000 files** on modern desktops; a 130k-note vault froze graph view on an i7-14700KF/64GB/RTX-4090 with **one CPU core pegged** — the force simulation is single-threaded on the main process (https://forum.obsidian.md/t/obsidian-graph-view-doesnt-work-for-a-large-vault/106287).
- **Idle cost:** long-standing 8–20% idle CPU while a graph pane is open because the render/sim loop keeps ticking (https://forum.obsidian.md/t/graph-obsidian-consistently-eating-8-20-cpu-at-idle/2349). Community plugins fix it with **Web Worker simulation** (Galaxy View) and persisted/reheated layouts. → Our gates 3-F/3-J directly target both failure modes.
- **LOD & UX worth copying** (https://obsidian.md/help/plugins/graph): text-fade threshold (labels fade by zoom — labels are the expensive part), node-size/link-thickness sliders, **groups = color-by-search-query** (first match wins — cheap, huge perceived value), filters incl. orphan toggle, **local graph with depth slider** (the most-loved feature; global graphs go decorative at scale), four raw force sliders (center/repel/link force/link distance), timelapse animate-by-creation-time.
- **MetadataCache architecture** (https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache): the whole link graph as a flat adjacency map `resolvedLinks: {source: {dest: count}}` + `unresolvedLinks` (rendered as ghost nodes — analog: unresolved imports); per-file `changed` events, `resolve`/`resolved` lifecycle; **the graph view is just a consumer of the cache** — parsing fully decoupled from rendering. CodeGraphy's Graph Cache + visibleGraph projection already follows this shape; Phase 4 finishes the decoupling.
- **Philosophy** (https://stephango.com/file-over-app, https://obsidian.md/about): file-over-app (durable plain files over opaque storage — CodeGraphy analog: graph state/config as plain files in `.codegraphy/`), local-first, ~9-person team, free core + paid services keeps pressure to bloat the core low.

### Obsidian plugin system (model for Phase 7)

- Plugins = TS class with `async onload()` / `onunload()`; the base class owns disposal — `registerEvent`, `registerDomEvent`, `registerInterval`, `addCommand`, `registerView` all auto-clean on unload (https://docs.obsidian.md/Plugins/Getting+started/Anatomy+of+a+plugin, https://docs.obsidian.md/Reference/TypeScript+API/Plugin).
- Data: `loadData()`/`saveData()` → plain `data.json` in the plugin folder; `onExternalSettingsChange()` when it changes on disk.
- **Why the ecosystem won:** sample template repo + esbuild watch dev loop (drop folder in `.obsidian/plugins`, `npm run dev`); distribution = GitHub release with `main.js` + `manifest.json` (+`versions.json` mapping plugin version → min app version) — no store build pipeline; community directory with automated policy review (https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin, https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin).
- **Core-as-plugins:** 25+ first-party features (including Graph View itself) ship as toggleable core plugins — the platform eats its own dogfood (https://obsidian.md/help/plugins).
- **Load-time discipline:** official guide teaches deferring work past startup (`onLayoutReady`) because eager views directly hit app load time (https://docs.obsidian.md/plugins/guides/load-time).

### VS Code extension standards (executor: verify against current official docs at code.visualstudio.com/api before relying on specifics)

- Webviews: message passing is the only channel and serializes to JSON — keep payloads small (Phase 3 diff protocol); `retainContextWhenHidden` is expensive and discouraged — prefer `getState`/`setState` for cheap persistence (Phase 6 ghost-graph uses this); react to `onDidChangeViewState` to pause work when hidden (Phase 3.6); strict CSP required.
- Activation: lazy activation events, bundle small, defer heavy work off the activation path — same discipline Obsidian teaches. Large-extension prior art worth studying for patterns (not copying code): **GitLens** (aggressive lazy activation + feature gating), **Foam** and **Dendron** (workspace graph views in webviews — both validate the canvas/WebGL-over-DOM choice and both hit walls CodeGraphy should benchmark past), **Draw.io** (webview state persistence done well).
- File ops: `vscode.workspace.fs` (incl. `delete({ useTrash })`); Explorer contributes via `explorer/context` menu points with `when` clauses; keybindings need webview-focus `when` contexts.
- Testing: `@vscode/test-electron` drives a real downloaded VS Code with your extension in CI (xvfb on Linux) — already wired in this repo via `test:vscode`.

### react-force-graph / d3-force levers (executor: confirm each prop in the README at https://github.com/vasturiano/react-force-graph before use — repo rule)

- Simulation lifecycle: `cooldownTicks` / `cooldownTime` bound how long the sim runs; `warmupTicks` pre-settles before first paint; `d3AlphaDecay` / `d3VelocityDecay` control convergence; `onEngineStop` signals settle; `pauseAnimation()` / `resumeAnimation()` for hidden panels. A settled graph must cost ~zero CPU (the anti-Obsidian-idle gate).
- Rendering: `autoPauseRedraw` (2D) skips frames when nothing changed; `nodeCanvasObject` + `nodeCanvasObjectMode` for custom glyphs — cache glyphs on offscreen canvases keyed by style, and gate label drawing on zoom scale (Obsidian's text-fade); the library passes `globalScale` to the paint callback for exactly this.
- Dynamic data: the official dynamic example mutates the `graphData` object and re-sets it — node objects preserved by reference keep their positions/velocities; `d3ReheatSimulation()` for local reheats.
- d3-force at scale: `forceManyBody` is Barnes–Hut approximated (`theta`, default 0.9 — raising it trades accuracy for speed); fixing nodes via `fx`/`fy` removes them from layout cost; a worker-thread simulation posting position buffers is the proven community answer to Obsidian's single-threaded ceiling (d3-force runs fine in workers; transfer positions as `Float32Array` via transferable objects).

### tree-sitter incremental parsing (unused in this repo today — confirmed)

- Core feature: after an edit, call `tree.edit(delta)` on the previous tree, then `parser.parse(newSource, oldTree)` — tree-sitter reuses unchanged subtrees; re-parse cost is proportional to the edit, not the file. Supported by the Node bindings this repo uses. Keep one `Parser` (+ compiled `Query`) per language for the process lifetime; `setLanguage` and query compilation are the expensive parts (executor: verify API shape against tree-sitter 0.25 docs given the repo's patched version).

---

## Explorer parity inventory (source of truth)

Committed as `docs/plans/explorer-parity-checklist.md` in Task 2.1; gate 2-A counts rows here. Legend: `done` (2026-07-08 audit) · `todo(P#)` · `verify(P2)` · `waived(reason)`.

### Context menu — file

| Explorer feature | Status | Task |
| --- | --- | --- |
| Open (incl. multi "Open N Files") | done | |
| Open to the Side / Open With… | todo(P2) | 2.4 |
| Reveal in Finder/Explorer | done | |
| Open in Integrated Terminal | todo(P2) | 2.4 (Trello card) |
| Select for Compare / Compare with Selected | todo(P2) | 2.4 (Trello card) |
| Open Timeline | waived (Graph Revision view covers it) | |
| Cut / Copy / Paste | todo(P2) | 2.2 |
| Copy Path / Copy Relative Path | done | |
| Rename | done (prompt) → inline in P6 | 6.2 |
| Delete (to trash) | partial → todo(P6) | 6.1 |
| Share (vscode.dev link) | waived (web-only) | |

### Context menu — folder

| Explorer feature | Status | Task |
| --- | --- | --- |
| New File / New Folder | done | |
| Nested-path create (`a/b/c.ts`) | verify(P2) | 2.1 (`extension/actions/createPath.ts`) |
| Find in Folder… | todo(P2) | 2.5 |
| Paste | todo(P2) | 2.2 |
| Reveal / copy paths / rename / delete (root protected) | done | |

### Keyboard

| Binding | Status | Task |
| --- | --- | --- |
| Enter = open (graph convention), F2 = rename | Enter done, F2 todo(P2) | 2.3 |
| Delete / Cmd+Backspace delete | todo(P2) — currently explicit `null` in `keyboard/command/lookup.ts` | 2.3 |
| Cmd/Ctrl+C, X, V | todo(P2) | 2.3 |
| Cmd/Ctrl+Enter open to side | todo(P2) | 2.3 |
| Cmd/Ctrl+A · Escape | done (fold Escape-closes-panels bug card into 2.3) | |
| Cmd/Ctrl+Z / Shift+Z undo/redo | todo(P2) — `undoManager` exists host-side | 2.3 |
| Type-ahead find | waived (search bar is the graph-native equivalent) | |
| Arrow-key navigation | **waived (owner)** | |
| Left/Right collapse/expand | waived (folderView click) | |

### Behaviors & display

| Feature | Status | Task |
| --- | --- | --- |
| Multi-select (marquee + modifiers) | done — extended semantics in P5 | 5.x |
| Auto-reveal active file (`explorer.autoReveal`) | todo(P2) — fixes outline bug card | 2.6 |
| Git status decorations / problems decorations | todo(P2) | 2.7 |
| `files.exclude` respected | todo(P2) (Trello card) | 2.5 |
| File nesting / Open Editors / sort order | waived (tree-list concepts) | |
| Drag semantics (canvas: select/move/pan) | todo(P5) — per owner spec | 5.x |
| Drag-to-move-file-on-disk / external OS drop | **deferred (future epic)** — follow-up card in P8 | |
| Inline input for new/rename | todo(P6) | 6.2 |
| Delete to OS trash (`files.enableTrash`) | todo(P6) | 6.1 |

### Validation standards (Explorer's rules as testable gates)

| # | Standard | Enforced in |
| --- | --- | --- |
| V1 | Rename/new rejects empty/whitespace-only names | 2.3 / 6.2 |
| V2 | Existing-name collision fails with "A file or folder **{name}** already exists at this location." | 2.2 / 6.2 |
| V3 | Path separators in New File create nested folders | 2.1 |
| V4 | Paste collision appends ` copy`, ` copy 2`, … | 2.2 |
| V5 | Delete → OS trash per `files.enableTrash`; permanent delete warns with Explorer wording | 6.1 |
| V6 | `explorer.confirmDelete` honored incl. persistent "Do not ask me again" | 6.1 |
| V7 | Every FS mutation undoable; Cmd+Z reverses | 2.3 |
| V8 | Multi-select destructive ops confirm once with count | 2.2 |

---

# Phase 1 — In-window metrics harness & baselines

## Goal

`pnpm perf` launches a real VS Code window, runs scripted scenarios per fixture, measures CodeGraphy *and* the built-in Explorer in the same session, and writes deterministic JSON. Baselines committed, CI gate live.

## How

### Task 1.1: Fixtures

**Vehicles:** unit.

Seeded, zero-randomness generator (file *i* imports files *i/2*, *i/3*): `small` 100 · `medium` 1,000 · `large` 5,000 · `huge` 10,000 · `self` = this monorepo. The symbol-heavy gate uses `huge --symbols`; the legacy 30k `giant` fixture is retained only for historical compatibility and is not generated or executed by this plan.

- [x] `perf/fixtures/generate.ts` + `manifest.json`; unit test: regenerate twice → identical tree hash. Commit.

### Task 1.2: In-window scenario runner

**Vehicles:** in-window perf.

- [ ] Build on the existing `test:vscode` / `@vscode/test-electron@^2.5.2` setup: `perf/run.ts` launches VS Code per fixture; hidden command `codegraphy.perf.runScenario` (new `packages/extension/src/extension/perf/scenarioCommand.ts`) executes scenarios; metric events via `packages/core/src/diagnostics/perfMetrics.ts` (zod schemas) through the existing diagnostics bus (`indexing/phase-completed` pattern in `core/src/indexing/workspace/timing.ts`); `perf/report.ts` writes schema-validated JSON per fixture (missing key = failed run).
- [ ] Emit sites: `core/src/indexing/engine.ts`, `extension/pipeline/service/refreshFacade.ts`, `extension/workspaceFiles/refresh/scheduler.ts`, `webview/store/messageHandlers/graphDataMessage/payload.ts`, `webview/components/graph/runtime/use/physics/hook/layout.ts`.
- [ ] Scenarios: cold open · warm open · single-file save/rename/create/delete · 100-file batch (`git checkout` between fixture branches) · interaction burst (pan/zoom/drag) · **scope-toggle battery** (each Graph Scope row toggled away/back ×5) · **idle watch** (60s untouched after settle).
- [ ] Keys: `coldOpenMs`, `warmOpenMs`, `incrementalRefreshMs`, `payloadBytes`, `watcherToGraphMs`, `fileOpRoundtripMs`, `layoutResets`, `cacheSaveMs`, `cacheBytes`, `treeSitterParseMs`, `graphBuildMs`, `scopeToggleMs` (per row), `settleTimeMs`, `idleCpuPct`, `simTicksAfterSettle`. Commit.

### Task 1.3: Explorer comparison lane (same window)

- [ ] Time the built-in path per comparable op: `explorerRenameMs`, `explorerCreateMs`, `explorerDeleteMs`, `explorerRevealMs` (user-gesture → visible update, honestly equivalent spans); report ratios `renameRatio` etc. Commit.

### Task 1.4: Webview FPS/CPU sampler

- [ ] `webview/perf/frameMetrics.ts`: rAF FPS + PerformanceObserver long-tasks + heap, armed only by the scenario command, excluded from release bundles (verified Phase 9). Keys: `fpsIdle`, `fpsDrag`, `fpsSettle`, `longTasksPerInteraction`, `heapUsedBytes`. Idle CPU measured process-side by the runner (`pidusage` on the renderer + extension host across the 60s idle watch). Commit.

### Task 1.5: Baselines + CI gate

- [ ] 5 local runs → median baselines `perf/baselines/local-reference.json` (the Mac mini is the canonical local reference); CI runner-class baselines separate. `.github/workflows/perf.yml`: xvfb, `small`+`medium` per PR, median of 3, >20% fail. Prove the gate red with a throwaway `await sleep(500)` PR; revert. Commit.

## Checkpoints

| # | Gate | Threshold |
| --- | --- | --- |
| 1-A | Fixture determinism | regenerate twice → 0 diff bytes through `huge` (10k) |
| 1-B | Report completeness | all **15 core + 5 webview + 4 Explorer keys + 4 ratios** present, schema-valid |
| 1-C | Stability | 5 runs on `medium`: CV < 10% per timing key (< 15% for ratios) |
| 1-D | Baselines | local-reference + CI baselines committed |
| 1-E | Gate proven | perf CI green on no-op, red on sleep-500 |

---

# Phase 2 — Explorer feature parity

## Goal

Every non-deferred inventory row `done` or `waived`; validation standards V1–V4, V7, V8 asserted by acceptance tests.

## How

Template for every FS mutation: copy the `extension/actions/deleteFiles.ts` pattern — `IUndoableAction` through `undoManager`, zod-validated messages, `mutationAvailability` gating (no destructive ops while browsing Graph Revision). Webview side: new `BuiltInContextMenuAction` member in `contextMenu/contracts.ts` + entries-builder wiring.

### Tasks

- [ ] **2.1 Checklist + prove `done` rows:** commit inventory to `docs/plans/explorer-parity-checklist.md`; walk every `done` row in the Dev Host on `medium` (screenshots); prove V3 nested-path create via `createPath.ts`; fix/re-status failures; add missing acceptance scenarios; regression-check plugin menu entries. Commit.
- [ ] **2.2 Cut/Copy/Paste:** `extension/actions/clipboardFiles.ts`; pure `resolveCollisionName(name, siblings)` implementing V4 exactly (unit-test the sequence ` copy`, ` copy 2`, ` copy 3`); V2 error shape; V8 count-confirm; wire contracts + `node/entries.ts` + `node/folderEntries.ts` + `background/entries.ts` + `providerMessages/primaryActions/workspaceFileActions.ts`. Acceptance first, then implement, then quality-tool loop. Update Trello card. Commit.
- [ ] **2.3 Keyboard:** `keyboard/command/lookup.ts` — Delete/Cmd+Backspace (remove explicit `null`), F2 rename, Cmd/Ctrl+C|X|V, Cmd/Ctrl+Enter open-to-side, Cmd/Ctrl+Z / Shift+Z through `undoManager` (new message). Escape-closes-panels bug folded in. **No arrow keys.** Unit test per binding; destructive bindings respect `mutationAvailability`. Commit per group.
- [ ] **2.4 Open variants + compare + terminal + close editor:** Open to the Side (`ViewColumn.Beside`) · Open With… · Open in Integrated Terminal · Select for Compare / Compare with Selected (armed-state like Explorer) · Close editor for node. One commit + Trello update each.
- [ ] **2.5 Find in Folder + files.exclude:** `workbench.action.findInFiles` with `filesToInclude` preset; `files.exclude` → discovery exclusions (`core/src/discovery/`) + Graph Filters toggle (default on) + excluded-count in the Filters button (links to the "Filters button reports 0" bug card). Commit.
- [ ] **2.6 Auto-reveal active file:** active-editor change → selected outline (fixes bug card); `codegraphy.autoReveal` mirroring `explorer.autoReveal` (`true` = outline+pan, `focusNoScroll` = outline only). Commit.
- [ ] **2.7 Git + problems decorations:** host: `vscode.git` extension API (fallback `git status --porcelain` via core's git layer) + `onDidChangeDiagnostics`, debounced, shipped as in-place metric-style updates (`metricUpdates.ts` pattern — never a refresh). Webview: ring color per status, error/warning badge; check react-force-graph `nodeCanvasObject` examples first. Playwright visual test. Commit.

## Checkpoints

| # | Gate | Threshold |
| --- | --- | --- |
| 2-A | Inventory | 0 `todo(P2)`/`verify(P2)` rows; waivers unchanged without owner sign-off |
| 2-B | Standards | named passing tests for V1–V4, V7, V8 |
| 2-C | Keyboard | 6 binding groups unit-tested; Delete ≠ null; 0 bindings bypass `mutationAvailability` |
| 2-D | Undo | 100% of new actions are `IUndoableAction` + undo acceptance test each |
| 2-E | Ratios pre-opt | `renameRatio`/`createRatio`/`deleteRatio` on `medium` ≤ 2.0 |
| 2-F | Plugins | plugin menu entry regression test green |
| 2-G | Dev Host | every new action walked with screenshots, 0 failures |
| 2-H | Quality loop | touched files: CRAP ≤ 8, scoped mutants dead, no over-threshold site counts |

---

# Phase 3 — Performance: pipeline + dependency maximization

## Goal

Explorer-tree-like updates (incremental, local, immediate) and a graph that stays physical and fast through `huge` (10k files), while the settled graph costs ~zero CPU (beating Obsidian's 8–20% idle problem). Every task commits before/after numbers.

## How — attack order

1. **Diff protocol** — stop shipping the whole graph. `packages/core/src/graph/diff.ts`: `diffGraphData(prev, next) → {addedNodes, removedNodeIds, updatedNodes, addedLinks, removedLinkIds}` + zod; `refreshFacade.ts` emits `GraphDataPatched` for incremental modes (full `GraphDataUpdated` only cold open/re-index); webview `graphDataMessage/patch.ts` applies in place (generalize `metricUpdates.ts`). Property test first: `apply(prev, diff(prev,next))` ≡ `next` on fixture pairs.
2. **Kill layout resets** — replace `layoutKey.ts`'s O(n) id-join with a `structureVersion` counter bumped only on membership change; on patch, mutate live graph data preserving node object identity (positions/velocities survive) + `d3ReheatSimulation()` locally; validate against the library's dynamic-data example first; full reset only on `GraphDataUpdated`.
3. **Optimistic file ops** — `webview/store/optimistic.ts`: rename/delete/create apply synchronously with pending flag; reconcile on next patch; rollback + toast on failure.
4. **tree-sitter maximization** *(confirmed gaps)* — (a) **process-lifetime parser + compiled Query per language** — hoist the per-call `new Parser()` in `analyzeHaskell/file.ts:279`, `analyzeDart/file.ts:192`, `analyzeKotlin/file.ts:188`, `analyzeCpp/relation/include/traversal.ts:66` and every sibling analyzer into a language-keyed registry in `core/src/treeSitter/runtime/`; (b) **incremental re-parse** — retain previous `Tree` per open/changed file, `tree.edit(delta)` + `parser.parse(source, oldTree)` on change (currently entirely unused); (c) **worker-pool cold index** — `worker_threads` pool (`os.cpus()-1`, currently zero worker usage in the repo) parsing independent files during cold index; incremental path stays single-threaded and simple.
5. **ladybugdb write scheduling** — hot path uses `patchWorkspaceAnalysisDatabaseCache` exclusively (full save only on re-index); persistence debounced to idle (`saveAsync`), never awaited by a user action; batch record/relation writes into single transactions (`graphCache/database/io/save*.ts`); implements — not contradicts — `docs/plans/2026-06-25-graph-cache-runtime-scheduler.md` (read it first).
6. **Simulation & render budget (react-force-graph levers)** — sim must **stop** after settling (`cooldownTicks`/`onEngineStop` + alpha tuning; keep damping 0.7 defaults as the feel baseline); `warmupTicks` pre-settle on load; `autoPauseRedraw` confirmed; `pauseAnimation()` when the panel hides (`onDidChangeViewState`); glyph sprite cache (offscreen canvas keyed by node style — verify OffscreenCanvas availability in the VS Code webview, else plain hidden canvases); **label LOD** via `globalScale` in `nodeCanvasObject` (Obsidian's text-fade: don't render what can't be read); 3D: verify geometry/material reuse + three-spritetext label caching.
7. **Worker-thread simulation** — if the 10k gates fail on the main thread after (6): run d3-force in a Web Worker; main thread sends structure diffs, worker posts `Float32Array` position buffers (transferables) at ≤ 60Hz; render consumes buffers directly. This stays within react-force-graph by driving it with externally-computed positions (fx/fy per frame or custom `d3Force` no-op + position injection — prototype both, keep the simpler). **This is the last rung before the PixiJS discussion; do not skip it.**
8. **Bridge trimming + watcher storms** — field-access-proxy test finds `IGraphData` fields the webview never reads → strip from wire format; `refresh/scheduler.ts` adaptive coalescing (32ms → 250ms when >20 events pending); 100-file burst = one diff.

- [ ] 3.1 diff protocol → gates 3-A
- [ ] 3.2 layout resets → 3-B
- [ ] 3.3 optimistic ops → 3-C
- [ ] 3.4 tree-sitter (a)(b)(c) → 3-G
- [ ] 3.5 ladybug scheduling → 3-G
- [ ] 3.6 sim/render budget → 3-F, 3-J
- [ ] 3.7 worker sim (only if 3-J fails after 3.6; otherwise check the box with a note) → 3-J
- [ ] 3.8 bridge + storms → 3-D

## Checkpoints (in-window `pnpm perf`, median of 5; ratios are machine-portable, absolutes are machine-independent or same-machine-relative)

| # | Gate | Fixture / scenario | Threshold |
| --- | --- | --- | --- |
| 3-A | Diff payload | `medium`, single save | `payloadBytes` ≤ 10 KB and ≥ 95% below baseline |
| 3-B | Zero resets | `medium`+`large`, single-file ops | `layoutResets` = 0; untouched-node drift 0px pre-reheat |
| 3-C | Explorer ratios | `medium` | rename/create/delete ratios ≤ **1.25**; optimistic update ≤ 1 frame (16ms) |
| 3-D | Watcher | `medium` 1-file / 100-file | ≤ 1.5× Explorer's own refresh / ≤ 1,500ms same-machine |
| 3-E | Warm startup | `self` | `warmOpenMs` ≥ 50% below Phase 1 same-machine baseline (anchor: 4,614ms, PR #294) |
| 3-F | Settled = free | `large`, idle watch | `simTicksAfterSettle` = **0**; `idleCpuPct` < **2%** (Obsidian's documented 8–20% is the anti-goal) |
| 3-G | Dependency wins | `medium`/`large` | incremental `treeSitterParseMs` ≤ 10% of that file's cold parse; cache-write blocking time in file-op scenarios = 0ms; cold index wall-clock on `large` ≥ 40% below baseline with worker pool |
| 3-H | Memory | `huge` | `heapUsedBytes` ≤ 500 MB |
| 3-I | No cold regression | `self` | `coldOpenMs` ≤ baseline +10% |
| 3-J | **10k interaction gate** | **`huge` (10k files)** | opens without freeze; `settleTimeMs` ≤ **15s**; `fpsDrag` ≥ **30**; `fpsIdle` ≥ **60** with sim stopped; no main-thread long task > **200ms** after first paint |

If 3-J is unreachable after Task 3.7: write the PixiJS blocker report (measurements, profiles, which rung failed) to PR #304 + the epic card and continue with other phases — **owner decision** territory.

---

# Phase 4 — Graph Scope & projection flow

## Goal

Graph Scope (symbols, variables, diff edges, per-plugin rows) toggles instantly at any fixture size: toggles are **webview-local projections over already-loaded evidence** — never a host round-trip, never a cache write, never a layout reset. This finishes the Obsidian MetadataCache-style decoupling: the cache/host owns evidence; the view projects it.

## How

Current flow (re-audited 2026-07-10): a scope toggle updates the webview store immediately, the visible graph is projected locally, and node-visibility changes are coalesced to the next animation frame. A separate 80ms persistence batch posts `UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH`; the host writes settings once and echoes control/legend state without a graph payload, Graph Cache write, analysis, or hydration. The remaining boundary is evidence not already loaded (notably first-time symbol enable), plus strict large/10k validation. Symbols/variables multiply node counts (a 1k-file workspace can carry 10k+ symbol nodes), and diff edges (Graph Revision) add another edge class.

### Tasks

- [ ] **4.1 Evidence/projection split:** define the loaded-evidence model in the webview store — the host ships the **superset** graph for the current view (files + symbols + all edge kinds the current settings could show) once; scope rows become webview-local predicate masks over it. Reuse `core/src/visibleGraph/` predicates by importing them into the webview bundle (they're pure core code — verify via `pnpm boundaries` that this respects module boundaries; if not, extract the predicates into a shared-safe module).
- [ ] **4.2 Per-kind indexes:** on evidence load, build index maps once (`Map<nodeKind, Set<id>>`, `Map<edgeKind, Set<id>>`, symbol→file ownership) so any toggle = set-membership filter, O(visible), no re-derivation. Applied via the Phase 3 patch path (node/link add/remove on the live sim data, object identity preserved) — a toggle must not reset layout; newly revealed nodes enter near their owner (symbols spawn at their file's position) so the graph feels physical, not teleporting.
- [ ] **4.3 Hydration protocol (the only allowed round-trip):** when a toggle needs evidence not loaded (e.g. symbols enabled for the first time on the 10k fixture), the webview requests hydration; host streams the missing evidence class from Graph Cache as chunked `GraphDataPatched` messages (chunk size tuned so no single apply exceeds one frame budget); a subtle busy indicator on the toggle row until hydrated. Subsequent toggles of that row are local. Evidence eviction only on explicit workspace change — memory is gated by 3-H/4-D.
- [ ] **4.4 Diff edges (Graph Revision):** revision browsing ships diff evidence as its own edge class in the superset; toggling diff-edge visibility is a mask like any other row; switching revisions hydrates only the changed slice (diff between revision evidence sets, computed host-side with `graph/diff.ts`).
- [ ] **4.5 Scope-toggle battery in `pnpm perf`:** scenario toggles every scope row away/back ×5 at `large` and `huge --symbols`, cold (hydration) and warm (local), recording `scopeToggleMs` per row + `layoutResets` + `cacheSaveMs` during the battery.

## Checkpoints

| # | Gate | Threshold |
| --- | --- | --- |
| 4-A | Warm toggles are local | during warm battery: **0 host messages** carrying graph payloads (assert via message-count instrumentation), 0 cache writes, 0 layout resets |
| 4-B | Warm toggle speed | `scopeToggleMs` warm ≤ **50ms** at `large` and `huge --symbols` (apply ≤ 1 frame per chunk) |
| 4-C | Cold hydration | first symbol-enable on `huge --symbols` streams without any main-thread long task > 100ms; UI stays interactive (input events processed) throughout |
| 4-D | Symbol scale | `huge --symbols` warm toggling keeps `heapUsedBytes` ≤ 3-H budget + 30% |
| 4-E | Revision diffs | switching adjacent revisions on `self` ships ≤ the changed slice (payload ≤ 10× the file-diff size, never the full graph) |

---

# Phase 5 — Desktop interaction model

## Goal

The canvas behaves like a desktop (owner spec, 2026-07-09): background drag = marquee select; selected nodes act as a unit in menus and drags; node drag is physical (edges tug neighbors); Ctrl+drag pans. File-move drag onto folders stays deferred (future epic).

## How — the exact semantics to implement

1. **Marquee:** plain click-drag on empty background draws a selection rectangle; all nodes inside become the selection (replacing it; Shift extends). Marquee machinery exists (`runtime/use/interaction/marquee/`, `marqueeSelection/model`) — the change is making it the **default** background-drag behavior.
2. **Pan:** **Ctrl+click-drag on background pans** the viewport (and trackpad/two-finger + wheel behaviors stay). This inverts react-force-graph's default (pan on plain drag) — implement by intercepting pointer-down on background: no Ctrl → marquee path, Ctrl → hand off to the library's pan. Confirm the interception hooks against the library README/examples first (repo rule); `enablePanInteraction` and the pointer callbacks are the likely levers.
3. **Group drag is physical:** click-drag on a selected node moves the whole selection with the pointer (group drag exists — `interaction/nodeDrag/group.ts`); while dragging, dragged nodes are pinned to the pointer (`fx/fy`) and the simulation is **reheated locally** so spring forces pull connected non-selected neighbors along — the "edges tug their nodes" feel. On release, unpin (or keep pinned if a pin mode is active), let the sim settle, sim stops (Phase 3-F still holds).
4. **Selection-aware context menus:** right-click on any selected node opens the menu for the **entire selection** (exists for open/delete; extend to every multi-capable action from Phase 2 — cut/copy, open variants, favorites); menu header shows target context ("3 files selected" — absorbs the two "context menus should show target context" bug cards); actions apply to all selected; single-only actions (rename, compare-pair) render disabled with a reason tooltip when selection > allowed.
5. Click empty background (no drag) clears selection; Escape clears selection (exists).

### Tasks

- [ ] **5.1 Pointer routing:** background pointer-down router (marquee vs Ctrl-pan vs click-clear); update any onboarding/help copy that mentions drag-to-pan. Acceptance: all three background gestures.
- [ ] **5.2 Physical group drag:** pin-to-pointer via fx/fy + local reheat during drag; measured `fpsDrag` at `large` with a 50-node selection; release settles and stops.
- [ ] **5.3 Selection-context menus:** selection-wide entries + count header + disabled-with-reason rows; wire every Phase 2 multi-capable action; absorbs the two context-target bug cards.
- [ ] **5.4 Interaction acceptance pack + Dev Host walkthrough** with screen recordings (these become Phase 8 material).

## Checkpoints

| # | Gate | Threshold |
| --- | --- | --- |
| 5-A | Gesture routing | acceptance: plain-drag marquee, Ctrl-drag pan, click clears, Shift-marquee extends — all pass; 0 regressions in existing interaction tests |
| 5-B | Physical drag | dragging 1 node with 10 neighbors on `medium`: neighbors displace ≥ some nonzero delta within 250ms (edges visibly tug — asserted on sim positions); `fpsDrag` ≥ 30 at `large` with 50-node selection; sim stops after release (3-F holds) |
| 5-C | Selection menus | every multi-capable action executes against N selected nodes in one invocation (acceptance per action); menu header shows correct count; single-only actions disabled with tooltip at N > 1 |
| 5-D | No perf regression | interaction-burst scenario ≥ Phase 3 numbers (no new long tasks from the pointer router) |

---

# Phase 6 — Feel & polish

## Goal

Explorer conventions exactly: settings, dialogs, inline editing, loading states. V5/V6 land here.

### Tasks

- [ ] **6.1 Destructive-op settings:** `vscode.workspace.fs.delete(uri, {useTrash})` per `files.enableTrash` (V5); `explorer.confirmDelete` with Explorer's exact wording incl. "You can restore this file from the Trash." + persistent "Do not ask me again" (V6). 8 acceptance scenarios ({setting} × {on,off} × single/multi). Commit.
- [ ] **6.2 Inline rename/create on canvas:** HTML input overlay at node screen coords (`graph2ScreenCoords`); Enter commits, Escape cancels, blur commits; V1/V2 errors inline under the input like Explorer's red box; ghost node + inline input for New File/Folder replacing prompts. Commit.
- [ ] **6.3 Cold-open ghost graph:** persist node positions via webview `setState` (cheap persistence — not `retainContextWhenHidden`); render dimmed ghost graph instantly, swap on first data without full re-layout. Pixel gate at t+100ms. Commit.
- [ ] **6.4 Dialog copy audit:** table of every CodeGraphy dialog/toast string vs Explorer's (captured from a real VS Code instance); fix mismatches; unit test locks strings. Commit.

## Checkpoints

| # | Gate | Threshold |
| --- | --- | --- |
| 6-A | Settings matrix | all 8 scenarios pass (V5, V6) |
| 6-B | Inline editing | 0 focus departures; input ≤ 100ms after trigger; V1/V2 inline errors asserted |
| 6-C | Cold open | non-blank canvas at 100ms; `layoutResets` ≤ 1 on cold open |
| 6-D | Copy | 0 unexplained mismatches |

---

# Phase 7 — Plugin ecosystem (modeled on VS Code + Obsidian)

## Goal

CodeGraphy's plugin system adopts the proven patterns from both ecosystems: Obsidian's lifecycle/disposal/data/manifest/template/dogfood model and VS Code's declarative-contribution + lazy-activation discipline — so third-party plugins are easy to write, safe to load, and cheap at startup.

## How — what we adopt from whom

| Pattern | Source | CodeGraphy implementation |
| --- | --- | --- |
| `onload`/`onunload` + base-class-owned disposal (`registerX` auto-clean) | Obsidian | plugin context gains `register(disposable)`, `registerEvent`, `registerInterval`; runtime disposes everything on unload/reload |
| `loadData`/`saveData` → plain JSON file | Obsidian (file-over-app) | `IPluginDataHost` exists in plugin-api — verify it writes plain files under `.codegraphy/plugins/<id>/data.json`; add `onExternalSettingsChange` |
| `manifest.json` + min-app-version (`versions.json`) | Obsidian | plugin manifest schema (id, semver, `minCoreVersion`) validating against plugin-api's required `apiVersion` at load; incompatible = clean refusal with message, never a crash |
| Sample plugin template + watch-mode dev loop | Obsidian | `examples/` gains a `sample-plugin` template (esbuild watch, workspace-local install path, hot reload on rebuild); docs walk zero-to-node-in-graph |
| Declarative contributions + `when`-style gating | VS Code | plugin menu entries (exists: `contextMenu/plugin/entries.ts`) get declarative visibility conditions instead of imperative filtering, evaluated by the runtime |
| Lazy activation / load-time budget | VS Code + Obsidian load-time guide | plugins activate on first relevant file-type/graph event, not at extension activation; per-plugin activation timing recorded via diagnostics |
| Core-as-plugins dogfood | Obsidian | extract Material Icon Theme support into a real plugin using the new lifecycle (absorbs the existing Ideas card) — the proof the API is sufficient |
| Runtime safety | both | zod-validate everything crossing the plugin boundary (extends the existing plugin runtime message validation from `ea798a0fc`); a throwing plugin is disabled with a notification, never takes the graph down |

### Tasks

- [ ] **7.1 Lifecycle + disposal:** add the register/dispose surface to plugin-api (additive; bump `apiVersion` policy documented); runtime enforces disposal on unload/reload; unit tests: leaked-handle detection after unload.
- [ ] **7.2 Manifest + compatibility:** manifest schema + load-time validation + clean refusal path; acceptance: stale-`minCoreVersion` plugin refuses politely.
- [ ] **7.3 Activation discipline:** lazy activation by declared file globs/graph events; per-plugin `pluginActivationMs` metric wired into `pnpm perf`; first-party plugins migrated.
- [ ] **7.4 Sample plugin template + docs:** `examples/sample-plugin` + `docs/plugins/GETTING_STARTED.md` (scaffold → watch → see node in Dev Host graph); the doc's step count is a gate.
- [ ] **7.5 Dogfood — Material Icon Theme as plugin:** extract using only public plugin-api (the sufficiency proof); default-enabled; visual regression via Playwright. Update the Ideas card.
- [ ] **7.6 Crash isolation:** plugin throw during analysis/menu/render contribution → plugin disabled + notification, graph unaffected; acceptance test with a deliberately-throwing fixture plugin.

## Checkpoints

| # | Gate | Threshold |
| --- | --- | --- |
| 7-A | Disposal | leaked-handle test: 0 live registrations after unload for every first-party plugin |
| 7-B | Compatibility | incompatible-manifest fixture refuses with message, extension stays healthy |
| 7-C | Activation budget | every first-party plugin `pluginActivationMs` ≤ **50ms**; none activate at extension startup without a matching file in the workspace |
| 7-D | Template | scaffold-to-visible-node in ≤ **10 documented steps**, verified by executing the doc verbatim in the Dev Host |
| 7-E | Dogfood | Material Icons runs as a plugin via public API only (`pnpm boundaries` proves no private imports); visual regression green |
| 7-F | Isolation | throwing-plugin acceptance test green |

---

# Phase 8 — Proof & showcase

## Goal

Publish reviewable proof: in-window numbers, Explorer side-by-side, Obsidian-limits comparison, interaction reel. Owner validation gates Phase 9.

### Tasks

- [ ] **8.1 Benchmark report:** capped sweep through `huge` (10k) on final branch AND pre-epic baseline commit, same machine; `docs/perf/2026-explorer-parity-report.md` — every Phase 3/4 gate: baseline → target → achieved (PR #294 table format). Include an **Obsidian context table** comparing our measured 10k results with Obsidian's documented ceiling and idle-CPU reports, without generating or running a 30k fixture.
- [ ] **8.2 Explorer side-by-side:** one VS Code window, scripted: each op in Explorer then CodeGraphy (rename, nested create, multi-delete+undo, 100-file checkout absorption), screen-recorded with the same-session ratio table embedded.
- [ ] **8.3 Reels:** (1) file-management tour (nested create → inline rename → cut/paste → multi-delete → undo); (2) snappiness reel (zero-reset save, optimistic rename, checkout as one patch, warm scope toggles on `huge --symbols`); (3) **physicality reel** (marquee → group drag with edges tugging neighbors → Ctrl-pan → settle-and-stop). Under `docs/assets/explorer-parity/`.
- [ ] **8.4 Publish:** media to PR #304 via the repo's Playwright PR-image workflow (`$PWCLI` GitHub profile flow); report + summary comment on the Trello epic; file the **drag-file-to-folder / external-drop follow-up card**; commit final checklist.
- [ ] **8.5 Owner validation:** owner signs off on the epic card or files gap cards. **Phase 9 blocked until sign-off.**

## Checkpoints

| # | Gate | Threshold |
| --- | --- | --- |
| 8-A | Report | all Phase 3 + Phase 4 gates with achieved values; 0 below target (or owner-acknowledged exception inline); Obsidian table with citations present |
| 8-B | Side-by-side | 1 same-window recording + same-session ratio table committed |
| 8-C | Reels + publish | 3 recordings committed; PR media comment live; Trello attachment live |
| 8-D | Follow-ups | drag-file/external-drop card filed and linked |
| 8-E | Sign-off | owner comment exists |

---

# Phase 9 — Cleanup & hardening (post-validation)

### Tasks

- [ ] **9.1 Scaffolding sweep:** perf sampler + scenario command tree-shaken from release bundles (bundle diff proves it); temp flags/settings gone; superseded prompt flows deleted.
- [ ] **9.2 Scoped quality pass:** the quality-tool loop over the epic's hot modules (diff/apply, collision naming, optimistic store, pointer router, projection masks, plugin lifecycle) — iterate until clean. No full-suite mutation run. Dedupe acceptance overlap with the three pre-existing acceptance-test card suites.
- [ ] **9.3 Docs:** perf event catalog → `docs/DIAGNOSTICS.md`; `docs/perf/README.md` (running `pnpm perf`, adding metrics, legitimate baseline updates, reading Explorer ratios); parity checklist → maintenance mode; plugin getting-started finalized.
- [ ] **9.4 Cross-package audit:** `pnpm build` + full suites across all packages; CLI/MCP unaffected by core changes; rebase perf baselines in one dedicated commit referencing the Phase 8 report.
- [ ] **9.5 Board hygiene:** completion comment on every linked child card (owner moves to Done); follow-up cards for every deferred/waived item.

## Checkpoints

| # | Gate | Threshold |
| --- | --- | --- |
| 9-A | Clean bundle | 0 perf-scaffold symbols in release bundle; size ≤ pre-epic +5% |
| 9-B | Quality | hot modules: CRAP ≤ 8, 0 surviving scoped mutants, 0 over-threshold files |
| 9-C | Docs | perf README + diagnostics catalog + plugin docs merged; checklist maintenance-mode |
| 9-D | Baselines | rebased in one commit referencing the report |
| 9-E | Board | 100% child cards commented; follow-ups filed |

---

# Risks / open questions

- **In-window variance:** medians, CV limits (1-C), same-session Explorer ratios, runner-class-scoped CI baselines. If a metric can't get CV < 10%, fix the scenario before gating on it.
- **Pointer-routing conflicts (5.1):** inverting pan/marquee defaults may fight react-force-graph's internal handlers — confirm the interception surface against the README first; if the library can't yield background-drag cleanly, overlay a transparent capture layer that forwards to the library only for Ctrl-pan.
- **Worker-sim ↔ react-force-graph integration (3.7):** two prototype routes named (fx/fy injection vs custom force no-op); if neither holds 60fps hand-off at `huge` (10k), that's the PixiJS blocker report — **owner decision**, never autonomous migration.
- **visibleGraph predicates in the webview bundle (4.1):** must pass `pnpm boundaries`; extraction into a shared-safe module is the sanctioned fallback.
- **`vscode.git` API stability (2.7):** fallback `git status --porcelain` via core's git layer.
- **OffscreenCanvas in VS Code webviews (3.6):** verify availability in the shipped Electron; hidden-canvas fallback specified.
- **tree-sitter 0.25 patched dependency:** incremental-parse work happens on the patched build; the "remove Node 23+ patch" bug card may land first — coordinate, don't fork the patch further.
- **Explorer-ratio honesty:** measured spans must be gesture→visible-update on both sides or ratios are vanity numbers; the 8.2 side-by-side recording is the check.
- **Obsidian comparisons are versus documented limits** (cited), not head-to-head runs — state this plainly in the report; the side-by-side video is Explorer-only.
