# Feature: Ruby Example

## Scenario: Ruby example renders expected file nodes and require relationships

Given I open the examples/example-ruby workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-ruby workspace

Then I can see there are 7 nodes and 4 connections
And lib/example_ruby.rb points to lib/app/runner.rb
And lib/app/runner.rb points to lib/base/base_runner.rb
And lib/app/runner.rb points to lib/model/user.rb

And README.md is an orphan node
And Gemfile is an orphan node
And example_ruby.gemspec is an orphan node
