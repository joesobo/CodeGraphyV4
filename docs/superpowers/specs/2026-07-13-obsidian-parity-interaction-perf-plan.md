# Goal: Make CodeGraphy's WebGPU graph interaction as instant and smooth as Obsidian's

Branch: `feat/unified-webgpu-renderer` (PR #308). Work directly on this branch. You should already have a local worktree as well. Commit often; push to the PR at least every milestone. Do not stop until every acceptance criterion at the bottom is verified with committed numbers. Ignore CI, Playwright e2e, and mutation testing.

## Target experience (reference: Obsidian's graph renderer)

The instant the mouse moves during a drag, the dragged node is at the cursor AND its edge-connected neighbors are visibly pulled along that same frame. All motion is continuous — no pauses, stutters, or teleports. Holding the dragged node still lets the graph smoothly settle around it; releasing lets everything smoothly relax to rest. This must hold from tiny graphs up through 2,500 nodes. The primary metric is **ms frame time** (144 Hz budget = 6.9 ms); FPS is derived, not the target.

## HARD RULE — never gate interaction on simulation "progress"

`worker/host.ts` currently discards the entire physics snapshot when the worker reports `result.steps === 0`. This single behavior kills the core effect of CodeGraphy's graph (frozen neighbors during drag). No code path may ever use "the sim didn't step" as a reason to withhold position updates, skip rendering, or reject user-driven motion. Interaction ALWAYS renders, ALWAYS propagates, regardless of sim step count. Enforce this with a regression test.

## Performance measurement spec

Two distinct rates, both always tracked:

- **Potential FPS (primary optimization target)** = 1000 / (measured CPU ms to produce one complete frame: physics step + geometry + buffer writes + GPU command encode). Deliberately uncapped: it MUST be able to read above 144 on a 144 Hz display when frame work is under budget. The display can only present at refresh rate, but the pipeline must never be limited by that — this number proves how fast we could go.
- **Displayed FPS** = actual presentation rate measured against wall-clock rAF cadence, where missed/frozen frames count as drops. This is what the user experiences; it must read low when the graph visibly stutters.
- **Frame time ms** with avg / max / 1%-high over a rolling window, split into sim ms vs render ms.
- Show an explicit idle state when the sim is deliberately asleep — never a stale frozen number.
- HUD numbers must match harness-measured values within 10% (verified in M1).

## Test sizing philosophy — smallest graph that answers the question

Do NOT default every measurement to big graphs. Pick the smallest fixture that can answer the current question — that keeps iteration loops fast:

- Testing whether the pipeline can exceed 144 FPS / meet the 6.9 ms budget at all? Use a trivial graph — a handful of nodes, one node, even empty. If overhead shows up there, it's pure pipeline cost with zero physics/geometry noise.
- Testing drag latency and neighbor propagation? A small star graph (one hub + a few leaves) is enough.
- Testing scaling behavior (the thing that actually degrades today)? That's when you reach for 500 / 1,000 / 2,500-node fixtures.

Re-run the full tier ladder (tiny / 500 / 1k / 2.5k) at major checkpoints — M1 baseline, after the M3/M4 interaction fixes, and final M5 — not necessarily every milestone; between checkpoints, measure only what the current change needs.

## Current defects (observed at ~2.5k nodes; small graphs are better but neighbors still trail the dragged node more than Obsidian's)

- During a drag on the large graph, neighbors do not move AT ALL until release; after release they lag, then teleport into a settled position.
- Nodes randomly pause and teleport instead of moving continuously.
- The HUD FPS/ms readout does not match perceived smoothness.

## Code-verified starting hypotheses (verify with instrumentation before fixing — read from the code, not guessed)

All under `packages/extension/src/webview/components/graph/rendering/surface/owned2d/`:

1. **Frozen neighbors during drag** — the `steps === 0` snapshot rejection above, compounded by drag never raising the alpha target: `setNodePosition` queues positions but only release calls `setAlphaTarget(0)` (`layoutRuntime.ts` `finishRemovedPointerNode`). Settled sim + drag ⇒ worker returns `steps: 0` ⇒ snapshots rejected ⇒ neighbors frozen until release, then a burst of late snapshots hits the interpolator ⇒ observed lag-then-teleport. Fix: dragging holds a positive alpha target (~0.3, d3-drag convention), decayed on release.
2. **Sim rate chained to render cadence + worker round trip** — the worker steps once per `tick` command and replies via postMessage. Latency = tick compute + structured-clone transfer + interpolation window, all growing with graph size (why small examples feel better; `layout.ts` always uses the worker — no size threshold exists). The sim can never outrun the renderer this way.
3. **Teleports** — `snapshotInterpolator.ts` resets / `directPosition` boundaries plus `preserveAuthoritativeKinematics` (`PENDING_MUTATION_REVISION` races) create discontinuities when snapshots arrive late or mutations race ticks.
4. **Stalls invisible to the HUD** — `frameLoop.ts` renders on-demand (`frameRequestedRef` gating) and `fps.ts` samples only frames that actually rendered.

## Required architecture end-state

- **Decoupled simulation and render loops.** Physics advances on a fixed timestep with an accumulator: each rAF, step the sim as many fixed steps as wall-clock time demands (per-frame CPU budget cap to avoid spiral-of-death). The sim is never throttled by display refresh; if physics is cheap it substeps faster than refresh. No hard-coded 16.67 ms / 60 Hz assumptions anywhere.
- **Zero-latency interaction path.** pointermove → dragged node written → neighbor forces affected → frame rendered, all in the same rAF tick. No postMessage round trip on the interaction path.
- **One physics home, chosen by measurement.** At ≤2.5k nodes a typed-array Barnes-Hut step is likely single-digit ms, so synchronous main-thread physics inside the rAF (Obsidian's model — one hot loop for sim, geometry, draw, no cloning) probably beats the worker. Decide from M2 numbers, then DELETE the losing path entirely (interpolator + transfer-buffer machinery included if the worker goes). Never maintain both.
- **Continuous frame loop while active.** Render every rAF while interacting or alpha is above the sleep threshold; on-demand only when truly idle. Sleep only when motion is imperceptible; wake without jumps.
- **Honest HUD** per the measurement spec above.

## Live progress dashboard — keep it updated the WHOLE time

Run a dashboard locally and tell me what the url is so i can keep track of progress from my phone. After EVERY milestone — and any iteration that meaningfully moves a number — update it to show stuff like:

- **Before/after speedup, front and center**: for each fixture, the baseline captured in M1 vs the current numbers, with the improvement stated plainly (e.g. "drag frame time 91 ms → 8 ms, 11.4× faster"). Only start this comparison AFTER M1 lands, so baseline and current are measured by the same trustworthy instrumentation — never compare against numbers from the old broken meter.
- Current vs baseline per fixture: frame time ms (avg, p95, 1% high, sim vs render split), potential FPS, displayed FPS, input-to-motion latency, freeze count, teleport count.
- The per-subsystem cost-attribution table (M2) with % of the 6.9 ms budget — updated whenever attribution is re-run, not on a schedule.
- Trend chart of frame time ms per fixture across commits.
- Visual evidence: screenshots and short GIFs of scripted drag runs (captured via the harness's headless browser), current vs baseline.

Keep it simple: static HTML + JSON regenerated by a script (`pnpm --filter graph-benchmark dashboard`), served once in the background. Latest info at the top. Updating the dashboard is part of the definition of done for every milestone.

## Iteration discipline — keep loops FAST

Large monorepo: NEVER run repo-wide typecheck or the full test suite per change.

- Typecheck only the touched package (`pnpm --filter <pkg> typecheck`); renderer work touches `packages/extension` only.
- Run only test files covering the modules touched (`vitest run <paths>`).
- Full `packages/extension` typecheck + tests ONLY at milestone boundaries, right before commit+push.
- Measure via the `packages/graph-benchmark` harness on the smallest sufficient fixture; keep a watch build running instead of cold-building.
- Per-iteration loop: pick one defect → measure before → smallest change → scoped typecheck/tests → measure after → commit with before/after numbers in the message → update dashboard at milestones → at major checkpoints, real-editor verification per the section below.

## Real-editor verification — the harness is not the final word

The scripted harness runs headless; the product runs inside a real VS Code webview. At every major checkpoint (M1 baseline, after M3, after M4, final M5) verify in the real editor using the `codegraphy` skill you already have:

1. Use the skill to launch CodeGraphy in a test VS Code window.
2. Open the extension, switch to the "open in editor" view so the graph gets the full editor display.
3. Switch the sidebar view back to the file explorer.

This is exactly how the owner tests it, so it is how we test it. In that setup, do the real interaction pass: drag a hub node around, hold it still, release it — confirm neighbors follow during the drag, motion is continuous, settle is smooth, and the HUD numbers are believable against what you see. If the harness says pass but the real editor feels wrong, the real editor wins: treat it as a defect in either the code or the harness and fix whichever is lying before moving on. Capture the dashboard screenshots/GIFs from this real-editor setup when practical, since it's the ground truth presentation.

## Milestones

**M1 — Trustworthy measurement (FIRST; optimize nothing until numbers are honest).**
Implement the measurement spec (potential FPS, displayed FPS, frame-time breakdown, idle state) in the HUD and harness. Extend the scripted-drag harness to measure, on deterministic fixtures (tiny + 500/1k/2.5k): potential FPS + frame-time ms, displayed FPS against wall-clock rAF cadence, input-to-motion latency (pointermove → dragged node rendered moved, ≤1 frame; → 1-hop neighbor rendered moved, ≤2 frames), continuity (frozen-position frames and implausible-jump frames during drag/settle → must trend to 0), settle (post-release kinetic energy decays monotonically, no late jumps). Sanity-check the harness against ground truth once. Commit baselines for all fixtures — these are the "before" numbers every later improvement is measured against — and stand up the dashboard with them.

**M2 — Lightweight cost attribution (one pass, then on-demand).**
Add cheap, toggleable per-stage timers (off by default, zero cost when off): physics step (worker round trip vs main-thread), snapshot apply + interpolator sample, geometry rebuild, picking/hover, GPU buffer writes + encode, React/props reconciliation. Run ONE attribution pass on the smallest fixture where the slowdown reproduces (plus 2.5k for the scaling picture), commit the stage × fixture table, and use it to order the remaining work. Do NOT regenerate it on a schedule — re-run attribution only when you need a decision it can answer (e.g. the worker-vs-main-thread call in M3, or when M5 asks "what's the next biggest cost?"). Keep the timers in the codebase so a re-run is a flag flip, not new work.

**M3 — Zero-latency, always-alive interaction.**
Remove the `steps === 0` gate (with regression test); drag holds positive alpha target; frame loop runs every rAF while interacting/hot; drag position renders same-tick; make the worker-vs-main-thread call from M2 data and delete the losing path.

**M4 — Decouple sim from display; continuity and settle.**
Fixed-timestep accumulator with substepping and CPU budget; prove decoupling on a trivial fixture first (potential FPS well above 144 while displayed FPS sits at refresh). Eliminate remaining freezes/teleports (interpolation boundaries if any remain, mutation races, premature sleep, wake jumps). Settle is a smooth alpha decay.

**M5 — Throughput.**
Re-run attribution to find the current biggest cost, attack it, repeat — until frame-time targets are met without regressing latency/continuity, working up the fixture ladder as each size comes under budget. Re-run the full ladder, update the dashboard's before/after story, and update the PR description with the same tables.

## Acceptance criteria (all verified by committed harness output + visible on the dashboard)

- **Frame time during scripted drag: ≤ 6.9 ms mean at 500 and 1k (potential FPS > 144); ≤ 16 ms mean / ≥ 60 FPS sustained at 2.5k — then keep pushing 2.5k toward the 6.9 ms budget as the stretch goal.**
- On a trivial fixture, potential FPS reads far above 144 while displayed FPS sits at refresh — proving the pipeline is not display-limited.
- Dragged node moves within 1 frame and 1-hop neighbors within 2 frames of pointermove on all fixtures; neighbors visibly follow DURING the drag at 2.5k.
- Zero frozen frames and zero teleport frames during drag + settle on all fixtures; no code path withholds updates because the sim reported zero steps (regression-tested).
- Smooth monotonic settle after release; sim sleeps only when motion is imperceptible.
- Sim stepping provably decoupled from refresh (fixed timestep + substeps; no 16.67 ms constants); displayed FPS reaches 144 at 500/1k.
- HUD values within 10% of harness values; displayed FPS drops when frames drop.
- Verified by hand in a real test VS Code window (via the `codegraphy` skill, editor view, sidebar back to file explorer): neighbors follow during drag, no stutters/teleports, smooth settle, HUD matches what's on screen.
- Dashboard current with final before/after numbers, speedup summary, trends, screenshots, GIFs (share the URL with me).
- Full `packages/extension` typecheck + unit tests green; everything pushed to PR #308.
