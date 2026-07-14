# Interaction performance evidence

This directory contains the committed evidence for the Obsidian-parity interaction performance plan.

## Metrics

- **Potential FPS** is `1000 / mean CPU frame work`, where CPU work includes the completed physics step plus synchronization, geometry/buffer preparation, GPU command encoding/submission, and overlay work.
- **Displayed FPS** is rendered presentations divided by elapsed wall-clock time. Missing frames lower this value.
- **Frame time** reports mean, p95, p99 (the 1%-high value), and maximum CPU milliseconds, with simulation and render distributions retained separately.
- **Target latency** counts rendered frames from pointer movement to the dragged node reaching that input position.
- **Neighbor latency** counts rendered frames from pointer movement to one-hop neighbor motion.
- **Freeze and teleport counts** use the versioned thresholds stored in each report's `configuration.interactionThresholds`.
- **Settle continuity** evaluates a rolling RMS kinetic-energy envelope after release and records whether sleep energy is imperceptible.
- **HUD agreement** independently recomputes metrics from raw frame records and compares them with the product HUD's rolling sample. Every displayed metric must be within 10%.

Headless Chromium on this machine presents near 60 Hz. Headless runs therefore prove CPU potential and honest dropped-frame accounting; the 144 Hz displayed-rate gate is verified in the real VS Code editor on the 144 Hz display.

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

Run the dashboard generator with:

```bash
pnpm --filter graph-benchmark dashboard
```

By default it writes static HTML and JSON to `~/pi-status/codegraphy-pr308-perf`. Set `CODEGRAPHY_DASHBOARD_DIR` to override the output directory.
