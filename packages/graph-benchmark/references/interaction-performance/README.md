# Interaction performance evidence

This directory contains the committed evidence for the Obsidian-parity interaction performance plan.

## Metrics

- **Potential FPS** is `1000 / mean CPU frame work`, where CPU work includes the completed physics step plus synchronization, geometry/buffer preparation, GPU command encoding/submission, and overlay work.
- **Displayed FPS** is rendered presentations divided by elapsed wall-clock time. Missing frames lower this value.
- **Frame time** reports mean, p95, p99 (the 1%-high value), and maximum CPU milliseconds, with simulation and render distributions retained separately.
- **Target latency** counts rendered frames after the pointer handler records an input until the dragged node reaches that input position. Each frame carries the latest handled-input sequence so an older frame whose rAF timestamp happens to follow the native event timestamp cannot be miscounted as post-input work.
- **Neighbor latency** uses the same execution-order boundary and counts post-input rendered frames until one-hop neighbor motion.
- **Freeze and teleport counts** use the versioned thresholds stored in each report's `configuration.interactionThresholds`.
- **Settle continuity** evaluates a rolling RMS kinetic-energy envelope after release and records whether sleep energy is imperceptible.
- **HUD agreement** independently recomputes metrics from raw frame records and compares them with the product HUD's rolling sample. Every displayed metric must be within 10%.

Headless Chromium on this machine presents near 60 Hz. Headless runs therefore prove CPU potential and honest dropped-frame accounting. Use `--headless false` on a high-refresh display when validating the displayed-rate gate; reports preserve headed/headless mode in `environment.headless`.

## M1 baseline

The clean-source baseline was captured at revision `a5b6360acb80b4657d8f07f99e3657a3ac6d2bf3` with three independent runs per fixture. `--memory-cycles 0` deliberately excludes the legacy reopen/close memory test: M1 measures interaction, and memory cycling is neither an interaction acceptance criterion nor allowed to obscure a completed 2.5k drag measurement.

| Fixture | Mean CPU frame | p95 | 1%-high | Sim / render | Potential / displayed FPS | Target / neighbor latency | Frozen / teleports | Settle violations | HUD max difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| tiny | 0.31 ms | 0.60 ms | 0.70 ms | 0.08 / 0.23 ms | 3,232 / 60.00 | 1 / 1.67 frames | 0.33 / 0 | 1 | 0.94% |
| 500 | 7.57 ms | 8.13 ms | 8.87 ms | 6.42 / 1.15 ms | 132 / 60.00 | 1 / 3 frames | 1 / 0 | 0 | 0% |
| 1k | 5.32 ms | 6.07 ms | 6.53 ms | 3.29 / 2.03 ms | 188 / 59.95 | 1 / 3 frames | 1 / 0 | 0 | 0% |
| 2.5k | 11.05 ms | 12.73 ms | 15.83 ms | 7.53 / 3.52 ms | 90 / 59.84 | 1 / 3 frames | 1 / 0 | 0 | 0% |

The reports in `m1-baseline/` are the immutable comparison point for later milestones. Reproduce one fixture with:

```bash
pnpm --filter @codegraphy-dev/graph-benchmark bench:graph \
  --fixture 500 --renderer current --runs 3 --memory-cycles 0 \
  --idle-ms 1000 --timeout-ms 120000 --output reports/m1-500.json
```

The real-editor pass in VS Code 1.128.0 used the editor graph with Files Explorer restored in the sidebar. Its 18-step hub drag moved the connected neighbor on all 18 sampled steps, measured one-frame target and neighbor latency, zero freezes and teleports, and active HUD agreement within 0.40%. It also confirmed the explicit final `Idle` state and retained one non-monotonic settle-envelope violation as an honest baseline defect. See `m1-baseline/real-editor-validation.json`, the screenshots, and the GIF.

## M2 attribution and physics-home decision

The explicitly armed profiler performs no clock reads while disabled. Three clean-source runs per profile at revision `90540a889bafd1e556d91d981179a4915a0b602b` measured the worker and the existing main-thread fallback at the smallest failing fixture (500) and at 2.5k. Values below are milliseconds per rendered frame; worker round trip is latency, not additive frame CPU.

