# Feature: Swift Example

## Scenario: Swift example renders expected file nodes and module import relationships

Given I open the examples/example-swift workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 6 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-swift workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Inherits
And I close the Graph Scope

When I toggle the Inherits edge on
Then I can see there are 6 nodes and 2 connections
And Sources/SwiftExample/main.swift points to Sources/RunnerSupport/Worker.swift
And Sources/SwiftExample/main.swift points to Sources/RunnerSupport/Runnable.swift

And README.md is an orphan node
And Package.swift is an orphan node
And .gitignore is an orphan node

Then I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 6 nodes and 0 connections
