# TypeScript/JavaScript Plugin

Detects import relationships in TypeScript and JavaScript files using the TypeScript Compiler API for accurate AST-based parsing.

## Supported Extensions
.ts .tsx .js .jsx .mjs .cjs

## Rules
| Rule | Description |
|------|-------------|
| ES6 Imports | import/export statements |
| Re-exports | export { x } from "y" |
| Dynamic Imports | import("module") |
| CommonJS Require | require("module") |

## Path Resolution
Uses tsconfig.json / jsconfig.json for path aliases, baseUrl, extension inference, and index file resolution.
