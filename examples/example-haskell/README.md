# Haskell Example

Tiny Cabal/Haskell project for checking that CodeGraphy connects module imports.

Open `examples/` in CodeGraphy and look for:

- `example-haskell/src/Main.hs -> example-haskell/src/App/Feature/Runner.hs#import`
- `example-haskell/src/App/Feature/Runner.hs -> example-haskell/src/App/Model/User.hs#import`

## Symbol Node Demo

Suggested symbol check:

1. Open `src/App/Feature/Runner.hs`.
2. In Graph Scope, enable **Symbol**.
3. Search for `run`, `User`, and `Greeting`.

Expected behavior:

- Function and Type symbols give the module import chain meaningful endpoints.
- The graph shows `Runner` pulling in the model module, and symbols show the declarations the runner exposes.
