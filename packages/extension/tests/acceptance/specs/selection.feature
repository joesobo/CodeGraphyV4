Feature: Selection

Scenario: Clicking and double-clicking a node select it and open its file in VS Code

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace

And I click the src/index.ts node to select it
Then the src/index.ts node is visibly outlined in white
And the src/index.ts file opens in VS Code as a preview editor tab

When I click the graph background to unselect the src/index.ts node
Then the src/index.ts node is no longer outlined

When I double click the src/index.ts node
Then the src/index.ts node is visibly outlined in white
And the src/index.ts file opens in VS Code as a pinned editor tab
