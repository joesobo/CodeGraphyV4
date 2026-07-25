# Agent benchmarks require structural work and tool adoption

**Status:** Accepted

## Context

ADR 0011 established fresh three-versus-three implementation benchmarks and a generalized, non-prescriptive Agent Skill. The first candidate task added `path --max-depth`. All six agents implemented it correctly, but only one of three CodeGraphy agents made one CLI help call. The task named the exact command and reduced to local parser/help work, so its token difference could not measure graph navigation.

A connection-aware offline graph-document feature was broader, but its first prompt named the owning tldraw package. After removing that ownership leak, agents still localized the task primarily through lexical evidence. Corrected telemetry later found that one treatment agent made two CodeGraphy calls through `pnpm codegraphy`; the original counter recognized only a bare executable. Treatment still regressed against raw agents despite equal 3/3 correctness:

| Mean | Raw | CodeGraphy + skill | Delta |
|---|---:|---:|---:|
| Model tokens | 369,924 | 404,126 | 9.2% more |
| Tool calls | 22.0 | 28.7 | 30.3% more |
| Tool output | 123,569 B | 140,578 B | 13.8% more |
| Elapsed | 126.0 s | 135.1 s | 7.2% slower |
| CodeGraphy calls | 0 | 0.7 | one of three adopted |

The task was therefore rejected as a stable graph benchmark. It primarily measured the overhead and model variance of loading a skill around work that ordinary lexical search already solved directly.

The replacement structural task starts from the parent of historical commit `e83057517`. Agents add cleanup ownership for headless Plugin runtimes across registry removal, one-shot Indexing success/failure, persistent engine rebuilds, and idempotent disposal. The hidden grader replaces two test modules with the original feature tests and runs Core typecheck. The untouched parent fails four behavioral assertions. Repository Markdown and source history are absent; dependencies come from the historical frozen lockfile.

The neutral generalized-skill baseline produced equal 2/3 correctness:

| Mean | Raw | CodeGraphy + neutral skill | Delta |
|---|---:|---:|---:|
| Tokens, all runs | 772,809 | 473,583 | 38.7% fewer |
| Tokens, correct runs | 820,903 | 475,038 | 42.1% fewer |
| Tool calls | 30.7 | 29.3 | 4.3% fewer |
| Tool output | 228,083 B | 242,281 B | 6.2% more |
| Elapsed | 171.7 s | 137.2 s | 20.1% faster |
| Correctness | 2/3 | 2/3 | equal |

Only the failed treatment run invoked CodeGraphy, however. The successful token difference cannot be attributed to graph queries and remains a high-variance product-level signal rather than CLI evidence.

## Tested candidates

### Coverage-balanced Triage

A `triage <text>` prototype independently matched task terms, weighted lexical rarity and File graph degree, preferred production source, and round-robin balanced source areas. It returned at most eight Files by default with matched terms and no excerpts, inferred answers, or generic neighborhoods.

On the lexical feature task, all three agents read the skill but none selected Triage. Correctness remained 3/3 while treatment regressed 21.9% in tokens, 41.0% in calls, 13.7% in output, and 6.1% in elapsed time. The command had no adoption and was reverted.

### Evidence-first generalized skill

A reordered skill described questions answered by live text, exact Target Query, dependencies, dependents, Path, and inventories before lifecycle details. It explicitly said there was no required command order or call count. On the structural task, no agent invoked CodeGraphy. Treatment correctness was 3/3 versus raw 2/3, but mean tokens per correct run increased from 242,665 to 806,164, calls increased 56.1%, and elapsed increased 55.6%. The wording was reverted.

### Combined Triage and evidence-first skill

A detached candidate combined both rejected ideas to test their interaction. Every treatment agent selected Triage exactly once, proving discoverability and adoption. It still failed the correctness and token gate:

| Mean | Raw | Triage + evidence skill | Delta |
|---|---:|---:|---:|
| Tokens, all runs | 619,031 | 559,269 | 9.7% fewer |
| Tokens, correct runs | 619,031 | 696,005 | 12.4% more |
| Tool calls | 26.3 | 34.7 | 31.6% more |
| Tool output | 259,628 B | 203,540 B | 21.6% fewer |
| Elapsed | 137.0 s | 153.6 s | 12.1% slower |
| Correctness | 3/3 | 2/3 | one fewer |
| CodeGraphy calls | 0 | 1.0 | adopted |

Triage reduced observation bytes, but successful trajectories consumed more model tokens and one implementation was incomplete. The detached worktree and prototype were removed.

### Incoming Impact radius

An `impact <node>` prototype traversed incoming Relationships from one exact File or Symbol to depth one through four, projected results to Files, and reported shortest distance, typed reasons, pagination, visited Nodes, and completeness. Runtime call/import reasons ranked ahead of type-only consumers. On the structural fixture, a 1.4 KB result around `plugins/registry.ts` placed `engine.ts`, `engineSetup.ts`, and `workspace.ts` in the first page.

All three treatment agents read the updated skill and none selected Impact. Corrected telemetry found three ordinary CodeGraphy Search calls in one successful treatment run. Raw correctness was 3/3 versus treatment 2/3. Mean correct-run tokens increased from 318,247 to 832,347, calls increased 60.3%, output increased 28.2%, and elapsed increased 65.7%. These trajectory regressions cannot be attributed to unused Impact output, but non-adoption fails the public-interface gate. The implementation, tests, documentation, and changeset update were reverted.

### Compact capability reference

A subtraction candidate reduced the neutral capability reference from 6,082 to 4,051 bytes without adding workflow policy. It increased voluntary CodeGraphy adoption to two of three treatment runs, with four Search calls in each adopted run. Both adopted runs omitted the required bulk-disposal API and failed; the only successful treatment did not invoke CodeGraphy. Treatment correctness fell to 1/3 from raw 3/3, and correct-run tokens increased 40.4%. The shorter skill and its release assertion were reverted.

## Decision

Retain the neutral generalized Agent Skill from ADR 0011. It explains the graph model, lifecycle, command semantics, output, freshness, shaping, and limitations without prescribing a workflow. Do not retain Triage or evidence-first comparative framing.

Retain the headless Plugin-runtime disposal task as a harder confirmation benchmark, and select an independently viable relationship task before screening new candidates. Report both all-run and correct-run token statistics. A CLI candidate must be invoked by treatment agents before a result can be attributed to that candidate. Non-adoption is a failed interface experiment even when aggregate model variance favors the treatment.

Correctness remains a gate. Lower output bytes, elapsed time, or all-run mean tokens do not justify a candidate whose correct-run tokens regress or whose correctness drops.

Three repetitions remain a fast screening instrument rather than confirmation. Raw means varied materially between rounds, so candidates that pass screening require broader paired tasks before a universal product claim.

## Consequences

- Exact, local parser features are too shallow for the ongoing graph benchmark.
- Lexical cross-package tasks are also insufficient when ordinary search exposes ownership directly.
- New commands must earn both discoverability and successful-trajectory value.
- Skill wording is itself an intervention and can increase exhaustive ordinary exploration even without CLI use.
- Tool output reduction is diagnostic; cumulative model tokens per correct implementation remain primary.
- Watcher, neighbor, conflict, inference, fuzzy, and hub experiments remain candidates under the same adoption and correctness gate; the tested incoming Impact command is rejected.
- ADR 0013 records the selected relationship fixture and accepted personalized Task Map.

## References

- ADR 0009, rejected connected neighborhoods
- ADR 0010, initial token-first clean-install experiments
- ADR 0011, generalized skill and feature-change benchmark protocol
- Historical feature commit `e83057517`, Core Plugin runtime disposal
