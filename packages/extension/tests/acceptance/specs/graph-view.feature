Feature: Graph View

Scenario: Fresh workspace opens file and folder structure before indexing

Given I open the examples/example-typescript workspace in VS Code
And the workspace has no Graph Cache
When I open the CodeGraphy extension graph view
Then I see file nodes
And I do not see edges
And the graph nodes match the expected files in the examples/example-typescript workspace
And the workspace still has no Graph Cache

When I toggle the Folder node on
And I toggle the Nests edge on
Then I see folder nodes and Nests containment edges before indexing
And the workspace still has no Graph Cache

Scenario: Opening and indexing a workspace shows a usable graph

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
And the top right of the graph says "19 nodes" and "13 connections"
