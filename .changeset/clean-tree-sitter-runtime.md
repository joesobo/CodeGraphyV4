---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
"@codegraphy-dev/tldraw": patch
---

Use Tree-sitter's upstream prebuilt runtime on Node.js 22.14.0 and newer.
Language analysis is unchanged, and CodeGraphy no longer needs its temporary
native-build patch.
