---
"@codegraphy-dev/plugin-typescript": patch
---

TypeScript alias import analysis now reads `tsconfig` compiler options without enumerating every project file, and it reuses parsed alias configuration until the config changes. On the CodeGraphy monorepo benchmark, this moved cold indexing from 37.27s to 17.28s: 19.99s faster, a 53.64% reduction, and 2.16x faster. File analysis improved from 23,352ms to 3,697ms: 19,655ms faster, an 84.17% reduction, and 6.32x faster.
