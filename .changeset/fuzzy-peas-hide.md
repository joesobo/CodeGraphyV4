---
"@codegraphy/extension": patch
"@codegraphy-vscode/mcp": patch
---

Improve CodeGraphy symbol and impact data for type-focused refactors.

The saved index now records TypeScript type aliases, interfaces, and enums as symbols, resolves type-only imports to target symbols when possible, and lets MCP impact queries traverse incoming, outgoing, or bidirectional relationships with edge-kind filters to reduce noise.
