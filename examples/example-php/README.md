# PHP Example

Tiny Composer/PHP project for checking that CodeGraphy connects namespace imports and simple inheritance.

Open `examples/` in CodeGraphy and look for:

- `example-php/src/App/Feature/Runner.php -> example-php/src/App/Base/BaseRunner.php#import`
- `example-php/src/App/Feature/Runner.php -> example-php/src/App/Contracts/Runnable.php#inherit`

## Symbol Node Demo

Suggested symbol check:

1. Open `src/App/Feature/Runner.php`.
2. In Graph Scope, enable **Symbol**.
3. Search for `Runner`, `BaseRunner`, `Runnable`, and `User`.

Expected behavior:

- Class and Interface symbols show the namespace imports and inheritance target.
- The graph demonstrates how a PHP feature class depends on base, contract, and model declarations.
