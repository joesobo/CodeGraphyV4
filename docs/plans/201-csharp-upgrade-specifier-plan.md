# C# Upgrade Specifier Plan

## Result

The C# upgrade should stay in this loop. The next role should first reshape
`examples/example-csharp` into the expected C# support demo, then update the
generated/executable acceptance work to match the approved human Markdown
contract.

Human-owned acceptance Markdown still needs approval before
`packages/extension/tests/acceptance/specs/csharp-example.md` is edited.

## Supported C# Inventory

Current Core Tree-sitter C# support is owned by
`packages/core/src/treeSitter/runtime/analyzeCSharp` and
`packages/core/src/treeSitter/runtime/csharpIndex`. The C# plugin is
metadata-only.

Supported edge capabilities from current Core capability metadata:

- `Imports`
- `References`
- `Calls`
- `Inherits`

Supported C# symbol node capabilities from current Core capability metadata:

- `Function`
- `Class`
- `Interface`
- `Struct`
- `Enum`

Important product-label detail: C# method declarations are emitted as symbol
kind `method`, but the C# capability row is `symbol:function`; the core
Function node type matches both `function` and `method`. The C# example should
therefore use the Graph Scope label `Function`, not `Method`.

Current C# analyzer behavior proven by tests:

- class, interface, struct, enum, and method symbols can be emitted.
- `using` directives become `Imports`, unresolved for external namespaces and
resolved when referenced namespace types exist in the workspace index.
- member access and object creation of uppercase type names become
`References` when the type resolves through current namespace or using
namespaces.
- object creation and static member access become `Calls` when the target type
resolves.
- unqualified method invocation can become a `Calls` edge to the single
resolved base class for the containing type.
- base-list entries become `Inherits` edges; only class base types are carried
forward for inherited method-call resolution.

Likely Core gap to verify red-first: the C# capability metadata does not list
`contains`, even though symbol node examples need `Contains` to prove file-to-
symbol projection. If the upgraded C# symbol acceptance cannot see the Contains
edge row after indexing with symbol node types, Coder should add the smallest
Core capability test/fix that makes C# expose `Contains` consistently with the
symbol-node contract.

## Example Shape

Keep the example small, readable, and C#-natural. Prefer file-scoped namespaces
to reduce fixture noise, matching current Microsoft C# guidance that namespaces
organize types and file-scoped namespaces are recommended for new code.

Upgrade `examples/example-csharp/src` around a simple task-runner/service demo:

- `Program.cs`: entry point that loads `Config`, creates an `ApiService`, builds
  a `RunRequest` struct value, calls the service, and formats output through
  `Helpers`.
- `Config.cs`: class with `LoadConfig()` static call target.
- `Contracts/IRunner.cs`: interface implemented by the service.
- `Services/BaseService.cs`: class with an inherited method target such as
  `Status()`.
- `Services/ApiService.cs`: class inheriting `BaseService` and implementing
  `IRunner`; it should reference/call `Helpers`, `RunRequest`, and `RunStatus`,
  and call the inherited base method.
- `Models/RunRequest.cs`: struct used from `Program.cs` and `ApiService.cs`.
- `Models/RunStatus.cs`: enum used from `ApiService.cs` and/or `Program.cs`.
- `Utils/Helpers.cs`: static helper class that calls `Formatter`.
- `Utils/Formatter.cs`: class/static helper called by `Helpers`.
- `Orphan.cs`: keep one intentionally unrelated class so file-orphan behavior
  remains easy to see.

The README should describe only current Tree-sitter/Core behavior:

- C# plugin contributes ecosystem defaults only.
- Core Tree-sitter owns C# Imports, References, Calls, Inherits, and symbols.
- Mention known limits only as current Core limits, not plugin gaps.

## Proposed Acceptance Contract

After the example source is updated and measured, `csharp-example.md` should
follow the C/C++ pattern with two scenarios.

Scenario 1: file relationships

- Open `examples/example-csharp`, index, show no edge types.
- Assert the expected file-node count and file list.
- Graph Scope edge types should be only the C#-relevant rows: `Imports`,
  `References`, `Calls`, `Inherits`, plus `Contains` if the symbol-node contract
  requires it to be available from current Core behavior.
- Toggle `Imports`, `References`, `Inherits`, and `Calls` independently.
- Assert stable counts and representative file edges:
  - `Program.cs` to `Config.cs`, `Services/ApiService.cs`,
    `Models/RunRequest.cs`, `Models/RunStatus.cs`, and/or `Utils/Helpers.cs`
    according to the final source.
  - `Services/ApiService.cs` to `Services/BaseService.cs` and
    `Contracts/IRunner.cs`.
  - `Utils/Helpers.cs` to `Utils/Formatter.cs`.
  - one intentionally unrelated file remains orphaned when only file-level
    relationship edges are enabled.

