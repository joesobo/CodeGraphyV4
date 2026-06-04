# Pascal Example

Tiny Pascal workspace for checking CodeGraphy's Core Pascal coverage.

Open `examples/example-pascal` in CodeGraphy and look for:

- `src/SampleApp.pas -> src/RunnerSupport.pas#import`
- `SampleApp.pas -> TBaseRunner#inherit`

## Symbol Node Demo

Suggested symbol check:

1. Open `src/SampleApp.pas`.
2. In Graph Scope, enable **Symbol**.
3. Search for `TAppRunner` and `Run`.

Expected behavior:

- Pascal unit `uses` relationships connect source files.
- Class and procedure symbols make the tiny unit graph inspectable.
