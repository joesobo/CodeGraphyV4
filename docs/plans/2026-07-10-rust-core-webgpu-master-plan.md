# CodeGraphy Rust Core + WebGPU Master Plan

> **For agentic workers:** This is the umbrella/handoff plan for the whole
> program. Each phase below is too large for a single session; when starting a
> phase, write a detailed task-level implementation plan for that phase first
> (superpowers:writing-plans style, checkbox tasks with failing-test steps),
> using this doc's checkpoints as that plan's acceptance criteria. Execute via
> superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Replace CodeGraphy's TypeScript indexing core with an installable
Rust binary (`codegraphy`) serving CLI/MCP/VS Code, and replace the
`react-force-graph` surface with a CodeGraphy-owned WebGPU 2D renderer plus a
custom typed-array physics engine — keeping every user-visible graph feature
working throughout.

**Architecture:** One installed Rust binary (`codegraphy stdio` machine mode,
JSON-RPC control + binary graph frames) owns indexing, SQLite cache, query,
projection/diffs, and the plugin registry. The VS Code extension becomes a
thin protocol client; the webview hosts React UI around a WebGPU renderer and
a headless struct-of-arrays physics engine. One flat binary payload format
flows Rust → extension (opaque) → `postMessage` transfer → GPU buffers.

**Tech Stack:** Rust (tree-sitter, rusqlite/WAL, wasmtime later), TypeScript
webview (React, WebGPU/WGSL, worker layout), JSON-RPC 2.0 with LSP-style
framing, platform-specific VSIXes.

## Source Documents (read these first)

- [Rust core architecture brainstorm](2026-07-09-rust-core-webgpu-architecture-brainstorm.md)
  — core/protocol/plugin/SQLite/remote/distribution design and precedents.
- [WebGPU renderer research](2026-07-09-webgpu-graph-renderer-research.md)
  — renderer/layout seam, migration levels, **Full Replacement Parity Spec**
  (§ by subsystem: physics, nodes, links, camera, picking, render loop, DAG),
  perf budgets, decided open questions.
- [WebGPU source research](2026-07-09-webgpu-renderer-source-research.md)
  — source-backed constraints (VS Code webview/CSP/workers, WebGPU support),
  precedent library notes, renderer module shape.

## Global Constraints (locked decisions — do not relitigate)

- **No d3-force dependency.** Custom engine; d3/Obsidian are study material.
- **3D mode is removed** (`react-force-graph-3d` + Three.js deleted).
- **Browser-hosted VS Code (vscode.dev) unsupported**; show a clear message.
  Remote SSH/WSL/containers **are** supported (binary runs on remote host).
- **Target scale:** smooth 60fps pan/zoom/drag at 100k nodes / 300k edges;
  usable with degraded decoration at 500k edges.
- **End state removes `react-force-graph`**; the adapter is a migration rail.
- Payload rule: **the extension host never parses graph payloads** — binary
  frames pass through untouched via `postMessage` ArrayBuffer transfer.
- Plugins never get raw WebGPU/renderer access; UI via React/DOM slots, data
  via core.
- WebGPU is runtime-probed; a Canvas fallback path must always exist until
  the deprecation checkpoint (C3) says otherwise.
- Repo workflow rules apply to every phase: acceptance scenarios for
  user-visible behavior, CRAP ≤ 8, scoped differential mutation testing
  (never full-suite), pre-commit typecheck must pass.

## Program Shape

Two parallel tracks that meet in a convergence phase:

```text
Track A (webview): A0 baseline → A1 seam → A2 remove 3D → A3 physics engine
                   → A4 WebGPU MVP → A5 parity → A6 scale/LOD → A7 remove RFG
Track B (core):    B0 protocol skeleton → B1 indexer MVP → B2 concurrency
                   → B3 query/projection/diffs → B4 extension sidecar
                   → B5 wasm plugin host → B6 CLI/MCP surfaces
Convergence:       C1 binary path end-to-end → C2 full-loop perf → C3 cleanup
```

Tracks A and B are independent until C1. A0/A1 and B0/B1 can start today, in
parallel. Within a track, phases are sequential.

---

## Track A — Graph Surface

### A0. Benchmark Baseline And Fixture Harness

Nothing else in Track A can be validated without this.

**Deliverables**

- Synthetic fixture graph generators (seeded): 1k/10k/50k/100k nodes with
  realistic degree distribution (power-law-ish, like import graphs), plus 2–3
  real-repo snapshots exported from the current extension.
