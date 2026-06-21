Feature: Multi File Node Context Menu

Scenario: Multi File node context menus expose their primary actions

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

When I click and drag on the background I can select multiple nodes at once
Then I see all the selected nodes outlined in white

When I right click one of the selected nodes to open its Graph Context Menu
And I see the "Open x Files" entry, where x is the number of selected nodes
And I see the "Copy Relative Paths" entry
And I see the "Add All to Favorites" entry
And I see the "Add Filter Patterns" entry
And I see the "Delete x Files" entry, where x is the number of selected nodes
