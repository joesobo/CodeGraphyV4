# Lua Example

Tiny Lua project for checking that CodeGraphy connects `require` calls.

Open `examples/` in CodeGraphy and look for:

- `example-lua/main.lua -> example-lua/app/runner.lua#import`
- `example-lua/app/runner.lua -> example-lua/app/model/user.lua#import`

## Symbol Node Demo

Suggested symbol check:

1. Open `app/runner.lua`.
2. In Graph Scope, enable **Symbol**.
3. Search for `Runner`, `new`, and `greet`.

Expected behavior:

- Table and Function symbols make the Lua require chain less anonymous.
- The file graph shows the module dependencies, while symbols identify the returned API shape.
