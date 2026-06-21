Feature: Graph Theme

Scenario: Graph colors follow the active VS Code color theme

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges

When I turn the VS Code setting "Preferences: Color Theme" to "Light 2026"
Then I can see that the background of the graph is "#FAFAFD"
And I can see that the arrowheads of the edges are "#0069CC"

When I turn the VS Code setting "Preferences: Color Theme" to "Dark 2026"
Then I can see that the background of the graph is "#1F2122"
And I can see that the arrowheads of the edges are "#297AA0"
