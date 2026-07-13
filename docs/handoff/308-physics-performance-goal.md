# Physics Performance Goal: Smooth Interactive Force Layout on Large Graphs

PR: https://github.com/joesobo/CodeGraphyV4/pull/308

## Goal

Make the force simulation scale to large graphs (thousands of nodes) while
dragging stays responsive and feels like the current 500-node experience:
neighbors ripple, clusters form naturally, and the layout glides to rest.
The work items below are the goal — land them correctly and cheaply; do NOT
build or run large-scale performance test suites to prove the numbers.
Validate with the existing fast unit/reference tests and small fixtures.

## Hard constraints (owner decisions)

1. **The feel must not change.** The current force behavior is validated by
   the d3-force reference tests
   (`packages/extension/tests/webview/graph/rendering/surface/owned2d/physics/forces/*.test.ts`)
   and the 500-node feel lock (`test: lock 500-node force feel`). Those tests
   define "correct". Any optimization that changes settled layouts beyond
   the reference tolerances is wrong, with one documented exception: the
   Barnes–Hut approximation below, which must itself be validated against
   real d3-force output (d3 uses Barnes–Hut internally, so matching d3 IS
   matching the target feel).
2. **Determinism stays.** Same graph + same settings + same interaction
   script must produce the same layout every run. All optimizations must use
   fixed iteration order. No `Math.random`, no order-dependent-on-timing
   parallelism inside a single physics step.
3. **No new physics dependencies.** Box2D was considered and rejected: it is
   a rigid-body/contact engine (stacking, joints, restitution), not an
   n-body attraction/repulsion solver — a force-directed graph would have to
   be faked with springs and repulsion fields on top of it, slower and
   further from the d3 feel than what we have. `d3-force` remains a
   test-only reference dependency.
4. **GPU compute physics is out of scope** for this goal. If pursued later it
   goes behind an experiment flag (it breaks benchmark determinism and the
   SwiftShader CI story).

## Why we miss the goal today

Rendering is not the bottleneck. The WebGPU renderer draws 10k nodes +
edges in single-digit milliseconds (instanced SDF quads, split
position/style streams, sprite-cached labels).

The bottleneck is `applyRepulsionForces` in
`packages/extension/src/webview/components/graph/rendering/surface/owned2d/physics/forces/repulsion.ts`:
it is brute-force all-pairs, O(n²). At 500 nodes that is ~125k pair
interactions per step (fine). At 10,000 nodes it is ~50 million pair
interactions per step — hundreds of milliseconds per tick. The worker keeps
the render loop alive, but the simulation itself crawls, so drag feels dead.

## Work items, in order

### 1. Barnes–Hut quadtree repulsion (the blocker)

Replace all-pairs repulsion with a Barnes–Hut quadtree, matching
`d3-force`'s own `forceManyBody` implementation:

- Flat typed-array quadtree rebuilt each step (no per-node object
  allocation), deterministic build and traversal order (node index order).
- Opening criterion theta ≈ 0.81 (d3 default `theta2 = 0.81`), far cells
  approximated by their center of charge.
- Support d3's `distanceMin`/`distanceMax` semantics.
- Per-node charge multipliers (`chargeStrengthMultipliers`) must keep
  working, including in aggregated cell charges.

Validation: extend the existing d3-force reference tests to compare
whole-layout results (not just single force applications) against real
`d3-force` simulations at 100–1,000 nodes within a small tolerance. d3 itself
uses Barnes–Hut, so agreement with d3 proves the clustering feel is
preserved. The 500-node feel-lock test must pass unchanged.

Expected result: repulsion at 10k drops from ~hundreds of ms to single-digit
ms per step. This item alone may reach the goal.

### 2. Worker improvements

- Always run physics in the worker: remove `WORKER_LAYOUT_NODE_THRESHOLD`
  (currently 5,000 in `.../owned2d/layout.ts`) and the size gate entirely.
  The synchronous engine remains only as the automatic fallback when
  `Worker` is unavailable or the worker fails (existing plumbing). Drag
  responsiveness is preserved because `setNodePosition` already applies the
  dragged node's position to the main-thread copy synchronously.
- Eliminate per-tick allocations in the worker protocol
  (`.../owned2d/worker/host.ts` and `worker/worker.ts`): each tick currently
  allocates fresh Float32Arrays in both directions. Use transferable
  double-buffering — two position/velocity buffer sets ping-ponged between
  main thread and worker — so steady-state ticking is zero-copy and
  zero-GC.

### 3. Snapshot interpolation for rendering

When physics runs in the worker, render frames should interpolate node
positions between the last two worker snapshots (fixed-timestep sim,
interpolated render). Then even if a huge graph simulates at 20–30 steps/s,
on-screen motion stays smooth at the display rate and drag feels responsive.
Interpolation must be render-only — picking, physics, and persisted
positions keep using the authoritative simulation state.

### 4. Lazy picker rebuilds

`synchronizeOwnedFrameState` (`.../owned2d/frame.ts`) rebuilds the node
picking index every frame while positions change. Rebuild lazily instead:
mark the index stale on position change and rebuild on the first pointer
event (hover/click/drag) that needs it. Saves O(n) per frame during
settling.

### 5. Zoom-based label fade

Below a zoom threshold, draw no labels at all (with a small fade band above
the threshold, like Obsidian). The sprite cache handles per-label cost, but
a fully zoomed-out 10k view still draws 10k sprites; past the threshold that
work should be zero.

## Explicitly not in scope

- A full scripted 10k drag benchmark scenario (owner declined; existing
  deterministic benchmark tiers stay as-is and get re-baselined after the
  physics work per the earlier decision in
  `docs/superpowers/specs/2026-07-12-fps-counter-and-d3-physics-design.md`).
- GPU compute shaders for forces (future experiment flag).
- Any change to collision behavior — the current collision force and its
  uniform grid stay.

## Definition of done

- 500-node feel-lock and d3-force reference tests pass (with the
  whole-layout comparison added in item 1).
- Deterministic: repeated runs of the same scenario produce identical
  layouts.
- Repulsion complexity is O(n log n) by construction (quadtree), verified by
  unit tests on tree build/traversal — not by large-scale benchmark runs.
- Do not add or run large performance suites as part of this work; the
  owner will assess real-world performance by hand, and the existing
  benchmark tiers get re-baselined separately afterward.
