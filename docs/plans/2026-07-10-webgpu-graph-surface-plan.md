# CodeGraphy WebGPU Graph Surface Plan

> **For agentic workers:** This is the umbrella/handoff plan for the graph
> surface track. Each phase is too large for a single session; when starting a
> phase, write a detailed task-level implementation plan for that phase first
> (superpowers:writing-plans style, checkbox tasks with failing-test steps),
> using this doc's checkpoints as that plan's acceptance criteria.

Sibling plan: [Rust core plan](2026-07-10-rust-core-plan.md) (Track B +
Convergence). The tracks are independent until that plan's C1 phase wires the
core's binary projections into this plan's renderer.

**Goal:** Replace the `react-force-graph` surface with a CodeGraphy-owned
WebGPU 2D renderer plus a custom typed-array physics engine — keeping every
user-visible graph feature working throughout, and removing the 3D and
timeline views along the way.

**Architecture:** The webview hosts React UI around a `GraphRenderer` /
`GraphLayout` seam. Behind it: a WebGPU renderer (instanced SDF nodes, bezier
link strips, CPU spatial-index picking, owned 2D camera) and a headless
struct-of-arrays physics engine (no d3-force), designed so the same buffers
later accept binary projections from the Rust core and a WGSL compute port of
the same physics passes.

**Tech Stack:** TypeScript, React, WebGPU/WGSL, web worker layout, Canvas
fallback via the react-force-graph adapter during migration.

## Source Documents (read these first)

- [WebGPU renderer research](2026-07-09-webgpu-graph-renderer-research.md)
  — renderer/layout seam, migration levels, **Full Replacement Parity Spec**
  (§ by subsystem: physics, nodes, links, camera, picking, render loop, DAG),
  perf budgets, decided open questions.
- [WebGPU source research](2026-07-09-webgpu-renderer-source-research.md)
  — source-backed constraints (VS Code webview/CSP/workers, WebGPU support),
  precedent library notes, renderer module shape.

## Global Constraints (locked decisions — do not relitigate)

- **No d3-force dependency.** The engine stays CodeGraphy-owned, while
  d3-force, Obsidian, and react-force-graph remain explicit architecture and
  behavior references for force semantics, lifecycle, interaction, and LOD.
- **Node collision is mandatory.** Every engine path must enforce node-radius
  collision without NaN/Inf, including coincident-node and pinned-node cases;
  WebGPU integration cannot regress the typed engine's collision pass.
- **3D mode is removed** (`react-force-graph-3d` + Three.js deleted).
- **The timeline view is removed entirely** (view, protocol message,
  contracts, physics branch).
- **Target scale:** smooth 60fps pan/zoom/drag at 100k nodes / 300k edges;
  usable with degraded decoration at 500k edges.
- **End state removes `react-force-graph`**; the adapter is a migration rail.
- Collapse/folder-view grouping is an extension/webview feature applied to
  core data before rendering (the core never learns view visibility).
- Plugins never get raw WebGPU/renderer access; UI via React/DOM slots, data
  via core.
- WebGPU is runtime-probed; a Canvas fallback path must always exist until
  the sibling plan's C3 deprecation checkpoint says otherwise.
- Repo workflow rules apply to every phase: acceptance scenarios for
  user-visible behavior, CRAP ≤ 8, scoped differential mutation testing
  (never full-suite), pre-commit typecheck must pass.
- Every new renderer/layout implementation must also be exercised locally in
  the Extension Development Host's **Open in Editor** view against a larger
  indexed graph. Standalone and sidebar-only checks are not sufficient;
  record the graph size and result in the phase verification notes.

## Phase Sequence

```text
A0 baseline → A1 seam → A2 remove 3D + timeline → A3 physics engine
→ A4 WebGPU MVP → A5 parity → A6 scale/LOD → A7 remove react-force-graph
```

A0/A1 can start today, in parallel with the sibling plan's B0/B1. This track
has no dependency on the Rust core; it runs entirely against the current
extension data layer until the sibling plan's C1.