| Fixture / home | Complete CPU frame | Physics CPU | Worker round trip | Snapshot / sync / interpolation | Style + geometry | GPU write + encode | Canvas + overlay | React / props | Neighbor latency / freezes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500 / worker | 7.72 | 6.54 | 6.63 | 0.02 | 0.70 | 0.04 | 0.39 | 0.07 | 2.33 / 0.67 |
| 500 / main thread | 5.51 | 4.50 | — | 0.01 | 0.59 | 0.04 | 0.35 | 0.06 | 1 / 0 |
| 2.5k / worker | 11.07 | 7.50 | 9.70 | 0.11 | 2.78 | 0.06 | 0.61 | 0.06 | 2.67 / 1 |
| 2.5k / main thread | 10.15 | 6.54 | — | 0.08 | 2.83 | 0.06 | 0.62 | 0.06 | 1 / 0 |

**Decision:** main-thread physics wins. At 500 it is 1.40× faster and at 2.5k it is 1.09× faster, remains under the 16 ms requirement, removes 6.63–9.70 ms worker round-trip latency, and eliminates the measured neighbor lag and frozen frames. M3 therefore deletes the worker, interpolation, and transferable-buffer path rather than maintaining two physics homes. After physics, the next largest measured cost is the style + geometry rebuild (2.83 ms/frame at 2.5k), which is currently triggered almost every active frame.

The raw reports and normalized stage summaries are under `m2-attribution/`. `--physics-home main-thread` was temporary decision scaffolding at the M2 revision; M3 removed the option together with the losing worker implementation. Current armed profiles use `--attribution true` and always report the sole main-thread home.

## M3 zero-round-trip interaction

Revision `1c06ca50ca8ae25a950862ca4a9a994b944b95a0` leaves the typed-array engine as the sole physics home and removes 2,200 lines of worker host, protocol, interpolation, transfer-buffer, and test machinery. Pointer-down wakes the frame loop, active pointer sessions independently keep it alive, and user-driven positions are rendered even when a physics tick reports zero steps.

| Fixture | Mean CPU frame | p95 | 1%-high | Sim / render | Potential / displayed FPS | Target / neighbor latency | Frozen / teleports | Settle violations | HUD max difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| tiny | 0.49 ms | 0.60 ms | 0.70 ms | 0.07 / 0.42 ms | 2,060 / 60.00 | 1 / 1 frames | 0 / 0 | 1 | 0% |
| 500 | 5.59 ms | 6.00 ms | 6.50 ms | 4.59 / 1.01 ms | 179 / 60.00 | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 1k | 4.22 ms | 4.70 ms | 5.07 ms | 2.48 / 1.74 ms | 237 / 60.00 | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 2.5k | 10.03 ms | 11.57 ms | 15.00 ms | 6.49 / 3.53 ms | 100 / 59.51 | 1 / 1 frames | 0 / 0 | 0 | 0.42% |

All four three-run tiers pass the headless checkpoint and settle completely. Relative to M1, mean frame work improves 1.35× at 500, 1.26× at 1k, and 1.10× at 2.5k while neighbor response improves from three frames to one and frozen frames fall from one to zero.

The required real-editor pass used VS Code 1.128.0 with the graph in an editor and Files Explorer restored. Its untruncated 983-frame recording measured 0.39 ms active mean work, 60.00 displayed FPS on the available 60 Hz display, one-frame target and neighbor response, zero freezes and teleports, and active HUD agreement within 3.2%. The graph slept at imperceptible energy; one small settle-envelope rebound remains for the fixed-timestep M4 work. Evidence is in `m3-main-thread/`.

## M4 fixed-timestep simulation

Revision `21618b4aceb3e657b08d1964f003a1894be5fbfb` advances simulation from a wall-clock accumulator at a 144 Hz fixed timestep. Each frame performs at most four substeps; a soft 4 ms simulation CPU budget drops excess debt rather than entering a spiral of death. Active interaction guarantees at least one simulation step, while deliberate sleep, pause, resume, and renderer recovery reset clock debt to prevent wake jumps.

