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

Run the dashboard generator with:

```bash
pnpm --filter graph-benchmark dashboard
```

By default it writes static HTML and JSON to `~/pi-status/codegraphy-pr308-perf`. Set `CODEGRAPHY_DASHBOARD_DIR` to override the output directory.
