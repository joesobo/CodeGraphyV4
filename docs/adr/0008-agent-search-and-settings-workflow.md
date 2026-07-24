# Deterministic phrase search and safe agent settings

**Status:** Accepted

## Context

A controlled hard-task run took 151.1 seconds although the prepared Graph Cache was fresh and covered all 903 eligible files. The run used 26 model turns, 34 tools, and 307,302 processed tokens. It exhausted its four CodeGraphy calls on Search, never used Target Query, followed unrelated `FilterOptions` and `includePatterns` results, and then reread known source through many sequential reads and greps. The CLI processes themselves accounted for only about 4–5 seconds.

The specific retrieval failure was `search "filter command"`. Literal phrase matching returned one parse-test line instead of `src/cli/filter/command.ts`.

BM25 was considered as a natural-language fallback. The Robertson BM25 literature defines a term-frequency and inverse-document-frequency rank with document-length normalization. Lucene's `BM25Similarity` uses the common defaults `k1 = 1.2` and `b = 0.75`; SQLite FTS5 exposes the same constants and supports column weighting.

A 902-document prototype compared literal matching, deterministic all-term ranking, and BM25 over path-boosted source documents. Both alternatives ranked `src/cli/filter/command.ts` first for `filter command`; BM25 handled some looser multi-term queries better, while deterministic ranking preserved stronger path precision.

A forced six-agent A/B test then required the same first command, `codegraphy search "filter command"`, so every treatment exercised the fallback. BM25 returned the target File first, but its broader ten-File candidate list did not improve task completion:

| Hard-task median | Literal | BM25 | BM25 delta |
|---|---:|---:|---:|
| Elapsed | 118.7 s | 135.6 s | 14.2% slower |
| Tool calls | 27 | 32 | 18.5% more |
| Total tokens | 176,147 | 183,241 | 4.0% more |
| Tool output | 115,837 B | 87,835 B | 24.2% fewer |

The direct retrieval improved, but the larger ranked candidate set encouraged more continuation and fallback exploration. An additional unforced A/B did not reliably invoke a natural phrase and was therefore treated as stochastic evidence, not a BM25 comparison.

The same traces raised a second hypothesis: embedding bounded live source in Target Query might remove a source-read turn. Two three-pair follow-ups rejected it. In v6, source-context Query was 3.4% slower than the prior CodeGraphy interface and used 28.1% more tokens. Stronger no-reread guidance in v7 reduced median elapsed time and calls, but tokens remained 61.2% higher and agents still duplicated or serially followed the context. Source embedding shifted work into larger accumulated model contexts rather than reliably removing it.

Agents also could not safely raise `maxFiles` or change another top-level workspace setting through one structured interface. Existing persisted-settings readers silently replaced malformed JSON and malformed known fields with defaults, so a mutation could overwrite corruption.

The selected graph-focused Query, deterministic phrase fallback, and bounded-skill workflow were then compared with ordinary navigation in three fresh paired v10 runs. Every answer contained the complete diagnosis and test surface. Final medians improved all four optimization metrics:

| Hard-task median | Ordinary navigation | Selected CodeGraphy | Improvement |
|---|---:|---:|---:|
| Elapsed | 131.7 s | 115.0 s | 12.7% faster |
| Tool calls | 32 | 26 | 18.8% fewer |
| Total tokens | 188,319 | 106,418 | 43.5% fewer |
| Tool output | 155,243 B | 100,455 B | 35.3% fewer |

The treatment won elapsed time in two of three pairs; the sample remains intentionally small. Separate v8/v9 comparisons against the prior CodeGraphy interface confirmed lower elapsed time and tokens but showed call-count variance, so no universal superiority claim is made.

## Decision

Do not ship BM25 as the default or add a public ranking flag.

Keep exact case-insensitive literal, wildcard, AST Symbol, Node, and source-line matches as the primary Search path. When a whitespace-separated natural phrase has fewer than five direct matches:

- tokenize camelCase, paths, and source text;
- remove a small fixed stop-word set;
- require every query term;
- prefer documents whose path contains every term;
- return at most three deterministic File candidates before lower-ranked direct source evidence.

Keep Target Query focused on graph evidence. It returns prioritized declarations and incoming/outgoing Relationships; callable and type declarations rank ahead of local constants. Do not embed source text. Once target and test Files are known, the Agent Skill directs one parallel source-read turn instead of serial reads or repeated graph searches.

Add one workspace-settings interface:

- `settings` reads all effective settings;
- `settings get <key>` reads one effective value;
- `settings set <key> <json>` validates and persists one supported top-level setting;
- `settings unset <key>` restores its default.

Settings mutations preserve unknown top-level fields, validate the complete existing file before writing, report `indexRequired`, and never replace malformed persisted input with defaults. Persisted known fields use strict validation; the standalone normalization function remains tolerant for programmatic inputs.

Indexing remains explicit and separate from settings and querying. Its structured `discovery` result reports `indexedFiles`, `totalFound`, and `limitReached`; a capped result includes the exact `settings set maxFiles` recovery command. An agent raises the file budget or adjusts durable filters only after Indexing reports truncation, then runs `index` and resumes Search or Target Query.

## Consequences

- Natural `filter command` discovery returns one high-confidence File candidate instead of a broad lexical list.
- Exact identifier behavior remains deterministic and unchanged.
- Query output stays graph-focused and bounded; exact source remains a deliberate read after all relevant Files are known.
- Configuration corruption becomes visible to Filter, Settings, Doctor, and other persisted-settings callers, and corrupt bytes are preserved.
- BM25 remains a rejected experiment for this corpus and task distribution. It may be reconsidered for substantially larger corpora only with end-to-end agent evidence, not retrieval scores alone.
- SQLite FTS5 is not added. Search already reads current source text, and the in-memory deterministic fallback adds negligible work without introducing another persisted source index or tokenizer contract.

## References

- Stephen E. Robertson et al., “Okapi at TREC-3” / BM25 foundations: https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf
- Apache Lucene `BM25Similarity`: https://lucene.apache.org/core/9_12_1/core/org/apache/lucene/search/similarities/BM25Similarity.html
- SQLite FTS5 `bm25()` ranking: https://www.sqlite.org/fts5.html#the_bm25_function