- A benchmark harness that loads the built webview standalone (reuse the
  existing screenshot harness pattern: build webview, serve over HTTP, mock
  `acquireVsCodeApi`, inject `GRAPH_DATA_UPDATED`) and records: FPS during
  scripted pan/zoom, time-to-settle after load, frame time percentiles,
  interaction latency (hover hit-test), and heap usage.
- A committed baseline report for the current react-force-graph renderer at
  each fixture size.

**Checkpoints (deterministic)**

- [ ] `pnpm bench:graph --fixture 10k --renderer current` produces a JSON
      report with fps/settle/latency fields; running twice with the same seed
      produces node counts and identical fixture hashes.
- [ ] Baseline report committed at `docs/plans/benchmarks/baseline-<date>.json`
      for 1k/10k/50k (100k allowed to fail/crawl on current renderer — record
      that fact; it is the motivation).

### A1. Renderer/Layout Seam

Introduce the interfaces from the research docs; wrap the current library.

**Deliverables**

- `GraphRenderer` and `GraphLayout` interfaces (shape per the research doc's
  "Target Interface Shape" / "Proposed Renderer Module Shape" sections).
- `ReactForceGraphAdapter` implementing both, wired where `Surface2d` +
  physics runtime are used today (`rendering/surface/`, `runtime/physics/`).
- Callers (interaction runtime, fit controls, accessibility, debug snapshot,
  marquee, viewport pan) talk only to the interfaces.

**Checkpoints**

- [ ] Full existing test suite and acceptance scenarios pass **unchanged**.
- [ ] Debug snapshot protocol output for a seeded fixture is identical
      before/after the seam (byte-diff the snapshot JSON).
- [ ] `grep -r "react-force-graph" packages/extension/src/webview` matches
      only inside the adapter directory.

### A2. Remove 3D Mode

**Deliverables**

- Delete `threeDimensional.tsx`, the 2D/3D mode toggle setting + UI, 3D
  branches (`graphMode: '3d'` paths), `react-force-graph-3d`,
  `three-spritetext` deps, and 3D test mocks.
- Settings migration: persisted `3d` mode value falls back to `2d` silently.

**Checkpoints**

- [ ] `grep -ri "force-graph-3d\|three" packages/extension/package.json` → no
      matches; `pnpm build:webview` bundle size recorded and reduced vs A1.
- [ ] Acceptance suite green; a stored `3d` settings value loads as 2D
      without error (regression test exists).

### A3. Custom Physics Engine

Headless typed-array engine per the parity spec §1. No renderer coupling.

**Deliverables**

- New package `packages/graph-engine` (pure TS, zero DOM imports):
  - state: `Float32Array` positions/velocities, `Uint32Array` edge endpoints,
    `Uint8Array` flags (pinned/hidden);
  - forces: grid- or quadtree-based repulsion (Barnes-Hut on CPU), link
    springs with degree bias, center/centroid gravity, iterative collision;
  - integrator with temperature (alpha) annealing, damping, reheat, jiggle;
  - lifecycle: `tick(dt)`, warmup/cooldown, stabilization callback, seeded
    deterministic mode;
  - custom-force API replacing the object-based plugin force adapters
    (positions in, velocity deltas out, temperature-scaled).
- Worker host wrapper (single-file bundle, blob-URL loading per VS Code
  webview worker rules) — may land in A6 if A4 needs to start sooner.
- Tuning bench: side-by-side run against the old engine on fixtures.

**Checkpoints**

- [ ] Determinism: same seed + fixed timestep ⇒ identical position buffer
      hash across two runs (unit test).
- [ ] Stability: 10k-node fixture with 100 coincident nodes settles with no
      NaN/Inf and bounded energy (unit test asserts).
- [ ] Settle time on 10k fixture ≤ current engine's baseline from A0.
- [ ] Blind feel check: owner cannot reliably distinguish old vs new engine
      on the 1k fixture (or prefers the new one) — recorded in the PR.
- [ ] Plugin-force API: existing graph-view force contributions re-expressed
      on the new API in a spike, behavior verified on their fixture.

### A4. WebGPU Renderer MVP

Behind the seam, feature-detected, Canvas fallback intact.

**Deliverables**

- `WebGpuGraphRenderer`: device/adapter acquisition with loss recovery;
  owned 2D camera (zoom/centerAt/zoomToFit/min-max clamp/coords conversion,
  tweened); instanced SDF node bodies with selection/hover/mute states;
  instanced link strips with bezier curvature; CPU spatial-index picking
  (node + link + marquee range query); pointer state machine (hover, click
  vs drag threshold, right-click, background events, drag with pin+reheat);
  damage-model render loop (draw only on tick/camera/interaction/animation).
