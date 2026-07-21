---
name: codegraphy
description: Use the CodeGraphy CLI to index, shape, and query a workspace graph.
---

# CodeGraphy

CodeGraphy turns a workspace into a queryable graph.

## Workflow

1. Configure graph contributors with `codegraphy plugins`, then run `codegraphy index`.
2. Shape returned results with `codegraphy filter` and `codegraphy scope`. These do not reindex or remove stored graph facts.
3. Query with `nodes`, `search`, `edges`, `dependencies`, `dependents`, or `path`.

`index` stores the complete graph in `.codegraphy/graph.sqlite`. Use `status` for cache freshness and `doctor` for runtime, settings, cache, and plugin diagnostics. Run `codegraphy --help` or `codegraphy <command> --help` for the exact contract and examples. Commands use the current directory by default, accept `-C <path>` for another workspace, and return a JSON envelope unless they are help or version commands.
