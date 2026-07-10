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

- **No d3-force dependency.** Custom engine; d3/Obsidian are study material.
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

## Phase Sequence

```text
A0 baseline → A1 seam → A2 remove 3D + timeline → A3 physics engine
→ A4 WebGPU MVP → A5 parity → A6 scale/LOD → A7 remove react-force-graph
```

A0/A1 can start today, in parallel with the sibling plan's B0/B1. This track
has no dependency on the Rust core; it runs entirely against the current
extension data layer until the sibling plan's C1.

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

- [ ] `grep -ri "force-graph-3d\|three-spritetext" packages/extension/package.json`
      → no matches; `pnpm build:webview` bundle size recorded and reduced vs
      A1.
- [ ] `grep -rin "timeline" packages/extension/src` → no matches (or only
      deliberate migration-shim lines, listed in the PR).
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

- [ ] Full acceptance suite green with WebGPU as default renderer.
- [ ] DAG modes: each direction renders a layered/radial layout on a seeded
      DAG fixture; a cyclic fixture degrades deterministically without error
      (matching current behavior).
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
