# C# Upgrade Specifier Plan

## Source

- Trello: https://trello.com/c/rSYGlC3d
- PR: https://github.com/joesobo/CodeGraphyV4/pull/275
- Handoff: `docs/handoff/201-csharp-upgrade.md`

## Support Audit Snapshot

Primary language/parser references checked:

- Microsoft C# language specification, especially class declarations, inheritance, namespace/type names, and expressions.
- Microsoft C# tour and language docs for using directives and ordinary project shape.
- `tree-sitter/tree-sitter-c-sharp`, the parser grammar used through the repo's `tree-sitter-c-sharp` dependency.

Current repo support split:

- Core Tree-sitter Analysis owns C# parsing and baseline relationship output.
- `@codegraphy-dev/plugin-csharp` is metadata-only for this behavior: supported `.cs` extension, ecosystem filters, and C# workspace defaults.
- The C# plugin does not provide supplemental analysis or Graph Scope capability declarations.

Current Core C# analyzer behavior from static source and tests:

- Symbols: class, interface, struct, enum, method.
- Relationships: imports from using directives, references from type/member usage and object creation, calls from object creation/member invocation/inherited method invocation, inherits from C# base lists.
- Cross-file C# resolution depends on `preAnalyzeCSharpTreeSitterFiles` and the C# workspace index.
- Generic Core support should remain limited to syntax-visible, tree-sitter-discoverable constructs. Deeper .NET project semantics should become follow-up cards unless a role proves they are already safely supported.

Current example/spec shape:

- `examples/example-csharp` is a small namespace/type-usage workspace with `Program`, `Config`, `ApiService`, `BaseService`, `IRunner`, `Helpers`, `Formatter`, and `Orphan`.
- Existing spec validates file nodes and edge toggles for Imports, References, Calls, and Inherits.
- Existing spec does not validate C# node-type availability or C# symbol nodes.
- C and C++ upgraded specs now validate Graph Scope node types and symbol/contains behavior; C# should follow that pattern at C# scale.

Executable inventory status:

- `codegraphy status .` on the fresh worktree reported missing Graph Cache, as expected.
- Focused analyzer inventory commands could not run because this worktree currently has no installed `node_modules`; `pnpm exec tsx` and `pnpm --filter @codegraphy-dev/core exec vitest ...` reported missing `tsx`/`vitest`.
- Coder should install or otherwise hydrate dependencies before red/green tests.

## Proposed Acceptance Contract

The C# acceptance update should remain one reviewable human-owned spec change to `packages/extension/tests/acceptance/specs/csharp-example.md`.

Keep the existing file-edge scenario and expand it only where the current example truly demonstrates supported behavior:

- Initial file-only graph still proves the expected workspace files and stable file-node count.
- Graph Scope edge type availability remains Imports, References, Calls, Inherits.
- Imports, References, Calls, and Inherits each keep stable count checks and named file relationships.
- Orphan checks stay present for `src/Orphan.cs`, README/settings/gitignore files, and any support files the example intentionally leaves disconnected.

Add a second scenario modeled after the C and C++ symbol scenarios:

- Open and index `examples/example-csharp`.
- Show no edge types and verify file-only count.
- Select node types and assert available C# node types are exactly Class, Interface, Struct, Enum, Method, plus structural File.
- Assert unrelated C/C++-specific node types such as Prototype, Union, Typedef, Alias, Template, Global, Constant, Field, Parameter, Local, and Callable are not available for the C# example unless implementation proves otherwise.
- Show only File and Class node types; assert visible class nodes include `Program`, `Config`, `ApiService`, `BaseService`, and `Orphan`.
- Show only File and Interface node types; assert visible interface node `IRunner`.
- Show only File and Method node types; assert visible method nodes include `Main`, `LoadConfig`, `FetchData`, `ProcessData`, `FormatOutput`, and `Status`.
- If the upgraded example adds struct or enum source files, include File+Struct and File+Enum checks. If it does not, do not claim those rows are available solely because Core can theoretically emit them.
- Toggle Contains to prove file-to-symbol relationships for representative class/interface/method nodes.
- Toggle Calls with symbol nodes visible to prove representative call relationships, such as `Main` calling `LoadConfig`, creating `ApiService`, and calling `ProcessData`; `ProcessData` calling `FormatOutput`; and `Run` calling inherited `Status` when implementation supports it.
- Toggle Inherits with symbol nodes visible to prove `ApiService` inheriting from `BaseService` and implementing `IRunner`.

## Example Upgrade Direction

Coder should preserve the current believable service/workflow story, but make it less toy-like and better aligned with supported graph features:

- Keep the namespace split across `MyApp`, `MyApp.Services`, `MyApp.Contracts`, and `MyApp.Utils`.
- Keep a clear entry point, configuration object, API service, helper/formatter path, inherited base service, interface implementation, and intentional orphan.
- Add struct/enum only if the acceptance contract will prove them and the example remains believable.
- Avoid adding .NET semantics that Core cannot resolve generically, such as project-file package references, dependency injection registration, Razor, partial-class merge behavior, or reflection.
- Update README and `.codegraphy/settings.json` honestly after Coder proves the actual Graph Scope rows/counts.
- Keep plugin docs scoped to filters/defaults unless Coder changes plugin behavior.

## Acceptance Impact Scan

Human-owned specs scanned:

- `packages/extension/tests/acceptance/specs/csharp-example.md`: affected and needs proposed update.
- `packages/extension/tests/acceptance/specs/c-example.md`: pattern reference only; no direct edit expected.
- `packages/extension/tests/acceptance/specs/cpp-example.md`: pattern reference only; no direct edit expected.
- `packages/extension/tests/acceptance/specs/graph-scope-node-types.md`: step vocabulary reference only; no direct edit expected.
- `packages/extension/tests/acceptance/specs/graph-scope-edge-types.md`: step vocabulary reference only; no direct edit expected.

Step-binding impact:

- Existing step binding for available node types is C++-specific; Coder probably needs a generic or C#-specific step before the proposed C# spec can compile/run.
- Existing visible-symbol and relationship steps appear reusable for C# once the spec text uses the supported phrasing.

## Human Gate

Before final commit of acceptance spec Markdown, ask for explicit approval of the proposed `csharp-example.md` scenario update. The Coder may implement support files, generated tests, unit tests, example source, and draft spec edits locally, but should not push a committed human-owned spec change past this gate.
