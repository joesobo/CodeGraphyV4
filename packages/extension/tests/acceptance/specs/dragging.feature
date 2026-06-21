Feature: Dragging

Scenario: Dragging a node moves it and keeps its dropped position

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

When I click and drag the src/index.ts node
Then the src/index.ts node moves

When I stop dragging the src/index.ts node
Then the src/index.ts node stays where I drop it
