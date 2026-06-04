# Objective-C Example

Tiny Objective-C workspace for checking CodeGraphy's Core Objective-C coverage.

Open `examples/example-objective-c` in CodeGraphy and look for:

- `Sources/AppDelegate.m -> Sources/Feature/UserCard.h#import`

## Symbol Node Demo

Suggested symbol check:

1. Open `Sources/AppDelegate.m`.
2. In Graph Scope, enable **Symbol**.
3. Search for `AppDelegate` and `applicationDidFinishLaunching`.

Expected behavior:

- Interface and implementation declarations appear as class symbols.
- Objective-C method declarations/definitions appear as method symbols.