- Feature detection: `navigator.gpu` probe → fall back to the A1 adapter.

**Checkpoints**

- [ ] With WebGPU force-disabled (probe stubbed false), the app runs the
      fallback adapter — acceptance suite green in that mode.
- [ ] Screenshot diff harness: seeded 1k fixture at 3 zoom levels renders
      within an agreed pixel-diff threshold of the fallback (layout pinned to
      identical positions for the comparison).
- [ ] Bench: 50k fixture ≥ 60fps scripted pan/zoom on the dev machine;
      hit-test < 16ms (from A0 harness, `--renderer webgpu`).
- [ ] Hit-test parity: table of (fixture, screen point) → picked id matches
      the fallback renderer on 20 sampled points (automated).

### A5. Full Feature Parity

Work through the parity spec §2–§8 until the WebGPU renderer is the default.

**Deliverables**

- Labels: top-N visible Canvas2D/DOM overlay with zoom-gated fade (MSDF atlas
  only if the overlay proves insufficient); icons via texture atlas with LOD
  cutoff; collapse indicators/badges layer; directional arrows and
  GPU-animated particles on curved links; `onRenderFramePost`-equivalent
  overlay pass (marquee rect); accessibility projector, tooltips, and debug
  snapshot fed from the renderer's position/camera data; DAG modes ported
  (decided): all current directions (td/bu/lr/rl/radial) implemented as
  constraint forces in the custom engine — per-node depth is computed from
  the directed graph (cycles broken deterministically, matching current
  behavior), and a positional force pulls each node toward its
  depth × `dagLevelDistance` coordinate on the mode's axis.
- Timeline replay parity: the timeline data path (`ITimelineData` messages,
  timeline cooldown behavior) works on the WebGPU renderer + custom engine.
- WebGPU renderer becomes default-on where supported; fallback demoted to
  probe-failure path.

**Checkpoints**

- [ ] Full acceptance suite green with WebGPU as default renderer.
- [ ] DAG modes: each direction renders a layered/radial layout on a seeded
      DAG fixture; a cyclic fixture degrades deterministically without error
      (matching current behavior).
- [ ] Timeline replay runs visually correctly on the WebGPU renderer
      (existing timeline acceptance scenarios pass).
- [ ] Parity checklist derived from the parity spec §2–§7 completed in the
      phase PR (every line: done / explicitly dropped with reason).
- [ ] Platform matrix run recorded: macOS (Metal), Windows (D3D12), Linux
      (may fall back — must do so cleanly), device-loss recovery (suspend or
      `device.destroy()` test) — manual checklist in the PR.

### A6. Scale And LOD

**Deliverables**

- Worker-hosted layout (if not landed in A3); dense-graph mode hiding in
  order: particles → icons → labels (keep hovered/selected) → arrows →
  low-weight edges; viewport culling where measurable; frame budgeting.

**Checkpoints**

- [ ] Committed targets met on bench harness: 60fps pan/zoom/drag at 100k
      nodes / 300k edges; usable at 500k edges; results committed to
      `docs/plans/benchmarks/`.
- [ ] Main thread: no frame > 33ms from layout work during interactive
      simulation on the 100k fixture (trace recorded).

### A7. Remove react-force-graph

**Checkpoints**

- [ ] `react-force-graph-2d` (and `d3-force`, if now unused) gone from
      `package.json`; adapter directory deleted; suite green; bundle size
      recorded.

---

## Track B — Rust Core

### B0. Protocol Spec + Skeleton

**Deliverables**

- Crates: `codegraphy-cli` (binary), `codegraphy-core`, `codegraphy-protocol`.
- `codegraphy stdio`: JSON-RPC 2.0 over LSP-style `Content-Length` framing;
  `initialize` handshake exchanging protocol + binary-format versions;
  `$/cancelRequest`, `$/progress`; binary frame channel (length-prefixed
  frames referenced by id from JSON results).
- Written protocol spec in-repo (`docs/protocol.md`): every method from the
  brainstorm doc's list with request/response schemas, revision semantics
  (every projection/diff carries its source revision; missed diff ⇒ client
  requests snapshot).

**Checkpoints**

- [ ] Integration test: spawn binary, initialize, mismatched version is
      refused with a typed error; `cargo test` green in CI for the crate
      workspace.
- [ ] A TS test client (in-repo) round-trips a request and receives a binary
      frame ≥ 1MB intact (checksum verified).

### B1. Indexer MVP + Differential Harness

**Deliverables**

