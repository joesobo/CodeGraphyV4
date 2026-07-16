# Minimap performance profile

Profiled for PR #311 on 2026-07-16 using an Apple M4 (`arm64`, macOS 15.6,
Node 26.0.0). Re-run with:

```bash
pnpm --filter @codegraphy-dev/extension profile:minimap
```

The command runs two complementary profiles. The renderer profile executes the
real `WebGpuGraphRenderer.render` path against the WebGPU test device: graph
packing, base-style callback resolution, CSS color parsing, upload preparation,
both render-pass encoders, command finalization, and queue submission. The fake
device makes this a CPU-path profile; it does not estimate GPU execution time.

| Fixture | Nodes | Edges | Minimap disabled | Enabled, retained styles | Isolated retained minimap | Forced base-style refresh | Isolated style refresh |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Small | 100 | 300 | 0.054 ms | 0.047 ms | 0.008 ms | 0.168 ms | 0.128 ms |
| Medium | 1,000 | 3,000 | 0.347 ms | 0.329 ms | 0.009 ms | 1.538 ms | 1.232 ms |
| Dense | 5,000 | 15,000 | 1.463 ms | 1.376 ms | 0.007 ms | 6.991 ms | 5.575 ms |

Enabled and disabled totals include the shared primary render path, so small
negative differences are expected measurement noise. The isolated value comes
from the renderer's secondary timer and is the useful incremental comparison.
The retained-style column is the normal physics-refresh path. The forced column
increments the minimap's base-style version every sample to exercise callback
resolution, color parsing, repacking, upload preparation, encoding, and submit.

The second profile measures the scene projection that runs before an enabled
refresh. The rendered-bounds scan is a validation reference and is not part of
the runtime refresh path.

| Fixture | Projection | Validation bounds | Projection CPU at 8 Hz |
| --- | ---: | ---: | ---: |
| Small | 0.105 ms | 0.098 ms | 0.84 ms/s |
| Medium | 0.330 ms | 0.334 ms | 2.64 ms/s |
| Dense | 1.549 ms | 1.581 ms | 12.39 ms/s |

## Result and response

The first implementation used a 24-step rendered-bounds search. Its dense fit
cost about 40.33 ms per refresh, above the 1 ms/frame review threshold even at
the initial 8 Hz cap.

The shipped implementation replaces repeated scans with a conservative analytic
fit. It measures node centers and sampled curve geometry once, records the
maximum node half-size, and solves the square-root zoom equation per axis.
Repainting and fitting use separate cadences: moving positions repaint the
retained surface at up to 60 Hz, while the full projection scan is capped at
8 Hz and performs one immediate final tight fit when physics settles. The dense
projection therefore contributes about 0.21 ms amortized per 60 Hz main frame.
Once the fit is settled, user-driven position changes retain that projection and
reuse the packed graph buffers, so dragging does not repay the projection scan.

A production WebGPU runtime comparison used a 2,500-node, 7,500-edge graph in an
editor-sized viewport, with the same node dragged repeatedly for roughly five
seconds across three accepted runs per cadence. The minimap-disabled graph used
4.00 ms of average frame work. The 60 Hz minimap used 4.75 ms and sustained
59.61 FPS, an incremental 0.75 ms per frame, below the 1 ms absolute regression
guard for the requested 2,500-node workflow. The dense projection fixture adds
about 0.21 ms amortized per 60 Hz main frame, but it is a separate 5,000-node,
15,000-edge fixture; summing those figures to 0.96 ms is useful only as a
mixed-fixture estimate and does not establish a dense initial-physics result.
The repaint cap is 60 Hz while projection fitting remains 8 Hz, limiting that
unmeasured path until it can be profiled with the same production fixture. The
minimap stops repainting when the graph settles, and edge density reduction
remains disabled. These measurements cover CPU submission and frame work; GPU
execution time is not separately instrumented.

If repeated dense runs exceed 1 ms/frame amortized, reduce the moving refresh
cap before considering deterministic edge sampling. Re-profile after each
change; do not hide an over-budget result by quoting the retained-style path
alone.

## Runtime measurement

`WebGpuGraphRenderer.lastSecondaryRefreshCpuMs()` isolates secondary-target CPU
work: retained-target resize, secondary camera upload, conditional base-only
style packing, secondary render-pass encoding, command finalization, and queue
submission. Primary-only frames report no secondary sample. The owned graph
performance monitor publishes the rolling average and
sample count through `data-secondary-refresh-average-ms` and
`data-secondary-refresh-sample-count` on the FPS output, separately from total
frame work and rendered FPS.

This CPU metric intentionally does not claim isolated GPU execution time because
the renderer does not enable WebGPU timestamp queries. Total submitted-frame
cost remains visible in the existing frame-time metric.