### Current Execution Status

The implementation is taking a vertical replacement slice before broadening
benchmark coverage: get the CodeGraphy-owned graph in, then remove the old
graph and its product surfaces.

- [x] Make the custom typed-array engine the default 2D layout and replace the
      legacy 2D surface with the CodeGraphy-owned Canvas fallback renderer.
- [x] Validate the replacement in Extension Development Host **Open in
      Editor** with a seed-307 graph of 1,000 nodes and 3,090 edges. The
      committed screenshot, GIF, and interaction timings are under
      `packages/graph-benchmark/references/owned2d/open-editor-1k/`.
- [x] Remove the 3D renderer, toggle/command, legacy d3 physics runtime, and
      all `react-force-graph`, Three.js, and d3-force package dependencies.
- [x] Remove the timeline UI, protocol, provider/indexing/playback, cache,
      git-history/churn implementation, settings, and runtime state; preserve
      ordinary preview/double-click file opening outside timeline modules.
- [x] Add the first WebGPU draw path: feature-detected device/context setup,
      validated WGSL pipelines, instanced SDF node shapes and link quads, dynamic
      `writeBuffer` uploads, device-loss fallback, and Canvas2D overlays.
- [x] Validate the actual WebGPU path (`data-codegraphy-renderer="webgpu"`)
      in Open in Editor with 1,000 nodes / 3,090 edges; commit the composited
      and GPU-only captures plus interaction timing under
      `packages/graph-benchmark/references/webgpu/open-editor-1k/`.
- [x] Add dense-graph LOD, numeric-grid physics broad phase, a dedicated
      iterative node-radius collision pass, camera-input frame budgeting, and
      persistent GPU upload/style buffers; validate 10,000 nodes / 31,089
      edges in Open in Editor at 142.13 requestAnimationFrame-paced camera
      FPS (p95 12.6ms, active physics p50 11.3ms). Evidence is under
      `packages/graph-benchmark/references/webgpu/open-editor-10k/`.
- [x] Move layouts of at least 5k nodes into an inline blob Web Worker with
      transferable typed-array snapshots, pinned-node protection, CSP support,
      and automatic main-thread fallback. Validate 50,000 nodes / 156,264
      edges in Open in Editor at 116.86 camera FPS (p95 10.9ms, max 13.5ms)
      with worker physics dispatch at 0.1ms p50 on the main thread. Evidence is
      under `packages/graph-benchmark/references/webgpu/open-editor-50k/`.
- [x] Cap performance testing at 10k nodes per the owner decision on
      2026-07-10; do not run further 50k/100k performance suites. The earlier
      50k checkpoint remains as historical implementation evidence.
- [x] Add deterministic cycle-tolerant `td`, `lr`, and `radialout` DAG
      constraint targets to the typed engine and worker protocol; validate the
      10k top-down layout in Open in Editor. Evidence is under
      `packages/graph-benchmark/references/webgpu/open-editor-dag-10k/`.
- [x] Complete local verification after removal/parity work: 926 extension
      Vitest files / 5,469 tests, 121 VS Code Playwright scenarios, extension
      source/test/Playwright TypeScript, ESLint, extension-owned physics tests,
      and the production extension/webview build all pass.
- [x] Move the renderer-private physics engine out of a workspace package and
      into focused extension modules (`owned2d/physics/{forces,config,
      initialization,integration,spatialGrid,engine}`); migrate all physics
      tests into the extension suite and remove the package/lockfile edge.
- [x] Restore dense-graph visual parity with GPU-native circle, square,
      rectangle, diamond, triangle, hexagon, and star SDFs; themed fill,
      opacity, border and selected-node outlines; GPU directional arrowheads;
      and viewport-capped Canvas labels/icons/plugin overlays.
