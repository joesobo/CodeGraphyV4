# Explorer parity and native-feel performance report

Status: **provisional blocker report**, measurement checkpoint `f07bebfec` plus
the retained measurements cited below, captured on 2026-07-11.

This is the Phase 8 report draft, not an acceptance declaration. The required
same-machine capped sweep of both the final branch and pre-epic commit is not yet
complete. Where fewer than five complete samples exist, the value is labeled
diagnostic and no final performance claim is made. No 30,000-file fixture was
generated or run; the largest CodeGraphy fixture used here is `huge` at 10,000
files.

## Environment and measurement policy

- Apple M4, macOS arm64, Node 26.0.0, VS Code 1.128.0.
- Real VS Code Extension Development Host; generated deterministic fixtures.
- Accepted performance results require five complete samples, reported as the
  median with coefficient of variation (CV). Failed or incomplete runs remain in
  the record and are never silently retried or discarded.
- Explorer comparisons use the same VS Code window. The current Explorer rename
  comparator is a public workspace-event/reveal signal, not a paint-equivalent
  signal; gate 3-C therefore remains both failed and subject to comparator review.
- “Baseline” below means the checked-in local reference or the explicit pre-change
  measurement named in the row. It is not a substitute for the still-required
  final-branch versus pre-epic recapture.
- Idle CPU sampling now retains aggregate, renderer, and extension-host process
  dimensions. The idle FPS probe is bounded to the first second so benchmark
  instrumentation does not drive animation frames throughout the 60-second CPU
  window.

## Phase 3 gates

| Gate | Baseline | Target | Retained achieved evidence | Status |
| --- | --- | --- | --- | --- |
| 3-A Diff payload | 497,876 B, `medium` single save | ≤10 KB and ≥95% smaller | 383 / 383 / 383 / 383 / 383 B; median 383 B, CV 0%; 99.923% smaller | **Pass** |
| 3-B Zero resets | 32 resets in the checked-in `medium` reference | 0 resets; 0 px untouched-node drift before reheat | `medium`: 0 ×5; `large`: 0 ×5. Retained objects and coordinates are asserted before physics receives the structure version. | **Pass** |
| 3-C Explorer ratios | Checked-in `medium` rename ratio 201.78× | rename/create/delete ≤1.25×; optimistic apply ≤16 ms | A lightweight decoration projection reduced one `medium` optimistic rename diagnostic from 50.954 ms to 13.678 ms (73.16%) and met the ≤16 ms feedback ceiling. Same-session Explorer was 3.681 ms, leaving the overall ratio at 3.72×. | **Optimistic threshold met diagnostically; parity ratio remains a blocker** |
| 3-D Watcher storms | Checked-in `medium` batch watcher 188.582 ms, before deterministic six-switch coverage | single-file ≤1.5× Explorer refresh; 100 files ≤1,500 ms | Batch watcher medians 425.067 / 411.793 / 423.505 / 427.540 / 427.203 ms; overall median 425.067 ms, CV 1.37%. Refresh median 80.115 ms, CV 3.99%; exactly one refresh/payload per switch. Five single-save samples: watcher median 65.317 ms, CV 3.28%. | **Pass for absolute batch gate; Explorer-relative single-file comparison still needs final paired sweep** |
| 3-E Warm startup | PR #294 same-machine anchor 4,614 ms | ≤2,307 ms | Checked-in local reference is 2,158.970 ms (53.2% below anchor), but this is not a final-branch five-sample recapture | **Pending final sweep** |
| 3-F Settled is free | Checked-in `medium`: 0 ticks, 3.275% idle CPU | 0 ticks; <2% idle CPU | Before split, one `large` diagnostic measured 5.767% aggregate (5.733% renderer, 0.033% extension host). After pausing the settled renderer and bounding the FPS probe, the same 5,000-node fixture measured 1.500% aggregate (1.467% renderer, 0.033% extension host), 0 ticks, and 57.815 FPS. | **Threshold met diagnostically; pending five samples** |
| 3-G Dependency wins | `large` cold median 40,416.706 ms; blocking cache write previously 20,458.676 ms | per-file incremental parse ≤10% of same file cold parse; 0 ms action-blocking cache write; cold index ≥40% faster | `large` cold 23,033.240 / 22,790.666 / 22,928.544 / 23,291.205 / 23,158.337 ms; median 23,033.240 ms, CV 0.76%, 43.01% faster. Cache save median 432.394 ms, CV 4.90%, scheduled off action path; five `medium` saves emitted 0 action-scoped cache time. Same-file identity is now retained through cold workers and save aggregation. One `small` diagnostic measured the target file at 0.440 ms cold and 0.370 ms incremental, or 84.21% of cold; the unscoped restore parse was excluded. | **Partial pass; incremental parse ratio fails diagnostically** |
| 3-H Memory | No accepted `huge` reference | ≤500 MB heap | One `huge` diagnostic: 26,808,635 B (25.57 MiB) | **Threshold met diagnostically; pending five samples** |
| 3-I No cold regression | Pre-epic `self` measurement required | final `self` cold open ≤ baseline +10% | No accepted final/pre-epic same-machine pair | **Pending final sweep** |
| 3-J 10k interaction | No accepted `huge` reference | settle ≤15 s; drag ≥30 FPS; idle ≥60 FPS; no >200 ms post-paint long task | Main-thread diagnostic: drag 2.281 FPS, settle 2.378 FPS, 47 long tasks. Zero-simulation upper bound: drag 22.552 FPS, settle 21.053 FPS, 5 long tasks. Removing all simulation still misses the render gate. | **Fail / renderer blocker** |

