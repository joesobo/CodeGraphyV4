---
"@codegraphy-dev/core": major
"@codegraphy-dev/plugin-api": major
---

Replace the Visible Graph core API with the Core-owned Graph Model API.

Core callers should use `buildGraphModel` and `GraphModel*` types instead of `deriveVisibleGraph` and `VisibleGraph*` types. Plugin authors should move graph-to-graph organization behavior from `graphView.projections` to Graph Model contributions so those contributions run before Graph Scope, Filter, and Search.
