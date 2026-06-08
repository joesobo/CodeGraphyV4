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

The visible file graph shows both local include edges and call-derived file
edges. It should show 8 nodes and 8 connections with the checked-in CodeGraphy
settings.

## Graph Screenshot

![C example graph screenshot](../assets/graphs/c.png)

## Symbol Node Demo

After indexing, enable **Function**, **Struct**, **Enum**, **Type**, and
**Contains** in Graph Scope. Useful symbols to search for:

- `main`
- `logger_init`
- `logger_write`
- `logger_flush`
- `logger_format_line`
- `Logger`
- `LogLevel`
- `LogRecord`

Expected behavior:

- File nodes explain the project layout and local header dependencies first.
- Function symbols show C calls that Tree-sitter can resolve by name inside the
  indexed files.
- Struct, enum, and typedef symbols make the public logger data model visible.
- CodeGraphy Core does not run a C compiler or preprocessor, so macro expansion,
  conditional compilation, include paths outside the indexed files, and
  type-checked semantic resolution stay outside this baseline example.
