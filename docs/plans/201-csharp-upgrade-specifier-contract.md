# 201 C# Upgrade Specifier Contract Draft

## Support Matrix

Classification meanings:

- `in acceptance`: include in the proposed C# example acceptance contract.
- `implementation gap`: include in the target contract, but current CodeGraphy C# analysis or capability declarations must be upgraded by Coder.
- `follow-up`: technically parseable or extractable, but intentionally left out of this natural example and this acceptance slice.

| Area | Construct | Classification | Evidence and rationale |
| --- | --- | --- | --- |
| Symbols | Classes | in acceptance | Tree-sitter C# has `class_declaration`; Microsoft describes class types as data structures with members and inheritance; current CodeGraphy indexes and emits C# class symbols through `class_declaration` handling in `packages/core/src/treeSitter/runtime/analyzeCSharp/declarations.ts` and declares `symbol:class` in `capabilities.ts`. |
| Symbols | Interfaces | in acceptance | Tree-sitter has `interface_declaration`; Microsoft describes interfaces as contracts implemented by classes or structs; current CodeGraphy indexes and emits C# interface symbols and inherit relations to interfaces. |
| Symbols | Structs | in acceptance | Tree-sitter has `struct_declaration`; Microsoft OOP docs list structs alongside classes and records as common object-oriented types; current CodeGraphy indexes and emits C# struct symbols. |
| Symbols | Enums | in acceptance | Tree-sitter has `enum_declaration`; current CodeGraphy emits enum symbols while intentionally skipping enum inheritance work. |
| Symbols | Methods as Function nodes | in acceptance | Tree-sitter has `method_declaration` with `name`, `parameters`, and function body fields; current CodeGraphy emits C# method symbols as `method`, which Graph Scope maps to the Function node type. |
| Edges | Namespace import edges from `using` directives to local C# types | in acceptance | Tree-sitter has `using_directive`; current CodeGraphy collects using namespaces and emits resolved import relations when references or inheritance identify local target files. |
| Edges | Inherits edges from base classes and implemented interfaces | in acceptance | Tree-sitter class, struct, enum, interface, and record initializers can include `base_list`; current CodeGraphy walks `base_list` identifiers/qualified names and emits `inherit` relations. |
| Edges | Static member and object-creation reference edges | in acceptance | Tree-sitter has `member_access_expression` and `object_creation_expression`; current CodeGraphy resolves uppercase type references in those node shapes to local C# files. |
| Edges | Static/object-creation/inherited call edges | in acceptance | Current CodeGraphy emits call relations for object creation, static member invocation, and unqualified inherited calls when one base class is resolved. |
| Edges | File-to-symbol Contains edges | implementation gap | C and C++ acceptance use `contains` to make Symbol Nodes navigable from File Nodes. C# declares symbols but does not currently declare `contains` for C# in `capabilities.ts`; the C# target should include it so type, method, and variable nodes are not detached. |
| Edges | Type-reference edges from declaration syntax | implementation gap | Tree-sitter exposes field, parameter, return, local, generic, nullable, array, and predefined type nodes through `variable_declaration`, `parameter`, `method_declaration`, and related grammar rules. Current C# references only cover object creation and member access, so references from fields, parameters, returns, and locals should be added for local C# types. |
| Variables | Field nodes | implementation gap | Tree-sitter has `field_declaration` wrapping `variable_declaration` / `variable_declarator`; Microsoft naming docs discuss private/internal fields. Current C# capabilities do not include `symbol:field`, and current analysis does not emit field symbols. |
| Variables | Constant nodes | implementation gap | C# constants are field-like declarations marked with `const`; current CodeGraphy has an existing `symbol:constant` node type used by other languages, but C# does not declare or emit it. |
| Variables | Parameter nodes | implementation gap | Tree-sitter has `parameter` nodes with `name` fields; Microsoft naming docs call out parameter naming. Current C# capabilities do not include `symbol:parameter`, and current analysis does not emit parameter symbols. |
| Variables | Local variable nodes | implementation gap | Tree-sitter has `local_declaration_statement`, `using_statement`, `for_statement` initializers, and `foreach_statement` initializers that expose local variable declarations. Current C# capabilities do not include `symbol:local`, and current analysis does not emit local symbols. This acceptance slice should cover ordinary local declarations first. |
| Symbols | Namespace nodes | follow-up | Tree-sitter exposes block-scoped and file-scoped namespaces. In C# projects, file-scoped namespace declarations often repeat in every file, so namespace nodes can be noisy without a product decision about deduplicating namespace concepts. |
| Symbols | Records | follow-up | Tree-sitter has `record_declaration`, and Microsoft lists records with classes and structs, but CodeGraphy lacks a record node-type decision. Mapping records to Class or Struct may be acceptable later, but this example avoids forcing that policy. |
| Symbols | Delegates | follow-up | Tree-sitter has `delegate_declaration`, but delegate nodes are lower-value for this small project and would make the example feel like a syntax sampler. |
| Symbols/variables | Properties, events, accessors, indexers, operators, constructors, destructors, extension declarations | follow-up | Tree-sitter parses these declarations, but including them would inflate the node surface and require product choices about whether they are functions, fields, or separate node types. Constructors are common, but constructor symbol nodes are less useful than class and method nodes for this example. |
| Edges | Instance member calls through local variable or field types | follow-up | Tree-sitter can expose the syntax, but resolving `_queue.Enqueue(...)` to `DispatchQueue` needs at least shallow dataflow/type inference. This is beyond the current Tree-sitter-only confidence boundary for this loop. |
| Edges | Overrides edges | follow-up | C# `override` is syntactically visible, but proving the overridden base method target needs base-type method resolution. Leave it for a dedicated method-resolution slice. |
| Edges | Using aliases, static using directives, extern aliases, partial type merging, top-level statements | follow-up | All are parseable, but each either adds noisy edge cases or needs a separate product/semantic decision. The example uses ordinary namespace imports and explicit `Program.Main`. |

