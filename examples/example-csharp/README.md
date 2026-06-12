# C# Example

A small C# workspace for manual checks of CodeGraphy's Core Tree-sitter C# support.
The C# plugin currently contributes ecosystem defaults; Core Tree-sitter owns the
C# Imports, References, Calls, Inherits, Contains, and symbol-node behavior shown
by this example.

## Graph Screenshot

![C# example graph screenshot](../assets/graphs/csharp.png)

## Structure

```
src/
├── Program.cs          # Entry point
├── Config.cs           # Configuration class and static call target
├── Orphan.cs           # No relationships (test showOrphans)
├── Contracts/
│   └── IRunner.cs      # Runner interface
├── Models/
│   ├── RunRequest.cs   # Struct used by Program and ApiService
│   └── RunStatus.cs    # Enum used by ApiService and formatting helpers
├── Utils/
│   ├── Helpers.cs      # Static helper methods
│   └── Formatter.cs    # Formatting utilities
└── Services/
    ├── ApiService.cs   # Service inheriting a base class and implementing IRunner
    └── BaseService.cs  # Base service with inherited method call target
```

## Expected Graph Structure

```
Program.cs ────┬──▶ Config.cs
               ├──▶ Models/RunRequest.cs
               ├──▶ Services/ApiService.cs ──▶ Services/BaseService.cs
               │                         └──▶ Utils/Helpers.cs ──▶ Utils/Formatter.cs
               └──▶ Utils/Helpers.cs

Services/ApiService.cs ──inherit──▶ Services/BaseService.cs
Services/ApiService.cs ──inherit──▶ Contracts/IRunner.cs
Services/ApiService.cs ──reference──▶ Models/RunStatus.cs

Orphan.cs (Orphan Node - only visible with showOrphans=true)
```

## Core Tree-sitter Patterns Tested

| Pattern | Example | File |
|---------|---------|------|
| Namespace using | `using MyApp.Utils;` | Program.cs |
| Type construction | `new RunRequest(...)` | Program.cs |
| Static call | `Config.LoadConfig()` | Program.cs |
| Static helper call | `Helpers.FormatStatus(status)` | Program.cs |
| Inheritance | `class ApiService : BaseService, IRunner` | ApiService.cs |
| Inherited method call | `Status()` | ApiService.cs |
| Enum reference | `RunStatus.Succeeded` | ApiService.cs |
| System usings | `using System;` | Program.cs |

## Files

| File | Uses | Used By |
|------|------|---------|
| `Program.cs` | Config, ApiService, RunRequest, Helpers | — |
| `Config.cs` | — | Program |
| `Contracts/IRunner.cs` | — | ApiService |
| `Models/RunRequest.cs` | — | Program |
| `Models/RunStatus.cs` | — | ApiService |
| `Orphan.cs` | — | — |
| `Utils/Helpers.cs` | Formatter | Program, ApiService |
| `Utils/Formatter.cs` | — | Helpers |
| `Services/ApiService.cs` | BaseService, IRunner, RunStatus, Helpers | Program |
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
2. In Graph Scope, enable **Symbol** and the C# symbol rows.
3. Search for `Program`, `Config`, `ApiService`, `BaseService`, `IRunner`,
   `RunRequest`, `RunStatus`, `Helpers`, and `Formatter`.

Expected behavior:

- Class, Interface, Struct, Enum, and Function rows are relevant for this C# workspace.
- Function includes C# method declarations such as `Main`, `LoadConfig`, `Run`,
  `Status`, `FormatStatus`, and `FormatOutput`.
- Contains edges connect each file to its symbols, and Calls edges can connect
  caller methods to method/type symbols when symbol nodes are enabled.
