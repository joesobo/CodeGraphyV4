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

## The bottleneck

Rendering is fine — the WebGPU renderer draws 10k nodes + edges in
single-digit ms. The problem is `physics/forces/repulsion.ts`: brute-force
all-pairs, O(n²). At 10k nodes that is ~50M pair interactions per step, so
the simulation crawls and drag feels dead even though rendering stays smooth.

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

### 4. Lazy picker rebuilds

`synchronizeOwnedFrameState` (`owned2d/frame.ts`) rebuilds the picking index
every frame while positions change. Instead, mark it stale and rebuild on
the first pointer event that needs it.

### 5. Zoom-based label fade

Below a zoom threshold draw no labels (small fade band above it, like
Obsidian). A fully zoomed-out large graph currently still draws every label
sprite; past the threshold that work should be zero.

## Definition of done

- d3-force reference tests (including the new whole-layout comparison) and
  the 500-node feel-lock test pass.
- Repeated runs of the same scenario produce identical layouts.
- Quadtree correctness covered by unit tests on tree build/traversal.
- No large performance suites added or run; benchmark tiers get re-baselined
  separately afterward.
