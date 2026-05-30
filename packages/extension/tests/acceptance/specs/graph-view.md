# Feature: Graph View

## Scenario: Opening and indexing the example workspace shows a usable graph

Given I open the example TypeScript workspace
When I open the CodeGraphy graph view
Then I see file nodes before indexing
When I index the workspace
Then I see indexing progress
And I see indexing progress disappear
And I see updated file nodes
And I see edges
And I see the src/index.ts file node
When I drag the src/index.ts file node
Then the src/index.ts file node moves
When I activate the src/index.ts file node
Then src/index.ts opens in VS Code
