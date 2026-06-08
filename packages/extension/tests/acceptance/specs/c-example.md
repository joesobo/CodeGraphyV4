# Feature: C Example

## Scenario: C example renders expected file nodes and include relationships

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 8 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-c workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 8 nodes and 5 connections
And src/main.c points to src/logger/logger.h
And src/logger/logger.c points to src/logger/logger.h
And src/logger/logger.c points to src/logger/format.h
And src/logger/format.h points to src/logger/logger.h
And src/logger/format.c points to src/logger/format.h

And README.md is an orphan node
And Makefile is an orphan node
And .gitignore is an orphan node

Then I show only the Calls edge type
Then I can see there are 8 nodes and 3 connections
And src/main.c points to src/logger/logger.h
And src/logger/logger.c points to src/logger/format.h
And src/logger/format.c points to src/logger/format.h

## Scenario: C example exposes symbols when symbol scope is enabled

Given I open the examples/example-c workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 8 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-c workspace

When I toggle the Function node on
Then I can see there are 19 nodes and 0 connections

When I toggle the Contains edge on
Then I can see there are 19 nodes and 11 connections

And src/main.c points to src/main.c#main:function

Then I toggle the Function node off
And I toggle the Type node on
Then I can see there are 11 nodes and 3 connections

Then I toggle the Type node off
And I toggle the Struct node on
Then I can see there are 10 nodes and 2 connections

Then I toggle the Struct node off
And I toggle the Enum node on
Then I can see there are 9 nodes and 1 connections

Then I toggle the Struct node on
And I toggle the Type node on
And I toggle the Function node on
And I toggle the Imports edge on
And I toggle the Contains edge on
Then I can see there are 25 nodes and 22 connections
Then I toggle the Contains edge off
Then I can see there are 25 nodes and 5 connections
Then I toggle the Imports edge off
Then I can see there are 25 nodes and 0 connections
