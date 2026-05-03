# Ruby Example

Tiny Ruby project for checking that CodeGraphy connects `require_relative` and simple inheritance.

Open `examples/` in CodeGraphy and look for:

- `example-ruby/lib/example_ruby.rb -> example-ruby/lib/app/runner.rb#import`
- `example-ruby/lib/app/runner.rb -> example-ruby/lib/base/base_runner.rb#import`
- `example-ruby/lib/app/runner.rb -> example-ruby/lib/base/base_runner.rb#inherit`
