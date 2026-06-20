Feature: Go Example

Scenario: Go example renders expected file nodes and import relationships

Given I open the examples/example-go workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 5 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-go workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 5 nodes and 1 connection
And main.go points to internal/service/service.go

And README.md is an orphan node
And go.mod is an orphan node
And .gitignore is an orphan node

When I toggle the Imports edge off
And I toggle the Calls edge on
Then I can see there are 5 nodes and 1 connection
And main.go points to internal/service/service.go
