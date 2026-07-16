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
cost about 40.33 ms per refresh (roughly 5.38 ms amortized over 60 main frames
at the 8 Hz cap), above the 1 ms/frame review threshold.

The shipped implementation replaces repeated scans with a conservative analytic
fit. It measures node centers and sampled curve geometry once, records the
maximum node half-size, and solves the square-root zoom equation per axis. The
dense normal physics path is about 0.21 ms amortized per 60 Hz frame: 1.549 ms
projection plus 0.007 ms retained secondary work, eight times per second. Even
the deliberately forced base-style rebuild profile is about 0.94 ms/frame when
combining projection with the renderer's measured enabled-minus-disabled cost.
Both remain below the 1 ms/frame threshold, so the 8 Hz cadence remains
appropriate and edge density reduction is not enabled.

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
