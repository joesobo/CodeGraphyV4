---
name: codegraphy
description: Use the CodeGraphy CLI to index, shape, and query a workspace graph.
---

# CodeGraphy

CodeGraphy turns a workspace into a queryable graph.

## Workflow

1. Index the workspace.

```bash
codegraphy index
```

2. Shape the graph with filters, Graph Scope, and plugins when needed.

3. Query nodes, search results, edges, dependencies, dependents, or paths.

Run `codegraphy --help` for the full workflow and `codegraphy <command> --help` for arguments, effects, output, and examples. Commands use the current directory by default and return JSON unless they are help or version commands.
