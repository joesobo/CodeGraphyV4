# Feature: Graph View

## Scenario: Opening and indexing the example TypeScript workspace shows a usable graph

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
Then I see graph nodes
And I do not see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

When I index the workspace
Then I see indexing progress
And I see indexing progress disappear
And the graph nodes have not changed
And I see edges

Then I see the src/index.ts node
And the src/index.ts node is a blue circle
And the src/index.ts node has a white TS symbol in the center of the node
And the src/index.ts node has the file name "index.ts" as a label below the node
And the src/index.ts node has an edge that points to the src/types.ts node
And the src/index.ts node has an edge that points to the src/utils.ts node

When I hover the src/index.ts node
Then I see information for the src/index.ts node
And the information says "src/index.ts" at the top
When I click the src/index.ts node
Then the src/index.ts node is visibly outlined
And src/index.ts opens in VS Code
When I click and drag the src/index.ts node
Then the src/index.ts node moves
When I stop dragging the src/index.ts node
Then the src/index.ts node stays where I drop it
