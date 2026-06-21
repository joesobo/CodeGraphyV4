Feature: Graph Rendering

Scenario: Indexed TypeScript graph renders file nodes, labels, and import edges

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

And I see the src/index.ts node
And the src/index.ts node is a blue circle
And the src/index.ts node has a white TS symbol in the center of the node
And the src/index.ts node has the file name "index.ts" as a label below the node
And the src/index.ts node has an edge that points to the src/types.ts node
And the src/index.ts node has an edge that points to the src/palette.ts node
