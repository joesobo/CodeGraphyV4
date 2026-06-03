# Ruby Example

Tiny Ruby project for checking that CodeGraphy connects `require_relative` and simple inheritance.

Open `examples/` in CodeGraphy and look for:

- `example-ruby/lib/example_ruby.rb -> example-ruby/lib/app/runner.rb#import`
- `example-ruby/lib/app/runner.rb -> example-ruby/lib/base/base_runner.rb#import`
- `example-ruby/lib/app/runner.rb -> example-ruby/lib/base/base_runner.rb#inherit`

## Graph Screenshot

![Ruby example graph screenshot](../assets/graphs/ruby.png)

## Symbol Node Demo

Suggested symbol check:

1. Open `lib/app/runner.rb`.
2. In Graph Scope, enable **Symbol**.
3. Search for `Runner`, `BaseRunner`, `User`, and `call`.

Expected behavior:

- Class and Function symbols make the `require_relative` chain navigable.
- The inheritance edge shows the file relationship, while symbols identify the Ruby declarations involved.
