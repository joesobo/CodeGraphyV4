# Feature: Folder Context Menu

## Scenario: Folder node context menus expose their primary actions

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have not yet indexed the workspace
And I open the Graph Scope
Then the Edge Types button is disabled

When I have indexed the workspace
Then I see graph nodes
And I do not see edges
And I can see there are 18 nodes and 0 connections displayed
And the graph nodes match the expected files in the examples/example-typescript workspace

When I open the Graph Scope
Then the Edge Types button is no longer disabled
Then I toggle the Imports edge on
And I can see there are 18 nodes and 11 connections displayed

Then I toggle the Folder node on
And the Nests edge is toggled on
And I can see there are 21 nodes and 31 connections displayed

When I right click one of the folder nodes to open its Graph Context Menu
And I see the "New File" entry
And I see the "New Folder" entry
And I see the "Reveal in explorer" entry
And I see the "Copy Relative Path" entry
And I see the "Copy Absolute Path" entry
And I see the "Add to Favorites" entry
And I see the "Focus Node" entry
And I see the "Add Filter Pattern" entry
And I see the "Add Legend Group" entry
And I see the "Rename Folder" entry
And I see the "Delete Folder" entry