- [x] Exercise every force slider at both extrema in Open in Editor on the
      actual WebGPU path. Repel 0–20, center 0–1, link distance 30–500, and
      link force 0–1 all update live and move the layout with zero browser
      errors; screenshot and metadata are committed under
      `references/webgpu/open-editor-force-sliders/`.
- [x] Preserve positions, velocities, pin flags, worker ownership, and camera
      zoom across live graph updates. Five Open in Editor 9k↔10k runs measured
      median 326.2ms to add 1,000 nodes, 346.0ms to remove them, and 49.3ms to
      restyle 900 nodes; evidence is under
      `references/webgpu/open-editor-dynamic-10k/`.
- [x] Add real rendered-edge picking for click, hover information, and context
      menus; make acceptance tests use actual Canvas pointer coordinates rather
      than dispatching events to screen-reader-only edge elements.
- [x] Record a controlled five-run legacy-vs-owned 1k comparison in identical
      headless Chromium conditions. The owned Canvas fallback is 156.54% faster
      in scripted pan/zoom and settles 17.52% faster; the report also discloses
      current regressions in hover p50 (+154.05%) and retained heap (+51.56%)
      rather than presenting them as wins.

### Rollout Gates

Phases ship to users continuously behind a renderer setting: `experimental`
(opt-in, A4) → `default-on with fallback setting` (A5) → `only` (A7). The old
renderer is never broken while it is reachable. A4 adds a WebGPU bench job to
CI if GPU runners are available; otherwise the bench is a documented
pre-release local step with results committed to `docs/plans/benchmarks/`.

---

### A0. Benchmark Baseline And Fixture Harness

Nothing else in this track can be validated without this.

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
- Feel groundwork (see "Feel Engineering" below): the scripted scenario
  format, the Obsidian vault mirror script (one note per fixture node, one
  wikilink per edge), and the committed Obsidian reference recordings +
  derived target bands.

**Checkpoints (deterministic)**

- [ ] `pnpm bench:graph --fixture 10k --renderer current` produces a JSON
      report with fps/settle/latency fields; running twice with the same seed
      produces node counts and identical fixture hashes.
- [ ] Baseline report committed at `docs/plans/benchmarks/baseline-<date>.json`
      for 1k/10k/50k (100k allowed to fail/crawl on current renderer — record
      that fact; it is the motivation).

**Task-level implementation plan (A0)**

Public test seams are the versioned fixture/report interfaces, the
`pnpm bench:graph` CLI, and the standalone built-webview handshake. Work in
vertical red/green slices; do not build all tests or all implementation in a
horizontal batch.

- [x] Add the private benchmark package and a failing determinism test; make
      same seed/config produce the same graph identifiers and valid edge
      endpoints, then run package test/typecheck/lint.
- [x] Add a failing canonical-hash test; implement a versioned streaming
      SHA-256 fixture hash that ignores object key insertion order, then add
      the 1k/10k/50k/100k named presets and topology-shape assertions.
- [x] Add a failing real-export normalization test; implement deterministic,
      sanitized snapshot import and commit 2–3 public real-repo fixtures with
      source revisions and licenses recorded.
- [x] Add failing CLI/report contract tests; implement `--fixture`,
      `--renderer`, `--seed`, output-path, timeout/failure reporting, and the
      stable JSON schema behind `pnpm bench:graph`.
- [x] Add a failing standalone smoke test; serve the built webview, install
      the `acquireVsCodeApi` mock before its bundle loads, inject
      `GRAPH_DATA_UPDATED`, and report current-renderer settle time from
      `PHYSICS_STABILIZED`.
- [x] Add failing metric tests one at a time for percentile math, the scripted
      pan/zoom scenario, rendered FPS/frame times, hover hit-test latency, and
      a separate forced-GC Chromium heap pass; verify each through the CLI.
- [x] Add a failing scenario-schema test; implement the shared deterministic
      feel-scenario format and the fixture-to-Obsidian-vault mirror command.