| Fixture | Mean CPU frame | p95 | 1%-high | Sim / render | Sim steps / frame · steps/s | Potential / displayed FPS | Target / neighbor latency | Frozen / teleports | Settle violations | HUD max difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| tiny | 0.39 ms | 0.67 ms | 0.70 ms | 0.08 / 0.31 ms | 2.38 · 143.72 | 2,583 / 60.00 | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 500 | 5.52 ms | 5.93 ms | 6.70 ms | 4.52 / 0.99 ms | 1.00 · 60.06 | 181 / 60.00 | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 1k | 4.31 ms | 5.40 ms | 5.70 ms | 2.63 / 1.69 ms | 1.12 · 67.60 | 232 / 60.00 | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 2.5k | 9.87 ms | 11.77 ms | 14.57 ms | 6.36 / 3.51 ms | 0.99 · 59.28 | 101 / 59.49 | 1 / 1 frames | 0 / 0 | 0 | 0.42% |

Tiny proves the loops are genuinely decoupled: simulation runs at 143.72 steps/s and 2.38 steps per rendered frame while the 60 Hz display presents 60.00 FPS and CPU potential is 2,583 FPS. Expensive fixtures obey the CPU cap without building time debt. Every run settles completely at imperceptible energy with a monotonic envelope, including tiny's M1/M3 settle defect now reduced from one violation to zero.

The required M4 real-editor pass independently confirms 144.43 simulation steps/s over a 60.00 Hz presentation (2.40 steps/frame), one-frame target and neighbor response, zero freezes and teleports, zero settle-envelope violations, and active HUD agreement within 0.60%. See `m4-fixed-timestep/` for the reports, validation JSON, screenshots, and GIF.

## M5 final throughput

Fresh attribution at clean revision `3ad8cab63173533db9c51946f1b463fe9776ef0f` confirmed that physics was dominant and that false props-identity invalidation still spent 1.28 ms/frame rebuilding 2.5k styles. Revision `953ad1d1901d7c14960439c5199e680662a6edbb` replaced that broad signal with a semantic revision over the actual ref-backed style dependencies: attributed style rebuild cost falls to zero and complete attributed work improves 9.92 → 8.18 ms. Revision `d6ce971b2ae7478577399ad3efa9ec9881d0c46f` then packs node/link geometry directly from authoritative typed position and edge-index arrays, producing this final unarmed ladder:

| Fixture | Mean CPU frame | p95 | 1%-high | Sim / render | Sim steps / frame · steps/s | Potential / displayed FPS | Target / neighbor latency | Frozen / teleports | Settle violations | HUD max difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| tiny | 0.27 ms | 0.50 ms | 0.60 ms | 0.07 / 0.20 ms | 2.38 · 143.72 | 3,720 / 60.00 | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 500 | 5.19 ms | 5.60 ms | 6.10 ms | 4.56 / 0.63 ms | 1.00 · 60.11 | 193 / 60.00 | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 1k | 3.58 ms | 4.60 ms | 4.87 ms | 2.68 / 0.90 ms | 1.11 · 66.91 | 279 / 60.00 | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 2.5k | 7.95 ms | 9.40 ms | 12.13 ms | 6.28 / 1.67 ms | 0.99 · 59.73 | 126 / 59.96 | 1 / 1 frames | 0 / 0 | 0 | 0.44% |

Relative to M1, mean complete frame work improves 1.15× / 1.46× / 1.49× / 1.39× across tiny / 500 / 1k / 2.5k. The 500 and 1k tiers are comfortably inside the 6.9 ms 144 Hz CPU budget; 2.5k is inside the 16 ms budget and has moved 28% from M1 toward the 6.9 ms stretch target. Final attribution identifies physics at 6.29 ms/frame as the remaining 2.5k dominant cost; behavior-changing force approximations were not accepted after all hard budgets were cleared.

The final physical-display real-editor pass in VS Code 1.128.0 records 144.53 simulation steps/s over exactly 60.00 displayed FPS, 0.36 ms active work, one-frame target and neighbor response, zero freezes and teleports, monotonic zero-violation settle, imperceptible sleep, and HUD agreement within 0.61%. See `m5-final/` for final reports, before/after attribution, validation JSON, screenshots, and GIF.

