# Feature: C Example

## Scenario: C example renders expected file nodes and include relationships

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-c workspace

Then I can see there are 5 nodes and 2 connections
And src/main.c points to src/math/add.h
And src/math/add.c points to src/math/add.h

And README.md is an orphan node
And Makefile is an orphan node
