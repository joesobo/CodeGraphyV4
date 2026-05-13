# C++ Example

Tiny C++ project for checking that CodeGraphy connects local includes.

Open `examples/` in CodeGraphy and look for:

- `example-cpp/src/app.cpp -> example-cpp/src/lib/widget.hpp#import:include`
- `example-cpp/src/lib/widget.cpp -> example-cpp/src/lib/widget.hpp#import:include`

## Symbol Node Demo

Suggested symbol check:

1. Open `src/app.cpp`.
2. In Graph Scope, enable **Symbol**.
3. Search for `Widget`, `render`, and `make_widget`.

Expected behavior:

- Class and Function symbols show the split between declarations in `widget.hpp` and implementation files.
- Include edges remain the coarse relationship, while symbols make the C++ API surface visible.
