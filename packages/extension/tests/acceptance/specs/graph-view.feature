Feature: Graph View

Scenario: Fresh workspace stays empty before indexing

Given I open the examples/example-typescript workspace in VS Code
And the workspace has no Graph Cache
When I open the CodeGraphy extension graph view
Then I have not yet indexed the workspace
And the workspace still has no Graph Cache

Scenario: Opening and indexing a workspace shows a usable graph

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
Then I have not yet indexed the workspace

When I index the workspace
Then I see indexing progress
And I see indexing progress disappear
And I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace
And the top right of the graph says "19 nodes" and "13 connections"
