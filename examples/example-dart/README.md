# Dart Example

Small Dart package for checking that CodeGraphy connects a runner entrypoint, app contracts, model types, and formatter helpers using the syntax-level relationships available from Tree-sitter.

Open `examples/` in CodeGraphy and look for:

- `example-dart/bin/sample_app.dart -> example-dart/lib/app/runner.dart#import`
- `example-dart/bin/sample_app.dart -> example-dart/lib/model/profile.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/base_runner.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/runnable.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/auditable.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/format_run.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/model/user.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/model/profile.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/model/run_status.dart#import`
- `example-dart/lib/app/auditable.dart -> example-dart/lib/model/profile.dart#import`
- `example-dart/lib/app/format_run.dart -> example-dart/lib/model/profile.dart#import`
- `example-dart/lib/app/format_run.dart -> example-dart/lib/model/run_status.dart#import`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/base_runner.dart#inherit`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/runnable.dart#inherit`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/auditable.dart#inherit`
- `example-dart/bin/sample_app.dart -> example-dart/lib/app/runner.dart#call`
- `example-dart/bin/sample_app.dart -> example-dart/lib/model/profile.dart#call`
- `example-dart/lib/app/runner.dart -> example-dart/lib/app/format_run.dart#call`
- `example-dart/lib/app/runner.dart -> example-dart/lib/model/user.dart#call`

## Graph Screenshot

![Dart example graph screenshot](../assets/graphs/dart.png)

## Symbol Node Demo

Suggested symbol check:

1. Open `lib/app/runner.dart`.
2. In Graph Scope, enable **Function**, **Class**, and **Enum**.
3. Search for `main`, `boot`, `formatRun`, `Runner`, `Profile`, `User`, and `RunStatus`.

Expected behavior:

- Function symbols show the entrypoint, runner boot helper, and formatter helper.
- Class symbols show the runner contract and model declarations.
- Enum symbols show the run status model.
- The Dart import chain becomes a small app story instead of a set of anonymous files.
