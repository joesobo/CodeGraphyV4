# Dart Example

Tiny Dart package for checking that CodeGraphy connects relative and package imports.

Open `examples/` in CodeGraphy and look for:

- `example-dart/bin/sample_app.dart -> example-dart/lib/app/runner.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/base_runner.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/runnable.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/model/user.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/model/profile.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/base_runner.dart#inherit`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/runnable.dart#inherit`

## Graph Screenshot

![Dart example graph screenshot](../assets/graphs/dart.png)

## Symbol Node Demo

Suggested symbol check:

1. Open `lib/app/runner.dart`.
2. In Graph Scope, enable **Symbol**.
3. Search for `Runner`, `BaseRunner`, `Runnable`, `User`, and `Profile`.

Expected behavior:

- Class and Interface symbols show the runner contract and model declarations.
- The Dart import chain becomes a small app story instead of a set of anonymous files.
