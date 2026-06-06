---
"@codegraphy-dev/extension": patch
"@codegraphy-dev/core": minor
"@codegraphy-dev/plugin-api": minor
"@codegraphy-dev/plugin-typescript": patch
"@codegraphy-dev/plugin-markdown": patch
"@codegraphy-dev/plugin-godot": patch
---

Graph Scope now shows Edge Type controls from indexed workspace capabilities instead of every theoretical toggle or only currently observed edges. Relevant Edge Types can appear even when the latest graph has zero matching relationships, and CodeGraphy decides the relevant Edge Type list before Depth Mode, filters, search, or other view narrowing changes what is displayed. Edge Type controls stay visible but disabled until the workspace has a Graph Cache, and Graph Scope returns to Node Types if an unindexed workspace is opened while Edge Types was selected. Any existing Graph Cache enables Edge Type controls, even while Graph Cache Sync catches up.

Source-language workspaces now surface Calls as a relevant Edge Type when their language has callable imported APIs, including C, C++, C#, Dart, Haskell, Kotlin, Lua, Objective-C, Pascal, PHP, Ruby, Scala, and Swift.

Plugins can declare core or plugin-owned Edge Type capabilities with `contributeEdgeTypeCapabilities(context)`. Plugin authors should use `context.filePaths` when a plugin supports multiple languages or file families with different Edge Types, so Graph Scope only shows toggles that are relevant to the indexed workspace.
