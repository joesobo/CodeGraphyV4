Feature: Graph Rendering Performance Settings

Scenario: Show and hide the live graph FPS counter

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I open Performance settings
And I turn Show FPS on
Then I see a finite positive graph FPS
When I turn Show FPS off
Then I do not see the graph FPS counter