The 3-J upper-bound experiment is stronger than a worker-only projection: a
worker cannot remove more main-thread simulation work than removing simulation
entirely. Moving layout to a worker remains necessary, but the retained Canvas2D
renderer cannot reach 30 FPS at 10,000 files. The plan explicitly reserves a
renderer migration for owner discussion, so no autonomous PixiJS migration was
started.

## Phase 4 gates

| Gate | Baseline | Target | Retained achieved evidence | Status |
| --- | --- | --- | --- | --- |
| 4-A Warm toggles local | Checked-in `medium` scope toggles included host-coupled graph work and many resets | 0 graph-payload host messages, 0 cache writes, 0 layout resets | One complete `medium` battery: 180 toggles, 0 measured payload bytes, 0 layout resets, one unmeasured cold-hydration cache save | **Behavior proven diagnostically; pending five `large`/`huge --symbols` runs** |
| 4-B Warm toggle speed | Checked-in `medium` medians ranged 38.579–210.389 ms | every warm toggle ≤50 ms at `large` and `huge --symbols` | Complete `medium` battery: 34/36 directions >50 ms; slowest 292.739 ms. Final one-repetition diagnostic: 35/36 >50 ms; slowest 253.510 ms. | **Fail / blocker** |
| 4-C Cold hydration | No accepted `huge --symbols` baseline | no main-thread long task >100 ms; input remains responsive | Chunked 500-item hydration and row busy state are implemented; no accepted five-run `huge --symbols` capture | **Pending** |
| 4-D Symbol scale | No accepted `huge --symbols` baseline | heap ≤650 MB (3-H budget +30%) | Non-symbol `huge` diagnostic used 25.57 MiB, but it is not the required symbol-scale workload | **Pending** |
| 4-E Revision diffs | Full evidence graph 30,786 B in deterministic adjacent-revision fixture | patch ≤10× changed-file diff allowance and never full graph | 831 B patch (2.70% of replay), below modeled 2,560 B allowance; deterministic fixture evidence | **Pass** |

## Adjacent interaction and feel blockers

These are outside the Phase 3/4 table but block the Phase 8 showcase and final
native-feel claim.

| Gate | Target | Achieved | Status |
| --- | --- | --- | --- |
| 5-B large group drag | ≥30 FPS with 50 selected nodes; linked neighbors move; sim stops | 4.629 / 4.604 / 4.564 / 4.552 / 4.532 FPS; median 4.564, CV 0.77%; 71 long tasks in every sample. Physical neighbor movement and release behavior pass focused tests. | **Fail / same renderer blocker as 3-J** |
| 6-B inline editing | input ≤100 ms; zero focus departures; inline V1/V2 errors | Inline state/error behavior passes focused tests, but fresh real-window runs report the rename input inactive after collision; a later diagnostic saw it inactive before editing | **Fail / VS Code focus-ownership blocker** |

## Obsidian context—not a head-to-head benchmark

CodeGraphy was not run against Obsidian on the same vault or machine. The table
only gives public context for the chosen 10,000-file ceiling and idle/render
goals. Forum reports are not formal service-level guarantees.

| Topic | Public Obsidian evidence | CodeGraphy retained result | Interpretation |
| --- | --- | --- | --- |
| Large-vault scale | A 2020 Obsidian forum response says the graph had been tested on 30,000 notes. A 2025 team response says there is no hard limit but more than about 25,000 files is not practical on a modern desktop; the same thread reports a 130,000-note graph freezing with one CPU core saturated. ([30k report](https://forum.obsidian.md/t/question-about-the-vault-size/7039/2), [25k/130k thread](https://forum.obsidian.md/t/obsidian-graph-view-doesnt-work-for-a-large-vault/106287)) | At the plan's capped 10,000 files, CodeGraphy opens but achieves only 2.281 drag FPS; even the zero-simulation upper bound reaches only 22.552 FPS. | CodeGraphy has not earned a “beats Obsidian scale” claim. No 30k fixture was generated or run. |
| Idle CPU | A historical user report described 8–20% idle CPU. An Obsidian team reply says graph rendering stops about one second after interaction and CPU/GPU should then stop, asking affected users for a trace. ([thread and team reply](https://forum.obsidian.md/t/graph-obsidian-consistently-eating-8-20-cpu-at-idle/2349/14)) | The latest `large` diagnostic measured 0 simulation ticks and 1.500% aggregate idle CPU after stopping the settled render cycle; this is one sample, not an accepted median. | The historical 8–20% report is anecdotal, not a current ceiling. CodeGraphy meets its stricter <2% gate diagnostically but still needs the prescribed five-run capture. |
| Feature model | Obsidian documents filters, groups, display thresholds, force controls, and local graph depth. ([Graph view help](https://help.obsidian.md/plugins/graph)) | CodeGraphy now projects loaded evidence locally, supports per-kind scope masks and revision-diff evidence, but warm toggle speed fails. | The feature direction is comparable; the measured interaction quality is not yet accepted. |

## Acceptance disposition

Phase 8 gate 8-A is **not satisfied**. Owner exceptions or additional engineering
are required for 3-C, 3-J, 4-B, 5-B, and 6-B. Gates 3-E, 3-F, 3-H, 3-I, 4-A,
4-C, and 4-D still need their prescribed final five-run or paired captures, and
3-G needs incremental-parse optimization and a five-run paired capture. Phase 9 remains
blocked until the report is complete, the showcase artifacts are published, and
the owner signs off or records explicit exceptions.
