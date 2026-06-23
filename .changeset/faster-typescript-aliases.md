---
"@codegraphy-dev/plugin-typescript": patch
---

TypeScript alias import analysis now reads `tsconfig` compiler options without enumerating every project file, and it reuses parsed alias configuration until the config changes. On the CodeGraphy monorepo benchmark, this moved cold indexing from 37.27s to 17.28s and file analysis from 23,352ms to 3,697ms.