## Example Contract

`examples/example-csharp` is now a small `BeaconDispatch` workflow:

- `Program` creates a `DispatchRunner` and runs a dispatch report.
- `DispatchRunner` extends `RunnerBase`, implements `IDispatchRunner`, creates a `DispatchRequest`, uses `DispatchTicket`, writes to `DispatchQueue`, calls inherited `Status`, and formats through `DispatchReport`.
- Domain files cover `DispatchPriority` enum, `DispatchRequest` struct, and `DispatchTicket` class with a constant, field, parameters, and locals.
- The README explicitly marks current support versus C# upgrade target gaps.

## Proposed Acceptance Spec Content

Do not commit this into `packages/extension/tests/acceptance/specs/csharp-example.md` until the human approves it.

```md
# Feature: C# Example

## Scenario: C# example renders expected file nodes and Tree-sitter relationships

Given I open the examples/example-csharp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 12 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-csharp workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are only Imports, References, Calls, Inherits, Contains
And I select node types
Then the available C# node types are only Function, Class, Interface, Struct, Enum, Field, Constant, Parameter, Local
And the Namespace node type is not available for the C# example
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 12 nodes and 10 connections
And src/Program.cs points to src/Services/DispatchRunner.cs
And src/Program.cs points to src/Domain/DispatchPriority.cs
And src/Services/DispatchRunner.cs points to src/Contracts/IDispatchRunner.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchRequest.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchTicket.cs
And src/Services/DispatchRunner.cs points to src/Presentation/DispatchReport.cs
And src/Services/DispatchQueue.cs points to src/Domain/DispatchTicket.cs

And README.md is an orphan node
And .gitignore is an orphan node
And .vscode/settings.json is an orphan node

Then I show only the Inherits edge type
Then I can see there are 12 nodes and 2 connections
And src/Services/DispatchRunner.cs points to src/Services/RunnerBase.cs
And src/Services/DispatchRunner.cs points to src/Contracts/IDispatchRunner.cs

Then I show only the References edge type
Then I can see there are 12 nodes and 11 connections
And src/Program.cs points to src/Services/DispatchRunner.cs
And src/Program.cs points to src/Domain/DispatchPriority.cs
And src/Contracts/IDispatchRunner.cs points to src/Domain/DispatchPriority.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchRequest.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchTicket.cs
And src/Services/DispatchRunner.cs points to src/Presentation/DispatchReport.cs
And src/Presentation/DispatchReport.cs points to src/Domain/DispatchTicket.cs
And src/Services/DispatchQueue.cs points to src/Domain/DispatchTicket.cs

Then I show only the Calls edge type
Then I can see there are 12 nodes and 6 connections
And src/Program.cs points to src/Services/DispatchRunner.cs
And src/Services/DispatchRunner.cs points to src/Services/DispatchQueue.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchRequest.cs
And src/Services/DispatchRunner.cs points to src/Domain/DispatchTicket.cs
And src/Services/DispatchRunner.cs points to src/Services/RunnerBase.cs
And src/Services/DispatchRunner.cs points to src/Presentation/DispatchReport.cs

## Scenario: C# example exposes symbols and variables when graph scope enables them

Given I open the examples/example-csharp workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 12 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-csharp workspace

Then I show only the Contains edge type
Then I show only the File and Class node types
Then I can see there are 18 nodes and 6 connections
And the visible graph includes the Class node Program from src/Program.cs
And the visible graph includes the Class node DispatchRunner from src/Services/DispatchRunner.cs
And the visible graph includes the Class node DispatchTicket from src/Domain/DispatchTicket.cs

Then I show only the File and Interface node types
Then I can see there are 13 nodes and 1 connection
And the visible graph includes the Interface node IDispatchRunner from src/Contracts/IDispatchRunner.cs

Then I show only the File and Struct node types
Then I can see there are 13 nodes and 1 connection
And the visible graph includes the Struct node DispatchRequest from src/Domain/DispatchRequest.cs

Then I show only the File and Enum node types
Then I can see there are 13 nodes and 1 connection
And the visible graph includes the Enum node DispatchPriority from src/Domain/DispatchPriority.cs

Then I show only the File and Function node types
Then I can see there are 22 nodes and 10 connections
And the visible graph includes the Function node Main from src/Program.cs
And the visible graph includes the Function node Run from src/Services/DispatchRunner.cs
And the visible graph includes the Function node CreateDefault from src/Services/DispatchRunner.cs
And the visible graph includes the Function node Format from src/Presentation/DispatchReport.cs

Then I show only the File and Field node types
Then I can see there are 17 nodes and 5 connections
And the visible graph includes the Field node _queue from src/Services/DispatchRunner.cs
And the visible graph includes the Field node _tickets from src/Services/DispatchQueue.cs
And the visible graph includes the Field node Location from src/Domain/DispatchRequest.cs

Then I show only the File and Constant node types
Then I can see there are 14 nodes and 2 connections
And the visible graph includes the Constant node DefaultCrew from src/Domain/DispatchTicket.cs
And the visible graph includes the Constant node ReadyStatus from src/Services/RunnerBase.cs

Then I show only the File and Parameter node types
Then I can see there are 25 nodes and 13 connections
And the visible graph includes the Parameter node location from src/Services/DispatchRunner.cs
And the visible graph includes the Parameter node priority from src/Services/DispatchRunner.cs
And the visible graph includes the Parameter node ticket from src/Presentation/DispatchReport.cs

Then I show only the File and Local node types
Then I can see there are 22 nodes and 10 connections
And the visible graph includes the Local node request from src/Services/DispatchRunner.cs
And the visible graph includes the Local node ticket from src/Services/DispatchRunner.cs
And the visible graph includes the Local node activeTickets from src/Services/DispatchRunner.cs

Then I show no edge types
Then I show only the File, Function, Class, Interface, Struct, Enum, Field, Constant, Parameter and Local node types
Then I can see there are 61 nodes and 0 connections

When I toggle the Contains edge on
Then I can see there are 61 nodes and 49 connections
And src/Services/DispatchRunner.cs points to src/Services/DispatchRunner.cs#DispatchRunner:class
And the visible graph includes the Function node Run from src/Services/DispatchRunner.cs
And src/Services/DispatchRunner.cs points to src/Services/DispatchRunner.cs#_queue:field
And src/Services/DispatchRunner.cs points to src/Services/DispatchRunner.cs#location:parameter
And src/Services/DispatchRunner.cs points to src/Services/DispatchRunner.cs#request:local
```

