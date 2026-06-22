# Haskell Example

A small Cabal/Haskell project for checking that CodeGraphy can show a believable module graph plus the generic symbol concepts currently supportable from Tree-sitter.

## Structure

```
src/
├── Main.hs                  # Entry point
└── App/
    ├── Feature/
    │   └── Runner.hs        # Runner data type, typeclass, and functions
    └── Model/
        ├── Profile.hs       # Profile data type
        └── User.hs          # User data type and constructor helper
```

## Expected Graph Structure

```
Main.hs ─────┬──▶ App/Feature/Runner.hs
             ├──▶ App/Model/User.hs
             └──▶ App/Model/Profile.hs

App/Feature/Runner.hs ──▶ App/Model/User.hs
App/Feature/Runner.hs ──▶ App/Model/Profile.hs
```

## Supported Haskell Coverage

This example intentionally sticks to the Haskell relationships and symbols that CodeGraphy can support from the current Tree-sitter parser surface:

- Imports: module imports between local `.hs` files.
- References: imported type mentions in signatures and data declarations.
- Calls: calls to imported functions and data constructors.
- Functions: `main`, `greet`, `boot`, `renderGreeting`, `makeUser`, `describeUser`, and `describeProfile`.
- Types: `Greeting`, `Runner`, `RunnerId`, `User`, and `Profile`.
- Class: `Runnable`.
- Constant: `defaultRunnerId`.
- Fields: `runnerId`, `runnerUser`, `runnerProfile`, `userName`, and `profileName`.
- Parameters: `runner`, `user`, `profile`, `task`, and `name`.
- Locals: `message` and `decorated`.

Out of scope for this card: type synonyms, typeclass instance relationships, deriving relationships, package/dependency resolution, and external Prelude or package symbols. Tree-sitter exposes syntax for some of those constructs, but CodeGraphy does not currently have reliable generic analyzer support for them.

## Graph Screenshot

![Haskell example graph screenshot](../assets/graphs/haskell.png)

## Symbol Node Demo

Suggested symbol check:

1. Open `src/App/Feature/Runner.hs`.
2. In Graph Scope, enable **Symbol**.
3. Search for `Greeting`, `Runner`, `RunnerId`, `Runnable`, `defaultRunnerId`, `runnerUser`, `boot`, `renderGreeting`, and `describeUser`.

Expected behavior:

- Function, Type, and Class symbols give the module import chain meaningful endpoints.
- The file graph stays small, while symbol nodes explain why `Main.hs` and `Runner.hs` reach the model files.
