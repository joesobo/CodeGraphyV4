# Agent navigation is token-first and task-selective

**Status:** Superseded by ADR 0011

## Context

Earlier CodeGraphy experiments optimized elapsed time, tool calls, model tokens, and tool output together. The measurements repeatedly showed that process time was not the dominant cost: extra model turns amplified cached context, and a graph workflow could look fast while consuming substantially more model tokens than ordinary navigation. Model tokens per correct task are therefore the primary product metric. Elapsed time, calls, output bytes, and indexing cost remain diagnostics.

Five fresh low-thinking research agents inspected Graphify, LARGER, Aider RepoMap, RepoGraph, LocAgent, and GraphLocator from primary papers and source where available:

- Graphify chooses a few lexical seeds, bounds BFS/DFS, suppresses expansion through high-degree hubs, and serializes compact Node/Edge lines under an approximate 2,000-token budget. Exact-symbol traversal and `explain` were more useful than broad phrase traversal on the CodeGraphy fixture.
- LARGER's paper describes adding at most ten confidence-filtered graph neighbors to lexical observations without another agent action. No official implementation was published, so its omitted path-confidence and community-scoring details cannot be copied exactly.
- Aider builds a def/reference File graph, runs personalized PageRank biased by active files and prompt-mentioned identifiers, and binary-searches a rendered repository map into a token budget.
- RepoGraph exposes one shallow symbol action. LocAgent combines lexical seeds with typed one-hop traversal. GraphLocator supports edge-centered search but adds LLM filtering and much larger turn budgets.

The shared useful idea is bounded task-selective evidence, not graph traversal by default.

## Clean-install evaluation

The evaluation moved from answer-only localization prompts to two real historical CodeGraphy regressions at their original failing commits:

1. globally enabling a shared Plugin ID updated only one conflicting installed package record;
2. filtered files consumed `maxFiles`, starving eligible files and polluting a fresh Graph Cache.

Each run started from an isolated copy containing the original failing regression test. Repository Markdown, Agent Skills, context files, prompt templates, extensions, sessions, shared agent homes, and visible answers were absent. The raw arm's restricted `PATH` could not resolve `codegraphy`. CLI arms received a freshly built external CLI and a separately prepared Graph Cache. Every run used `openai-codex/gpt-5.6-sol` with low thinking, could edit production code, and was accepted only when the untouched historical regression test passed. Indexing cost was measured outside task time.

Simply placing the CLI on `PATH` did not produce a treatment: none of six skill-free agents invoked the unknown command. A tiny command contract caused agents to use it, but results split by task. Plugin activation improved from 108,404 to 44,159 median tokens, while discovery regressed from 134,679 to 207,836. Discoverability and command-selection policy are therefore part of the agent interface, but they must not contain task answers.

A clean three-arm skill screen then compared raw navigation, a 74-word two-call rule, and the previous full skill:

| Median total tokens | Raw | Short bounded skill | Previous full skill |
|---|---:|---:|---:|
| Plugin activation | 199,805 | 135,099 | 85,480 |
| Discovery budget | 313,846 | 178,759 | 225,249 |
| Correct runs | 5/6 | 6/6 | 6/6 |

The short rule controlled exploration but did not teach Target Query selection. The full skill localized the plugin task well but allowed repeated broad phrase searches on the discovery task. A compact policy combined both lessons:

- use CodeGraphy only when source ownership or a Relationship is unknown;
- skip it when an exact source or failing test already localizes a small task;
- search with an exact identifier plus one task-domain word, or at most three short task literals;
- never submit a sentence or guessed API name;
- normally allow one Search and one exact Target Query, with one additional Relationship continuation only when unresolved;
- read returned paths directly instead of relocalizing them through repository-wide search.

The compact policy screening medians were 70,258 tokens for Plugin activation and 170,295 for discovery, with all six runs correct. The exact shipped 3,407-byte skill was then paired against raw navigation in a fresh six-run comparison:

