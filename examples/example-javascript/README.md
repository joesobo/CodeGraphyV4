# JavaScript Example

CodeGraphy's extension-host end-to-end tests use this workspace. You can also open it as a small JavaScript project in VS Code and try the Graph View.

It mirrors the TypeScript example's file graph with JavaScript source files, plain imports, calls, a class inheritance edge, and an intentionally disconnected file. It does not include the TypeScript-only alias import demo.

Suggested Depth Mode check:

1. Open this folder in VS Code.
2. Open `src/index.js`.
3. Run `CodeGraphy: Open`.
4. Turn on Depth Mode.
5. Move the depth slider from `1` to `3`.

Expected behavior:

- Depth `1` shows `src/index.js`, `src/utils.js`, and `src/user.js`.
- Depth `2` adds `src/depth.js`.
- Depth `3` adds `src/leaf.js`.
- `src/orphan.js` stays out of the focused depth area because it is an Orphan Node.

## Symbol Node Demo

Suggested symbol check:

1. Open `src/index.js`.
2. In Graph Scope, enable **Symbol** and **Variable**.
3. Search for `buildGreeting`, `AppRunner`, `BaseRunner`, `RunnableThing`, and `currentUser`.

Expected behavior:

- `buildGreeting` appears as a Function symbol imported from `src/utils.js`.
- `AppRunner` imports `RunnableThing` and extends `BaseRunner`, giving the JavaScript example both import and inheritance checks.
- `currentUser` appears as a Variable node, giving the tiny app a file/function/value story.
