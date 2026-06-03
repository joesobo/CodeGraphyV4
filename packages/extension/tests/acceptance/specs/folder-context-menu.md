# Feature: Folder Context Menu

## Scenario: Folder node context menus expose their primary actions

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace
And I can see there are 11 nodes and 6 connections displayed

When I click the Graph Scope button
And I see to buttons for switching views between node type and edge type toggles
And I select node types

Then I see a list of node types with toggles
And I toggle the Folder node on
And I close the Graph Scope

And I can see there are 14 nodes and 6 connections displayed
And I can see a new "src" node in the graph
And I can see a new "alias" node in the graph
And I can see a new "(root)" node in the graph

When I click the Graph Scope button
And I see to buttons for switching views between node type and edge type toggles
And I select edge types

Then I see a list of edge types with toggles
And I toggle the Nests edge on
And I close the Graph Scope

And I can see there are 14 nodes and 19 connections displayed

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
