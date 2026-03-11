# C# Plugin

Detects using directives and intra-namespace type usage in C# files, resolving them to file paths using convention-based namespace mapping.

## Supported Extensions

`.cs`

## Rules

| Rule | Description |
|------|-------------|
| Using Directives | `using System;`, `using static System.Math;`, `global using X;`, `using Alias = X;` |
| Type Usage | Intra-namespace references: `new Type()`, `Type.Method()`, `: Type` |

## Path Resolution

- Convention-based: namespace parts map to directory structure (`MyApp.Services` → `Services/`)
- Namespace registry for cross-file resolution
- Type-aware: only creates connections for types actually used in the file
- Supports configurable root namespace stripping and source directories
