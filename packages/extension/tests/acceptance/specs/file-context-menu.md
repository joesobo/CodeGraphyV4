# Feature: File Context Menu

## Scenario: File node context menus expose their primary actions

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

When I right click the src/index.ts node to open its Graph Context Menu
And I see the "Open File" entry
And I see the "Reveal in Explorer" entry
And I see the "Copy Relative Path" entry
And I see the "Copy Absolute Path" entry
And I see the "Add to Favorites" entry
And I see the "Focus Node" entry
And I see the "Add Filter Pattern" entry
And I see the "Add Legend Group" entry
And I see the "Rename" entry
And I see the "Delete File" entry

When I click the "Open File" entry
Then the index.ts file opens in VS Code as a pinned editor tab
When I click the "Reveal in Explorer" entry
Then VS Code should navigate to the Explorer sidebar tab
And the src/index.ts file should be highlighted in the Explorer
When I click the "Copy Relative Path" entry
Then "src/index.ts" should be saved to my clipboard
When I click the "Copy Absolute Path" entry
Then the absolute path for src/index.ts should be saved to my clipboard
When I click the "Add to Favorites" entry
Then "src/index.ts" should be added to the "favorites" array in .codegraphy/settings.json
When I click the "Focus Node" entry
Then the src/index.ts node should be centered in the middle of the graph
When I click the "Add Filter Pattern" entry
Then the filter section of the graph should expand
And the add glob text should be prefilled with "**/src/index.ts"
When I click the "Add Legend Group" entry
Then a popup should appear titled "Add Legend Group"
And the legend group text should be prefilled with "src/index.ts"
When I click the "Rename" entry
Then a VS Code rename input should appear saying "Enter new file name (Press 'Enter' to confirm or 'Escape' to cancel)"
And the VS Code rename input should be prefilled with "index.ts"
When I click the "Delete File" entry
Then a confirmation pops up saying "Are you sure you want to delete "src/index.ts"?"
