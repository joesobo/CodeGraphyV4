# 201 C# Upgrade

Manual alignment notes for Trello card 201.

## Settled Boundaries

- This upgrade targets C# Core Tree-sitter Language Coverage.
- C# stays core-analyzer oriented unless future work needs C# Project-Aware Analysis Semantics.
- Built-in C# support should cover what a C# developer would expect when Tree-sitter exposes enough syntax evidence for low-noise graph Nodes or Relationships.
- C# features that need `.csproj`, NuGet, MSBuild, generated-code, or Roslyn-style semantic analysis are out of scope for Core Tree-sitter Language Coverage and belong in future Plugin Analysis.
- Feature selection comes before example design.
- The C# example should become a realistic small C# app that cleanly demonstrates the locked feature set.

## Construct Decisions

Settled C# type constructs:

- `Class`
- `Interface`
- `Struct`
- `Record`
- `Enum`
- `Delegate`

Settled C# member and behavior constructs:

- `Method`
- `Constructor`
- `Property`
- `Event`

Settled C# variable constructs:

- `Field`
- `Parameter`
- `Constant`
- `Local`

Constructs out of scope for this card:

- `Indexer`
- `Enum Member`
- `Global`
- `Operator`
- `Destructor`
- `Function`
- `Callable`

C# local functions group under `Method`. C# constructors are separate from methods.

## Edge Decisions

- Do not force C# relationships into generic shared edge types by default.
- Audit C# relationships from the C# developer point of view first.
- Merge with an existing shared Edge Type only when the meaning truly matches.
- Add language-specific C# Edge Types when a generic edge would hide meaningful C# semantics.
- Settled acceptance-visible edge families are `Using`, `Type`, `Call`, `Inherits`, `Implements`, and `Contains`.
- `Type` means C# type references when the name resolves to a workspace type.
- `Call` covers method calls and constructor calls together.
- `Contains` likely remains the shared `Contains` Edge Type because containment means the same thing across languages.
- Object creation is not a standalone acceptance-visible edge label.
- Audit-only edge families such as overrides, property access, event subscription, attribute usage, and delegate invocation are not settled for this card.

## Open Questions

- Final C#-specific edge names and merge decisions.

## Tree-sitter Capability Audit

This audit bridges the aligned feature list into the later example, acceptance, and implementation steps.

### Constructs

| Construct | Tree-sitter AST evidence | Current CodeGraphy support | Required implementation |
| --- | --- | --- | --- |
| `Class` | `class_declaration` with `name` and `body` fields | Supported | Keep and verify against the new example |
| `Interface` | `interface_declaration` with `name`, `body`, and `type_parameters` fields | Supported | Keep and verify against the new example |
| `Struct` | `struct_declaration` with `name` and `body` fields | Supported | Keep and verify against the new example |
| `Record` | `record_declaration` with `name`, `body`, and optional parameter list | Unsupported | Add symbol support and Graph Scope capability |
| `Enum` | `enum_declaration` with `name` and `body` fields | Supported | Keep and verify against the new example |
| `Delegate` | `delegate_declaration` with `name`, `type`, and `parameters` fields | Unsupported | Add symbol support and Graph Scope capability |
| `Method` | `method_declaration`; local functions use `local_function_statement` | Partially supported for `method_declaration` only | Add local-function support under `Method`; verify normal methods |
| `Constructor` | `constructor_declaration` with `name`, `parameters`, and `body` fields | Unsupported | Add symbol support and Graph Scope capability |
| `Property` | `property_declaration` with `name`, `type`, `accessors`, and optional value fields | Unsupported | Add symbol support and Graph Scope capability |
| `Event` | `event_declaration` and `event_field_declaration` | Unsupported | Add symbol support and Graph Scope capability |
| `Field` | `field_declaration` containing `variable_declaration` and `variable_declarator` | Unsupported for C# | Add variable-symbol support and Graph Scope capability |
| `Parameter` | `parameter` with `name` and `type` fields | Unsupported for C# | Add variable-symbol support and Graph Scope capability |
| `Constant` | `const` modifier on field/local variable declarations | Unsupported for C# | Classify const field/local declarations as `Constant` |
| `Local` | `local_declaration_statement`, `variable_declaration`, and `variable_declarator` | Unsupported for C# | Add local variable support and Graph Scope capability |

### Relationships

