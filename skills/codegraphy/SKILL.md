---
name: codegraphy
description: Use the CodeGraphy CLI to index, shape, and query a workspace graph.
---

# CodeGraphy

CodeGraphy turns a workspace into a queryable graph.

## Workflow

1. `codegraphy index` writes the complete workspace graph to `.codegraphy/graph.sqlite`.
2. Shape the graph with `codegraphy filter`, `scope`, and `plugins`.
3. Query with `nodes`, `search`, `edges`, `dependencies`, `dependents`, or `path`.

Use `status` for cache freshness and `doctor` for runtime, settings, cache, and plugin diagnostics. Run `codegraphy --help` or `codegraphy <command> --help` for the exact contract and examples. Commands use the current directory by default, accept `-C <path>` for another workspace, and return a JSON envelope unless they are help or version commands.
