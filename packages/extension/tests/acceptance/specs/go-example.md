# Feature: Go Example

## Scenario: Go example renders expected file nodes and import relationships

Given I open the examples/example-go workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-go workspace

Then I can see there are 5 nodes and 1 connection
And main.go points to internal/service/service.go

And README.md is an orphan node
And go.mod is an orphan node
And .gitignore is an orphan node