- Tree-sitter parsing (start: TypeScript/JavaScript + Markdown — the near-core
  languages), SQLite schema (WAL, migrations table), files/symbols/relations
  tables, FTS index for symbol search; `codegraphy index`, `codegraphy
  status`. This subsumes and eventually replaces the existing
  `packages/core/src/graphCache` database layer — study its records/query
  modules for the fact model before designing the schema.
- **Differential harness** (the phase's centerpiece): index the fixture/example
  repos (`examples/`) with both the current TS core and the Rust core; diff
  emitted nodes/edges; report format committed.

**Checkpoints**

- [ ] Differential report on all example repos: 100% node parity, edge parity
      ≥ 99% with every discrepancy triaged in the report (bug vs accepted
      improvement).
- [ ] Index throughput recorded; target: full index of the CodeGraphy repo
      itself ≥ 5× faster than the current TS core on the same machine.
- [ ] `codegraphy index && codegraphy status` on a fixture repo exits 0 and
      reports counts matching the harness.

### B2. Concurrency, Watching, Incremental

**Deliverables**

- WAL + busy_timeout; single-writer election (advisory lock + PID/heartbeat,
  reader promotion); `notify`-based watcher owned by the elected writer;
  debounced incremental re-index; revision counter + change notification to
  connected clients.

**Checkpoints**

- [ ] Test: two `codegraphy stdio` processes on one workspace — exactly one
      indexes (assert via status); kill the writer; the reader promotes and
      indexing resumes (integration test, deterministic with heartbeat
      timeout override).
- [ ] Incremental: touching one file re-indexes only that file's scope;
      end-to-end update visible to a subscribed client < 500ms on the fixture
      repo (test with timing assertion, generous CI margin).
- [ ] Schema migration under contention: writer migrates, concurrent reader
      never observes a half-migrated schema (test).

### B3. Query, Projection, Diffs

**Deliverables**

- Query engine: search/filter/sort/scope/graph traversal matching the current
  extension's data layer semantics; visible-graph projection as
  struct-of-arrays binary frames (format doc committed — this format is the
  C1 contract, co-designed with Track A's buffer layout); `getGraphDiff`
  between revisions; node/edge detail lookup.
- Feature semantics that must be first-class in the projection model (all
  exist in the extension today and are easy to forget): collapse/folder-view
  state (collapsed groups change the visible projection, not just styling);
  timeline data (`ITimelineData` — decide whether timeline frames are served
  by core or remain extension-computed, and record it); persisted layout
  positions keyed by stable node identity, with a defined rename/move policy
  (content-assisted identity or explicit position migration on rename —
  positions must survive common refactors).
- Settings ownership split, documented: settings that affect indexed data or
  projections (filters, scopes, plugin enablement) live in/flow through core;
  purely visual settings stay extension/webview-side.

**Checkpoints**

- [ ] Golden tests: projections for seeded fixtures byte-stable across runs.
- [ ] Diff soundness property test: snapshot(rev A) + diffs(A→B) ==
      snapshot(rev B) for randomized edit sequences.
- [ ] Query latency: filter+search+projection on 100k-node synthetic
      workspace < 50ms (bench in CI, informational not blocking).

### B4. Extension Sidecar Integration

**Deliverables**

- Extension spawns/discovers the binary (bundled per-platform VSIX using the
  existing tree-sitter-natives pipeline; `codegraphy.path` override); process
  lifecycle (restart on crash, version handshake surfacing); extension data
  layer swapped to protocol client behind its existing interface; web
  environment detection → "requires desktop VS Code" notice; Windows
  binary-lock update workaround; diagnostics: core stderr/log stream surfaced
  in a VS Code output channel, `codegraphy status --json` wired into an
  extension "doctor" command for bug reports.

**Checkpoints**

- [ ] Acceptance suite green with the Rust core supplying graph data.
- [ ] Manual matrix recorded in PR: local macOS, local Windows, Remote SSH
      (binary on remote), WSL, dev container; each loads a graph.
- [ ] Kill the core process mid-session: extension restarts it and recovers
      the view via snapshot resync (integration test).

### B5. Wasm Plugin Host + Plugin Migration

**Deliverables**

- Wasmtime component-model host; WIT interface exposing parse-once AST/query
  access, fact emission, and manifest-declared UI contribution descriptors;
  fuel/epoch limits; `codegraphy plugin install/list/enable`.
- Per-plugin migration (decided): **no JS compatibility host in this
  program.** All plugins are first-party and in-repo, so embedding a JS
  engine in the Rust core to run four of our own plugins is a large subsystem
  with no payoff. typescript + markdown fold into core as built-ins;
  godot/unity/vue/svelte are rewritten as Rust→wasm plugins, validated by the
  differential harness; particles stays webview-only. An Oxc-style JS host
  remains a documented future option if a third-party TS plugin ecosystem
  materializes — it is explicitly out of scope here.

**Checkpoints**

- [ ] Differential parity per migrated plugin on its example repo (same
      harness as B1).
- [ ] Sandbox test: a plugin that infinite-loops is terminated by
      fuel/epoch limit without stalling indexing (integration test).
- [ ] Extension renders plugin UI contributions purely from core descriptors
      (no plugin-specific extension code) for one migrated plugin.

### B6. CLI + MCP Surfaces

**Deliverables**

- Human CLI (`index`, `query`, `status`, `plugin …`) with stable JSON output
  mode; MCP adapter (`codegraphy mcp`) exposing the same tools the current
  `packages/mcp` provides, backed by the core protocol.

**Checkpoints**

- [ ] Existing MCP package's tool-level tests pass against the new adapter
      (or a mapped equivalent suite); old TS MCP package deleted.
- [ ] `codegraphy query --json` output schema documented + golden-tested.

---

## Convergence

### C1. Binary Path End-To-End

Wire B3's binary projections through the extension (opaque pass-through) into
A4/A5's GPU buffers.

**Checkpoints**

- [ ] Assertion in code + test: extension host performs zero
      parse/re-serialize of projection frames (frames pass through with only
      envelope handling; verified by checksum at both ends).
- [ ] Trace on the 100k fixture: core-emit → GPU-buffer-written < 100ms for a
      full projection swap; diffs < 16ms.
- [ ] Remote SSH: same flow over the remote channel; diff-driven update after
      a file save < 1s end-to-end (manual, recorded).

### C2. Full-Loop Performance Validation

- [ ] The A0 harness, now driven by the real core on real repos, meets every
      committed budget (60fps at 100k/300k; index 5× baseline; interactive
      force sliders reflected next frame). Results committed as the program's
      exit report.

### C3. Cleanup And Deprecation

- [ ] Old TS indexing/data-layer code deleted from `packages/core`/extension;
      react-force-graph adapter deleted (A7 done); docs updated; decision on
      keeping the Canvas fallback long-term recorded (based on A5 platform
      matrix + telemetry if available).

---

## Shipping Strategy During Migration

Phases ship to users continuously; nothing waits for the end state.

- Track A phases ship behind a renderer setting: `experimental` (opt-in,
  A4) → `default-on with fallback setting` (A5) → `only` (A7). The old
  renderer is never broken while it is reachable.
- Track B ships dark first: B4 can ship with a `useRustCore` experimental
  setting, running the differential harness in CI on every release until
  cutover confidence is earned.
- CI grows two new legs when B0 lands: a Rust workspace job (fmt, clippy,
  `cargo test`) and a cross-platform binary build matrix feeding the
  platform VSIXes; A4 adds a WebGPU-capable browser bench job (or a
  documented local-only bench policy if CI GPUs are unavailable).
- Version discipline: extension and binary versions are released in lockstep
  while bundled; the protocol handshake makes any drift a clean error, not
  silent corruption.

## Risk Register (watch these; each has a checkpoint above)

1. **Physics feel** (A3) — highest subjective risk; mitigated by A0 baseline,
   side-by-side tuning bench, blind feel check, and keeping the adapter rail
   until A7.
2. **WebGPU availability on Linux/VMs** (A4/A5) — fallback is a permanent
   requirement until C3 says otherwise.
3. **Fact parity of the Rust indexer** (B1/B5) — the differential harness is
   the safety net; no phase advances with untriaged discrepancies.
4. **Payload path regressions** (C1) — any hop that reintroduces per-node JS
   objects silently erases the win; the zero-parse checksum test guards it.
5. **Scope creep in plugin host** (B5) — WIT surface starts minimal
   (parse-once queries + facts + UI descriptors); anything more is a new
   decision.

## Handoff Notes

- Worktree/PR conventions, acceptance-spec ownership guard, and pre-commit
  typecheck are enforced by hooks — commits will run them.
- Quality loop: acceptance scenarios first for user-visible behavior; CRAP ≤ 8
  on changed code; differential (scoped) mutation testing only.
- Benchmarks live in `docs/plans/benchmarks/`; every perf checkpoint commits
  its JSON so trends are diffable.
- When a phase starts: (1) re-read the relevant research doc section, (2)
  write the task-level plan, (3) copy this doc's checkpoints in as acceptance
  criteria, (4) tick checkboxes here as phases complete — this file is the
  program's single source of progress truth.
