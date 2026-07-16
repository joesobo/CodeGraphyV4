# Minimap performance profile

Profiled for PR #311 on 2026-07-16 using an Apple M4 (`arm64`, macOS 15.6,
Node 26.0.0). Re-run with:

```bash
pnpm --filter @codegraphy-dev/extension profile:minimap
```

The fixture includes mixed straight and curved edges plus regular self-loops.
The refresh-preparation measurement covers rendered scene fitting and the final
live rendered-bounds measurement. It excludes WebGPU driver execution, which is
reported at runtime as described below.

| Fixture | Nodes | Edges | Bounds scan | Refresh preparation | CPU at 8 Hz | 60 FPS amortized |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Small | 100 | 300 | 0.10 ms | 0.09 ms | 0.70 ms/s | 0.01 ms/frame |
| Medium | 1,000 | 3,000 | 0.32 ms | 0.63 ms | 5.05 ms/s | 0.08 ms/frame |
| Dense | 5,000 | 15,000 | 1.58 ms | 3.06 ms | 24.45 ms/s | 0.41 ms/frame |

## Result and response

The first implementation used a 24-step rendered-bounds search. Its dense fit
cost about 40.33 ms per refresh (roughly 5.38 ms amortized over 60 main frames
at the 8 Hz cap), above the 1 ms/frame review threshold.

The shipped implementation replaces repeated scans with a conservative analytic
fit. It measures node centers and sampled curve geometry once, records the
maximum node half-size, and solves the square-root zoom equation per axis. The
dense end-to-end preparation result is 0.41 ms amortized per 60 Hz frame, so the
8 Hz cadence remains appropriate and density reduction is not enabled.

## Runtime measurement

`WebGpuGraphRenderer.lastSecondaryRefreshCpuMs()` isolates secondary-target CPU
work: retained-target resize, secondary camera upload, base-only style packing,
and secondary render-pass encoding. Primary-only frames report no secondary
sample. The owned graph performance monitor publishes the rolling average and
sample count through `data-secondary-refresh-average-ms` and
`data-secondary-refresh-sample-count` on the FPS output, separately from total
frame work and rendered FPS.

This CPU metric intentionally does not claim isolated GPU execution time because
the renderer does not enable WebGPU timestamp queries. Total submitted-frame
cost remains visible in the existing frame-time metric.
