Feature: Graph Navigation

Scenario: Fit to Screen and zoom controls change the visible graph scale

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges

When I click the "Fit to Screen" button
Then all 19 graph nodes are visible in the graph viewport

When I click the "Zoom In" button
Then the visible graph scale increases
When I press and hold the "Zoom In" button
Then the visible graph scale continues to increase

When I click the "Fit to Screen" button
Then all 19 graph nodes are visible in the graph viewport

When I click the "Zoom Out" button
Then the visible graph scale decreases
When I press and hold the "Zoom Out" button
Then the visible graph scale continues to decrease
