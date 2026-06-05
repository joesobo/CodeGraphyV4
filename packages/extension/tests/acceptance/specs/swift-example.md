# Feature: Swift Example

## Scenario: Swift example renders expected file nodes and module import relationships

Given I open the examples/example-swift workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-swift workspace

Then I can see there are 6 nodes and 2 connections
And Sources/SwiftExample/main.swift points to Sources/RunnerSupport/Worker.swift
And Sources/SwiftExample/main.swift points to Sources/RunnerSupport/Runnable.swift

And README.md is an orphan node
And Package.swift is an orphan node
And .gitignore is an orphan node

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Inherits edge on
Then the top right of the graph says "2 connections"
And Sources/SwiftExample/main.swift points to Sources/RunnerSupport/Worker.swift
And Sources/SwiftExample/main.swift points to Sources/RunnerSupport/Runnable.swift
