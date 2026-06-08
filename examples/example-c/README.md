# C Example

Tiny logger written in C for checking CodeGraphy Core support from the
Tree-sitter C AST. The project is intentionally small and plain: headers expose
the logger API and records, source files implement formatting and counters, and
`main.c` exercises the API like a C developer would expect.

Build and run it with:

```bash
make run
```

## File Graph

Open `examples/example-c` in CodeGraphy, index the workspace, and start with the
default file graph. Look for these relationships:

- `src/main.c -> src/logger/logger.h`
- `src/logger/logger.c -> src/logger/logger.h`
- `src/logger/logger.c -> src/logger/format.h`
- `src/logger/format.c -> src/logger/format.h`
- `src/logger/format.h -> src/logger/logger.h`

The default visible file graph starts with local **Include** edges. Enable
**Calls** when you want file-level call edges layered on top.

## Graph Screenshot

![C example graph screenshot](../assets/graphs/c.png)

## Symbol Node Demo

After indexing, enable **Include**, **Function**, **Prototype**, **Struct**,
**Union**, **Enum**, **Typedef**, **Global**, and **Contains** in Graph Scope.
Useful symbols to search for:

- `main`
- `logger_init`
- `logger_write`
- `logger_flush`
- `logger_accepts`
- `logger_format_line`
- `Logger`
- `LogLevel`
- `LogMessage`
- `LogRecord`
- `logger_output_enabled`

Expected behavior:

- File nodes explain the project layout and local header dependencies first.
- Include nodes show the `#include` directives that create local header edges.
- Function and prototype symbols show C calls that Tree-sitter can resolve by
  name inside the indexed files and included headers.
- Struct, union, enum, typedef, and global symbols make the public logger data
  model and file-scope state visible.
- CodeGraphy Core does not run a C compiler or preprocessor, so macro expansion,
  conditional compilation, include paths outside the indexed files, and
  type-checked semantic resolution stay outside this baseline example.
