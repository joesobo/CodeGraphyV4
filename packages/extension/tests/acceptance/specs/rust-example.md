# Feature: Rust Example

## Scenario: Rust example renders expected file nodes and module relationships

Given I open the examples/example-rust workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-rust workspace

Then I can see there are 6 nodes and 2 connections
And src/main.rs points to src/util.rs
And src/main.rs points to src/inner.rs

And README.md is an orphan node
And Cargo.toml is an orphan node
And .gitignore is an orphan node
