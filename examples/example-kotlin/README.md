# Kotlin Example

Tiny Gradle/Kotlin project for checking that CodeGraphy connects imports and simple inheritance.

Open `examples/` in CodeGraphy and look for:

- `example-kotlin/src/main/kotlin/com/example/app/AppRunner.kt -> example-kotlin/src/main/kotlin/com/example/base/BaseRunner.kt#import`
- `example-kotlin/src/main/kotlin/com/example/app/AppRunner.kt -> example-kotlin/src/main/kotlin/com/example/base/RunnableThing.kt#inherit`

## Symbol Node Demo

Suggested symbol check:

1. Open `src/main/kotlin/com/example/app/AppRunner.kt`.
2. In Graph Scope, enable **Symbol**.
3. Search for `AppRunner`, `BaseRunner`, `RunnableThing`, and `User`.

Expected behavior:

- Class and Interface symbols make the inheritance story visible.
- The model symbol shows why the runner imports `User` in addition to its base and interface files.
