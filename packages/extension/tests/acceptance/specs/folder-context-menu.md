# Feature: Folder Context Menu

## Scenario: Folder node context menus expose their primary actions

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 14 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-typescript workspace

When I toggle the Imports edge on
And I toggle the TypeScript/JavaScript plugin on
And I toggle the Typescript Alias Import edge on
And I can see there are 14 nodes and 7 connections displayed

When I toggle the Folder node on

And I can see there are 17 nodes and 7 connections displayed
And I can see a new "src" node in the graph
And I can see a new "alias" node in the graph
And I can see a new "(root)" node in the graph

When I toggle the Nests edge on
And I can see there are 17 nodes and 23 connections displayed

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