### High-refresh presentation gate

Because the attached physical panel is limited to 60 Hz, the final presentation gate uses a compositor-backed macOS CoreGraphics display configured at 165 Hz. This is a headed, vsynced browser/editor path: neither Chromium's frame-rate limit nor GPU vsync is disabled. A separate 399-frame headed Chromium probe measures 165.00 Hz (6.06 ms mean rAF interval). Clean headed reports then measure **161.35 displayed FPS at 500**, **163.93 at 1k**, and **70.00 at 2.5k**, closing the 144 FPS 500/1k gate and sustained 60 FPS 2.5k gate. CPU work remains 4.28 / 2.64 / 8.13 ms respectively.

The real VS Code 1.128.0 editor on the same 165 Hz compositor independently records **165.01 displayed FPS**, one-frame target and neighbor response, zero freezes and teleports, monotonic zero-violation settle, imperceptible sleep, and HUD agreement within 1.40%. The high-refresh pass also exposed and fixed a measurement defect: the settle envelope had used five frames, silently shrinking from about 80 ms at 60 Hz to 30 ms at 165 Hz; it now uses a refresh-independent 80 ms wall-clock window. Evidence and the explicit virtual-display provenance are committed under `m5-final/high-refresh/`.

## M6 Obsidian sizing and D3 layout parity

Revision `a466c9c7df9fde2cb36a89118578bdc692ef9add` replaces graph-relative connection sizing with Obsidian's stable `clamp(3 × sqrt(uniqueRelatedNodes + 1), 8, 30)` curve. Parallel and reverse relationships to the same node count once, and node-size changes rebuild through the authoritative graph model so rendering, collision, picking, and fit calculations share one radius.

The owned layout now also matches D3's exact deterministic phyllotaxis. Top Down and Left to Right center ranks around the origin and fix only the ranked axis, while Radial Out uses a D3-equivalent radial force with roots at radius zero and no prescribed angle. Deterministic best-effort cycle handling remains because a Relationship Graph is not guaranteed to be acyclic.

| Fixture | Mean CPU frame | p95 | 1%-high | Sim / render | Potential / displayed FPS | M1 potential gain | Target / neighbor latency | Frozen / teleports | Settle violations | HUD max difference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| tiny | 0.31 ms | 0.60 ms | 0.67 ms | 0.07 / 0.24 ms | 3,239 / 60.00 | +0.2% | 1 / 1 frames | 0 / 0 | 0 | 8.82% |
| 500 | 4.95 ms | 5.27 ms | 6.13 ms | 4.35 / 0.61 ms | 202 / 60.00 | +52.9% | 1 / 1 frames | 0 / 0 | 0 | 0% |
| 1k | 4.00 ms | 4.80 ms | 5.00 ms | 3.06 / 0.94 ms | 250 / 60.00 | +33.1% | 1 / 1 frames | 0 / 0 | 0 | 1.82% |
| 2.5k | 6.39 ms | 7.27 ms | 9.27 ms | 4.75 / 1.64 ms | 157 / 60.00 | +73.0% | 1 / 1 frames | 0 / 0 | 0 | 0% |

All four clean three-run tiers pass and settle. The 2.5k result is now below the 6.9 ms stretch target as well as the 16 ms hard target. A real VS Code editor review captures Default, Top Down, Left to Right, and Radial Out layouts with Files Explorer visible. With Show FPS enabled, the compact HUD stays live after physics settles and measures 142–144 displayed FPS against an independent 144.00 Hz rAF probe, without frame-rate or vsync bypass flags. The diagnostic intentionally continues rendering while enabled; turning it off restores normal zero-idle-render behavior. Evidence is under `m6-obsidian-layout/`.

Run the dashboard generator with:

```bash
pnpm --filter graph-benchmark dashboard
```

By default it writes static HTML and JSON to `~/pi-status/codegraphy-pr308-perf`. Set `CODEGRAPHY_DASHBOARD_DIR` to override the output directory.
