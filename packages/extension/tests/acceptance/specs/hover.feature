Feature: Hover

Scenario: Hovering a graph node shows and hides node information

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

When I hover the src/index.ts node
Then I see information for the src/index.ts node
And the information says "src/index.ts" at the top

When I stop hovering the src/index.ts node
Then I see information for the src/index.ts node goes away
