# Go Example

Small Go workspace for manual checks of the core Tree-sitter pipeline. The example is intentionally compact but covers the Go syntax and relationships that Core can support from Tree-sitter plus a lightweight workspace index.

What to look for:

- package-level import edges between local packages
- reference edges for workspace types used across packages
- call edges for package-qualified calls, same-package function calls, and simple receiver method calls with an AST-visible constructor assignment
- inherit edges for embedded Go structs/interfaces, including pointer embeddings
- external package nodes for standard library imports
- extracted Function, Method, Struct, Interface, Type, Constant, and Local nodes

## Graph Screenshot

![Go example graph screenshot](../assets/graphs/go.png)

## Workspace Shape

Files:

- `main.go` imports `internal/app` and calls `app.Start`.
- `internal/app/app.go` imports `internal/model`, `internal/service`, `internal/notify`, and `fmt`; it creates `model.Task`, `notify.ConsoleNotifier`, and `service.TaskRunner` values.
- `internal/service/service.go` imports `internal/model` and `strings`; it defines `Runner`, `AuditingNotifier`, `TaskRunner`, `Status`, `DefaultStatus`, `RetryStatus`, `NewTaskRunner`, and the `TaskRunner.Run` method. `TaskRunner` embeds `*model.Audited`, and `AuditingNotifier` embeds `model.Notifier`.
- `internal/model/model.go` defines `Audited`, `Task`, `Result`, and `Notifier`.
- `internal/notify/notify.go` imports `fmt`; it defines `ConsoleNotifier`, `NewConsoleNotifier`, and the `ConsoleNotifier.Send` method.

Supported symbol checks:

- Function: `main`, `Start`, `NewTaskRunner`, and `NewConsoleNotifier`
- Method: `Run`, `Send`
- Struct: `Config`, `TaskRunner`, `ConsoleNotifier`, `Audited`, `Task`, `Result`
- Interface: `Runner`, `AuditingNotifier`, `Notifier`
- Type: `Status`
- Constant: `startupMessage`, `DefaultStatus`, `RetryStatus`
- Local: `config`, `notifier`, `runner`, `task`, `result`, `normalized`

Current Go analysis should not infer full Go type-checker semantics. Receiver method call support in this example is limited to AST-visible local values created from known constructors in the same function. Global, Field, and Parameter nodes are intentionally out of scope for this card.
