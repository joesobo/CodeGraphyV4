# Final owned-WebGPU benchmark

Clean capture on 2026-07-12 from revision `f80dba9efbd5b08b5977758940e9d00241bd9cb8`.

Environment: Apple M4 Mac mini, macOS `24.6.0`, Node `22.22.2`, Chromium `145.0.7632.6`, hardware Metal WebGPU, 1280×720 at DPR 1. Each row is the arithmetic mean of three complete deterministic scripted-drag runs. Each run performs five additional open/settle/close cycles; plateau is assessed over all 15 samples.

| Fixture | Drag FPS | FPS delta | Settle | Settle delta | Idle CPU | Heap after load | Process RSS after load | RSS after cycles | Collisions settled/released | Plateau | Tier pass |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 500 | 59.44 | +0.61 | 1.08s | +0.02s | 0.07% | 7.22 MiB | 334.03 MiB | 196.99 MiB | 0 / 0 | yes | yes |
| 1,000 | 59.23 | +16.86 | 1.33s | −0.59s | 0.07% | 9.32 MiB | 348.35 MiB | 193.73 MiB | 0 / 0 | yes | yes |
| 2,500 | 58.30 | +44.02 | 3.04s | −1.91s | 0.07% | 15.33 MiB | 390.77 MiB | 191.11 MiB | 0 / 0 | yes | yes |
| 5,000 | 57.90 | +51.01 | 11.83s | +0.49s | 0.13% | 25.40 MiB | 433.18 MiB | 193.67 MiB | 0 / 0 | yes | yes |
| 10,000 | 49.32 | +46.52 | 53.43s | +38.09s | 0.00% | 45.68 MiB | 577.50 MiB | 191.92 MiB | 0 / 0 | yes | yes |

All five tiers pass the complete gate: finite layout, responsive drag, at least 30 FPS, exact production collision radii after settlement and release, and lifecycle memory plateau. The 10,000-file settlement regression remains documented: profiling identified dense collision cleanup as the bottleneck, and three low-yield solver experiments were stopped rather than retained.
