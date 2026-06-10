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
Then the available edge types are only Include, References, Calls, Contains
And I close the Graph Scope

When I toggle the Include edge on
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
Then I can see there are 8 nodes and 4 connections
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
Then I can see there are 15 nodes and 0 connections

When I toggle the Contains edge on
Then I can see there are 15 nodes and 7 connections
And src/main.c points to src/main.c#main:function

When I toggle the Calls edge on
Then I can see there are 15 nodes and 11 connections
And src/logger/logger.c#logger_write:function points to src/logger/logger.c#logger_accepts:function

When I toggle the Prototype node on
Then I can see there are 20 nodes and 18 connections
And src/logger/logger.c#logger_write:function points to src/logger/format.h#logger_format_line:prototype
And src/main.c#main:function points to src/logger/logger.h#logger_init:prototype
And src/logger/format.c#logger_format_line:function points to src/logger/format.h#logger_level_name:prototype

Then I show only the Include edge type
Then I can see there are 20 nodes and 5 connections
And src/main.c points to src/logger/logger.h

Then I show only the Contains edge type
Then I show only the File and Struct node types
Then I can see there are 10 nodes and 2 connections

Then I show only the File and Union node types
Then I can see there are 9 nodes and 1 connection

Then I show only the File and Enum node types
Then I can see there are 9 nodes and 1 connection

Then I show only the File and Typedef node types
Then I can see there are 12 nodes and 4 connections

Then I show only the File and Global node types
Then I can see there are 9 nodes and 1 connection

Then I show only the File, Function, Prototype, Struct, Union, Enum, Typedef and Global node types
And I toggle the Include edge on
And I toggle the Contains edge on
And I toggle the Calls edge on
Then I can see there are 29 nodes and 32 connections
Then I toggle the Contains edge off
Then I can see there are 29 nodes and 11 connections
Then I toggle the Include edge off
Then I can see there are 29 nodes and 6 connections
Then I toggle the Calls edge off
Then I can see there are 29 nodes and 0 connections
