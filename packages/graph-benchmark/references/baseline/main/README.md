# Current-renderer baseline

Clean capture on 2026-07-11 from harness revision `932f0c4cdffafb81b75e7c189ba4be21d0c91b62`; the graph renderer remains unchanged from `main` revision `eb3e51df492ba334d6ac20ddeea8315575b19c85`.

Environment: Apple M4 Mac mini, macOS `24.6.0`, Node `22.22.2`, Chromium `145.0.7632.6`, 1280×720 at DPR 1. Each row is the arithmetic mean of three complete runs. Each run performs five additional open/settle/close cycles; plateau is assessed over all 15 samples.

| Fixture | Drag FPS | Settle | Idle CPU | Heap after load | Process RSS after load | RSS after cycles | Memory plateau | Tier pass |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 500 | 58.83 | 1.05s | 4.04% | 7.26 MiB | 345.41 MiB | 166.11 MiB | yes | no |
| 1,000 | 42.37 | 1.91s | 3.98% | 9.54 MiB | 361.64 MiB | 165.06 MiB | yes | no |
| 2,500 | 14.28 | 4.95s | 4.24% | 15.62 MiB | 396.92 MiB | 164.04 MiB | yes | no |
| 5,000 | 6.90 | 11.34s | 4.64% | 26.40 MiB | 457.17 MiB | 164.73 MiB | yes | no |
| 10,000 | 2.79 | 15.33s | 16.90% | 48.76 MiB | 528.26 MiB | 164.94 MiB | yes | no |

The legacy renderer clears the 30 FPS threshold through 1,000 files, but no baseline tier passes the complete gate because its settled layout violates the exact production collision-radius contract. This is baseline evidence, not a regression introduced by the harness. Candidate reports must use these JSON files through `--baseline`; the harness rejects mismatched fixture, workload, runtime, browser, or machine identity.