- [x] Capture and commit Obsidian reference recordings, motion strips, and
      derived target bands for the standard scenarios, preserving the source
      fixture hash and capture environment in metadata.
- [ ] Run the current renderer twice on 10k to verify stable counts/hash, then
      capture committed 1k/10k/50k baselines and a bounded 100k attempt. Run
      the standalone Playwright suite, full local suite, quality gates, and
      record A0 checkpoint evidence before checking off the phase.

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

### A2. Remove 3D Mode And Timeline View

Both are product removals (owner decision): 3D is a gimmick next to the 2D
graph's navigation value, and the timeline view is being cut entirely.

**Deliverables**

- 3D: delete `threeDimensional.tsx`, the 2D/3D mode toggle setting + UI, 3D
  branches (`graphMode: '3d'` paths), `react-force-graph-3d`,
  `three-spritetext` deps, and 3D test mocks.
- Timeline: delete the timeline view/UI, `ITimelineData` and the
  `TIMELINE_DATA` protocol message, timeline contracts
  (`shared/timeline/`), the timeline cooldown branch
  (`TIMELINE_COOLDOWN_TICKS` / `timelineActive`), timeline acceptance
  scenarios, and any extension-side timeline data computation.
- Settings migration: persisted `3d` mode value falls back to `2d` silently;
  stale timeline settings/state are ignored without error.

**Checkpoints**

- [x] `grep -ri "force-graph-3d\|three-spritetext" packages/extension/package.json`
      → no matches; `pnpm build:webview` bundle size recorded and reduced vs
      A1.
- [x] `grep -rin "timeline" packages/extension/src` → no matches (or only
      deliberate migration-shim lines, listed in the PR).
- [ ] Acceptance suite green; a stored `3d` settings value loads as 2D
      without error (regression test exists).

### A3. Custom Physics Engine

Headless typed-array engine per the parity spec §1. No renderer coupling.

**Deliverables**

- Extension-private module `owned2d/physics` (pure TS, zero DOM imports), split
  into focused configuration, initialization, force, integration, grid, and
  lifecycle modules:
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
- Feel harness per the "Feel Engineering" section: headless scenario runner
  computing the §1 motion metrics against `feel-targets.json`; visual layer
  producing motion strips/GIFs per standard scenario; parameter-sweep tuning
  tool emitting ranked metric tables.
- Tuning bench: side-by-side run against the old engine on fixtures.

**Checkpoints**

- [ ] Feel metrics: every standard scenario passes its committed target band
      in the headless harness (CI test); motion strips for the chosen config
      committed next to the Obsidian reference strips.
- [x] Frame-rate independence: the same scenario at 30fps and 120fps tick
      cadence settles to the same layout (test).

- [x] Determinism: same seed + fixed timestep ⇒ identical position buffer
      hash across two runs (unit test).
- [ ] Stability: 10k-node fixture with 100 coincident nodes settles with no
      NaN/Inf and bounded energy (unit test asserts).
- [ ] Settle time on 10k fixture ≤ current engine's baseline from A0.
- [ ] Human feel gate: the structured rubric session from "Feel Engineering"
      §5 (side-by-side with old renderer and Obsidian, fixed action script)
      scores ≥ 4 on every rubric line — recorded in the PR.
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
- Renderer foundations per the Technical Notes appendix below: SDF-smoothstep
  antialiasing, devicePixelRatio-aware sizing, premultiplied-alpha canvas
  config, `writeBuffer`-based instance updates, and a same-frame texture-copy
  export path.

**Checkpoints**

- [ ] With WebGPU force-disabled (probe stubbed false), the app runs the
      fallback adapter — acceptance suite green in that mode.
- [ ] Visual quality: node/edge silhouettes are antialiased with no shimmer
      at DPR 1 and DPR 2, verified at 0.25×/1×/4× zoom in the screenshot
      harness (crops committed alongside the diff report).
- [ ] Export: a screenshot/export call returns the current graph as a PNG
      matching the on-screen frame **including labels** (the DOM label
      overlay is not in the GPU frame — the export path must composite it) —
      automated pixel-diff vs harness capture.
