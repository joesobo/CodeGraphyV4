# Agents choose their CodeGraphy strategy

**Status:** Accepted

## Context

ADR 0010 selected a compact Agent Skill after two historical regression benchmarks. That skill improved model-token use, but it also prescribed a command sequence, fixed call budget, search wording, stopping rules, and when CodeGraphy was permitted. Those constraints measured compliance with one navigation policy rather than whether an agent understood CodeGraphy well enough to reason about the task.

An unknown executable on `PATH` is not a meaningful CodeGraphy treatment because agents do not know that it exists or what its graph represents. The deployable agent interface is the CLI together with its generalized Agent Skill.

Future CLI experiments also need a stable implementation workload. Diagnosis-only questions do not exercise the complete loop of localization, source reasoning, editing, test selection, and verification. Changing benchmark tasks between candidates makes token differences uninterpretable.

## Decision

The CodeGraphy Agent Skill describes the product rather than directing an agent workflow. It covers:

- Relationship Graph Nodes, directed typed Edges, and static-analysis limits;
- Indexing, Graph Cache state, Plugins, Filters, Graph Scope, settings, status, and doctor;
- Search, Target Query, inventories, dependencies, dependents, and Path;
- live source evidence versus cached Symbols and Relationships;
- exact target identity, wildcard and phrase behavior, projections, pagination, bounds, and completeness;
- JSON stdout, structured stderr, exit status, verbose diagnostics, and recovery details;
- coverage, freshness, hub, static-analysis, and interpretation limitations.

The skill does not prescribe a command sequence, maximum call count, preferred search phrase, stopping rule, or conditions under which the agent is allowed to use CodeGraphy. The agent selects commands and combines graph evidence with ordinary repository tools according to its own reasoning.

Agent-utility experiments use one frozen moderate feature-change task until a deliberate benchmark-version change. Each condition runs three times in a fresh isolated workspace and agent home:

- **Raw:** no CodeGraphy executable, Graph Cache, skill, repository Agent Markdown, prior session, or answer-bearing context.
- **CodeGraphy:** the candidate CLI plus the exact shipped generalized skill and a freshly prepared per-run Graph Cache. Indexing cost is measured separately.

Both conditions receive the same neutral task prompt, source tree, dependency state, tool access, model, and thinking level. A run is correct only when the unchanged hidden validation passes and the requested behavior is implemented. Cumulative model tokens per correct run are primary. Mean and median tokens, token classes, calls, tool output, elapsed time, fallback navigation, files read, and indexing cost are reported.

Each CLI or skill candidate changes one independently attributable behavior and reruns the same three-versus-three comparison. Candidates are retained only with non-inferior correctness and an end-to-end token improvement that is not explained solely by one outlier. Rejected implementation and generated fixtures are removed before the next candidate.

## Consequences

- CodeGraphy is evaluated as the installable CLI-plus-skill product, not as an undiscoverable executable.
- Agents can exploit commands and combinations not anticipated by the skill author.
- Skill improvements deepen accurate understanding rather than steering agents toward benchmark-specific trajectories.
- Feature implementation, hidden tests, and fresh workspaces make the benchmark closer to real coding work than answer-only localization.
- Three repetitions provide a fast iteration signal, not a universal performance claim; promising candidates require broader held-out confirmation.
- ADR 0010 remains the historical record of the token-first experiments, but its prescribed navigation policy is superseded.

## References

- ADR 0007, Search and Target Query
- ADR 0008, retrieval and settings experiments
- ADR 0009, exact reexport Relationships
- ADR 0010, initial token-first clean-install experiments