The exact counts above are part of the proposed contract. Coder should prove or adjust them through the failing acceptance test and graph output before asking for final acceptance approval.

## Acceptance Impact Scan

- `packages/extension/tests/acceptance/specs/csharp-example.md` is directly affected. It references the old file names, old edge counts, and old limited node/edge capability list. It must be replaced only after human approval.
- `packages/extension/tests/acceptance/specs/c-example.md` is intentionally unaffected. It remains a pattern reference for symbol/variable Graph Scope coverage and `Contains` edges.
- `packages/extension/tests/acceptance/specs/cpp-example.md` is intentionally unaffected. It remains the closest pattern for class/enum/function/field/parameter/local acceptance wording.
- Global acceptance specs that use `examples/example-typescript` are unaffected by this example workspace.
- `examples/README.md` was updated because it had a stale `example-csharp` summary.

## Public Research Sources

- Tree-sitter C# grammar repo: https://github.com/tree-sitter/tree-sitter-c-sharp
- Tree-sitter C# `grammar.js`: https://github.com/tree-sitter/tree-sitter-c-sharp/blob/master/grammar.js
- Microsoft C# OOP overview: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/
- Microsoft C# classes specification: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes
- Microsoft C# types specification: https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/types
- Microsoft C# identifier names and naming conventions: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/identifier-names

## Current CodeGraphy Evidence

- `packages/core/src/treeSitter/runtime/capabilities.ts` currently declares C# edge capabilities as `import`, `reference`, `call`, and `inherit`, and node capabilities as Function, Class, Interface, Struct, and Enum.
- `packages/core/src/treeSitter/runtime/analyzeCSharp/declarations.ts` currently emits type symbols, method symbols, and inheritance relations.
- `packages/core/src/treeSitter/runtime/analyzeCSharp/references.ts` currently emits references for object creation and static member access, and calls for object creation, static member invocation, and simple inherited method calls.
- `packages/core/src/treeSitter/runtime/analyzeCSharp/usingImports.ts` currently emits import relations for using namespaces with matched local targets.
- `packages/core/src/treeSitter/runtime/csharpIndex/**` currently indexes class, interface, struct, and enum type declarations for local resolution.
- `packages/plugin-csharp/src/plugin.ts` is metadata-only; the C# support target belongs to Core Tree-sitter Language Coverage, not supplemental plugin analysis.
