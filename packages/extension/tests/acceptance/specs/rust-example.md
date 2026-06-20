# Feature: Rust Example

## Scenario: Rust example renders expected file nodes and module relationships

Given I open the examples/example-rust workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 6 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-rust workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 6 nodes and 2 connections
And src/main.rs points to src/util.rs
And src/main.rs points to src/inner.rs

And README.md is an orphan node
And Cargo.toml is an orphan node
And .gitignore is an orphan node

Then I toggle the Imports edge off
And I toggle the Calls edge on
Then I can see there are 6 nodes and 2 connections
And src/main.rs points to src/util.rs
And src/main.rs points to src/inner.rs
