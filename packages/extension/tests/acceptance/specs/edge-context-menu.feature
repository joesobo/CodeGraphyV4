Feature: Edge Context Menu

Scenario: Edge context menus expose their primary actions

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

When I right click the edge going from src/index.ts node to src/types.ts node to open its Graph Context Menu
And I see the "Open Source" entry
And I see the "Open Target" entry
And I see the "Copy Source Path" entry
And I see the "Copy Target Path" entry
