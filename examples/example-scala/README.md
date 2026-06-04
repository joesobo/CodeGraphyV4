# Scala Example

Small Scala 3 workspace for checking CodeGraphy's Core Scala coverage with an app runner, service, repository, model, and view layer.

Open `examples/example-scala` in CodeGraphy and look for:

- `src/main/scala/com/example/app/AppRunner.scala -> src/main/scala/com/example/base/BaseRunner.scala#import`
- `src/main/scala/com/example/app/AppRunner.scala -> src/main/scala/com/example/service/UserService.scala#import`
- `src/main/scala/com/example/service/UserService.scala -> src/main/scala/com/example/repository/UserRepository.scala#import`
- `src/main/scala/com/example/view/DashboardView.scala -> src/main/scala/com/example/model/User.scala#import`
- `AppRunner.scala -> BaseRunner.scala#inherit`

## Symbol Node Demo

Suggested symbol check:

1. Open `src/main/scala/com/example/app/AppRunner.scala`.
2. In Graph Scope, enable **Symbol**.
3. Search for `AppRunner`, `UserService`, `InMemoryUserRepository`, `DashboardView`, `AccountTier`, and `run`.

Expected behavior:

- Class, trait, object, enum, type alias, and method symbols make the Scala fixture readable.
