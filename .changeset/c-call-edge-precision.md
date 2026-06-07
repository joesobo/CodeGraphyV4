---
"@codegraphy-dev/core": patch
---

Stop attributing unmatched C function calls to the only included header.

C call edges now point to included headers only when the analyzer finds a matching function declaration in that header. Local helper calls and other unresolved calls no longer create misleading file-to-header Call edges just because the source file has one include.
