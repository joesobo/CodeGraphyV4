# Feature: Favorite

## Scenario: Favorite nodes keep an orange outline when they are not selected

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

Then I see the src/index.ts node
And I right click the src/index.ts node to open its Graph Context Menu
And I select the "Add to Favorites" entry

Then I click the graph background to unselect the src/index.ts node
And the src/index.ts node is visibly outlined in orange

When I click the src/index.ts node to select it
Then the src/index.ts node is visibly outlined in white

Then I right click the src/index.ts node to open its Graph Context Menu
And I select the "Remove from Favorites" entry
And I click the graph background to unselect the src/index.ts node
Then the src/index.ts node is no longer outlined
