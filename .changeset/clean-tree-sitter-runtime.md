---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
"@codegraphy-dev/tldraw": patch
---

Use Tree-sitter's upstream prebuilt runtime on Node.js `^22.14.0 || >=23.6.0`.
Language analysis is unchanged, and CodeGraphy no longer needs its temporary
native-build patch.
