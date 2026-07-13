# Physics Performance: Smooth Interactive Force Layout on Large Graphs

PR: https://github.com/joesobo/CodeGraphyV4/pull/308

## Goal

Match Obsidian's graph feel and readability at scale: dragging ripples
through neighbors immediately, clusters form naturally, the layout glides to
rest, and nodes — not edges — carry the visual weight.

Land the work items below correctly and cheaply. Do NOT build or run
large-scale performance suites — validate with the existing fast
unit/reference tests and small fixtures. The owner assesses real-world
performance by hand.

## Already landed (context, do not redo)

Barnes–Hut quadtree repulsion, always-worker physics with the synchronous
fallback, zero-copy worker ticks, and snapshot interpolation for rendering.

## Constraints

1. **The feel must not change** except where an item says otherwise. The
   d3-force reference tests
   (`packages/extension/tests/.../owned2d/physics/forces/*.test.ts`) and the
   500-node feel-lock test define "correct".
2. **Determinism stays.** Same graph + settings + scripted steps produce the
   same layout every run: fixed step size, fixed iteration order, no
   randomness.
3. **No new physics dependencies; no GPU compute physics.** `d3-force` stays
   test-only.
4. **Collision behavior is untouched.**

## Work items, in order

### 0. Stop discarding worker ticks during drag (critical bug)

Observed on the CodeGraphy monorepo (2,593 nodes): dragging a node moves no
neighbors at all, and on release the graph freezes then teleports into its
settled positions.

Cause, in `owned2d/worker/host.ts`: `handleTickMessage` discards the whole
tick snapshot whenever `message.mutationRevision !== this.mutationRevision`.
Every pointermove during a drag bumps the revision twice (`setNodePosition`
and `pin` in `interaction.ts`), so during any drag every tick result arrives
stale and is dropped — the worker simulates the ripple and the host throws
it away. Meanwhile the worker keeps integrating unseen at `alphaTarget 0.3`,
so the first accepted snapshot after release jumps ("teleport").

Fix:
- Split the revision. Kinematic mutations (`setNodePosition`, `pin`,
  `release`, `setAlpha*`, `reheat`) must NOT cause tick results to be
  discarded — the pinned-node overwrite that already follows acceptance
  keeps the dragged node authoritative. Only structural changes
  (`init`/`setGraph`, `setConfig`, `setHidden`) may invalidate a tick.
- Pin once at drag start instead of on every pointermove, and coalesce
  `setNodePosition` posts to one per animation frame.

Acceptance: dragging a hub on a large graph visibly pulls its neighbors
while the pointer is moving, and release glides smoothly — no teleport.

### 1. Step the simulation at display rate (the drag-follow fix)

Even at 144 FPS, neighbors follow a dragged node slower than Obsidian. The
force math and drag `alphaTarget 0.3` already match d3 — the step rate does
not: d3/Obsidian advance one simulation step per animation frame (144
steps/s on a 144 Hz display), while our accumulator caps physics at 60
steps/s regardless of render rate.

Fix: run one fixed-size physics step per rendered frame instead of
accumulating wall-clock time toward 60 Hz. Settle speed then tracks refresh
rate — exactly d3/Obsidian semantics. Determinism is preserved because the
step size and iteration order stay fixed; scripted tests keep driving
explicit step counts. Worker pacing follows the render loop's frames, not an
internal 60 Hz cadence.

Also align `alphaDecay` with d3's default `1 - 0.001^(1/300)` (~300 ticks to
settle); ours settles in ~150, cutting the post-release glide short.

### 2. Obsidian/d3 visual language: emphasize nodes, dim edges

At monorepo scale (2k+ nodes) our bright thick edges dominate and nodes
disappear. Replicate Obsidian's balance:

- Node radius scales with connection count (hubs visibly larger); plain
  filled circles carry the visual weight.
- Edges are thin, low-opacity, desaturated hairlines — background texture.
- Arrows fade out with zoom like labels; at far zoom draw none.

Keep it in the existing WebGPU pipeline (style-stream values + shader
alpha), no new render passes.

### 3. Zoom-based label fade

Below a zoom threshold draw no labels (small fade band above it, like
Obsidian). A fully zoomed-out large graph currently still draws every label
sprite; past the threshold that work should be zero. This is the prime
suspect for the measured 44.5 ms frames on the zoomed-out monorepo view
(2,593 labels drawn per frame) — confirm with the
`__CODEGRAPHY_WEBGPU_PERF__` sample split (`overlayMs` vs `gpuMs` vs
`physicsMs`) before and after.

### 4. Edge hover at distance

Past a zoom-out threshold, disable the edge hover tooltip; above it,
highlight the hovered edge so it is clear which edge the tooltip refers to.

### 5. Lazy picker rebuilds

`synchronizeOwnedFrameState` (`owned2d/frame.ts`) rebuilds the picking index
every frame while positions change. Instead, mark it stale and rebuild on
the first pointer event that needs it.

## Definition of done

- d3-force reference tests and the 500-node feel-lock test pass (updated
  where item 1 intentionally changes step pacing).
- Repeated runs of the same scripted scenario produce identical layouts.
- No large performance suites added or run; benchmark tiers get re-baselined
  separately afterward.