| Median | Raw | CodeGraphy + shipped skill | Delta |
|---|---:|---:|---:|
| Plugin activation tokens | 173,833 | 70,556 | 59.4% fewer |
| Discovery budget tokens | 258,625 | 247,174 | 4.4% fewer |
| Pooled tokens | 199,642 | 113,360 | 43.2% fewer |
| Plugin activation calls | 16 | 18 | 2 more |
| Discovery budget calls | 28 | 22 | 6 fewer |
| Correct runs | 6/6 | 6/6 | equal |

The sample is small and task variance remains high. It establishes a selected token-first policy for these tasks, not universal superiority.

## Rejected additions

A LARGER-inspired prototype attached up to two live per-term source lines to every natural-phrase File result. It reduced Plugin activation from the shipped skill's 70,556-token median to 59,356, but increased discovery from 247,174 to 577,260 and raised calls to 30–37. Superficially term-rich but causally irrelevant files looked authoritative. The prototype was reverted completely.

Seeded weighted Leiden was evaluated on the clean fixture's File projection: 2,729 files, 5,853 weighted links, 549 communities, modularity 0.864, and 45.2 ms runtime. Community-density reranking improved none of six real localization phrases. It moved the discovery target from rank 3 to 10 and the Plugin target from rank 1 to 2. Communities remain useful architecture metadata candidates, but are not a default localization prior or output field.

Generic connected neighborhoods remain rejected by ADR 0009. Agents read source after receiving them, so their added output increased end-to-end tokens. Target source embedding, BM25 fallback, mandatory Symbol preference, and an underspecified minimal skill remain rejected by ADR 0008 and ADR 0009.

## Decision

Use cumulative model `totalTokens` per correct task as the primary acceptance metric for agent-interface experiments. Report input, cache-read, output, and reasoning tokens separately, plus correctness, tool classes, result bytes, calls, elapsed time, and clean indexing cost.

Ship the compact task-selective Agent Skill. The normal navigation budget is two CodeGraphy calls, with a third only for one unresolved Relationship continuation. Teach agents when not to use CodeGraphy and require direct reads after useful paths are known.

Evaluate CLI behavior, Agent Skill behavior, and algorithm changes as separate arms. A raw baseline has no CodeGraphy executable or skill. A CLI-discoverability arm may state that the command exists but must not provide task-specific guidance. Skill arms differ only by frozen generalized instruction text.

Do not add search evidence, graph neighborhoods, PageRank, Leiden communities, god-node output, or new traversal commands because they are plausible in isolation. Add one only after a clean held-out coding task shows lower end-to-end model tokens at non-inferior correctness.

## Consequences

- CodeGraphy is a selective accelerator, not a mandatory first step.
- Skill length is not minimized independently; enough command-selection guidance can reduce total trajectory tokens despite a larger initial prompt.
- Search phrase construction is part of retrieval quality. Common identifiers need one domain term; full natural-language sentences are discouraged.
- Runtime and tool-call improvements cannot compensate for token regression.
- Clean-install benchmarks must keep answers, repository instructions, caches, homes, and skill text isolated by condition.
- Leiden clustering has been tested and rejected as a default retrieval prior, while remaining available for a future explicit subsystem use case.

## References

- Graphify source: https://github.com/Graphify-Labs/graphify
- LARGER paper: https://arxiv.org/abs/2605.16352
- Aider RepoMap: https://github.com/Aider-AI/aider/blob/main/aider/repomap.py
- RepoGraph: https://github.com/ozyyshr/RepoGraph
- LocAgent: https://github.com/gersteinlab/LocAgent
- GraphLocator: https://github.com/oceaneLIU/GraphLocator
- ADR 0007, Search and Target Query
- ADR 0008, agent Search and settings workflow
- ADR 0009, complete reexport Relationships and rejected connected neighborhoods
