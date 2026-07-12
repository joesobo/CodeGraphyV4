# FPS Counter and d3-force-Style Physics

Date: 2026-07-12
Status: Approved
Branch context: builds on `feat/unified-webgpu-renderer` (PR #308), the unified owned-WebGPU renderer with typed-array physics.

## Goals

1. A debug toggle under Settings → Performance that shows a live FPS readout in the bottom-left corner of the graph.
2. Make the graph behave like a proper force-directed layout in the style of react-force-graph and Obsidian — both of which are d3-force. We port d3-force's math into the existing typed-array engine rather than adopting an external library.

## Decisions (locked with owner)

- **Port d3-force math, no external physics dependency.** GraphWaGu and d3-force-webgpu are reference implementations to copy math from, not dependencies. Determinism, the layout worker, benchmarks, and CI stay intact.
- **Benchmarks are re-baselined after tuning.** Gate criteria stay the same (finite layout, responsive drag, ≥30 FPS scripted drag through the 10,000-file tier, collision parity, memory plateau); the recorded numbers are re-captured once the new physics feels right.
- **Sequencing:** FPS counter ships first (it is the measurement tool for the physics work), then physics as its own PR.

## Feature 1: FPS counter

### Setting

- New boolean setting `showFps`, default `false`.
- Rendered as a Switch in `src/webview/components/settingsPanel/performance/Section.tsx`, directly below "Verbose Diagnostics", using the identical pattern: zustand store field (`showFps` / `setShowFps`), `UPDATE_SHOW_FPS` webview→extension message, persistence through the existing simple-settings pipeline (`src/extension/graphView/webview/settingsMessages/updates/simple.ts`, `src/shared/protocol/webviewToExtension.ts`).

### Measurement

- The owned-graph frame loop (`surface/owned2d/frameLoop.ts`) computes an exponential moving average of frame-to-frame deltas for rendered frames only (frames where a render was submitted, not idle rAF ticks).
- The displayed value updates at most ~2 Hz so the counter never causes per-frame React re-renders. Implementation detail: the loop writes into a ref; a lightweight interval or throttled state set publishes to the overlay.
- FPS is added to the `window.__CODEGRAPHY_GRAPH_DEBUG__` snapshot so tests assert on it without pixel reads.

### UI

- Small monospace overlay pinned to the graph stage's bottom-left corner (zoom controls own the bottom-right), e.g. `57 FPS`.
- `pointer-events: none`; mounted only while the toggle is on.

### Testing

- Unit tests for the FPS averaging/throttling math.
- One acceptance scenario: toggle on → counter visible with a finite positive value (via debug snapshot + DOM); toggle off → element absent.

## Feature 2: d3-force-style physics

### Why the current graph does not feel force-directed

- Repulsion only acts within a 3×3 uniform-grid neighborhood (≤24 neighbors), so there is no long-range repulsion; clusters pack instead of fanning out.
- `damping = 0.7` kills velocity far faster than d3's `velocityDecay = 0.4`; motion feels dead.
- Forces are impulse-capped (`maximumSpeed`) rather than alpha-cooled, so settling is abrupt instead of a glide.

### Changes (keeping typed arrays, worker, fixed timestep, determinism)

1. **Barnes–Hut many-body repulsion** replaces the grid-local repulsion in `physics/forces/repulsion.ts`.
   - Flat-array quadtree rebuilt each step; theta ≈ 0.9; math matches d3 `forceManyBody` including distance-squared falloff and per-node strength (existing `chargeStrengthMultipliers` plug in directly).
   - Deterministic: tree build and traversal follow fixed node-index order.
   - The uniform grid remains for collision only.
2. **d3 link force semantics** in `physics/forces/link.ts`: degree-based bias (low-degree endpoint moves more than the hub) and default strength `1 / min(degree(source), degree(target))`, scaled by the user's link-force slider.
3. **d3 cooling model** in `physics/engine.ts` / `physics/integration.ts`:
   - `velocityDecay = 0.4` replaces `damping = 0.7`.
   - Alpha starts at 1, `alphaDecay ≈ 0.0228` (d3 default, ~300 ticks to `alphaMin = 0.001`).
   - Remove `maximumSpeed` clamping from normal operation; keep only a non-finite/explosion safety net (`recoverFinitePosition` stays).
4. **Drag reheat**: while a node is dragged, hold `alphaTarget = 0.3` so neighbors ripple and follow; on release alphaTarget returns to 0 and the layout glides to rest. (d3 `drag` interaction convention, same as Obsidian.)

### Settings mapping (no UI changes)

Existing Forces sliders map onto d3 parameters:

| Slider (existing) | d3 parameter |
| --- | --- |
| Repel force | many-body charge strength |
| Center force | forceX/forceY strength toward origin |
| Link distance | link force distance |
| Link force | link strength multiplier |

Config keys are renamed to match the new semantics: `gravitationalConstant → chargeStrength`, `springLength → linkDistance`, `springConstant → linkStrength`, `damping → velocityDecay`. Defaults tuned to Obsidian-like feel.

### Out of scope / unchanged

- Collision force (works and feels good), pinning, DAG constraints, worker protocol, renderer, picking, camera.
- GPU compute physics (future 100k+ program; force modules should stay 1-force-per-file so each maps to a WGSL kernel later, but no WGSL work now).

### Testing

- Per-force unit tests validated against reference values computed with real `d3-force` (test-only dev dependency) so the ported math is provably equivalent.
- Acceptance scenarios:
  - Spread: two disconnected clusters end up separated (component centroids beyond a distance threshold).
  - Settle: alpha reaches `alphaMin` and node positions stop changing.
  - Drag ripple: dragging a node moves an undragged neighbor.
- Benchmarks: re-run the deterministic tier ladder (500 → 10,000) after tuning and publish fresh baselines with the same pass criteria.

## Risks

- Barnes–Hut is O(n log n) vs the old grid's O(n·24); the 10k tier's settle wall-time and drag FPS will shift. Mitigation: theta tuning, and the re-baseline decision above.
- Removing the speed clamp can let bad inputs explode; the finite-position recovery path must be covered by a unit test.
