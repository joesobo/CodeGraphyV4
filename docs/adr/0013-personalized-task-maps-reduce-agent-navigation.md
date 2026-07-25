# Personalized task maps reduce agent navigation

**Status:** Accepted

## Context

ADR 0012 required structural coding work, hidden behavioral grading, correct-run token accounting, and actual candidate adoption. Repeated use of the Plugin-runtime disposal fixture then saturated that one task. A second historical fixture was needed to distinguish a generally useful graph action from benchmark-specific steering.

The first replacement candidate, complete-graph cache persistence from parent `daa5b9dff`, was rejected as a benchmark. The untouched parent failed six hidden behaviors and the historical patch passed all sixteen focused tests, but no low-thinking agent completed both the Core save path and every Extension persistence path. A tightened one-versus-one viability pilot also produced 0/2 correctness. The task was too broad for rapid screening.

The selected relationship fixture starts from parent `e93ac48a`. It contains two independent background Plugin failures: scheduled extension-host graph work and Webview Plugin asset loading. Hidden tests require both rejected Promises to be observed, contextual errors to retain the original failure, and asset-load completion to run after rejection. The grader initially required historical log wording; that implementation-coupled assertion was replaced by behavioral checks. The untouched parent remains red, the historical patch and both independent pilot solutions pass, and all repository Markdown, VCS history, sessions, answers, and benchmark infrastructure remain outside agent workspaces.

The corrected benchmark invocation counter recognizes direct `codegraphy`, package-manager launchers such as `pnpm codegraphy` and `pnpm exec codegraphy`, and direct Node launchers. Earlier reports understated existing CLI adoption when agents used package-manager scripts.

With the existing CLI and neutral shipped skill unchanged, the relationship fixture established 3/3 correctness in both arms:

| Mean | Raw | Existing CLI + skill | Delta |
|---|---:|---:|---:|
| Model tokens | 278,262 | 238,049 | 14.5% fewer |
| Median tokens | 270,199 | 147,307 | 45.5% fewer |
| Tool calls | 19.0 | 25.0 | 31.6% more |
| Tool output | 170,084 B | 92,201 B | 45.8% fewer |
| Elapsed | 108.8 s | 89.8 s | 17.5% faster |
| CodeGraphy adoption | 0/3 | 3/3 | 2.7 calls/run |

This established that agents voluntarily select the existing CLI on a task that remains objectively solvable by raw navigation.

## Candidate

`codegraphy map <task>` accepts task or issue text and returns a bounded personalized File map. It:

- extracts independently useful non-stopword terms with light identifier stemming;
- scores term presence with lexical rarity rather than term frequency;
- combines live eligible source with cached File, Symbol, and typed Relationship facts;
- uses personalized PageRank to retain connected Files;
- balances source areas so one dense subsystem does not consume the complete result;
- returns eight Files by default, rejects CLI bounds above twenty, and includes at most three selected declarations per File and twelve typed Relationships among returned Files;
- reports pagination, truncation completeness, live-source freshness, and Graph Cache freshness;
- returns no source excerpts, inferred answers, hidden workflow policy, or model-specific token estimates.

On the selected fixture, one 5.4 KB response places both required production Files in its first six results. On the harder disposal fixture, source-area balancing exposes the Core Indexing runtime and Plugin Registry rather than filling the page with sibling engine modules.

## Benchmark results

### Required raw comparison

The Map candidate retained 3/3 correctness in both arms. Candidate treatment reduced mean tokens and output, but Map itself was selected in only one of three runs, so the aggregate result was not sufficient attribution:

| Mean | Raw | Map CLI + skill | Delta |
|---|---:|---:|---:|
| Model tokens | 281,602 | 205,919 | 26.9% fewer |
| Median tokens | 198,193 | 209,454 | 5.7% more |
| Tool calls | 19.3 | 27.0 | 39.7% more |
| Tool output | 126,647 B | 84,756 B | 33.1% fewer |
| Elapsed | 80.7 s | 89.5 s | 10.9% slower |
| Map adoption | 0/3 | 1/3 | partial |

### Direct candidate A/B

A fresh direct comparison then held CLI access, skill installation, pre-Indexing, model, prompt, hidden grader, and workspace isolation constant. The control used pre-Map commit `93ffde349`; the treatment used the Map candidate. Both arms were 3/3 correct, and treatment agents selected Map in two of three runs:

| Mean | Existing CLI + skill | Map CLI + skill | Delta |
|---|---:|---:|---:|
| Model tokens | 257,334 | 167,940 | **34.7% fewer** |
| Median tokens | 243,105 | 159,426 | **34.4% fewer** |
| Tool calls | 32.0 | 21.0 | **34.4% fewer** |
| CodeGraphy calls | 5.0 | 3.3 | **33.3% fewer** |
| Tool output | 115,915 B | 71,745 B | **38.1% fewer** |
| Elapsed | 139.9 s | 97.2 s | **30.5% faster** |
| Correctness | 3/3 | 3/3 | equal |

The Map-only treatment trajectory completed correctly with one CodeGraphy call, twenty total calls, and 220,943 model tokens. Another trajectory used Map after two Search calls and completed with 123,451 tokens.

### Harder-task confirmation

A fresh disposal-fixture confirmation retained equal 2/3 correctness. Correct-run mean tokens were 246,332 for CLI plus skill versus 685,081 raw, a 64.0% reduction, but no treatment agent selected Map. This confirms existing CLI value on that round, not Map value. It also shows that Map is task-selective rather than a required replacement for Search.

## Decision

Retain `codegraphy map <task>` as a public bounded query. Its selected direct A/B passed adoption, correctness, and correct-run token gates while also reducing calls, output, and elapsed time.

Keep Search, exact Target Query, dependencies, dependents, and Path unchanged. Map is another evidence surface, not a prescribed first action or universal navigation policy. The Agent Skill describes its output semantics but does not specify command order, call counts, task wording, or permission conditions.

Treat all measurements as small-sample evidence. Three-versus-three runs screen candidates; they do not establish universal superiority. Future confirmation should use the relationship fixture plus at least one additional independently viable structural task.

## Consequences

- Candidate attribution can use an additional direct CLI-control A/B after the required raw comparison when general CLI behavior already differs from raw navigation.
- Viability pilots may reject benchmark fixtures before a full candidate run, but product iterations still require three runs per compared condition.
- Hidden graders must assert behavior rather than historical wording or decomposition.
- Invocation telemetry must recognize equivalent executable launch forms.
- Complete-graph persistence remains an unsuitable rapid screen despite being a valid historical feature.
- Incoming Impact, Triage, connected Search augmentation, BM25 fallback, phrase-line evidence, compact skill subtraction, and default Leiden ranking remain rejected.

## References

- ADR 0011, generalized skill and fresh implementation benchmarks
- ADR 0012, structural work and adoption gate
- Aider repository map implementation and personalized PageRank
- RepoGraph and LocAgent single-action graph localization interfaces
