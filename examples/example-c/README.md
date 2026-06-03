# C Example

Tiny C project for checking that CodeGraphy connects local includes.

Open `examples/` in CodeGraphy and look for:

- `example-c/src/main.c -> example-c/src/math/add.h#import:include`
- `example-c/src/math/add.c -> example-c/src/math/add.h#import:include`

## Graph Screenshot

![C example graph screenshot](../assets/graphs/c.png)

## Symbol Node Demo

Suggested symbol check:

1. Open `src/main.c`.
2. In Graph Scope, enable **Symbol**.
3. Search for `main`, `add`, and `AddInput`.

Expected behavior:

- Function and Type symbols make the header/source/include relationship inspectable.
- The include edges explain the files, while symbols explain which declarations the tiny program uses.
