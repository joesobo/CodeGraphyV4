---
"@codegraphy-dev/core": minor
---

Add core language coverage for Objective-C, Scala, and Pascal workspaces.

Objective-C and Scala use native Tree-sitter grammars so users get file nodes, local/imported file relationships, inheritance where the analyzer can resolve it, and useful symbol nodes for classes, protocols, traits, objects, enums, type aliases, and methods. Pascal is handled by a core text-baseline analyzer because the available `tree-sitter-pascal` package does not ship a usable native binding; users still get Pascal unit `uses` relationships, class inheritance relationships, and class/record/interface/procedure symbols without breaking the Tree-sitter runtime.
