# C# Example

A small C# workspace for manual checks of CodeGraphy's C# support.

## Graph Screenshot

![C# example graph screenshot](../assets/graphs/csharp.png)

## Structure

```
src/
├── Program.cs         # Entry point
├── Config.cs          # Configuration
├── Orphan.cs          # No relationships (test showOrphans)
├── Contracts/
│   └── IRunner.cs     # Runner contract
├── Utils/
│   ├── Helpers.cs     # Utility functions
│   └── Formatter.cs   # Formatting utilities
└── Services/
    ├── ApiService.cs  # API service
    └── BaseService.cs # Base service
```

## Expected Graph Structure

```
Program.cs ────┬──▶ Config.cs
               │
               ├──▶ Services/ApiService.cs ──▶ Utils/Helpers.cs ──▶ Utils/Formatter.cs
               │
               └──▶ Utils/Helpers.cs

Services/ApiService.cs ──inherit──▶ Services/BaseService.cs
Services/ApiService.cs ──inherit──▶ Contracts/IRunner.cs

Orphan.cs (Orphan Node - only visible with showOrphans=true)
```

## Using Patterns Tested

| Pattern | Example | File |
|---------|---------|------|
| Namespace using | `using MyApp.Utils;` | Program.cs |
| Relative path | `using MyApp.Services;` | Program.cs |
| Inheritance | `class ApiService : BaseService, IRunner` | ApiService.cs |
| System usings | `using System;` | (ignored) |

## Files

| File | Uses | Used By |
|------|------|---------|
| `Program.cs` | Config, ApiService, Helpers | — |
| `Config.cs` | — | Program |
| `Contracts/IRunner.cs` | — | ApiService |
| `Orphan.cs` | — | — |
| `Utils/Helpers.cs` | Formatter | Program, ApiService |
| `Utils/Formatter.cs` | — | Helpers |
| `Services/ApiService.cs` | BaseService, IRunner, Helpers | Program |
| `Services/BaseService.cs` | — | ApiService |

## How to Test

1. Open CodeGraphy repo in VSCode
2. Press F5 to launch Extension Development Host
3. In the new window: **File → Open Folder → examples/example-csharp**
4. Click the CodeGraphy icon in the activity bar
5. Compare the graph to the expected structure above

## Symbol Node Demo

Suggested symbol check:

1. Open `src/Program.cs`.
2. In Graph Scope, enable **Symbol**.
3. Search for `Program`, `Config`, `ApiService`, `BaseService`, `IRunner`, and `Helpers`.

Expected behavior:

- Class, Interface, and Function symbols show the application entry point, configuration object, service class, inherited base, implemented contract, and helper calls.
- The file graph stays small, while symbol nodes explain why `Program.cs` reaches the service and utility files.
