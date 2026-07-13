# Physics Performance: Smooth Interactive Force Layout on Large Graphs

PR: https://github.com/joesobo/CodeGraphyV4/pull/308

## Goal

Make the force simulation scale to graphs with thousands of nodes while
dragging keeps the current 500-node feel: neighbors ripple, clusters form
naturally, the layout glides to rest.

Land the work items below correctly and cheaply. Do NOT build or run
large-scale performance suites — validate with the existing fast
unit/reference tests and small fixtures. The owner assesses real-world
performance by hand.

## Constraints

1. **The feel must not change.** The d3-force reference tests
   (`packages/extension/tests/.../owned2d/physics/forces/*.test.ts`) and the
   500-node feel-lock test define "correct".
2. **Determinism stays.** Same graph + settings + interaction script must
   produce the same layout every run: fixed iteration order, no randomness,
   no timing-dependent parallelism within a step.
3. **No new physics dependencies.** (Box2D was evaluated and rejected: it is
   a rigid-body engine, not an n-body solver.) `d3-force` stays test-only.
4. **No GPU compute physics** — future experiment flag, not this work.
5. **Collision behavior is untouched.**

## The bottleneck (measured)

Rendering is fine — the WebGPU renderer draws 10k nodes + edges in
single-digit ms. The problem is `physics/forces/repulsion.ts`: brute-force
all-pairs, O(n²), and it runs on the main thread below the worker threshold.

Owner measurements (2026-07-13, FPS overlay): a 311-node example graph holds
144 FPS · 6.9 ms; the CodeGraphy monorepo (2,224 nodes, 5,236 connections)
drops to 47 FPS · 21.8 ms · 1% low 29. At 2,224 nodes physics is still
main-thread (under the 5,000 threshold), so O(n²) repulsion eats the frame
budget directly. And because frame time (21.8 ms) exceeds the fixed physics
step (16.7 ms) with `maximumSubSteps` clamping, the simulation runs slower
than real time — this is also why dragging feels sluggish next to Obsidian:
the ripple isn't weak, it's late. Items 1–3 fix this.

## Work items, in order

### 1. Barnes–Hut quadtree repulsion (the blocker)

Replace all-pairs repulsion with a Barnes–Hut quadtree matching d3-force's
`forceManyBody`: flat typed-array tree rebuilt each step, deterministic
index-order build/traversal, theta² = 0.81, `distanceMin`/`distanceMax`
semantics, and per-node `chargeStrengthMultipliers` folded into aggregated
cell charges.

Validation: extend the d3-force reference tests to compare whole-layout
results against real d3-force simulations (100–1,000 nodes, small
tolerance). d3 itself uses Barnes–Hut, so matching d3 proves the clustering
feel is preserved. The 500-node feel-lock test must pass unchanged.

### 2. Always-worker physics, zero-copy ticks

- Remove `WORKER_LAYOUT_NODE_THRESHOLD` (`owned2d/layout.ts`): physics
  always runs in the worker; the synchronous engine remains only as the
  fallback when `Worker` is unavailable or fails. Drag stays responsive
  because `setNodePosition` already updates the main-thread copy
  synchronously.
- Kill per-tick allocations in `owned2d/worker/host.ts` / `worker/worker.ts`:
  ping-pong two transferable position/velocity buffer sets instead of
  allocating fresh Float32Arrays each tick.

### 3. Snapshot interpolation for rendering

Render frames interpolate node positions between the last two worker
snapshots, so a graph simulating at 20–30 steps/s still moves smoothly at
display rate. Interpolation is render-only; picking, physics, and persisted
positions use the authoritative simulation state.

### 3b. Step the simulation at display rate (drag-follow feel)

Separate from raw performance: even at 144 FPS, neighbors follow a dragged
node noticeably slower than Obsidian. Root cause: d3/Obsidian advance one
simulation step per animation frame (144 steps/s on a 144 Hz display), while
our fixed-timestep accumulator caps the simulation at 60 steps/s regardless
of render rate — 2.4× fewer convergence steps per wall-second. The force
math and drag `alphaTarget 0.3` already match d3; the step *rate* does not.

Fix: run one fixed-size physics step per rendered frame (d3 semantics —
settle speed tracks refresh rate, which is the Obsidian feel), instead of
accumulating wall-clock time toward 60 Hz. The step itself stays fixed-size
and iteration order stays fixed, so determinism per step count is preserved;
scripted tests keep driving explicit step counts. Worker pacing follows the
render loop's frame callbacks rather than an internal 60 Hz cadence.

Also align `alphaDecay` with d3's default (~300 ticks to settle,
`1 - 0.001^(1/300)`); ours settles in ~150 ticks, cutting the post-release
glide short.

### 4. Lazy picker rebuilds

`synchronizeOwnedFrameState` (`owned2d/frame.ts`) rebuilds the picking index
every frame while positions change. Instead, mark it stale and rebuild on
the first pointer event that needs it.

### 5. Zoom-based label fade

Below a zoom threshold draw no labels (small fade band above it, like
Obsidian). A fully zoomed-out large graph currently still draws every label
sprite; past the threshold that work should be zero.

### 6. Obsidian/d3 visual language: emphasize nodes, dim edges

At monorepo scale our edges dominate and nodes disappear. Study Obsidian's
graph view and d3-force examples and replicate the balance:

- Node radius scales with connection count (hubs visibly larger), plain
  filled circles carrying the visual weight.
- Edges are thin, low-opacity, desaturated hairlines — background texture,
  not foreground strokes. Today they render bright, saturated, and thick.
- Arrows fade out with zoom the same way labels do; at far zoom draw none.

Keep it in the existing WebGPU pipeline (style-stream values + shader
alpha), no new render passes.

### 7. Edge hover at distance

Past a zoom-out threshold, either disable the edge hover tooltip entirely or
add a clear hover indication (highlight the hovered edge) — currently at
distance it is impossible to tell which edge the tooltip refers to.
Preference: disable below the threshold, highlight above it.

## Definition of done

- d3-force reference tests (including the new whole-layout comparison) and
  the 500-node feel-lock test pass.
- Repeated runs of the same scenario produce identical layouts.
- Quadtree correctness covered by unit tests on tree build/traversal.
- No large performance suites added or run; benchmark tiers get re-baselined
  separately afterward.
