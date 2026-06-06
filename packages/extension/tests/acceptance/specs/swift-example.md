# Feature: Swift Example

## Scenario: Swift example renders expected file nodes and module import relationships

Given I open the examples/example-swift workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-swift workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Inherits
And I close the Graph Scope

Then I can see there are 5 nodes and 1 connection
And Sources/SwiftExample/main.swift points to Sources/RunnerSupport/Worker.swift

And README.md is an orphan node
And Package.swift is an orphan node
And .gitignore is an orphan node