| Edge family | Tree-sitter AST evidence | Current CodeGraphy support | Required implementation |
| --- | --- | --- | --- |
| `Using` | `using_directive` with `name`; related type usage can resolve namespace targets | Currently emitted as generic `import` | Decide final edge id/label; keep resolved workspace target behavior |
| `Type` | `qualified_name`, `member_access_expression`, `object_creation_expression`, declaration type fields | Currently emitted as generic `reference` for limited shapes | Add C#-specific edge if needed; broaden resolvable type-reference cases |
| `Call` | `invocation_expression`, `object_creation_expression`, member access function fields | Currently emitted as generic `call` for limited shapes | Decide final edge id/label; include method and constructor calls together |
| `Inherits` | `base_list` entries resolving to class types | Currently emitted as generic `inherit` | Keep or rename to C#-specific edge; verify class inheritance only |
| `Implements` | `base_list` entries resolving to interface types | Currently collapsed into generic `inherit` | Split interface implementation into `Implements` |
| `Contains` | Declaring file/symbol owns accepted constructs | Existing shared edge concept | Add contains edges for newly supported construct symbols |

## C# Example Design Draft

Design the example as a small task dispatch application. The app should look like a believable C# workspace while staying compact enough for acceptance counts and graph expectations to remain reviewable.

### App Story

The example models a task dispatcher that accepts work items, queues them by priority, runs them through a runner service, and emits a completion event. This gives the example natural reasons to use C# records, structs, delegates, interfaces, inheritance, implementation, events, properties, fields, constants, parameters, locals, method calls, constructor calls, and type references.

### Proposed File Layout

```text
src/
├── Program.cs
├── Config/
│   └── DispatchSettings.cs
├── Contracts/
│   ├── ITaskQueue.cs
│   └── ITaskRunner.cs
├── Events/
│   └── TaskCompleted.cs
├── Models/
│   ├── DispatchResult.cs
│   ├── DispatchTask.cs
│   ├── TaskId.cs
│   └── DispatchStatus.cs
└── Services/
    ├── BaseTaskRunner.cs
    ├── PriorityTaskQueue.cs
    └── TaskDispatcher.cs
```

Keep one orphan file only if acceptance still needs Show Orphans coverage for the C# example. Otherwise, remove the orphan from the upgraded example so the graph reads like a real app.

### Construct Coverage

| Construct | Example source shape |
| --- | --- |
| `Class` | `TaskDispatcher`, `PriorityTaskQueue`, `BaseTaskRunner`, `DispatchSettings` |
| `Interface` | `ITaskQueue`, `ITaskRunner` |
| `Struct` | `TaskId` value object |
| `Record` | `DispatchTask`, `DispatchResult` |
| `Enum` | `DispatchStatus` |
| `Delegate` | `TaskCompleted` delegate |
| `Method` | `Dispatch`, `Run`, `Enqueue`, `Dequeue`, plus one local function inside `Dispatch` |
| `Constructor` | Constructors on `TaskDispatcher`, `PriorityTaskQueue`, and `BaseTaskRunner` |
| `Property` | `DispatchSettings.MaxRetries`, `DispatchTask.Status`, `PriorityTaskQueue.Count` |
| `Event` | `TaskDispatcher.Completed` or `PriorityTaskQueue.TaskCompleted` using the `TaskCompleted` delegate |
| `Field` | Private queue/list fields such as `_tasks`, `_runner`, `_settings` |
| `Parameter` | Method and constructor parameters such as `task`, `settings`, `runner` |
| `Constant` | `DispatchSettings.DefaultMaxRetries` or local `const int retryLimit` |
| `Local` | Locals inside `Program.Main` and `TaskDispatcher.Dispatch` |

### Edge Coverage

| Edge family | Example source shape |
| --- | --- |
| `Using` | Files import local namespaces such as `ExampleCSharp.Models`, `ExampleCSharp.Contracts`, and `ExampleCSharp.Services` |
| `Type` | Properties, fields, parameters, return types, records, delegate signatures, and constructor parameters reference workspace types |
| `Call` | `Program.Main` constructs services and calls `Dispatch`; `TaskDispatcher.Dispatch` calls queue and runner methods; constructor calls are included under `Call` |
| `Inherits` | `TaskDispatcher` or `BaseTaskRunner` class inheritance shape, preferably `TaskDispatcher : BaseTaskRunner` if it reads naturally |
| `Implements` | `PriorityTaskQueue : ITaskQueue` and `TaskDispatcher : ITaskRunner` |
| `Contains` | Files contain all acceptance-visible constructs; class symbols contain accepted member/variable constructs where symbol-to-symbol containment is supported |

### Design Constraints

- Avoid `Indexer`, `Enum Member`, `Global`, `Operator`, `Destructor`, `Function`, and `Callable` coverage.
- Avoid `.csproj`, NuGet, generated-code, MSBuild, or Roslyn-style semantics.
- Prefer file-scoped namespaces if the current parser and analyzer resolve them cleanly; otherwise use block namespaces for lower implementation risk.
- Keep the source realistic, but optimize for graph clarity and deterministic acceptance counts.
- Do not edit acceptance spec Markdown until the human-owned acceptance step is explicitly approved.
