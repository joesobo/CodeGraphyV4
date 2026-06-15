# C# Example

Small C# dispatch runner for checking that CodeGraphy can show a real C#
workspace shape instead of a one-file syntax sample.

## Structure

```text
src/
├── Program.cs                         # Entry point
├── Contracts/
│   └── IDispatchRunner.cs             # Runner contract
├── Domain/
│   ├── DispatchPriority.cs            # Priority enum
│   ├── DispatchRequest.cs             # Request value struct
│   └── DispatchTicket.cs              # Ticket domain object
├── Presentation/
│   └── DispatchReport.cs              # Report formatter
└── Services/
    ├── DispatchQueue.cs               # Queue state
    ├── DispatchRunner.cs              # Concrete runner
    └── RunnerBase.cs                  # Shared runner base class
```

## Expected Graph Shape

```text
Program.cs
  -> Services/DispatchRunner.cs
  -> Domain/DispatchPriority.cs

Services/DispatchRunner.cs
  -> Contracts/IDispatchRunner.cs
  -> Domain/DispatchRequest.cs
  -> Domain/DispatchTicket.cs
  -> Presentation/DispatchReport.cs
  -> Services/DispatchQueue.cs
  -> Services/RunnerBase.cs

Presentation/DispatchReport.cs
  -> Domain/DispatchTicket.cs

Services/DispatchQueue.cs
  -> Domain/DispatchTicket.cs
```

The runner hierarchy gives inheritance targets, while the entry point and
runner methods give import, reference, and call relationships. The domain and
service files also include fields, constants, parameters, and locals for the
C# variable-node support target.

## C# Graph Targets

- Classes: `Program`, `DispatchTicket`, `DispatchReport`, `DispatchQueue`,
  `DispatchRunner`, and `RunnerBase`.
- Interface: `IDispatchRunner`.
- Struct: `DispatchRequest`.
- Enum: `DispatchPriority`.
- Methods: `Main`, `Run`, `CreateDefault`, `Create`, `Format`, `Enqueue`,
  `Count`, `AssignedCrew`, and `Status`.
- Variables: fields such as `_queue` and `_tickets`, the constant
  `ReadyStatus`, parameters such as `location` and `priority`, and locals such
  as `request`, `ticket`, `status`, and `activeTickets`.
- Edges: namespace imports, type references, calls, inheritance, and
  file-to-symbol containment.

## Current Support Notes

Core Tree-sitter C# analysis currently resolves local namespace imports, object
creation and static member references, static and inherited calls, and class,
interface, struct, enum, and method symbols. The C# upgrade loop targets the
remaining Tree-sitter-backed gaps in this example: variable nodes, file-to-symbol
containment edges, and richer type-reference extraction from C# declarations.

Follow-up candidates intentionally left out of this example include records,
delegates, properties, events, operators, indexers, extension declarations,
namespace nodes, partial type merging, top-level statements, and using aliases.
Those constructs are parseable, but they are either noisier, less valuable for a
small example, or need a separate node-type/product decision.
