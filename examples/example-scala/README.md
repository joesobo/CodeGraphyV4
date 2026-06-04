# Scala Example

Tiny Scala workspace for checking CodeGraphy's Core Scala coverage.

Open `examples/example-scala` in CodeGraphy and look for:

- `src/main/scala/com/example/app/AppRunner.scala -> src/main/scala/com/example/base/BaseRunner.scala#import`
- `src/main/scala/com/example/app/AppRunner.scala -> src/main/scala/com/example/model/User.scala#import`
- `AppRunner.scala -> BaseRunner.scala#inherit`

## Symbol Node Demo

Suggested symbol check:

1. Open `src/main/scala/com/example/app/AppRunner.scala`.
2. In Graph Scope, enable **Symbol**.
3. Search for `AppRunner`, `AppConfig`, `Status`, `UserName`, and `run`.

Expected behavior:

- Class, object, enum, type alias, and method symbols make the Scala fixture readable.