Scenario 2: C# symbol node scope

- Open `examples/example-csharp`, index, show no edge types.
- Select Graph Scope node types and assert available C# node types are only
  `Function`, `Class`, `Interface`, `Struct`, and `Enum`.
- Assert `Method`, `Type`, and C/C++-only rows are not available for the C#
  example.
- Show only File plus each C# symbol node type and assert stable counts plus
  representative symbols:
  - Class: `Program`, `Config`, `ApiService`, `BaseService`, `Helpers`,
    `Formatter`, `Orphan`.
  - Interface: `IRunner`.
  - Struct: `RunRequest`.
  - Enum: `RunStatus`.
  - Function: representative C# methods such as `Main`, `LoadConfig`, `Run`,
    `Status`, `Process`, or `FormatOutput`.
- Toggle `Contains` with all C# symbol node types enabled and assert file-to-
  symbol edges such as `src/Models/RunRequest.cs` to
  `src/Models/RunRequest.cs#RunRequest:struct`.
- Show only `Calls` with symbol node types enabled and assert representative
  symbol-level calls where current Core supports them. If C# only reliably
  exposes file-level Calls for a case, keep the contract at the file edge level
  and record the unsupported symbol-call expectation as a follow-up note.

## Acceptance Impact Scan

Directly affected human-owned spec:

- `packages/extension/tests/acceptance/specs/csharp-example.md`

Likely generated/tooling files after approval:

- `packages/extension/tests/playwright-vscode/generated/acceptance.spec.ts`

Potential fixture/source/docs files:

- `examples/example-csharp/README.md`
- `examples/example-csharp/src/**/*.cs`
- `examples/example-csharp/.codegraphy/settings.json`
- `examples/README.md`

Intentionally unaffected specs:

- `packages/extension/tests/acceptance/specs/c-example.md`
- `packages/extension/tests/acceptance/specs/cpp-example.md`
- generic Graph Scope specs, unless Coder changes shared Graph Scope capability
  behavior for `Contains`.

## Files Inspected

- `AGENTS.md`
- `CONTEXT.md`
- `docs/agents/codegraphy-loop.md`
- `docs/agents/loops/specifier.md`
- `docs/agents/acceptance-specs.md`
- `docs/handoff/201-csharp-upgrade.md`
- `packages/core/src/treeSitter/runtime/capabilities.ts`
- `packages/core/src/treeSitter/runtime/analyzeCSharp/file.ts`
- `packages/core/src/treeSitter/runtime/analyzeCSharp/declarations.ts`
- `packages/core/src/treeSitter/runtime/analyzeCSharp/references.ts`
- `packages/core/src/treeSitter/runtime/analyzeCSharp/resolution.ts`
- `packages/core/src/treeSitter/runtime/analyzeCSharp/usingImports.ts`
- `packages/core/src/treeSitter/runtime/csharpIndex/nodes.ts`
- `packages/core/src/treeSitter/runtime/csharpIndex/preAnalyze.ts`
- `packages/core/src/treeSitter/runtime/csharpIndex/resolve.ts`
- `packages/core/src/treeSitter/runtime/csharpIndex/store.ts`
- `packages/core/src/treeSitter/runtime/csharpIndex/tree.ts`
- `packages/core/src/graphControls/defaults/symbolNodeTypes.ts`
- `packages/core/src/graph/data.ts`
- `packages/core/src/graph/symbols.ts`
- `packages/core/tests/treeSitter/csharp/*.test.ts`
- `packages/core/tests/treeSitter/csharpIndex/*.test.ts`
- `packages/core/tests/treeSitter/capabilities.test.ts`
- `packages/core/tests/treeSitter/analyze.languageRelations.test.ts`
- `packages/plugin-csharp/src/plugin.ts`
- `packages/plugin-csharp/tests/plugin.test.ts`
- `packages/plugin-csharp/README.md`
- `packages/plugin-csharp/codegraphy.json`
- `examples/example-csharp/README.md`
- `examples/example-csharp/.codegraphy/settings.json`
- `examples/example-csharp/.vscode/settings.json`
- `examples/example-csharp/src/**/*.cs`
- `examples/README.md`
- `packages/extension/tests/acceptance/specs/csharp-example.md`
- `packages/extension/tests/acceptance/specs/c-example.md`
- `packages/extension/tests/acceptance/specs/cpp-example.md`

External reference checked:

- Microsoft Learn, C# type system:
  `https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/`
- Microsoft Learn, namespaces and using directives:
  `https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/namespaces`
- Microsoft Learn, program organization:
  `https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/program-organization`