- [ ] Degenerate inputs render without error: empty graph, single node,
      self-loop, multi-edge pair, zero-length link (coincident endpoints),
      and a 0×0 canvas (collapsed panel) — unit/harness tests for each.
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

- Labels: start with a DOM overlay (absolutely-positioned HTML above the
  WebGPU canvas) drawing only the top-N legible labels with zoom-gated fade —
  DOM text is resolution-independent for free and inherits VS Code theme
  fonts. Escalate to an MSDF glyph atlas rendered in-GPU only if the overlay
  proves insufficient at scale; MSDF is the established WebGPU text practice
  (precomputed atlas, resolution-independent via distance-field sampling —
  see Technical Notes). Icons via texture atlas with LOD cutoff; collapse indicators/badges layer; directional arrows and
  GPU-animated particles on curved links; `onRenderFramePost`-equivalent
  overlay pass (marquee rect); accessibility projector, tooltips, and debug
  snapshot fed from the renderer's position/camera data; DAG modes ported
  (decided): all current directions (td/bu/lr/rl/radial) implemented as
  constraint forces in the custom engine — per-node depth is computed from
  the directed graph (cycles broken deterministically, matching current
  behavior), and a positional force pulls each node toward its
  depth × `dagLevelDistance` coordinate on the mode's axis.
- WebGPU renderer becomes default-on where supported; fallback demoted to
  probe-failure path.

**Checkpoints**

- [x] Full acceptance suite green with WebGPU as default renderer (121/121
      local VS Code Playwright scenarios on 2026-07-10).
- [ ] DAG modes: each direction renders a layered/radial layout on a seeded
      DAG fixture; a cyclic fixture degrades deterministically without error
      (matching current behavior).
- [x] Parity checklist derived from the parity spec §2–§7 completed in the
      phase PR (every line: done / explicitly dropped with reason).

**Parity disposition (2026-07-10)**

- Done: owned node bodies, straight/curved links, labels/icons/shapes through
  the Canvas decoration layer, arrows, particles, camera/fit/zoom,
  accessibility projection, tooltips, node picking, marquee/context-menu
  interactions, pin/drag/reheat, filtering, deterministic DAG constraints,
  debug coordinates, and composited PNG/JPEG export.
- Done with dense-graph LOD: decoration Canvas is omitted above 5k nodes and
  low-weight overview edges are deterministically sampled above 250k edges;
  hovered/selected interaction data remains available through the owned model.
- Done: Canvas2D fallback on failed WebGPU probe/device/pipeline, worker failure
  fallback to main-thread typed physics, and device-loss renderer fallback.
- Deliberately removed by owner decision: 3D and timeline/git-history/churn
  product surfaces.
- Deliberately not ported: the legacy object-mutating plugin force adapter. No
  bundled plugin contributes one; a future plugin API revision must expose
  typed-array velocity deltas rather than raw renderer/force objects.

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

- [x] `react-force-graph-2d` (and `d3-force`, if now unused) gone from
      `package.json`; adapter directory deleted; suite green; bundle size
      recorded.

---

## Renderer Technical Notes (research-backed, for A4/A5 implementers)

Grounding for implementation choices so the phase plans don't re-research
them:

- **Antialiasing: SDF smoothstep first, MSAA only if needed.** Nodes are
  SDF-shaded quads, so the cheapest and best AA is analytic: blend the shape
  edge over ~1px of distance-field falloff with `smoothstep` in the fragment
  shader — resolution-independent and free
  ([SDF antialiasing](https://www.redblobgames.com/blog/2024-09-22-sdf-antialiasing/),
  [analytical AA overview](https://blog.frost.kiwi/analytical-anti-aliasing/)).
  Edge strips can use the same trick across their width. WebGPU MSAA is
  limited to sample count 4 (render to a multisampled texture, resolve into
  the canvas —
  [WebGPU multisampling](https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html));
  reserve it as a fallback if geometric silhouettes (arrows, bezier strips)
  visibly alias.
- **DPR and canvas config.** Size the canvas backing store by
  `devicePixelRatio` (webviews inherit editor zoom, so DPR changes at
  runtime — re-size on change); configure the context with
  `navigator.gpu.getPreferredCanvasFormat()` and `alphaMode:
  "premultiplied"` so the graph composites correctly over themed DOM
  backgrounds and under DOM overlays.
- **Buffer updates.** `queue.writeBuffer` on contiguous struct-of-arrays
  instance buffers is the right default (simple, fast, no mapping
  lifecycles); diffs update sub-ranges. Only reach for mapped staging rings
  if profiling shows `writeBuffer` as a bottleneck at 500k edges.
- **Dense-edge blending.** At high edge density, per-edge alpha blending
  with low opacity (Obsidian-style) reads better than opaque lines and is
  order-independent enough in practice; expose it as the dense-mode edge
  style.
- **Screenshot/export.** `getCurrentTexture()` is only valid within the
  frame; capture by rendering to (or copying into) a separate readable
  texture in the same frame, then `copyTextureToBuffer` → PNG encode. Do not
  rely on `canvas.toDataURL` timing.
- **Labels.** DOM overlay first (resolution-independent, themed, accessible);
  MSDF atlas is the proven in-GPU path if needed
  ([WebGPU MSDF sample](https://webgpu.github.io/webgpu-samples/?sample=textRenderingMsdf),
  [SDF/MSDF font guide](https://www.redblobgames.com/articles/sdf-fonts/)) —
  precompute the atlas offline; atlas glyph size trades quality against
  texture weight. Newly patent-free Slug-style vector text (MIT reference
  shaders, 2026) is an alternative to evaluate only if MSDF quality
  disappoints at extreme zoom.
- **Memory sanity check at target scale.** ~32B/node instance data × 100k
  nodes ≈ 3.2MB; ~24B/edge × 500k edges ≈ 12MB — GPU memory is not a
  constraint at the committed tier; design for upload bandwidth and draw
  organization, not for compression.

## Feel Engineering: How An Agent Builds Obsidian-Like Physics

"Feels like Obsidian" is not testable as stated, and an agent cannot perceive
motion. This section turns feel into things an agent can measure, see, and
iterate on — with humans gating only the subjective residue. It governs A3
(engine) and A4/A5 (interaction), and its harness pieces are A0/A3
deliverables.

### 1. Decompose "feel" into measurable properties

Feel is the sum of a small number of motion behaviors. Each gets a metric
computed from position time-series, and a target band committed as JSON
(`packages/graph-benchmark/references/obsidian/feel-targets.json`):

- **Settle**: from load, total kinetic energy decays monotonically after an
  initial peak; settle time (energy < 0.1% of peak) within band (e.g. 1–3s
  on the 1k fixture); at most one visible overshoot (energy curve may have
  ≤ 1 secondary bump). No residual jitter: post-settle per-node position
  RMS < 0.05px/frame at 1× zoom.
- **Drag response**: the dragged node tracks the pointer exactly (it is
  pinned — zero lag by construction). Its 1-hop neighbors follow with
  visible elastic lag: neighbor displacement reaches ~63% of its final value
  within a band of ticks; 2-hop neighbors move less than 1-hop (monotonic
  falloff). On release, the neighborhood re-settles within band with ≤ 1
  overshoot and no oscillation ping-pong (sign of velocity along the
  displacement axis flips ≤ 2 times).
- **Hub stability**: during a leaf-node drag, high-degree nodes' displacement
  stays below a fraction of the leaf's (this is what degree bias buys —
  the graph should feel anchored, not soupy).
- **Slider immediacy**: changing repel/link/distance/center mid-simulation
  changes node motion on the next tick, with bounded max velocity (no
  explosion frame) and re-settle within band. This is Obsidian's signature
  behavior — force sliders feel like a live material, not a restart.
- **Frame-rate independence**: identical scenario at simulated 30fps and
  120fps tick cadence produces the same settled layout (fixed physics
  timestep with accumulator) — feel must not depend on the user's monitor.

### 2. Capture the Obsidian reference once

Build an Obsidian vault from the 1k fixture (script: one note per node, one
wikilink per edge — an A0 deliverable). Screen-record Obsidian's graph for
the standard scenarios below, and extract the target bands from the
recording (settle time by counting frames to visual rest; drag-lag
qualitatively from frame strips). Commit the recordings and the derived
numbers with the fixture. This makes "like Obsidian" a measured reference,
not a vibe — and the agent can re-consult the frame strips at any time.

### 3. The feel harness (agent-runnable, deterministic)

Two layers, both driven by the same **scripted scenario format** (JSON:
initial fixture + timed inputs — `at t=120 ticks, pointerdown node 42, move
along path P over 60 ticks, release; at t=400, set repel to 2×`):

- **Headless layer** (unit-test speed): runs scenarios against the engine
  alone, records position/velocity time-series, computes every metric in §1,
  and asserts against the committed bands. This is the inner tuning loop —
  milliseconds per run, runs in CI, no GPU needed.
- **Visual layer** (harness): replays the same scenarios in the real webview
  via Playwright with synthesized pointer events, capturing a screenshot
  every N frames. Output is a **motion strip** (filmstrip PNG of 12–20
  frames laid side by side) plus an encoded GIF/video per scenario. The
  agent reads motion strips directly — motion is legible as differences
  between adjacent frames (trail length ∝ speed, ghosting = jitter,
  overshoot visible as direction reversal across frames). Golden strips are
  committed; regressions show up as strip diffs a human can also eyeball in
  the PR.

Standard scenarios (minimum set): cold load → settle; drag-leaf-and-release;
drag-hub-and-release; rapid drag shake; each force slider swept mid-sim;
filter swap (half the nodes appear/disappear); pin two nodes and drag the
graph between them; 10k version of load → settle.

### 4. The tuning loop protocol

All engine parameters live in one typed config object (no magic constants in
force code). Tuning is a sweep, not guesswork: the harness accepts a
parameter grid (`repel × linkStrength × damping …`), runs the headless layer
on every combination, and emits a ranked table of metric results. The agent's
loop is: sweep → pick candidates inside all bands → generate motion strips
for the top 3 → compare against the Obsidian reference strips → commit the
chosen config with its metric report. Every tuning PR includes the before/
after strips and the metric table — the human reviews pictures and numbers,
not adjectives.

### 5. Human feel gates (the subjective residue)

Metrics get a candidate into range; a human decides it feels right. At the
end of A3 and again at A5 default-on, the owner runs a structured session:

- side-by-side windows (old renderer / new / Obsidian on the mirrored
  vault), same fixture, unlabeled where possible;
- a fixed script of actions (the standard scenarios, performed by hand);
- a rubric scored 1–5 per property: drag elasticity, settle calm, slider
  liveliness, anchoredness, "would I ship this";
- any score ≤ 3 converts into a new or tightened metric band (the complaint
  must be translated into a number before tuning resumes — this is how
  subjective feedback compounds instead of looping).

The A3 "blind feel check" checkpoint is this session; it passes when every
rubric line scores ≥ 4.

## Edge Cases And Failure Modes (design for these; don't discover them)

Reviewed against the current codebase — each item names the phase that owns
it.

**Lifecycle and environment**

- Webview hide/restore (A4): the graph panel currently uses
  `retainContextWhenHidden: true` (`extension/graphView/editorPanel.ts`), so
  webview destruction is rare — but the GPU device can still be lost while
  retained (sleep, driver reset, GPU process kill). The renderer must
  rebuild pipelines/buffers from CPU-side state on `device.lost` without
  losing camera or positions. Separately: `retainContextWhenHidden` is
  expensive per VS Code guidance — once positions/camera persist cheaply
  through the renderer's own state, re-evaluate dropping it (decision point
  in A5).
- Live renderer toggle (A4): switching the renderer setting at runtime must
  dispose one implementation and mount the other, preserving camera and
  node positions — this is also the mechanism the screenshot-diff harness
  relies on.
- Theme changes (A5): VS Code theme switches at runtime, including
  high-contrast themes. Colors arrive as CSS custom properties — resolve to
  RGBA at upload time and re-upload style buffers on theme change; DOM label
  overlay inherits theme for free.
- Reduced motion (A5): respect `prefers-reduced-motion` — disable particles
  and camera tweens (jump-cut instead), keep the simulation itself.
- Fractional DPR (A4): editor zoom produces DPRs like 1.25/1.5 — round
  backing-store sizes consistently so picking coordinates and CSS pixels
  don't drift by a pixel.

**Data and numeric**

- Node removal and index reuse (A4, biggest structural one): instance
  buffers are index-addressed; removing nodes/edges from a live graph needs
  a compaction or freelist strategy, and the picking index, selection sets,
  and flag buffers must remap atomically with it. Design this into the
  buffer layout before diffs exist (it is also the C1 diff-application
  contract).
- Large projection swaps (A6): a filter change can replace ~100k nodes in
  one message — stage uploads across frames under the frame budget instead
  of one blocking upload + GC spike.
- NaN/precision defense (A3/A4): the engine guards NaN via jiggle, but the
  renderer must also refuse to upload non-finite positions (dev-mode
  assert), and world coordinates should be soft-bounded — f32 precision
  degrades far from origin if a simulation ever drifts.
- Degenerate geometry (A4): self-loops (arc rendering), multi-edges
  (existing per-link curvature), zero-length links (arrow/tangent math must
  not NaN), single-node and empty graphs (`zoomToFit` on an empty/point
  bbox must not divide by zero).

**Interaction**

- Pointer-capture drag (A4): dragging must use pointer capture so leaving
  the canvas (or the webview iframe) mid-drag ends cleanly; define behavior
  for right-click and marquee-start during an active drag (current library
  ignores them — match it).
- Drag-end pin policy is plugin-influenced (A5): plugins decide
  `keepFixedPosition` via `nodeDragEnd` contributions
  (`interaction/nodeDrag/policy.ts`) — the new engine's pin API must expose
  the same post-drag hook, not hardcode release-on-drop.
- Trackpad/gesture input (A4): VS Code webviews deliver pinch-zoom as
  ctrl+wheel and high-resolution wheel deltas on macOS — zoom handling must
  treat both; keyboard zoom/pan parity comes from the existing accessibility
  work.
- Camera never strands the user (A5): clamp zoom/pan so the graph cannot be
  scrolled irrecoverably off-screen, and keep a fit-to-graph escape hatch
  reachable (existing fit control).

**Testing infrastructure**

- jsdom has no WebGPU (A4): unit tests exercise the renderer through its
  interface with a mock GPU device; real-GPU coverage lives in the
  Playwright harness. Headless Chromium needs WebGPU flags on Linux CI
  (`--enable-unsafe-webgpu`, SwiftShader fallback renders but does not
  perf-test) — document the exact flags in the harness README, and treat
  Linux CI as correctness-only, never performance.
- Dispose hygiene (A4): repeated open/close of the graph view must not leak
  GPU buffers, RAF loops, or listeners — harness test loops mount/dispose
  50× and asserts stable memory.

## Risk Register

1. **Physics feel** (A3) — highest subjective risk; mitigated by A0 baseline,
   side-by-side tuning bench, blind feel check, and keeping the adapter rail
   until A7.
2. **WebGPU availability on Linux/VMs** (A4/A5) — fallback is a permanent
   requirement until the sibling plan's C3 says otherwise.

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
  graph surface track's single source of progress truth.
