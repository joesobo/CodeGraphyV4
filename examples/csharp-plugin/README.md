# C# Plugin Test Fixture

A mini C# project with predictable using patterns for testing CodeGraphy's C# plugin.

## Structure

```
src/
├── Program.cs         # Entry point
├── Config.cs          # Configuration
├── Orphan.cs          # No connections (test showOrphans)
├── Utils/
│   ├── Helpers.cs     # Utility functions
│   └── Formatter.cs   # Formatting utilities
└── Services/
    └── ApiService.cs  # API service
```

## Expected Graph Structure

```
Program.cs ────┬──▶ Config.cs
               │
               ├──▶ Services/ApiService.cs ──▶ Utils/Helpers.cs ──▶ Utils/Formatter.cs
               │
               └──▶ Utils/Helpers.cs

Orphan.cs (no connections - only visible with showOrphans=true)
```

## Using Patterns Tested

| Pattern | Example | File |
|---------|---------|------|
| Namespace using | `using MyApp.Utils;` | Program.cs |
| Relative path | `using MyApp.Services;` | Program.cs |
| System usings | `using System;` | (ignored) |

## Files

| File | Uses | Used By |
|------|------|---------|
| `Program.cs` | Config, ApiService, Helpers | — |
| `Config.cs` | — | Program |
| `Orphan.cs` | — | — |
| `Utils/Helpers.cs` | Formatter | Program, ApiService |
| `Utils/Formatter.cs` | — | Helpers |
| `Services/ApiService.cs` | Helpers | Program |

## How to Test

1. Open CodeGraphy repo in VSCode
2. Press F5 to launch Extension Development Host
3. In the new window: **File → Open Folder → examples/csharp-plugin**
4. Click the CodeGraphy icon in the activity bar
5. Compare the graph to the expected structure above
