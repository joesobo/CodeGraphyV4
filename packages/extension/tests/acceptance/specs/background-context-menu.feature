Feature: Background Context Menu

Scenario: Background context menus expose their primary actions

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

When I right click the graph background to open its Graph Context Menu
And I see the "New File" entry
And I see the "New Folder" entry
And I see the "Refresh" entry
And I see the "Fit All Nodes" entry
