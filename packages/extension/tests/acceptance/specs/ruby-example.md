# Feature: Ruby Example

## Scenario: Ruby example renders expected file nodes and require relationships

Given I open the examples/example-ruby workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-ruby workspace

Then I can see there are 8 nodes and 3 connections
And lib/example_ruby.rb points to lib/app/runner.rb
And lib/app/runner.rb points to lib/base/base_runner.rb
And lib/app/runner.rb points to lib/model/user.rb

And README.md is an orphan node
And Gemfile is an orphan node
And example_ruby.gemspec is an orphan node
And .gitignore is an orphan node

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "1 connection"
And lib/app/runner.rb points to lib/base/base_runner.rb
